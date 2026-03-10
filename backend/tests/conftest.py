"""
Pytest configuration and fixtures for VeraProof AI tests
"""
from typing import AsyncGenerator

import pytest
from httpx import AsyncClient

from app.auth import api_key_manager, local_auth_manager
from app.database import db_manager
from app.main import app


@pytest.fixture(scope="function")
async def client() -> AsyncGenerator[AsyncClient, None]:
    """Create test client"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


@pytest.fixture(scope="function")
async def test_user():
    """Create test user and return credentials"""
    email = "test@veraproof.ai"
    password = "test123"

    local_auth_manager.users.clear()

    user = await local_auth_manager.signup(email, password)

    yield {
        "email": email,
        "password": password,
        "user_id": user["user_id"],
        "tenant_id": user["tenant_id"],
    }

    local_auth_manager.users.clear()


@pytest.fixture(scope="function")
async def auth_token(test_user):
    """Get JWT token for test user"""
    result = await local_auth_manager.login(test_user["email"], test_user["password"])
    return result["access_token"]


@pytest.fixture(scope="function")
async def api_key(test_user):
    """Generate API key for test user"""
    key = await api_key_manager.generate_key(test_user["tenant_id"], "sandbox")

    yield key["api_key"]

    api_key_manager.api_keys.clear()


@pytest.fixture(scope="function")
async def db_connection():
    """Database connection for tests"""
    await db_manager.connect()
    yield db_manager
    await db_manager.disconnect()
