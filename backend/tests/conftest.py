"""
Pytest configuration and fixtures for VeraProof AI tests
"""
import pytest
import asyncio
from typing import AsyncGenerator
from httpx import AsyncClient
from app.main import app
from app.database import db_manager
from app.auth import local_auth_manager, api_key_manager


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


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
    
    # Clear existing users
    local_auth_manager.users.clear()
    
    # Create user
    user = await local_auth_manager.signup(email, password)
    
    yield {
        "email": email,
        "password": password,
        "user_id": user["user_id"],
        "tenant_id": user["tenant_id"]
    }
    
    # Cleanup
    local_auth_manager.users.clear()


@pytest.fixture(scope="function")
async def auth_token(test_user):
    """Get JWT token for test user"""
    result = await local_auth_manager.login(
        test_user["email"],
        test_user["password"]
    )
    return result["access_token"]


@pytest.fixture(scope="function")
async def api_key(test_user):
    """Generate API key for test user"""
    key = await api_key_manager.generate_key(
        test_user["tenant_id"],
        "sandbox"
    )
    
    yield key["api_key"]
    
    # Cleanup
    api_key_manager.api_keys.clear()


@pytest.fixture(scope="function")
async def db_connection():
    """Database connection for tests"""
    await db_manager.connect()
    yield db_manager
    await db_manager.disconnect()
