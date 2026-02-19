from typing import Dict, Optional
from datetime import datetime, timedelta
import logging
from app.database import db_manager

logger = logging.getLogger(__name__)


class UsageQuotaManager:
    """Manages usage quotas and billing"""
    
    async def check_quota(self, tenant_id: str) -> bool:
        """Check if tenant has remaining quota"""
        query = """
            SELECT monthly_quota, current_usage
            FROM tenants
            WHERE tenant_id = $1
        """
        
        result = await db_manager.fetch_one(query, tenant_id)
        
        if not result:
            logger.warning(f"Tenant not found in database: {tenant_id} - allowing for development")
            # In development, if tenant doesn't exist in DB, allow the request
            # This handles the case where in-memory auth creates users but DB sync fails
            return True
        
        has_quota = result['current_usage'] < result['monthly_quota']
        
        logger.info(
            f"Quota check for {tenant_id}: "
            f"{result['current_usage']}/{result['monthly_quota']} - "
            f"{'Available' if has_quota else 'Exhausted'}"
        )
        
        return has_quota
    
    async def decrement_quota(self, tenant_id: str):
        """Decrement usage quota"""
        query = """
            UPDATE tenants
            SET current_usage = current_usage + 1
            WHERE tenant_id = $1
            RETURNING current_usage, monthly_quota
        """
        
        result = await db_manager.fetch_one(query, tenant_id)
        
        if result:
            logger.info(
                f"Quota decremented for {tenant_id}: "
                f"{result['current_usage']}/{result['monthly_quota']}"
            )
            
            # Check if alert thresholds reached
            usage_pct = (result['current_usage'] / result['monthly_quota']) * 100
            
            if usage_pct >= 100:
                await self.send_quota_alert(tenant_id, 100)
            elif usage_pct >= 80:
                await self.send_quota_alert(tenant_id, 80)
        else:
            logger.warning(f"Tenant not found for quota decrement: {tenant_id} - skipping for development")
    
    async def get_usage_stats(self, tenant_id: str) -> Dict:
        """Get current usage statistics"""
        query = """
            SELECT 
                tenant_id,
                subscription_tier,
                monthly_quota,
                current_usage,
                billing_cycle_start,
                billing_cycle_end
            FROM tenants
            WHERE tenant_id = $1
        """
        
        result = await db_manager.fetch_one(query, tenant_id)
        
        if not result:
            # Return default values for development when tenant not in DB
            logger.warning(f"Tenant not found in database: {tenant_id} - returning default values for development")
            return {
                "tenant_id": tenant_id,
                "subscription_tier": "Sandbox",
                "monthly_quota": 100,
                "current_usage": 0,
                "remaining_quota": 100,
                "billing_cycle_start": datetime.utcnow().date().isoformat(),
                "billing_cycle_end": (datetime.utcnow() + timedelta(days=30)).date().isoformat(),
                "usage_percentage": 0.0
            }
        
        remaining_quota = result['monthly_quota'] - result['current_usage']
        usage_percentage = (result['current_usage'] / result['monthly_quota']) * 100
        
        return {
            "tenant_id": result['tenant_id'],
            "subscription_tier": result['subscription_tier'],
            "monthly_quota": result['monthly_quota'],
            "current_usage": result['current_usage'],
            "remaining_quota": remaining_quota,
            "billing_cycle_start": result['billing_cycle_start'],
            "billing_cycle_end": result['billing_cycle_end'],
            "usage_percentage": round(usage_percentage, 2)
        }
    
    async def reset_monthly_quotas(self):
        """Background task to reset quotas on billing cycle"""
        query = """
            UPDATE tenants
            SET current_usage = 0
            WHERE billing_cycle_end <= $1
        """
        
        result = await db_manager.execute_query(query, datetime.utcnow().date())
        logger.info(f"Monthly quotas reset: {result}")
    
    async def send_quota_alert(self, tenant_id: str, percentage: int):
        """Send email alert at 80% and 100% usage"""
        # In production, this would send actual emails
        logger.warning(
            f"QUOTA ALERT: Tenant {tenant_id} has reached {percentage}% usage"
        )


class MockRazorpayClient:
    """Mock Razorpay client for local development"""
    
    async def create_order(self, amount: int, currency: str = "INR") -> Dict:
        """Create mock payment order"""
        import uuid
        
        order = {
            "id": f"order_{uuid.uuid4().hex[:12]}",
            "amount": amount,
            "currency": currency,
            "status": "created"
        }
        
        logger.info(f"Mock Razorpay order created: {order}")
        return order
    
    async def verify_payment(self, payment_id: str) -> bool:
        """Verify mock payment (always succeeds)"""
        logger.info(f"Mock payment verified: {payment_id}")
        return True


class BillingManager:
    """Manages subscriptions and billing"""
    
    def __init__(self, use_mock: bool = True):
        self.use_mock = use_mock
        self.mock_client = MockRazorpayClient()
    
    async def create_subscription(
        self,
        tenant_id: str,
        plan: str,
        billing_cycle: str
    ) -> Dict:
        """Create Razorpay subscription"""
        # Define plan pricing
        plan_pricing = {
            "Sandbox": 0,
            "Starter": 999,  # INR per month
            "Pro": 4999,
            "Enterprise": 19999
        }
        
        amount = plan_pricing.get(plan, 0)
        
        if self.use_mock:
            order = await self.mock_client.create_order(amount)
        else:
            raise NotImplementedError("Real Razorpay integration not implemented")
        
        logger.info(f"Subscription created for {tenant_id}: {plan}")
        return order
    
    async def purchase_credits(self, tenant_id: str, amount: int) -> Dict:
        """Create Razorpay order for credit purchase"""
        if self.use_mock:
            order = await self.mock_client.create_order(amount)
        else:
            raise NotImplementedError("Real Razorpay integration not implemented")
        
        logger.info(f"Credits purchased for {tenant_id}: {amount}")
        return order
    
    async def handle_payment_success(self, payment_id: str, tenant_id: str, plan: str):
        """Handle successful payment webhook"""
        # Update tenant subscription
        query = """
            UPDATE tenants
            SET 
                subscription_tier = $1,
                billing_cycle_start = $2,
                billing_cycle_end = $3,
                monthly_quota = $4
            WHERE tenant_id = $5
        """
        
        # Define quotas
        plan_quotas = {
            "Sandbox": 3,
            "Starter": 100,
            "Pro": 1000,
            "Enterprise": 10000
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
            tenant_id
        )
        
        logger.info(f"Payment success: {tenant_id} upgraded to {plan}")
    
    async def handle_payment_failure(self, payment_id: str, tenant_id: str):
        """Handle failed payment, downgrade to sandbox"""
        query = """
            UPDATE tenants
            SET subscription_tier = 'Sandbox', monthly_quota = 3
            WHERE tenant_id = $1
        """
        
        await db_manager.execute_query(query, tenant_id)
        logger.warning(f"Payment failed: {tenant_id} downgraded to Sandbox")
    
    async def upgrade_plan(self, tenant_id: str, new_plan: str):
        """Upgrade subscription tier"""
        await self.handle_payment_success("mock_payment", tenant_id, new_plan)
    
    async def downgrade_plan(self, tenant_id: str, new_plan: str):
        """Downgrade subscription tier"""
        await self.handle_payment_success("mock_payment", tenant_id, new_plan)


# Global instances
quota_manager = UsageQuotaManager()
billing_manager = BillingManager(use_mock=True)
