"""
Authentication Tests - Unit and Property-Based
"""
import re

import pytest
from hypothesis import given, settings, strategies as st

from app.auth import api_key_manager, local_auth_manager


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

    @given(email=st.emails(), password=st.text(min_size=6, max_size=100))
    @settings(max_examples=50, deadline=None)
    @pytest.mark.asyncio
    async def test_property_signup_login_roundtrip(self, email, password):
        """Property: Any valid email/password can signup and login"""
        local_auth_manager.users.clear()

        try:
            user = await local_auth_manager.signup(email, password)
            assert user["email"] == email

            result = await local_auth_manager.login(email, password)
            assert result["user"]["email"] == email
            assert "access_token" in result
        except Exception as exc:
            pytest.fail(f"Unexpected exception: {exc}")

    @given(password=st.text(min_size=6, max_size=100))
    @settings(max_examples=50, deadline=None)
    @pytest.mark.asyncio
    async def test_property_password_hashing_consistency(self, password):
        """Property 18: Password hashing is consistent"""
        hash1 = local_auth_manager.hash_password(password)
        hash2 = local_auth_manager.hash_password(password)

        assert hash1 == hash2
        assert local_auth_manager.verify_password(password, hash1)


class TestAPIKeys:
    """API key management tests for the database-backed APIKeyManager"""

    @pytest.mark.asyncio
    async def test_generate_api_key(self):
        """Test API key generation stores hashed secret in DB"""
        from unittest.mock import AsyncMock, patch

        tenant_id = "test-tenant-123"
        environment = "sandbox"

        with patch("app.auth.db_manager") as mock_db, patch("app.auth.ensure_tenant_environments", new=AsyncMock()), patch(
            "app.auth.get_tenant_environment",
            new=AsyncMock(return_value={"environment_id": "env-123", "slug": environment}),
        ):
            mock_db.fetch_val = AsyncMock(return_value=0)
            mock_db.execute_query = AsyncMock(return_value="INSERT")

            key = await api_key_manager.generate_key(tenant_id, environment)

        assert key["api_key"].startswith(f"vp_{environment}_")
        assert key["environment"] == environment
        assert key["key_id"] is not None
        mock_db.execute_query.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_validate_api_key(self):
        """Test API key validation looks up hashed secret in DB"""
        from unittest.mock import AsyncMock, patch

        tenant_id = "test-tenant-123"
        raw_token = "vp_sandbox_abcdef1234567890abcdef1234567890"

        with patch("app.auth.db_manager") as mock_db:
            mock_db.fetch_one = AsyncMock(
                return_value={
                    "tenant_id": tenant_id,
                    "environment": "sandbox",
                    "tenant_environment_id": "env-123",
                }
            )

            validated_tenant, env, environment_id = await api_key_manager.validate_key(raw_token)

        assert validated_tenant == tenant_id
        assert env == "sandbox"
        assert environment_id == "env-123"
        mock_db.fetch_one.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_validate_invalid_api_key_raises(self):
        """Test validation of non-existent key raises ValueError"""
        from unittest.mock import AsyncMock, patch

        with patch("app.auth.db_manager") as mock_db:
            mock_db.fetch_one = AsyncMock(return_value=None)

            with pytest.raises(ValueError, match="Invalid or revoked API key"):
                await api_key_manager.validate_key("vp_sandbox_invalid")

    @pytest.mark.asyncio
    async def test_revoke_api_key(self):
        """Test API key revocation updates DB"""
        from unittest.mock import AsyncMock, patch

        key_id = "test-key-id-123"

        with patch("app.auth.db_manager") as mock_db:
            mock_db.fetch_one = AsyncMock(return_value={"tenant_id": "test-tenant-123"})

            await api_key_manager.revoke_key(key_id)

            mock_db.fetch_one.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_revoke_nonexistent_key_raises(self):
        """Test revoking a non-existent key raises ValueError"""
        from unittest.mock import AsyncMock, patch

        with patch("app.auth.db_manager") as mock_db:
            mock_db.fetch_one = AsyncMock(return_value=None)

            with pytest.raises(ValueError, match="API key not found or already revoked"):
                await api_key_manager.revoke_key("nonexistent-key")

    @pytest.mark.asyncio
    async def test_generate_api_key_quota_exceeded(self):
        """Test API key generation fails when quota is exceeded"""
        from unittest.mock import AsyncMock, patch

        with patch("app.auth.db_manager") as mock_db, patch("app.auth.ensure_tenant_environments", new=AsyncMock()), patch(
            "app.auth.get_tenant_environment",
            new=AsyncMock(return_value={"environment_id": "env-123", "slug": "sandbox"}),
        ):
            mock_db.fetch_val = AsyncMock(return_value=5)

            with pytest.raises(ValueError, match="Maximum limit of 5 active API keys reached for sandbox"):
                await api_key_manager.generate_key("tenant-123", "sandbox")


class TestPropertyBasedAPIKeys:
    """Property-based tests for API keys"""

    @given(tenant_id=st.uuids().map(str), environment=st.sampled_from(["sandbox", "production"]))
    @settings(max_examples=50, deadline=None)
    @pytest.mark.asyncio
    async def test_property_api_key_format(self, tenant_id, environment):
        """Property 20: API keys follow correct format"""
        from unittest.mock import AsyncMock, patch

        async def fake_environment(_tenant_id, slug=None):
            return {"environment_id": f"env-{slug}", "slug": slug}

        with patch("app.auth.db_manager") as mock_db, patch("app.auth.ensure_tenant_environments", new=AsyncMock()), patch(
            "app.auth.get_tenant_environment",
            new=AsyncMock(side_effect=fake_environment),
        ):
            mock_db.fetch_val = AsyncMock(return_value=0)
            mock_db.execute_query = AsyncMock(return_value="INSERT")

            key = await api_key_manager.generate_key(tenant_id, environment)

        pattern = rf"^vp_{environment}_[a-f0-9]{{32}}$"
        assert re.match(pattern, key["api_key"])

    @given(tenant_id=st.uuids().map(str), environment=st.sampled_from(["sandbox", "production"]))
    @settings(max_examples=20, deadline=None)
    @pytest.mark.asyncio
    async def test_property_generate_validate_roundtrip(self, tenant_id, environment):
        """Property: Generated keys can be validated back to the same tenant"""
        from unittest.mock import AsyncMock, patch

        async def fake_environment(_tenant_id, slug=None):
            return {"environment_id": f"env-{slug}", "slug": slug}

        with patch("app.auth.db_manager") as mock_db, patch("app.auth.ensure_tenant_environments", new=AsyncMock()), patch(
            "app.auth.get_tenant_environment",
            new=AsyncMock(side_effect=fake_environment),
        ):
            mock_db.fetch_val = AsyncMock(return_value=0)
            mock_db.execute_query = AsyncMock(return_value="INSERT")

            key = await api_key_manager.generate_key(tenant_id, environment)

        with patch("app.auth.db_manager") as mock_db:
            mock_db.fetch_one = AsyncMock(
                return_value={
                    "tenant_id": tenant_id,
                    "environment": environment,
                    "tenant_environment_id": f"env-{environment}",
                }
            )

            validated_tenant, env, environment_id = await api_key_manager.validate_key(key["api_key"])

        assert validated_tenant == tenant_id
        assert env == environment
        assert environment_id == f"env-{environment}"
