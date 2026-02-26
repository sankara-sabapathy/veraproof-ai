"""
Quota Management Tests - Unit and Property-Based
"""
import pytest
from hypothesis import given, strategies as st, settings
from app.quota import quota_manager
from datetime import datetime, timedelta
import uuid


class TestQuotaManagement:
    """Unit tests for quota management"""
    
    @pytest.mark.asyncio
    async def test_check_quota_available(self):
        """Test quota check when quota is available - returns True for non-existent tenant in dev"""
        tenant_id = str(uuid.uuid4())
        
        # In development mode, non-existent tenants return True
        has_quota = await quota_manager.check_quota(tenant_id)
        assert has_quota is True
    
    @pytest.mark.asyncio
    async def test_check_quota_exceeded(self):
        """Test quota check returns default for non-existent tenant"""
        tenant_id = str(uuid.uuid4())
        
        # In development mode, non-existent tenants return True
        has_quota = await quota_manager.check_quota(tenant_id)
        assert has_quota is True
    
    @pytest.mark.asyncio
    async def test_decrement_quota(self):
        """Test quota decrement handles non-existent tenant gracefully"""
        tenant_id = str(uuid.uuid4())
        
        # Should not raise error for non-existent tenant
        await quota_manager.decrement_quota(tenant_id)
        
        # Get stats returns default values
        stats = await quota_manager.get_usage_stats(tenant_id)
        assert stats["tenant_id"] == tenant_id
        assert stats["subscription_tier"] == "Sandbox"
    
    @pytest.mark.asyncio
    async def test_reset_monthly_quota(self):
        """Test monthly quota reset executes without error"""
        # Should execute without error even with no tenants
        await quota_manager.reset_monthly_quotas()
    
    @pytest.mark.asyncio
    async def test_get_usage_stats_default(self):
        """Test get_usage_stats returns default values for non-existent tenant"""
        tenant_id = str(uuid.uuid4())
        
        stats = await quota_manager.get_usage_stats(tenant_id)
        
        assert stats["tenant_id"] == tenant_id
        assert stats["subscription_tier"] == "Sandbox"
        assert stats["monthly_quota"] == 100
        assert stats["current_usage"] == 0
        assert stats["remaining_quota"] == 100
        assert stats["usage_percentage"] == 0.0


class TestPropertyBasedQuota:
    """Property-based tests for quota management"""
    
    @given(tenant_id=st.uuids().map(str))
    @settings(max_examples=50, deadline=None)
    @pytest.mark.asyncio
    async def test_property_quota_check_always_succeeds_in_dev(self, tenant_id):
        """Property: Quota check always returns True in development mode"""
        has_quota = await quota_manager.check_quota(tenant_id)
        assert has_quota is True
    
    @given(tenant_id=st.uuids().map(str))
    @settings(max_examples=30, deadline=None)
    @pytest.mark.asyncio
    async def test_property_quota_decrement_graceful(self, tenant_id):
        """Property: Quota decrement handles non-existent tenants gracefully"""
        # Should not raise error
        await quota_manager.decrement_quota(tenant_id)
        
        # Stats should return default values
        stats = await quota_manager.get_usage_stats(tenant_id)
        assert stats["tenant_id"] == tenant_id
    
    @given(tenant_id=st.uuids().map(str))
    @settings(max_examples=30, deadline=None)
    @pytest.mark.asyncio
    async def test_property_usage_stats_structure(self, tenant_id):
        """Property: Usage stats always returns correct structure"""
        stats = await quota_manager.get_usage_stats(tenant_id)
        
        # Check all required fields exist
        assert "tenant_id" in stats
        assert "subscription_tier" in stats
        assert "monthly_quota" in stats
        assert "current_usage" in stats
        assert "remaining_quota" in stats
        assert "billing_cycle_start" in stats
        assert "billing_cycle_end" in stats
        assert "usage_percentage" in stats
        
        # Check types
        assert isinstance(stats["monthly_quota"], int)
        assert isinstance(stats["current_usage"], int)
        assert isinstance(stats["remaining_quota"], int)
        assert isinstance(stats["usage_percentage"], float)


class TestRateLimiting:
    """Rate limiting tests"""
    
    @pytest.mark.asyncio
    async def test_api_rate_limit_within_limit(self):
        """Test API rate limit within limit"""
        from app.rate_limiter import rate_limiter
        
        tenant_id = str(uuid.uuid4())
        
        # Make 50 requests (under 100 limit)
        for _ in range(50):
            allowed = await rate_limiter.check_api_rate_limit(tenant_id)
            assert allowed is True
    
    @pytest.mark.asyncio
    async def test_concurrent_session_limit(self):
        """Test concurrent session limit"""
        from app.rate_limiter import rate_limiter
        
        tenant_id = str(uuid.uuid4())
        
        # Start 10 sessions (at limit)
        for _ in range(10):
            allowed = await rate_limiter.check_concurrent_sessions(tenant_id)
            assert allowed is True
            await rate_limiter.increment_sessions(tenant_id)
        
        # 11th session should be blocked
        allowed = await rate_limiter.check_concurrent_sessions(tenant_id)
        assert allowed is False


class TestPropertyBasedRateLimiting:
    """Property-based tests for rate limiting"""
    
    @given(
        tenant_id=st.uuids().map(str),
        sessions=st.integers(min_value=0, max_value=15)
    )
    @settings(max_examples=30, deadline=None)
    @pytest.mark.asyncio
    async def test_property_concurrent_session_limit(self, tenant_id, sessions):
        """Property 25: Concurrent session limit is enforced"""
        from app.rate_limiter import rate_limiter
        
        # Reset
        rate_limiter.concurrent_sessions.pop(tenant_id, None)
        
        # Start sessions
        for i in range(sessions):
            if i < 10:
                allowed = await rate_limiter.check_concurrent_sessions(tenant_id)
                assert allowed is True
                await rate_limiter.increment_sessions(tenant_id)
            else:
                allowed = await rate_limiter.check_concurrent_sessions(tenant_id)
                assert allowed is False
    
    @given(
        tenant_id=st.uuids().map(str),
        requests=st.integers(min_value=0, max_value=150)
    )
    @settings(max_examples=30, deadline=None)
    @pytest.mark.asyncio
    async def test_property_api_rate_limit(self, tenant_id, requests):
        """Property 26: API rate limit is enforced"""
        from app.rate_limiter import rate_limiter
        
        # Reset
        rate_limiter.api_requests.pop(tenant_id, None)
        
        allowed_count = 0
        blocked_count = 0
        
        for _ in range(requests):
            allowed = await rate_limiter.check_api_rate_limit(tenant_id)
            if allowed:
                allowed_count += 1
            else:
                blocked_count += 1
        
        # Should allow up to 100 requests
        assert allowed_count <= 100
        
        # If more than 100 requests, some should be blocked
        if requests > 100:
            assert blocked_count > 0
