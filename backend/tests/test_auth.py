"""
Authentication Tests - Unit and Property-Based
"""
import pytest
from hypothesis import given, strategies as st, settings
from app.auth import local_auth_manager, api_key_manager
import re


class TestAuthentication:
    """Unit tests for authentication"""
    
    @pytest.mark.asyncio
    async def test_signup_creates_user(self):
        """Test user signup creates user with correct fields"""
        local_auth_manager.users.clear()
        
        email = "newuser@test.com"
        password = "password123"
        
        user = await local_auth_manager.signup(email, password)
        
        assert user["email"] == email
        assert user["user_id"] is not None
        assert user["tenant_id"] is not None
        assert user["role"] == "Admin"
        assert email in local_auth_manager.users
    
    @pytest.mark.asyncio
    async def test_signup_duplicate_email_fails(self):
        """Test signup with existing email fails"""
        local_auth_manager.users.clear()
        
        email = "duplicate@test.com"
        password = "password123"
        
        await local_auth_manager.signup(email, password)
        
        with pytest.raises(ValueError, match="User already exists"):
            await local_auth_manager.signup(email, password)
    
    @pytest.mark.asyncio
    async def test_login_with_valid_credentials(self):
        """Test login with valid credentials returns tokens"""
        local_auth_manager.users.clear()
        
        email = "user@test.com"
        password = "password123"
        
        await local_auth_manager.signup(email, password)
        result = await local_auth_manager.login(email, password)
        
        assert "access_token" in result
        assert "refresh_token" in result
        assert result["token_type"] == "bearer"
        assert result["user"]["email"] == email
    
    @pytest.mark.asyncio
    async def test_login_with_invalid_credentials(self):
        """Test login with invalid credentials fails"""
        local_auth_manager.users.clear()
        
        email = "user@test.com"
        password = "password123"
        
        await local_auth_manager.signup(email, password)
        
        with pytest.raises(ValueError, match="Invalid credentials"):
            await local_auth_manager.login(email, "wrongpassword")
    
    @pytest.mark.asyncio
    async def test_jwt_token_verification(self):
        """Test JWT token can be verified"""
        local_auth_manager.users.clear()
        
        email = "user@test.com"
        password = "password123"
        
        await local_auth_manager.signup(email, password)
        result = await local_auth_manager.login(email, password)
        
        payload = await local_auth_manager.verify_jwt(result["access_token"])
        
        assert payload["email"] == email
        assert payload["type"] == "access"
        assert "exp" in payload


class TestPropertyBasedAuth:
    """Property-based tests for authentication"""
    
    @given(
        email=st.emails(),
        password=st.text(min_size=6, max_size=100)
    )
    @settings(max_examples=50, deadline=None)
    @pytest.mark.asyncio
    async def test_property_signup_login_roundtrip(self, email, password):
        """Property: Any valid email/password can signup and login"""
        local_auth_manager.users.clear()
        
        try:
            # Signup
            user = await local_auth_manager.signup(email, password)
            assert user["email"] == email
            
            # Login
            result = await local_auth_manager.login(email, password)
            assert result["user"]["email"] == email
            assert "access_token" in result
        except Exception as e:
            # Should not raise unexpected exceptions
            pytest.fail(f"Unexpected exception: {e}")
    
    @given(password=st.text(min_size=6, max_size=100))
    @settings(max_examples=50, deadline=None)
    @pytest.mark.asyncio
    async def test_property_password_hashing_consistency(self, password):
        """Property 18: Password hashing is consistent"""
        hash1 = local_auth_manager.hash_password(password)
        hash2 = local_auth_manager.hash_password(password)
        
        # Same password should produce same hash
        assert hash1 == hash2
        
        # Verification should work
        assert local_auth_manager.verify_password(password, hash1)


class TestAPIKeys:
    """API Key management tests"""
    
    @pytest.mark.asyncio
    async def test_generate_api_key(self):
        """Test API key generation"""
        api_key_manager.api_keys.clear()
        
        tenant_id = "test-tenant-123"
        environment = "sandbox"
        
        key = await api_key_manager.generate_key(tenant_id, environment)
        
        assert key["api_key"].startswith(f"vp_{environment}_")
        assert key["environment"] == environment
        assert key["key_id"] is not None
    
    @pytest.mark.asyncio
    async def test_validate_api_key(self):
        """Test API key validation"""
        api_key_manager.api_keys.clear()
        
        tenant_id = "test-tenant-123"
        key = await api_key_manager.generate_key(tenant_id, "sandbox")
        
        validated_tenant, env = await api_key_manager.validate_key(key["api_key"])
        
        assert validated_tenant == tenant_id
        assert env == "sandbox"
    
    @pytest.mark.asyncio
    async def test_revoke_api_key(self):
        """Test API key revocation"""
        api_key_manager.api_keys.clear()
        
        tenant_id = "test-tenant-123"
        key = await api_key_manager.generate_key(tenant_id, "sandbox")
        
        await api_key_manager.revoke_key(key["key_id"])
        
        with pytest.raises(ValueError, match="Invalid or revoked API key"):
            await api_key_manager.validate_key(key["api_key"])


class TestPropertyBasedAPIKeys:
    """Property-based tests for API keys"""
    
    @given(
        tenant_id=st.uuids().map(str),
        environment=st.sampled_from(["sandbox", "production"])
    )
    @settings(max_examples=50, deadline=None)
    @pytest.mark.asyncio
    async def test_property_api_key_format(self, tenant_id, environment):
        """Property 20: API keys follow correct format"""
        api_key_manager.api_keys.clear()
        
        key = await api_key_manager.generate_key(tenant_id, environment)
        
        # Check format: vp_{environment}_{hex}
        pattern = rf"^vp_{environment}_[a-f0-9]{{32}}$"
        assert re.match(pattern, key["api_key"])
        
        # Validate returns correct tenant
        validated_tenant, env = await api_key_manager.validate_key(key["api_key"])
        assert validated_tenant == tenant_id
        assert env == environment
