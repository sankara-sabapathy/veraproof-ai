from datetime import datetime, timedelta
from typing import Dict, Optional
import logging

from app.database import db_manager
from app.tenant_environment import (
    DEFAULT_ENVIRONMENT,
    PRODUCTION_ENVIRONMENT,
    get_tenant_environment,
    update_environment_quota,
)

logger = logging.getLogger(__name__)


class UsageQuotaManager:
    """Manages usage quotas and billing"""

    @staticmethod
    def _calculate_usage_percentage(current_usage: int, monthly_quota: int) -> float:
        if monthly_quota <= 0:
            return 0.0 if current_usage <= 0 else 100.0
        return round((current_usage / monthly_quota) * 100, 2)

    async def _resolve_environment(self, tenant_id: str, environment_slug: Optional[str] = None, environment_id: Optional[str] = None) -> Optional[Dict]:
        context = db_manager.get_request_context()
        resolved_environment_id = environment_id or context.get('environment_id')
        resolved_environment_slug = environment_slug or context.get('environment_slug') or DEFAULT_ENVIRONMENT
        environment = await get_tenant_environment(tenant_id, slug=resolved_environment_slug, environment_id=resolved_environment_id)
        return environment

    async def check_quota(self, tenant_id: str, environment_slug: Optional[str] = None) -> bool:
        environment = await self._resolve_environment(tenant_id, environment_slug=environment_slug)
        if not environment:
            logger.warning(f'Tenant environment not found in database: {tenant_id} - allowing for development')
            return True

        if environment['monthly_quota'] <= 0:
            logger.info(
                f"Quota check for {tenant_id}/{environment['slug']}: "
                f"{environment['current_usage']}/{environment['monthly_quota']} - No quota configured"
            )
            return False

        has_quota = environment['current_usage'] < environment['monthly_quota']
        logger.info(
            f"Quota check for {tenant_id}/{environment['slug']}: "
            f"{environment['current_usage']}/{environment['monthly_quota']} - "
            f"{'Available' if has_quota else 'Exhausted'}"
        )
        return has_quota

    async def decrement_quota(self, tenant_id: str, environment_slug: Optional[str] = None):
        environment = await self._resolve_environment(tenant_id, environment_slug=environment_slug)
        if not environment:
            logger.warning(f'Tenant environment not found for quota decrement: {tenant_id} - skipping for development')
            return

        result = await update_environment_quota(
            tenant_id,
            environment['slug'],
            current_usage_delta=1,
        )

        if result:
            logger.info(
                f"Quota decremented for {tenant_id}/{result['slug']}: "
                f"{result['current_usage']}/{result['monthly_quota']}"
            )
            usage_pct = self._calculate_usage_percentage(result['current_usage'], result['monthly_quota'])
            if usage_pct >= 100:
                await self.send_quota_alert(tenant_id, result['slug'], 100)
            elif usage_pct >= 80:
                await self.send_quota_alert(tenant_id, result['slug'], 80)
        else:
            logger.warning(f'Tenant environment not found for quota decrement: {tenant_id} - skipping for development')

    async def get_usage_stats(self, tenant_id: str, environment_slug: Optional[str] = None) -> Dict:
        tenant = await db_manager.fetch_one(
            """
            SELECT tenant_id, subscription_tier, billing_cycle_start, billing_cycle_end
            FROM tenants
            WHERE tenant_id = $1
            """,
            tenant_id,
        )

        environment = await self._resolve_environment(tenant_id, environment_slug=environment_slug)

        if not tenant or not environment:
            logger.warning(f'Tenant or environment not found in database: {tenant_id} - returning default values for development')
            return {
                'tenant_id': tenant_id,
                'subscription_tier': 'Sandbox',
                'monthly_quota': 100,
                'current_usage': 0,
                'remaining_quota': 100,
                'billing_cycle_start': datetime.utcnow().date().isoformat(),
                'billing_cycle_end': (datetime.utcnow() + timedelta(days=30)).date().isoformat(),
                'usage_percentage': 0.0,
                'environment': {
                    'environment_id': '',
                    'slug': environment_slug or DEFAULT_ENVIRONMENT,
                    'display_name': (environment_slug or DEFAULT_ENVIRONMENT).title(),
                    'is_default': True,
                    'is_billable': environment_slug != 'sandbox',
                    'monthly_quota': 100,
                    'current_usage': 0,
                    'billing_cycle_start': datetime.utcnow().date().isoformat(),
                    'billing_cycle_end': (datetime.utcnow() + timedelta(days=30)).date().isoformat(),
                },
            }

        remaining_quota = environment['monthly_quota'] - environment['current_usage']
        usage_percentage = self._calculate_usage_percentage(environment['current_usage'], environment['monthly_quota'])

        return {
            'tenant_id': str(tenant['tenant_id']),
            'subscription_tier': tenant['subscription_tier'],
            'monthly_quota': environment['monthly_quota'],
            'current_usage': environment['current_usage'],
            'remaining_quota': remaining_quota,
            'billing_cycle_start': environment['billing_cycle_start'] or tenant.get('billing_cycle_start'),
            'billing_cycle_end': environment['billing_cycle_end'] or tenant.get('billing_cycle_end'),
            'usage_percentage': usage_percentage,
            'environment': environment,
        }

    async def reset_monthly_quotas(self):
        query = """
            UPDATE tenant_environment_quotas q
            SET current_usage = 0,
                billing_cycle_start = CURRENT_DATE,
                billing_cycle_end = CURRENT_DATE + INTERVAL '30 days',
                updated_at = NOW()
            FROM tenant_environments te
            WHERE te.tenant_environment_id = q.tenant_environment_id
              AND q.billing_cycle_end <= CURRENT_DATE
        """
        result = await db_manager.execute_query(query)
        logger.info(f'Monthly quotas reset: {result}')

    async def send_quota_alert(self, tenant_id: str, environment_slug: str, percentage: int):
        logger.warning(f'QUOTA ALERT: Tenant {tenant_id} environment {environment_slug} has reached {percentage}% usage')


class MockRazorpayClient:
    async def create_order(self, amount: int, currency: str = 'INR') -> Dict:
        import uuid

        order = {
            'id': f'order_{uuid.uuid4().hex[:12]}',
            'amount': amount,
            'currency': currency,
            'status': 'created',
        }

        logger.info(f'Mock Razorpay order created: {order}')
        return order

    async def verify_payment(self, payment_id: str) -> bool:
        logger.info(f'Mock payment verified: {payment_id}')
        return True


class BillingManager:
    """Manages subscriptions and billing"""

    def __init__(self, use_mock: bool = True):
        self.use_mock = use_mock
        self.mock_client = MockRazorpayClient()

    async def create_subscription(self, tenant_id: str, plan: str, billing_cycle: str) -> Dict:
        plan_pricing = {
            'Sandbox': 0,
            'Starter': 999,
            'Pro': 4999,
            'Enterprise': 19999,
        }

        amount = plan_pricing.get(plan, 0)

        if self.use_mock:
            order = await self.mock_client.create_order(amount)
        else:
            raise NotImplementedError('Real Razorpay integration not implemented')

        logger.info(f'Subscription created for {tenant_id}: {plan}')
        return order

    async def purchase_credits(self, tenant_id: str, amount: int) -> Dict:
        if self.use_mock:
            order = await self.mock_client.create_order(amount)
        else:
            raise NotImplementedError('Real Razorpay integration not implemented')

        logger.info(f'Credits purchased for {tenant_id}: {amount}')
        return order

    async def handle_payment_success(self, payment_id: str, tenant_id: str, plan: str):
        query = """
            UPDATE tenants
            SET subscription_tier = $1,
                billing_cycle_start = $2,
                billing_cycle_end = $3,
                monthly_quota = $4
            WHERE tenant_id = $5
        """

        plan_quotas = {
            'Sandbox': 3,
            'Starter': 100,
            'Pro': 1000,
            'Enterprise': 10000,
        }

        start_date = datetime.utcnow().date()
        end_date = start_date + timedelta(days=30)
        quota = plan_quotas.get(plan, 3)

        await db_manager.execute_query(
            query,
            plan,
            start_date,
            end_date,
            quota,
            tenant_id,
        )
        await update_environment_quota(
            tenant_id,
            PRODUCTION_ENVIRONMENT,
            absolute_monthly_quota=quota,
            absolute_current_usage=0,
        )

        logger.info(f'Payment success: {tenant_id} upgraded to {plan}')

    async def handle_payment_failure(self, payment_id: str, tenant_id: str):
        query = """
            UPDATE tenants
            SET subscription_tier = 'Sandbox', monthly_quota = 3
            WHERE tenant_id = $1
        """

        await db_manager.execute_query(query, tenant_id)
        await update_environment_quota(
            tenant_id,
            PRODUCTION_ENVIRONMENT,
            absolute_monthly_quota=3,
            absolute_current_usage=0,
        )
        logger.warning(f'Payment failed: {tenant_id} downgraded to Sandbox')

    async def upgrade_plan(self, tenant_id: str, new_plan: str):
        await self.handle_payment_success('mock_payment', tenant_id, new_plan)

    async def downgrade_plan(self, tenant_id: str, new_plan: str):
        await self.handle_payment_success('mock_payment', tenant_id, new_plan)


quota_manager = UsageQuotaManager()
billing_manager = BillingManager(use_mock=True)
