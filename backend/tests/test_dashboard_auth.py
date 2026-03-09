import pytest
from starlette.requests import Request
from starlette.responses import Response

from app.dashboard_auth import dashboard_session_manager, AuthContext


@pytest.mark.asyncio
async def test_dashboard_session_manager_sets_cookies_and_reads_memory_session():
    response = Response()
    session = await dashboard_session_manager.create_session(
        response,
        user_id='user-123',
        tenant_id='tenant-123',
        email='user@example.com',
        roles={'org_admin'},
        permissions={'sessions.read'},
    )

    session_cookie_header = response.headers.getlist('set-cookie')[0]
    csrf_cookie_header = response.headers.getlist('set-cookie')[1]
    session_secret = session_cookie_header.split('=', 1)[1].split(';', 1)[0]
    csrf_token = csrf_cookie_header.split('=', 1)[1].split(';', 1)[0]

    scope = {
        'type': 'http',
        'method': 'GET',
        'headers': [],
        'path': '/api/v1/auth/session',
    }
    request = Request(scope)
    request._cookies = {
        'vp_session': session_secret,
        'vp_csrf': csrf_token,
    }

    loaded = await dashboard_session_manager.get_session_from_request(request)
    assert loaded is not None
    assert loaded['tenant_id'] == 'tenant-123'
    assert loaded['user_id'] == 'user-123'


@pytest.mark.asyncio
async def test_dashboard_session_manager_validates_ws_token():
    token = dashboard_session_manager.create_ws_token('session-123', 'tenant-123')
    assert dashboard_session_manager.verify_ws_token('session-123', 'tenant-123', token) is True
    assert dashboard_session_manager.verify_ws_token('session-xyz', 'tenant-123', token) is False
