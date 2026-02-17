import asyncpg
from typing import Optional, Any, Dict, List
from contextlib import asynccontextmanager
from app.config import settings
import logging

logger = logging.getLogger(__name__)


class TenantDatabaseManager:
    """Database manager with tenant context for row-level security"""
    
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None
    
    async def connect(self):
        """Initialize database connection pool"""
        self.pool = await asyncpg.create_pool(
            settings.database_url,
            min_size=5,
            max_size=20,
            command_timeout=60
        )
        logger.info("Database connection pool created")
    
    async def disconnect(self):
        """Close database connection pool"""
        if self.pool:
            await self.pool.close()
            logger.info("Database connection pool closed")
    
    @asynccontextmanager
    async def get_connection(self, tenant_id: Optional[str] = None):
        """Get database connection with optional tenant context"""
        if not self.pool:
            raise RuntimeError("Database pool not initialized")
        
        async with self.pool.acquire() as conn:
            # Set tenant context for RLS if tenant_id provided
            if tenant_id:
                await conn.execute(
                    "SET LOCAL app.current_tenant = $1",
                    tenant_id
                )
            yield conn
    
    async def execute_query(
        self,
        query: str,
        *args,
        tenant_id: Optional[str] = None
    ) -> str:
        """Execute a query with automatic tenant filtering"""
        async with self.get_connection(tenant_id) as conn:
            return await conn.execute(query, *args)
    
    async def fetch_one(
        self,
        query: str,
        *args,
        tenant_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Fetch one row with automatic tenant filtering"""
        async with self.get_connection(tenant_id) as conn:
            row = await conn.fetchrow(query, *args)
            return dict(row) if row else None
    
    async def fetch_all(
        self,
        query: str,
        *args,
        tenant_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Fetch all rows with automatic tenant filtering"""
        async with self.get_connection(tenant_id) as conn:
            rows = await conn.fetch(query, *args)
            return [dict(row) for row in rows]
    
    async def fetch_val(
        self,
        query: str,
        *args,
        tenant_id: Optional[str] = None
    ) -> Any:
        """Fetch single value with automatic tenant filtering"""
        async with self.get_connection(tenant_id) as conn:
            return await conn.fetchval(query, *args)


# Global database manager instance
db_manager = TenantDatabaseManager()
