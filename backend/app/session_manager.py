from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
import json
import logging
import uuid
from urllib.parse import quote

from opentelemetry import trace

from app.config import settings
from app.database import db_manager
from app.models import SessionState

logger = logging.getLogger(__name__)


def _normalize_json_field(value, fallback):
    if value is None:
        return fallback
    if isinstance(value, type(fallback)):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            return fallback
        return parsed if isinstance(parsed, type(fallback)) else fallback
    return fallback


class SessionManager:
    """Manages verification sessions"""

    def __init__(self):
        self.in_memory_sessions = {}

    def _context_environment(self) -> tuple[Optional[str], Optional[str]]:
        context = db_manager.get_request_context()
        return context.get('environment_id'), context.get('environment_slug')

    def _normalize_session_record(self, session: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if not session:
            return session
        session['metadata'] = _normalize_json_field(session.get('metadata'), {})
        session['verification_commands'] = _normalize_json_field(session.get('verification_commands'), [])
        session['ai_explanation'] = _normalize_json_field(session.get('ai_explanation'), {})
        if session.get('environment') is None and session.get('environment_slug'):
            session['environment'] = session.get('environment_slug')
        return session

    async def create_session(
        self,
        tenant_id: str,
        metadata: Dict[str, Any],
        return_url: str,
        session_duration: int = 15,
        verification_commands: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        session_id = str(uuid.uuid4())
        created_at = datetime.utcnow()
        expires_at = created_at + timedelta(minutes=settings.session_expiration_minutes)
        environment_id, environment_slug = self._context_environment()

        span = trace.get_current_span()
        if span and span.is_recording():
            span.set_attribute('session.id', session_id)
            span.set_attribute('session.expires_in_minutes', settings.session_expiration_minutes)
            if environment_slug:
                span.set_attribute('tenant.environment', environment_slug)

        query = """
            INSERT INTO sessions (
                session_id, tenant_id, tenant_environment_id, created_at, expires_at,
                state, return_url, metadata, session_duration, verification_commands
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10::jsonb)
            RETURNING session_id, created_at, expires_at
        """

        try:
            result = await db_manager.fetch_one(
                query,
                session_id,
                tenant_id,
                environment_id,
                created_at,
                expires_at,
                SessionState.IDLE.value,
                return_url,
                json.dumps(metadata) if metadata else '{}',
                session_duration,
                json.dumps(verification_commands) if verification_commands else '[]',
                tenant_id=tenant_id,
            )
        except Exception as e:
            logger.error(f'Failed to insert session into database: {e}', extra={'session_id': session_id})
            result = None

        session_data = {
            'session_id': session_id,
            'tenant_id': tenant_id,
            'tenant_environment_id': environment_id,
            'environment': environment_slug,
            'created_at': created_at,
            'expires_at': expires_at,
            'state': SessionState.IDLE.value,
            'return_url': return_url,
            'metadata': metadata or {},
            'tier_1_score': None,
            'tier_2_score': None,
            'final_trust_score': None,
            'correlation_value': None,
            'reasoning': None,
            'video_s3_key': None,
            'session_duration': session_duration,
            'verification_commands': verification_commands or [],
            'imu_data_s3_key': None,
            'optical_flow_s3_key': None,
        }

        if result is None:
            logger.warning('Database unavailable, storing session in memory', extra={'session_id': session_id, 'fallback': True})
            self.in_memory_sessions[session_id] = session_data

        logger.info('Verification session created successfully', extra={'session_id': session_id, 'tenant_id': tenant_id, 'state': SessionState.IDLE.value, 'environment': environment_slug})

        encoded_return_url = quote(return_url, safe='') if return_url else ''
        session_url = f'{settings.frontend_verification_url}?session_id={session_id}'
        if encoded_return_url:
            session_url = f'{session_url}&return_url={encoded_return_url}'

        return {
            'session_id': session_id,
            'session_url': session_url,
            'created_at': created_at,
            'expires_at': expires_at,
        }

    async def get_session(self, session_id: str, tenant_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        environment_id, _environment_slug = self._context_environment()
        query = """
            SELECT s.*, te.slug AS environment
            FROM sessions s
            LEFT JOIN tenant_environments te ON te.tenant_environment_id = s.tenant_environment_id
            WHERE s.session_id = $1
        """
        args = [session_id]
        if tenant_id:
            query += ' AND s.tenant_id = $2'
            args.append(tenant_id)
        if tenant_id and environment_id:
            query += ' AND s.tenant_environment_id = $3'
            args.append(environment_id)
        elif environment_id:
            query += ' AND s.tenant_environment_id = $2'
            args.append(environment_id)

        session = await db_manager.fetch_one(query, *args, tenant_id=tenant_id)
        session = self._normalize_session_record(session)

        if session is None and session_id in self.in_memory_sessions:
            memory_session = self.in_memory_sessions[session_id]
            if not tenant_id or str(memory_session.get('tenant_id')) == str(tenant_id):
                if not environment_id or str(memory_session.get('tenant_environment_id')) == str(environment_id):
                    session = memory_session
                    logger.debug('Session retrieved from memory rather than Postgres DB', extra={'session_id': session_id, 'memory_fallback': True})
        elif session:
            logger.debug('Session retrieved from database smoothly', extra={'session_id': session_id})
        else:
            logger.warning('Session completely missing from all datastores', extra={'session_id': session_id})
        return session

    async def update_session_state(self, session_id: str, state, tenant_id: Optional[str] = None):
        state_value = state.value if hasattr(state, 'value') else str(state)
        environment_id, _environment_slug = self._context_environment()
        query = 'UPDATE sessions SET state = $1 WHERE session_id = $2'
        args = [state_value, session_id]
        if tenant_id:
            query += ' AND tenant_id = $3'
            args.append(tenant_id)
            if environment_id:
                query += ' AND tenant_environment_id = $4'
                args.append(environment_id)
        elif environment_id:
            query += ' AND tenant_environment_id = $3'
            args.append(environment_id)

        await db_manager.execute_query(query, *args, tenant_id=tenant_id)
        logger.info('Session execution phase transition recorded', extra={'session_id': session_id, 'new_state': state_value})

        span = trace.get_current_span()
        if span and span.is_recording():
            span.add_event('session_state_transition', {'session.state': state_value})

    async def extend_expiration(self, session_id: str, tenant_id: Optional[str] = None):
        new_expiration = datetime.utcnow() + timedelta(minutes=settings.session_extension_minutes)
        environment_id, _environment_slug = self._context_environment()
        query = 'UPDATE sessions SET expires_at = $1 WHERE session_id = $2'
        args = [new_expiration, session_id]
        if tenant_id:
            query += ' AND tenant_id = $3'
            args.append(tenant_id)
            if environment_id:
                query += ' AND tenant_environment_id = $4'
                args.append(environment_id)
        elif environment_id:
            query += ' AND tenant_environment_id = $3'
            args.append(environment_id)

        await db_manager.execute_query(query, *args, tenant_id=tenant_id)
        logger.info('Session expiration securely extended', extra={'session_id': session_id, 'new_expiration': new_expiration})

    async def update_session_results(
        self,
        session_id: str,
        tier_1_score: int,
        tier_2_score: Optional[int],
        final_trust_score: int,
        correlation_value: float,
        reasoning: str,
        ai_score: float = None,
        physics_score: float = None,
        unified_score: float = None,
        ai_explanation: dict = None,
        verification_status: str = None,
        tenant_id: Optional[str] = None,
    ):
        if verification_status is None:
            verification_status = SessionState.COMPLETE.value

        environment_id, _environment_slug = self._context_environment()
        query = """
            UPDATE sessions
            SET
                tier_1_score = $1,
                tier_2_score = $2,
                final_trust_score = $3,
                correlation_value = $4,
                reasoning = $5,
                ai_score = $6,
                physics_score = $7,
                unified_score = $8,
                ai_explanation = $9::jsonb,
                verification_status = $10,
                state = $11
            WHERE session_id = $12
        """
        args = [
            tier_1_score,
            tier_2_score,
            final_trust_score,
            correlation_value,
            reasoning,
            ai_score,
            physics_score,
            unified_score,
            json.dumps(ai_explanation) if ai_explanation else None,
            verification_status,
            verification_status,
            session_id,
        ]
        if tenant_id:
            query += ' AND tenant_id = $13'
            args.append(tenant_id)
            if environment_id:
                query += ' AND tenant_environment_id = $14'
                args.append(environment_id)
        elif environment_id:
            query += ' AND tenant_environment_id = $13'
            args.append(environment_id)

        try:
            await db_manager.execute_query(query, *args, tenant_id=tenant_id)
        except Exception as e:
            logger.error(f'Failed to update session results in database: {e}', extra={'session_id': session_id})
            if session_id in self.in_memory_sessions:
                self.in_memory_sessions[session_id].update(
                    {
                        'tier_1_score': tier_1_score,
                        'tier_2_score': tier_2_score,
                        'final_trust_score': final_trust_score,
                        'correlation_value': correlation_value,
                        'verification_status': verification_status,
                    }
                )

        logger.info('Session analytics recorded & completed', extra={
            'session_id': session_id,
            'final_score': final_trust_score,
            'tier_1': tier_1_score,
            'correlation': correlation_value,
        })

    async def store_artifact_keys(
        self,
        session_id: str,
        video_s3_key: Optional[str] = None,
        imu_data_s3_key: Optional[str] = None,
        optical_flow_s3_key: Optional[str] = None,
        tenant_id: Optional[str] = None,
    ):
        environment_id, _environment_slug = self._context_environment()
        query = """
            UPDATE sessions
            SET
                video_s3_key = COALESCE($1, video_s3_key),
                imu_data_s3_key = COALESCE($2, imu_data_s3_key),
                optical_flow_s3_key = COALESCE($3, optical_flow_s3_key)
            WHERE session_id = $4
        """
        args = [video_s3_key, imu_data_s3_key, optical_flow_s3_key, session_id]
        if tenant_id:
            query += ' AND tenant_id = $5'
            args.append(tenant_id)
            if environment_id:
                query += ' AND tenant_environment_id = $6'
                args.append(environment_id)
        elif environment_id:
            query += ' AND tenant_environment_id = $5'
            args.append(environment_id)

        await db_manager.execute_query(query, *args, tenant_id=tenant_id)
        logger.info('Artifact keys synced to session', extra={
            'session_id': session_id,
            'has_video': video_s3_key is not None,
            'has_imu': imu_data_s3_key is not None,
        })

    async def cleanup_expired_sessions(self):
        result = await db_manager.execute_query(
            'DELETE FROM sessions WHERE expires_at < $1 AND state != $2',
            datetime.utcnow(),
            SessionState.COMPLETE.value,
        )
        logger.info('Bulk expired session purges successfully executed', extra={'rows_deleted': result, 'scheduled_job': True})

    async def get_sessions_by_tenant(self, tenant_id: str, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        environment_id, _environment_slug = self._context_environment()
        query = """
            SELECT s.*, te.slug AS environment
            FROM sessions s
            LEFT JOIN tenant_environments te ON te.tenant_environment_id = s.tenant_environment_id
            WHERE s.tenant_id = $1
        """
        args = [tenant_id]
        if environment_id:
            query += ' AND s.tenant_environment_id = $2'
            args.append(environment_id)
            query += ' ORDER BY s.created_at DESC LIMIT $3 OFFSET $4'
            args.extend([limit, offset])
        else:
            query += ' ORDER BY s.created_at DESC LIMIT $2 OFFSET $3'
            args.extend([limit, offset])

        sessions = await db_manager.fetch_all(query, *args, tenant_id=tenant_id)
        sessions = [self._normalize_session_record(session) for session in sessions]
        if sessions is None:
            logger.warning('Database unavailable during session indexing query', extra={'tenant_id': tenant_id, 'fallback': 'empty_list'})
            return []
        return sessions


session_manager = SessionManager()
