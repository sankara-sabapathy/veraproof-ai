import httpx
import hmac
import hashlib
import json
import asyncio
from typing import Dict
from datetime import datetime
import logging
from app.database import db_manager

logger = logging.getLogger(__name__)


class WebhookManager:
    """Manages webhook delivery to partners"""
    
    async def send_webhook(
        self,
        tenant_id: str,
        webhook_url: str,
        payload: Dict,
        api_secret: str
    ):
        """Send webhook with HMAC signature"""
        # Sign payload
        signature = self.sign_payload(payload, api_secret)
        
        headers = {
            "Content-Type": "application/json",
            "X-VeraProof-Signature": signature
        }
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    webhook_url,
                    json=payload,
                    headers=headers
                )
                
                # Log webhook delivery
                await self.log_webhook(
                    tenant_id,
                    payload.get("session_id"),
                    webhook_url,
                    payload,
                    response.status_code,
                    delivered=True
                )
                
                logger.info(
                    f"Webhook delivered to {webhook_url}: "
                    f"status={response.status_code}"
                )
                
                return response.status_code
                
        except Exception as e:
            logger.error(f"Webhook delivery failed: {e}")
            
            # Log failure
            await self.log_webhook(
                tenant_id,
                payload.get("session_id"),
                webhook_url,
                payload,
                None,
                delivered=False
            )
            
            raise
    
    async def retry_webhook(
        self,
        tenant_id: str,
        webhook_url: str,
        payload: Dict,
        api_secret: str,
        max_retries: int = 3
    ):
        """Retry failed webhook with exponential backoff"""
        for attempt in range(max_retries):
            try:
                status = await self.send_webhook(
                    tenant_id,
                    webhook_url,
                    payload,
                    api_secret
                )
                
                if 200 <= status < 300:
                    logger.info(f"Webhook retry succeeded on attempt {attempt + 1}")
                    return
                
            except Exception as e:
                logger.warning(f"Webhook retry {attempt + 1} failed: {e}")
            
            # Exponential backoff: 1s, 2s, 4s
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt
                await asyncio.sleep(wait_time)
        
        logger.error(f"Webhook delivery failed after {max_retries} retries")
    
    def sign_payload(self, payload: Dict, secret: str) -> str:
        """Generate HMAC-SHA256 signature"""
        payload_str = json.dumps(payload, sort_keys=True)
        signature = hmac.new(
            secret.encode('utf-8'),
            payload_str.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        return signature
    
    async def log_webhook(
        self,
        tenant_id: str,
        session_id: str,
        webhook_url: str,
        payload: Dict,
        response_status: int,
        delivered: bool
    ):
        """Log webhook delivery attempt"""
        query = """
            INSERT INTO webhook_logs (
                tenant_id, session_id, webhook_url, payload,
                response_status, delivered_at, failed_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        """
        
        now = datetime.utcnow()
        
        await db_manager.execute_query(
            query,
            tenant_id,
            session_id,
            webhook_url,
            payload,
            response_status,
            now if delivered else None,
            None if delivered else now
        )


# Global webhook manager instance
webhook_manager = WebhookManager()
