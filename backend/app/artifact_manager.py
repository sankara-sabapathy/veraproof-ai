import json
import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.database import db_manager

logger = logging.getLogger(__name__)


def _normalize_metadata(value: Any) -> Dict[str, Any]:
    if value is None:
        return {}
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            return {}
        return parsed if isinstance(parsed, dict) else {}
    return {}


class SessionArtifactManager:
    def _context_environment(self) -> Optional[str]:
        return db_manager.get_request_context().get('environment_id')

    async def upsert_artifact(
        self,
        *,
        session_id: str,
        tenant_id: str,
        artifact_type: str,
        file_name: str,
        content_type: str,
        storage_key: str,
        provider: Optional[str] = None,
        size_bytes: Optional[int] = None,
        sha256: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        encryption_mode: Optional[str] = None,
        encryption_key_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        environment_id = self._context_environment()
        query = """
            INSERT INTO session_artifacts (
                session_id,
                tenant_id,
                tenant_environment_id,
                artifact_type,
                provider,
                file_name,
                content_type,
                storage_key,
                size_bytes,
                sha256,
                metadata,
                encryption_mode,
                encryption_key_id,
                encrypted_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, CASE WHEN $12::varchar IS NULL THEN NULL ELSE NOW() END)
            ON CONFLICT (session_id, artifact_type)
            DO UPDATE SET
                tenant_environment_id = EXCLUDED.tenant_environment_id,
                provider = EXCLUDED.provider,
                file_name = EXCLUDED.file_name,
                content_type = EXCLUDED.content_type,
                storage_key = EXCLUDED.storage_key,
                size_bytes = EXCLUDED.size_bytes,
                sha256 = EXCLUDED.sha256,
                metadata = EXCLUDED.metadata,
                encryption_mode = EXCLUDED.encryption_mode,
                encryption_key_id = EXCLUDED.encryption_key_id,
                encrypted_at = EXCLUDED.encrypted_at,
                created_at = NOW()
            RETURNING *
        """
        artifact = await db_manager.fetch_one(
            query,
            session_id,
            tenant_id,
            environment_id,
            artifact_type,
            provider,
            file_name,
            content_type,
            storage_key,
            size_bytes,
            sha256,
            json.dumps(metadata or {}),
            encryption_mode,
            encryption_key_id,
            tenant_id=tenant_id,
        )
        return self._normalize_artifact(artifact)

    async def list_artifacts(self, session_id: str, tenant_id: Optional[str] = None) -> List[Dict[str, Any]]:
        environment_id = self._context_environment()
        query = 'SELECT * FROM session_artifacts WHERE session_id = $1'
        args = [session_id]
        if tenant_id:
            query += ' AND tenant_id = $2'
            args.append(tenant_id)
            if environment_id:
                query += ' AND tenant_environment_id = $3'
                args.append(environment_id)
        elif environment_id:
            query += ' AND tenant_environment_id = $2'
            args.append(environment_id)
        query += ' ORDER BY created_at DESC, artifact_type ASC'
        artifacts = await db_manager.fetch_all(query, *args, tenant_id=tenant_id)
        return [self._normalize_artifact(artifact) for artifact in artifacts]

    async def get_artifact(self, session_id: str, artifact_id: str, tenant_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        environment_id = self._context_environment()
        query = 'SELECT * FROM session_artifacts WHERE session_id = $1 AND artifact_id = $2'
        args = [session_id, artifact_id]
        if tenant_id:
            query += ' AND tenant_id = $3'
            args.append(tenant_id)
            if environment_id:
                query += ' AND tenant_environment_id = $4'
                args.append(environment_id)
        elif environment_id:
            query += ' AND tenant_environment_id = $3'
            args.append(environment_id)
        artifact = await db_manager.fetch_one(query, *args, tenant_id=tenant_id)
        return self._normalize_artifact(artifact)

    async def get_artifact_by_type(self, session_id: str, artifact_type: str, tenant_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        environment_id = self._context_environment()
        query = 'SELECT * FROM session_artifacts WHERE session_id = $1 AND artifact_type = $2'
        args = [session_id, artifact_type]
        if tenant_id:
            query += ' AND tenant_id = $3'
            args.append(tenant_id)
            if environment_id:
                query += ' AND tenant_environment_id = $4'
                args.append(environment_id)
        elif environment_id:
            query += ' AND tenant_environment_id = $3'
            args.append(environment_id)
        artifact = await db_manager.fetch_one(query, *args, tenant_id=tenant_id)
        return self._normalize_artifact(artifact)

    def _normalize_artifact(self, artifact: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if not artifact:
            return artifact

        normalized = dict(artifact)

        for key in ('artifact_id', 'session_id', 'tenant_id', 'tenant_environment_id'):
            value = normalized.get(key)
            if isinstance(value, uuid.UUID):
                normalized[key] = str(value)

        for key in ('created_at', 'encrypted_at'):
            value = normalized.get(key)
            if isinstance(value, datetime):
                normalized[key] = value

        normalized['metadata'] = _normalize_metadata(normalized.get('metadata'))
        return normalized


artifact_manager = SessionArtifactManager()
