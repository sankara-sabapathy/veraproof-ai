import asyncpg
from typing import Optional, Any, Dict, List
from contextlib import asynccontextmanager
import json
from app.config import settings
import logging
import asyncio

logger = logging.getLogger(__name__)


class TenantDatabaseManager:
    """Database manager with tenant context for row-level security"""

    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None

    async def _init_connection(self, conn: asyncpg.Connection):
        # Ensure Postgres json/jsonb columns are decoded into Python objects.
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
        """Initialize database connection pool"""
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
            logger.info("Database connection pool created")
            await self.initialize_schema()
        except asyncio.TimeoutError:
            logger.error("Database connection timed out")
            if settings.environment == "development":
                logger.warning("Running in development mode without database - some features will use mock data")
                self.pool = None
            else:
                raise
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            if settings.environment == "development":
                logger.warning("Running in development mode without database - some features will use mock data")
                self.pool = None
            else:
                raise

    async def initialize_schema(self):
        """Apply additive schema updates from init.sql whenever a database pool is available."""
        if not self.pool:
            return

        try:
            import os
            sql_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "db", "init.sql")
            if not os.path.exists(sql_path):
                logger.warning(f"Database initialization script not found at {sql_path}")
                return

            with open(sql_path, "r", encoding="utf-8-sig") as f:
                init_script = f.read()

            async with self.pool.acquire() as conn:
                advisory_lock_id = 847321905114
                await conn.fetchval("SELECT pg_advisory_lock($1)", advisory_lock_id)
                try:
                    await conn.execute(init_script)
                finally:
                    await conn.fetchval("SELECT pg_advisory_unlock($1)", advisory_lock_id)
            logger.info("Successfully executed database initialization script (init.sql)")
        except Exception as e:
            logger.error(f"Failed to execute database initialization script: {e}")
            raise

    async def disconnect(self):
        """Close database connection pool"""
        if self.pool:
            await self.pool.close()
            logger.info("Database connection pool closed")
        else:
            logger.info("No database pool to close")

    async def _apply_context(self, conn: asyncpg.Connection, tenant_id: Optional[str] = None, context: Optional[Dict[str, Any]] = None):
        context = context or {}
        effective_tenant = tenant_id or context.get("tenant_id")
        if effective_tenant:
            await conn.execute("SELECT set_config('app.current_tenant', $1, true)", str(effective_tenant))
        actor_id = context.get("actor_id")
        if actor_id:
            await conn.execute("SELECT set_config('app.current_actor', $1, true)", str(actor_id))
        actor_type = context.get("actor_type")
        if actor_type:
            await conn.execute("SELECT set_config('app.current_actor_type', $1, true)", str(actor_type))

    @asynccontextmanager
    async def get_connection(self, tenant_id: Optional[str] = None, context: Optional[Dict[str, Any]] = None):
        """Get database connection with optional tenant context"""
        if not self.pool:
            raise RuntimeError("Database pool not initialized")

        async with self.pool.acquire() as conn:
            await self._apply_context(conn, tenant_id=tenant_id, context=context)
            yield conn

    async def execute_query(self, query: str, *args, tenant_id: Optional[str] = None, context: Optional[Dict[str, Any]] = None) -> str:
        if not self.pool:
            logger.warning("Database not available - skipping query execution")
            return "SKIPPED"
        async with self.get_connection(tenant_id=tenant_id, context=context) as conn:
            return await conn.execute(query, *args)

    async def fetch_one(self, query: str, *args, tenant_id: Optional[str] = None, context: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        if not self.pool:
            logger.warning("Database not available - returning None")
            return None
        async with self.get_connection(tenant_id=tenant_id, context=context) as conn:
            row = await conn.fetchrow(query, *args)
            return dict(row) if row else None

    async def fetch_all(self, query: str, *args, tenant_id: Optional[str] = None, context: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        if not self.pool:
            logger.warning("Database not available - returning empty list")
            return []
        async with self.get_connection(tenant_id=tenant_id, context=context) as conn:
            rows = await conn.fetch(query, *args)
            return [dict(row) for row in rows]

    async def fetch_val(self, query: str, *args, tenant_id: Optional[str] = None, context: Optional[Dict[str, Any]] = None) -> Any:
        if not self.pool:
            logger.warning("Database not available - returning None")
            return None
        async with self.get_connection(tenant_id=tenant_id, context=context) as conn:
            return await conn.fetchval(query, *args)


# Global database manager instance
db_manager = TenantDatabaseManager()
