from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import uuid
import logging
import json
from opentelemetry import trace
from app.config import settings
from app.database import db_manager
from app.models import SessionState

logger = logging.getLogger(__name__)


class SessionManager:
    """Manages verification sessions"""
    
    def __init__(self):
        """Initialize session manager with in-memory fallback storage"""
        self.in_memory_sessions = {}  # Fallback when database unavailable
    
    async def create_session(
        self,
        tenant_id: str,
        metadata: Dict[str, Any],
        return_url: str
    ) -> Dict[str, Any]:
        """Create new verification session"""
        session_id = str(uuid.uuid4())
        created_at = datetime.utcnow()
        expires_at = created_at + timedelta(minutes=settings.session_expiration_minutes)
        
        # Inject standard trace parameters into this session transaction natively
        span = trace.get_current_span()
        if span and span.is_recording():
            span.set_attribute("session.id", session_id)
            span.set_attribute("session.expires_in_minutes", settings.session_expiration_minutes)
        
        query = """
            INSERT INTO sessions (
                session_id, tenant_id, created_at, expires_at,
                state, return_url, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
            RETURNING session_id, created_at, expires_at
        """
        
        try:
            result = await db_manager.fetch_one(
                query,
                session_id,
                tenant_id,
                created_at,
                expires_at,
                SessionState.IDLE.value,
                return_url,
                json.dumps(metadata) if metadata else '{}'
            )
        except Exception as e:
            logger.error(f"Failed to insert session into database: {e}", extra={"session_id": session_id})
            result = None
        
        # Store in memory as fallback if database unavailable
        session_data = {
            "session_id": session_id,
            "tenant_id": tenant_id,
            "created_at": created_at,
            "expires_at": expires_at,
            "state": SessionState.IDLE.value,
            "return_url": return_url,
            "metadata": metadata or {},
            "tier_1_score": None,
            "tier_2_score": None,
            "final_trust_score": None,
            "correlation_value": None,
            "reasoning": None,
            "video_s3_key": None,
            "imu_data_s3_key": None,
            "optical_flow_s3_key": None
        }
        
        if result is None:
            # Database unavailable, use in-memory storage
            logger.warning(f"Database unavailable, storing session in memory", extra={"session_id": session_id, "fallback": True})
            self.in_memory_sessions[session_id] = session_data
        
        logger.info(f"Verification session created successfully", extra={"session_id": session_id, "tenant_id": tenant_id, "state": SessionState.IDLE.value})
        
        # Generate session URL
        session_url = f"{settings.frontend_verification_url}?session_id={session_id}"
        
        return {
            "session_id": session_id,
            "session_url": session_url,
            "created_at": created_at,
            "expires_at": expires_at
        }
    
    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve session by ID"""
        query = """
            SELECT * FROM sessions WHERE session_id = $1
        """
        
        session = await db_manager.fetch_one(query, session_id)
        
        # Fallback to in-memory storage if database unavailable
        if session is None and session_id in self.in_memory_sessions:
            session = self.in_memory_sessions[session_id]
            logger.debug(f"Session retrieved from memory rather than Postgres DB", extra={"session_id": session_id, "memory_fallback": True})
        elif session:
            logger.debug(f"Session retrieved from database smoothly", extra={"session_id": session_id})
        else:
            logger.warning(f"Session completely missing from all datastores", extra={"session_id": session_id})
        
        return session
    
    async def update_session_state(
        self,
        session_id: str,
        state: SessionState
    ):
        """Update session state"""
        query = """
            UPDATE sessions
            SET state = $1
            WHERE session_id = $2
        """
        
        await db_manager.execute_query(query, state.value, session_id)
        logger.info(f"Session execution phase transition recorded", extra={"session_id": session_id, "new_state": state.value})
        
        span = trace.get_current_span()
        if span and span.is_recording():
            span.add_event("session_state_transition", {"session.state": state.value})
    
    async def extend_expiration(self, session_id: str):
        """Extend session expiration by 10 minutes"""
        new_expiration = datetime.utcnow() + timedelta(
            minutes=settings.session_extension_minutes
        )
        
        query = """
            UPDATE sessions
            SET expires_at = $1
            WHERE session_id = $2
        """
        
        await db_manager.execute_query(query, new_expiration, session_id)
        logger.info(f"Session expiration securely extended", extra={"session_id": session_id, "new_expiration": new_expiration})
    
    async def update_session_results(
        self,
        session_id: str,
        tier_1_score: int,
        tier_2_score: Optional[int],
        final_trust_score: int,
        correlation_value: float,
        reasoning: str
    ):
        """Update session with verification results"""
        query = """
            UPDATE sessions
            SET 
                tier_1_score = $1,
                tier_2_score = $2,
                final_trust_score = $3,
                correlation_value = $4,
                reasoning = $5,
                state = $6
            WHERE session_id = $7
        """
        
        await db_manager.execute_query(
            query,
            tier_1_score,
            tier_2_score,
            final_trust_score,
            correlation_value,
            reasoning,
            SessionState.COMPLETE.value,
            session_id
        )
        
        logger.info(f"Session analytics recorded & completed", extra={
            "session_id": session_id, 
            "final_score": final_trust_score, 
            "tier_1": tier_1_score,
            "correlation": correlation_value
        })
    
    async def store_artifact_keys(
        self,
        session_id: str,
        video_s3_key: Optional[str] = None,
        imu_data_s3_key: Optional[str] = None,
        optical_flow_s3_key: Optional[str] = None
    ):
        """Store S3 artifact keys for session"""
        query = """
            UPDATE sessions
            SET 
                video_s3_key = COALESCE($1, video_s3_key),
                imu_data_s3_key = COALESCE($2, imu_data_s3_key),
                optical_flow_s3_key = COALESCE($3, optical_flow_s3_key)
            WHERE session_id = $4
        """
        
        await db_manager.execute_query(
            query,
            video_s3_key,
            imu_data_s3_key,
            optical_flow_s3_key,
            session_id
        )
        
        logger.info("Artifact keys synced to session", extra={
            "session_id": session_id,
            "has_video": video_s3_key is not None,
            "has_imu": imu_data_s3_key is not None
        })
    
    async def cleanup_expired_sessions(self):
        """Background task to clean up expired sessions"""
        query = """
            DELETE FROM sessions
            WHERE expires_at < $1 AND state != $2
        """
        
        result = await db_manager.execute_query(
            query,
            datetime.utcnow(),
            SessionState.COMPLETE.value
        )
        
        logger.info(f"Bulk expired session purges successfully executed", extra={"rows_deleted": result, "scheduled_job": True})
    
    async def get_sessions_by_tenant(
        self,
        tenant_id: str,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Get sessions for a tenant"""
        query = """
            SELECT * FROM sessions
            WHERE tenant_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        """
        
        sessions = await db_manager.fetch_all(
            query,
            tenant_id,
            limit,
            offset
        )
        
        # Return empty list if database unavailable (graceful degradation)
        if sessions is None:
            logger.warning(f"Database unavailable during session indexing query", extra={"tenant_id": tenant_id, "fallback": "empty_list"})
            return []
        
        return sessions


# Global session manager instance
session_manager = SessionManager()
