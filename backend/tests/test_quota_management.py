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
        """Test quota check when quota is available"""
        tenant_id = str(uuid.uuid4())
        
        # Set quota
        await quota_manager.set_quota(tenant_id, 100)
        await quota_manager.set_usage(tenant_id, 50)
        
        has_quota = await quota_manager.check_quota(tenant_id)
        assert has_quota is True
    
    @pytest.mark.asyncio
    async def test_check_quota_exceeded(self):
        """Test quota check when quota is exceeded"""
        tenant_id = str(uuid.uuid4())
        
        # Set quota
        await quota_manager.set_quota(tenant_id, 100)
        await quota_manager.set_usage(tenant_id, 100)
        
        has_quota = await quota_manager.check_quota(tenant_id)
        assert has_quota is False
    
    @pytest.mark.asyncio
    async def test_decrement_quota(self):
        """Test quota decrement"""
        tenant_id = str(uuid.uuid4())
        
        await quota_manager.set_quota(tenant_id, 100)
        await quota_manager.set_usage(tenant_id, 50)
        
        await quota_manager.decrement_quota(tenant_id)
        
        stats = await quota_manager.get_usage_stats(tenant_id)
        assert stats["current_usage"] == 51
    
    @pytest.mark.asyncio
    async def test_reset_monthly_quota(self):
        """Test monthly quota reset"""
        tenant_id = str(uuid.uuid4())
        
        await quota_manager.set_quota(tenant_id, 100)
        await quota_manager.set_usage(tenant_id, 75)
        
        await quota_manager.reset_monthly_quotas()
        
        stats = await quota_manager.get_usage_stats(tenant_id)
        assert stats["current_usage"] == 0


class TestPropertyBasedQuota:
    """Property-based tests for quota management"""
    
    @given(
        tenant_id=st.uuids().map(str),
        quota=st.integers(min_value=1, max_value=10000),
        usage=st.integers(min_value=0, max_value=10000)
    )
    @settings(max_examples=50, deadline=None)
    @pytest.mark.asyncio
    async def test_property_quota_enforcement(self, tenant_id, quota, usage):
        """Property 23: Quota enforcement is correct"""
        await quota_manager.set_quota(tenant_id, quota)
        await quota_manager.set_usage(tenant_id, usage)
        
        has_quota = await quota_manager.check_quota(tenant_id)
        
        # Should have quota if usage < quota
        if usage < quota:
            assert has_quota is True
        else:
            assert has_quota is False
    
    @given(
        tenant_id=st.uuids().map(str),
        initial_usage=st.integers(min_value=0, max_value=100),
        decrements=st.integers(min_value=1, max_value=10)
    )
    @settings(max_examples=30, deadline=None)
    @pytest.mark.asyncio
    async def test_property_quota_decrement(self, tenant_id, initial_usage, decrements):
        """Property 22: Quota decrement is accurate"""
        await quota_manager.set_quota(tenant_id, 1000)
        await quota_manager.set_usage(tenant_id, initial_usage)
        
        # Decrement multiple times
        for _ in range(decrements):
            await quota_manager.decrement_quota(tenant_id)
        
        stats = await quota_manager.get_usage_stats(tenant_id)
        expected_usage = initial_usage + decrements
        
        assert stats["current_usage"] == expected_usage
    
    @given(
        tenant_id=st.uuids().map(str),
        quota=st.integers(min_value=100, max_value=10000)
    )
    @settings(max_examples=30, deadline=None)
    @pytest.mark.asyncio
    async def test_property_monthly_quota_reset(self, tenant_id, quota):
        """Property 24: Monthly quota reset works correctly"""
        await quota_manager.set_quota(tenant_id, quota)
        await quota_manager.set_usage(tenant_id, quota - 10)
        
        # Reset
        await quota_manager.reset_monthly_quotas()
        
        stats = await quota_manager.get_usage_stats(tenant_id)
        
        # Usage should be reset to 0
        assert stats["current_usage"] == 0
        # Quota should remain unchanged
        assert stats["monthly_quota"] == quota


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
