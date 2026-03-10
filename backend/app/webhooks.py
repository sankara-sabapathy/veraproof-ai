import asyncio
import hashlib
import hmac
import json
import logging
from datetime import datetime
from typing import Dict, Optional

import httpx

from app.database import db_manager

logger = logging.getLogger(__name__)


class WebhookManager:
    """Manages webhook delivery to partners"""

    def _context_environment(self) -> tuple[Optional[str], Optional[str]]:
        context = db_manager.get_request_context()
        return context.get('environment_id'), context.get('environment_slug')

    async def send_webhook(
        self,
        tenant_id: str,
        webhook_url: str,
        payload: Dict,
        api_secret: str,
        *,
        webhook_id: Optional[str] = None,
        event_type: str = 'verification.complete',
    ):
        signature = self.sign_payload(payload, api_secret)

        headers = {
            'Content-Type': 'application/json',
            'X-VeraProof-Signature': signature,
        }

        try:
            start_time = datetime.utcnow()
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    webhook_url,
                    json=payload,
                    headers=headers,
                )
            response_time_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)

            await self.log_webhook(
                tenant_id,
                payload.get('session_id'),
                webhook_url,
                payload,
                response.status_code,
                delivered=True,
                webhook_id=webhook_id,
                event_type=event_type,
                response_time_ms=response_time_ms,
            )

            logger.info(f'Webhook delivered to {webhook_url}: status={response.status_code}')
            return response.status_code

        except Exception as e:
            logger.error(f'Webhook delivery failed: {e}')
            await self.log_webhook(
                tenant_id,
                payload.get('session_id'),
                webhook_url,
                payload,
                None,
                delivered=False,
                webhook_id=webhook_id,
                event_type=event_type,
                response_time_ms=0,
            )
            raise

    async def retry_webhook(
        self,
        tenant_id: str,
        webhook_url: str,
        payload: Dict,
        api_secret: str,
        *,
        webhook_id: Optional[str] = None,
        event_type: str = 'verification.complete',
        max_retries: int = 3,
    ):
        for attempt in range(max_retries):
            try:
                status = await self.send_webhook(
                    tenant_id,
                    webhook_url,
                    payload,
                    api_secret,
                    webhook_id=webhook_id,
                    event_type=event_type,
                )

                if 200 <= status < 300:
                    logger.info(f'Webhook retry succeeded on attempt {attempt + 1}')
                    return

            except Exception as e:
                logger.warning(f'Webhook retry {attempt + 1} failed: {e}')

            if attempt < max_retries - 1:
                wait_time = 2 ** attempt
                await asyncio.sleep(wait_time)

        logger.error(f'Webhook delivery failed after {max_retries} retries')

    def sign_payload(self, payload: Dict, secret: str) -> str:
        payload_str = json.dumps(payload, sort_keys=True)
        signature = hmac.new(
            secret.encode('utf-8'),
            payload_str.encode('utf-8'),
            hashlib.sha256,
        ).hexdigest()
        return signature

    async def log_webhook(
        self,
        tenant_id: str,
        session_id: str,
        webhook_url: str,
        payload: Dict,
        response_status: int,
        delivered: bool,
        *,
        webhook_id: Optional[str] = None,
        event_type: str = 'verification.complete',
        response_time_ms: int = 0,
    ):
        environment_id, _environment_slug = self._context_environment()
        query = """
            INSERT INTO webhook_logs (
                tenant_id,
                tenant_environment_id,
                session_id,
                webhook_url,
                payload,
                response_status,
                delivered_at,
                failed_at,
                webhook_id,
                event_type,
                response_time_ms,
                success
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        """

        now = datetime.utcnow()

        await db_manager.execute_query(
            query,
            tenant_id,
            environment_id,
            session_id,
            webhook_url,
            payload,
            response_status,
            now if delivered else None,
            None if delivered else now,
            webhook_id,
            event_type,
            response_time_ms,
            delivered,
        )


webhook_manager = WebhookManager()
