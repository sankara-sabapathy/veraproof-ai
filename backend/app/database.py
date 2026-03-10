import asyncio
import asyncpg
import json
import logging
from contextlib import asynccontextmanager
from contextvars import ContextVar
from typing import Any, Dict, List, Optional

from app.config import settings

logger = logging.getLogger(__name__)

_current_tenant_var: ContextVar[Optional[str]] = ContextVar('veraproof_current_tenant', default=None)
_current_environment_id_var: ContextVar[Optional[str]] = ContextVar('veraproof_current_environment_id', default=None)
_current_environment_slug_var: ContextVar[Optional[str]] = ContextVar('veraproof_current_environment_slug', default=None)
_current_actor_id_var: ContextVar[Optional[str]] = ContextVar('veraproof_current_actor_id', default=None)
_current_actor_type_var: ContextVar[Optional[str]] = ContextVar('veraproof_current_actor_type', default=None)


class TenantDatabaseManager:
    """Database manager with tenant context for row-level security"""

    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None

    async def _init_connection(self, conn: asyncpg.Connection):
        await conn.set_type_codec(
            'json',
            encoder=json.dumps,
            decoder=json.loads,
            schema='pg_catalog'
        )
        await conn.set_type_codec(
            'jsonb',
            encoder=json.dumps,
            decoder=json.loads,
            schema='pg_catalog'
        )

    async def connect(self):
        try:
            self.pool = await asyncio.wait_for(
                asyncpg.create_pool(
                    settings.database_url,
                    min_size=5,
                    max_size=20,
                    command_timeout=60,
                    init=self._init_connection
                ),
                timeout=5.0
            )
            logger.info('Database connection pool created')
            await self.initialize_schema()
        except asyncio.TimeoutError:
            logger.error('Database connection timed out')
            if settings.environment == 'development':
                logger.warning('Running in development mode without database - some features will use mock data')
                self.pool = None
            else:
                raise
        except Exception as e:
            logger.error(f'Failed to connect to database: {e}')
            if settings.environment == 'development':
                logger.warning('Running in development mode without database - some features will use mock data')
                self.pool = None
            else:
                raise

    async def initialize_schema(self):
        if not self.pool:
            return

        try:
            import os
            sql_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'db', 'init.sql')
            if not os.path.exists(sql_path):
                logger.warning(f'Database initialization script not found at {sql_path}')
                return

            with open(sql_path, 'r', encoding='utf-8-sig') as f:
                init_script = f.read()

            async with self.pool.acquire() as conn:
                advisory_lock_id = 847321905114
                await conn.fetchval('SELECT pg_advisory_lock($1)', advisory_lock_id)
                try:
                    await conn.execute(init_script)
                finally:
                    await conn.fetchval('SELECT pg_advisory_unlock($1)', advisory_lock_id)
            logger.info('Successfully executed database initialization script (init.sql)')
        except Exception as e:
            logger.error(f'Failed to execute database initialization script: {e}')
            raise

    async def disconnect(self):
        if self.pool:
            await self.pool.close()
            logger.info('Database connection pool closed')
        else:
            logger.info('No database pool to close')

    def set_request_context(
        self,
        *,
        tenant_id: Optional[str] = None,
        environment_id: Optional[str] = None,
        environment_slug: Optional[str] = None,
        actor_id: Optional[str] = None,
        actor_type: Optional[str] = None,
    ) -> None:
        _current_tenant_var.set(str(tenant_id) if tenant_id else None)
        _current_environment_id_var.set(str(environment_id) if environment_id else None)
        _current_environment_slug_var.set(environment_slug or None)
        _current_actor_id_var.set(str(actor_id) if actor_id else None)
        _current_actor_type_var.set(actor_type or None)

    def get_request_context(self) -> Dict[str, Optional[str]]:
        return {
            'tenant_id': _current_tenant_var.get(),
            'environment_id': _current_environment_id_var.get(),
            'environment_slug': _current_environment_slug_var.get(),
            'actor_id': _current_actor_id_var.get(),
            'actor_type': _current_actor_type_var.get(),
        }

    def current_environment_id(self) -> Optional[str]:
        return _current_environment_id_var.get()

    def current_environment_slug(self) -> Optional[str]:
        return _current_environment_slug_var.get()

    async def _apply_context(self, conn: asyncpg.Connection, tenant_id: Optional[str] = None, context: Optional[Dict[str, Any]] = None):
        context = context or {}
        request_context = self.get_request_context()
        effective_tenant = tenant_id or context.get('tenant_id') or request_context.get('tenant_id')
        effective_environment_id = context.get('environment_id') or request_context.get('environment_id')
        effective_environment_slug = context.get('environment_slug') or request_context.get('environment_slug')
        actor_id = context.get('actor_id') or request_context.get('actor_id')
        actor_type = context.get('actor_type') or request_context.get('actor_type')

        await conn.execute("SELECT set_config('app.current_tenant', COALESCE($1, ''), true)", str(effective_tenant) if effective_tenant else None)
        await conn.execute("SELECT set_config('app.current_environment', COALESCE($1, ''), true)", str(effective_environment_id) if effective_environment_id else None)
        await conn.execute("SELECT set_config('app.current_environment_slug', COALESCE($1, ''), true)", effective_environment_slug)
        await conn.execute("SELECT set_config('app.current_actor', COALESCE($1, ''), true)", str(actor_id) if actor_id else None)
        await conn.execute("SELECT set_config('app.current_actor_type', COALESCE($1, ''), true)", actor_type)

    @asynccontextmanager
    async def get_connection(self, tenant_id: Optional[str] = None, context: Optional[Dict[str, Any]] = None):
        if not self.pool:
            raise RuntimeError('Database pool not initialized')

        async with self.pool.acquire() as conn:
            await self._apply_context(conn, tenant_id=tenant_id, context=context)
            yield conn

    async def execute_query(self, query: str, *args, tenant_id: Optional[str] = None, context: Optional[Dict[str, Any]] = None) -> str:
        if not self.pool:
            logger.warning('Database not available - skipping query execution')
            return 'SKIPPED'
        async with self.get_connection(tenant_id=tenant_id, context=context) as conn:
            return await conn.execute(query, *args)

    async def fetch_one(self, query: str, *args, tenant_id: Optional[str] = None, context: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        if not self.pool:
            logger.warning('Database not available - returning None')
            return None
        async with self.get_connection(tenant_id=tenant_id, context=context) as conn:
            row = await conn.fetchrow(query, *args)
            return dict(row) if row else None

    async def fetch_all(self, query: str, *args, tenant_id: Optional[str] = None, context: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        if not self.pool:
            logger.warning('Database not available - returning empty list')
            return []
        async with self.get_connection(tenant_id=tenant_id, context=context) as conn:
            rows = await conn.fetch(query, *args)
            return [dict(row) for row in rows]

    async def fetch_val(self, query: str, *args, tenant_id: Optional[str] = None, context: Optional[Dict[str, Any]] = None) -> Any:
        if not self.pool:
            logger.warning('Database not available - returning None')
            return None
        async with self.get_connection(tenant_id=tenant_id, context=context) as conn:
            return await conn.fetchval(query, *args)


db_manager = TenantDatabaseManager()
