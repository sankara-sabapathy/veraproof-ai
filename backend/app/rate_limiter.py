from typing import Dict
from datetime import datetime, timedelta
import asyncio
import logging
from app.config import settings

logger = logging.getLogger(__name__)


class InMemoryRateLimiter:
    """In-memory rate limiter for development"""
    
    def __init__(self):
        # Track concurrent sessions per tenant
        self.concurrent_sessions: Dict[str, int] = {}
        
        # Track API requests per tenant (timestamp: count)
        self.api_requests: Dict[str, list] = {}
        
        # Cleanup task will be started when event loop is running
        self._cleanup_task = None
    
    def start_cleanup(self):
        """Start cleanup task (called when event loop is running)"""
        if self._cleanup_task is None:
            self._cleanup_task = asyncio.create_task(self.cleanup_loop())
    
    async def check_concurrent_sessions(self, tenant_id: str) -> bool:
        """Check if tenant is within concurrent session limit"""
        current = self.concurrent_sessions.get(tenant_id, 0)
        limit = settings.max_concurrent_sessions
        
        within_limit = current < limit
        
        if not within_limit:
            logger.warning(
                f"Concurrent session limit exceeded for {tenant_id}: "
                f"{current}/{limit}"
            )
        
        return within_limit
    
    async def increment_sessions(self, tenant_id: str):
        """Increment concurrent session count"""
        self.concurrent_sessions[tenant_id] = \
            self.concurrent_sessions.get(tenant_id, 0) + 1
        
        logger.debug(
            f"Sessions incremented for {tenant_id}: "
            f"{self.concurrent_sessions[tenant_id]}"
        )
    
    async def decrement_sessions(self, tenant_id: str):
        """Decrement concurrent session count"""
        if tenant_id in self.concurrent_sessions:
            self.concurrent_sessions[tenant_id] = \
                max(0, self.concurrent_sessions[tenant_id] - 1)
            
            logger.debug(
                f"Sessions decremented for {tenant_id}: "
                f"{self.concurrent_sessions[tenant_id]}"
            )
    
    async def check_api_rate_limit(self, tenant_id: str) -> bool:
        """Check if tenant is within API rate limit (100 requests/minute)"""
        now = datetime.utcnow()
        one_minute_ago = now - timedelta(minutes=1)
        
        # Get or initialize request list
        if tenant_id not in self.api_requests:
            self.api_requests[tenant_id] = []
        
        # Remove old requests
        self.api_requests[tenant_id] = [
            ts for ts in self.api_requests[tenant_id]
            if ts > one_minute_ago
        ]
        
        # Check limit
        current_count = len(self.api_requests[tenant_id])
        limit = settings.api_rate_limit_per_minute
        
        within_limit = current_count < limit
        
        if not within_limit:
            logger.warning(
                f"API rate limit exceeded for {tenant_id}: "
                f"{current_count}/{limit} requests/minute"
            )
        else:
            # Add current request
            self.api_requests[tenant_id].append(now)
        
        return within_limit
    
    async def cleanup_loop(self):
        """Background task to clean up old data"""
        while True:
            await asyncio.sleep(60)  # Run every minute
            
            now = datetime.utcnow()
            one_minute_ago = now - timedelta(minutes=1)
            
            # Clean up API request tracking
            for tenant_id in list(self.api_requests.keys()):
                self.api_requests[tenant_id] = [
                    ts for ts in self.api_requests[tenant_id]
                    if ts > one_minute_ago
                ]
                
                # Remove empty entries
                if not self.api_requests[tenant_id]:
                    del self.api_requests[tenant_id]
            
            logger.debug("Rate limiter cleanup completed")


# Global rate limiter instance
rate_limiter = InMemoryRateLimiter()
