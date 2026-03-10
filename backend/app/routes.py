from fastapi import APIRouter, HTTPException, Depends, Header, WebSocket, WebSocketDisconnect, UploadFile, File, Form, Request, Response, Query
from fastapi.responses import RedirectResponse
from typing import Optional
import logging
from datetime import datetime, timedelta
from jose import JWTError, jwt
from opentelemetry import trace

from app.models import (
    AuthSessionResponse, AuthenticatedUser, CreateSessionRequest, CreateSessionResponse, LoginRequest, SignupRequest,
    ColorConfig, VerificationResult, SessionArtifactRecord
)
from app.auth import local_auth_manager, api_key_manager
from app.config import settings
from app.dashboard_auth import AuthContext, dashboard_session_manager, get_auth_context, require_authenticated_context, require_permission
from app.identity_adapter import IdentityAdapterError, get_identity_adapter
from app.session_manager import session_manager
from app.quota import quota_manager, billing_manager
from app.rate_limiter import rate_limiter
from app.branding import branding_manager
from app.webhooks import webhook_manager
from app.storage import storage_manager
from app.websocket_handler import ws_handler
from app.database import db_manager
from app.tenant_environment import DEFAULT_ENVIRONMENT, ensure_tenant_environments, list_tenant_environments, update_environment_quota

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1")


# Helper function to ensure tenant exists in database
async def ensure_tenant_exists(tenant_id: str):
    """Ensure tenant exists in database (for development with in-memory auth)"""
    from datetime import datetime, timedelta

    check_query = "SELECT tenant_id FROM tenants WHERE tenant_id = $1"
    exists = await db_manager.fetch_one(check_query, tenant_id)

    if exists:
        await ensure_tenant_environments(tenant_id)
        return

    insert_query = """
        INSERT INTO tenants (
            tenant_id, email, subscription_tier,
            monthly_quota, current_usage, billing_cycle_start, billing_cycle_end
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    """
    try:
        await db_manager.execute_query(
            insert_query,
            tenant_id,
            f"tenant_{tenant_id[:8]}@veraproof.ai",
            'Sandbox',
            1000,
            0,
            datetime.utcnow().date(),
            (datetime.utcnow() + timedelta(days=30)).date()
        )
        await ensure_tenant_environments(tenant_id)
        logger.info(f"Created tenant in database: {tenant_id}")
    except Exception as e:
        logger.warning(f"Could not create tenant: {e}")


def _current_environment_context() -> tuple[Optional[str], Optional[str]]:
    context = db_manager.get_request_context()
    return context.get('environment_id'), context.get('environment_slug')


def _serialize_environment(environment: Optional[dict]) -> Optional[dict]:
    if not environment:
        return None
    return {
        'environment_id': environment['environment_id'],
        'slug': environment['slug'],
        'display_name': environment['display_name'],
        'is_default': environment['is_default'],
        'is_billable': environment['is_billable'],
        'monthly_quota': environment['monthly_quota'],
        'current_usage': environment['current_usage'],
        'billing_cycle_start': environment['billing_cycle_start'],
        'billing_cycle_end': environment['billing_cycle_end'],
    }


# Dependency to extract tenant_id from API key
async def get_tenant_from_api_key(authorization: str = Header(...)) -> str:
    """Extract tenant_id from API key"""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    api_key = authorization.replace("Bearer ", "")

    try:
        tenant_id, environment, environment_id = await api_key_manager.validate_key(api_key)
        db_manager.set_request_context(
            tenant_id=tenant_id,
            environment_id=environment_id,
            environment_slug=environment,
            actor_type='service_account',
        )
        span = trace.get_current_span()
        if span and span.is_recording():
            span.set_attribute("tenant.id", tenant_id)
            span.set_attribute("tenant.environment", environment)

        return tenant_id
    except ValueError:
        logger.warning("Failed authentication via API Key")
        raise HTTPException(status_code=401, detail="Invalid API key")


async def get_tenant_from_jwt(context: AuthContext = Depends(require_authenticated_context)) -> str:
    return str(context.tenant_id)


async def get_tenant_and_role_from_any_auth(context: AuthContext = Depends(require_authenticated_context)) -> tuple[str, str]:
    role = next(iter(context.roles), "Admin") if context.roles else "Admin"
    return str(context.tenant_id), role


def require_tenant_permission(permission: str):
    async def _dependency(context: AuthContext = Depends(require_permission(permission))) -> str:
        return str(context.tenant_id)

    return _dependency


# Session Management Endpoints
@router.post("/sessions/create", response_model=CreateSessionResponse)
async def create_session(
    request: CreateSessionRequest,
    tenant_id: str = Depends(get_tenant_from_api_key)
):
    """Create new verification session (API key authentication)"""
    # Check rate limits
    if not await rate_limiter.check_api_rate_limit(tenant_id):
        raise HTTPException(status_code=429, detail="API rate limit exceeded")
    
    # Check quota
    if not await quota_manager.check_quota(tenant_id):
        raise HTTPException(status_code=429, detail="Usage quota exceeded")
    
    # Ensure tenant exists in database
    await ensure_tenant_exists(tenant_id)
    
    session = await session_manager.create_session(
        tenant_id=tenant_id,
        metadata=request.metadata,
        return_url=request.return_url,
        session_duration=request.session_duration,
        verification_commands=[cmd.dict() for cmd in request.verification_commands] if request.verification_commands else []
    )
    ws_token = dashboard_session_manager.create_ws_token(session["session_id"], tenant_id)
    session["ws_token"] = ws_token
    session["session_url"] = f"{session['session_url']}&ws_token={ws_token}"
    return CreateSessionResponse(**session)


@router.post("/sessions", response_model=CreateSessionResponse)
async def create_session_dashboard(
    request: CreateSessionRequest,
    tenant_id: str = Depends(require_tenant_permission("sessions.create"))
):
    """Create new verification session from dashboard (permission-gated)"""
    # Check rate limits
    if not await rate_limiter.check_api_rate_limit(tenant_id):
        logger.warning("API Rate limit exceeded", extra={"tenant_id": tenant_id})
        raise HTTPException(status_code=429, detail="API rate limit exceeded")
    
    # Check quota
    if not await quota_manager.check_quota(tenant_id):
        logger.warning("Usage quota exceeded", extra={"tenant_id": tenant_id})
        raise HTTPException(status_code=429, detail="Usage quota exceeded")
    
    # Ensure tenant exists in database
    await ensure_tenant_exists(tenant_id)
    
    session = await session_manager.create_session(
        tenant_id=tenant_id,
        metadata=request.metadata,
        return_url=request.return_url,
        session_duration=request.session_duration,
        verification_commands=[cmd.dict() for cmd in request.verification_commands] if request.verification_commands else []
    )
    ws_token = dashboard_session_manager.create_ws_token(session["session_id"], tenant_id)
    session["ws_token"] = ws_token
    session["session_url"] = f"{session['session_url']}&ws_token={ws_token}"
    logger.info("Dashboard verification session created", extra={"session_id": session['session_id'], "tenant_id": tenant_id})
    return CreateSessionResponse(**session)


@router.get("/sessions/{session_id}/ws-token")
async def issue_ws_token(session_id: str, context: AuthContext = Depends(require_permission("sessions.read"))):
    session = await session_manager.get_session(session_id, tenant_id=str(context.tenant_id))
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"ws_token": dashboard_session_manager.create_ws_token(session_id, str(context.tenant_id))}


@router.get("/sessions/{session_id}")
async def get_session(
    session_id: str,
    auth_data: tuple[str, str] = Depends(get_tenant_and_role_from_any_auth)
):
    """Get session details"""
    tenant_id, role = auth_data
    session = await session_manager.get_session(session_id, tenant_id=tenant_id)
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if str(session['tenant_id']) != str(tenant_id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return session


@router.get("/sessions/{session_id}/results")
async def get_session_results(
    session_id: str,
    auth_data: tuple[str, str] = Depends(get_tenant_and_role_from_any_auth)
):
    """Get verification results"""
    tenant_id, role = auth_data
    session = await session_manager.get_session(session_id, tenant_id=tenant_id)
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if str(session['tenant_id']) != str(tenant_id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return {
        "session_id": session['session_id'],
        "tier_1_score": session['tier_1_score'],
        "tier_2_score": session['tier_2_score'],
        "final_trust_score": session['final_trust_score'],
        "correlation_value": session['correlation_value'],
        "reasoning": session['reasoning'],
        "state": session['state']
    }


async def _get_authorized_session_for_artifacts(
    session_id: str,
    auth_data: tuple[str, str]
):
    tenant_id, role = auth_data
    session = await session_manager.get_session(session_id, tenant_id=tenant_id)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if str(session['tenant_id']) != str(tenant_id):
        raise HTTPException(status_code=403, detail="Access denied")

    return session


def _build_backend_download_url(path: str) -> str:
    base = settings.backend_url.rstrip('/')
    return f"{base}{path}"


def _build_content_disposition(filename: str, disposition: str = 'attachment') -> str:
    safe_name = (filename or 'artifact.bin').replace('"', '')
    return f'{disposition}; filename="{safe_name}"'


async def _serve_storage_object(storage_key: str, file_name: str, disposition: str = 'attachment') -> Response:
    payload, content_type, metadata = await storage_manager.load_artifact_object(storage_key)
    headers = {
        'Content-Disposition': _build_content_disposition(file_name, disposition=disposition),
        'Cache-Control': 'private, no-store',
    }
    if metadata.get('vp_encrypted') == '1':
        headers['X-VeraProof-Encryption-Mode'] = metadata.get('vp_mode', 'managed')
        if metadata.get('vp_key_id'):
            headers['X-VeraProof-Key-Id'] = metadata['vp_key_id']
    return Response(content=payload, media_type=content_type, headers=headers)


# Artifact Access Endpoints
@router.get("/sessions/{session_id}/artifacts", response_model=list[SessionArtifactRecord])
async def list_session_artifacts(
    session_id: str,
    auth_data: tuple[str, str] = Depends(get_tenant_and_role_from_any_auth)
):
    """List registered artifacts for a verification session."""
    from app.artifact_manager import artifact_manager

    tenant_id, _role = auth_data
    await _get_authorized_session_for_artifacts(session_id, auth_data)
    return await artifact_manager.list_artifacts(session_id, tenant_id=tenant_id)


@router.get("/sessions/{session_id}/report")
async def get_session_report(
    session_id: str,
    auth_data: tuple[str, str] = Depends(get_tenant_and_role_from_any_auth)
):
    """Generate or refresh the final verification report PDF and return a signed URL."""
    from app.reporting import evidence_manager

    session = await _get_authorized_session_for_artifacts(session_id, auth_data)
    artifact = await evidence_manager.generate_report(session)
    return {
        "artifact": artifact,
        "url": _build_backend_download_url(f"/api/v1/sessions/{session_id}/report/download"),
    }


@router.get("/sessions/{session_id}/artifacts/bundle")
async def get_session_artifact_bundle(
    session_id: str,
    auth_data: tuple[str, str] = Depends(get_tenant_and_role_from_any_auth)
):
    """Generate or refresh the full evidence bundle ZIP and return a signed URL."""
    from app.reporting import evidence_manager

    session = await _get_authorized_session_for_artifacts(session_id, auth_data)
    artifact = await evidence_manager.generate_bundle(session)
    return {
        "artifact": artifact,
        "url": _build_backend_download_url(f"/api/v1/sessions/{session_id}/artifacts/bundle/download"),
    }


@router.get("/sessions/{session_id}/artifacts/{artifact_id}")
async def get_session_artifact(
    session_id: str,
    artifact_id: str,
    auth_data: tuple[str, str] = Depends(get_tenant_and_role_from_any_auth)
):
    """Get session artifact metadata and a signed download URL."""
    from app.artifact_manager import artifact_manager

    await _get_authorized_session_for_artifacts(session_id, auth_data)
    tenant_id, _role = auth_data
    artifact = await artifact_manager.get_artifact(session_id, artifact_id, tenant_id=tenant_id)
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")

    return {
        "artifact": artifact,
        "url": _build_backend_download_url(f"/api/v1/sessions/{session_id}/artifacts/{artifact_id}/download"),
    }


@router.get("/sessions/{session_id}/video")
async def get_video_artifact(
    session_id: str,
    auth_data: tuple[str, str] = Depends(get_tenant_and_role_from_any_auth)
):
    """Get video artifact signed URL"""
    session = await _get_authorized_session_for_artifacts(session_id, auth_data)
    
    if not session['video_s3_key']:
        raise HTTPException(status_code=404, detail="Video artifact not found")
    
    return {"url": _build_backend_download_url(f"/api/v1/sessions/{session_id}/video/download")}


@router.get("/sessions/{session_id}/imu-data")
async def get_imu_artifact(
    session_id: str,
    auth_data: tuple[str, str] = Depends(get_tenant_and_role_from_any_auth)
):
    """Get IMU data artifact signed URL"""
    session = await _get_authorized_session_for_artifacts(session_id, auth_data)
    
    if not session['imu_data_s3_key']:
        raise HTTPException(status_code=404, detail="IMU data artifact not found")
    
    return {"url": _build_backend_download_url(f"/api/v1/sessions/{session_id}/imu-data/download")}


@router.get("/sessions/{session_id}/optical-flow")
async def get_optical_flow_artifact(
    session_id: str,
    auth_data: tuple[str, str] = Depends(get_tenant_and_role_from_any_auth)
):
    session = await _get_authorized_session_for_artifacts(session_id, auth_data)

    if not session['optical_flow_s3_key']:
        raise HTTPException(status_code=404, detail="Optical flow artifact not found")

    return {"url": _build_backend_download_url(f"/api/v1/sessions/{session_id}/optical-flow/download")}


@router.get("/sessions/{session_id}/report/download")
async def download_session_report(
    session_id: str,
    auth_data: tuple[str, str] = Depends(get_tenant_and_role_from_any_auth)
):
    from app.reporting import evidence_manager

    session = await _get_authorized_session_for_artifacts(session_id, auth_data)
    artifact = await evidence_manager.generate_report(session)
    try:
        return await _serve_storage_object(artifact['storage_key'], artifact['file_name'])
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/sessions/{session_id}/artifacts/bundle/download")
async def download_session_artifact_bundle(
    session_id: str,
    auth_data: tuple[str, str] = Depends(get_tenant_and_role_from_any_auth)
):
    from app.reporting import evidence_manager

    session = await _get_authorized_session_for_artifacts(session_id, auth_data)
    artifact = await evidence_manager.generate_bundle(session)
    try:
        return await _serve_storage_object(artifact['storage_key'], artifact['file_name'])
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/sessions/{session_id}/artifacts/{artifact_id}/download")
async def download_session_artifact(
    session_id: str,
    artifact_id: str,
    auth_data: tuple[str, str] = Depends(get_tenant_and_role_from_any_auth)
):
    from app.artifact_manager import artifact_manager

    tenant_id, _role = auth_data
    await _get_authorized_session_for_artifacts(session_id, auth_data)
    artifact = await artifact_manager.get_artifact(session_id, artifact_id, tenant_id=tenant_id)
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")

    try:
        return await _serve_storage_object(artifact['storage_key'], artifact['file_name'])
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/sessions/{session_id}/video/download")
async def download_video_artifact(
    session_id: str,
    auth_data: tuple[str, str] = Depends(get_tenant_and_role_from_any_auth)
):
    session = await _get_authorized_session_for_artifacts(session_id, auth_data)
    if not session['video_s3_key']:
        raise HTTPException(status_code=404, detail="Video artifact not found")
    try:
        return await _serve_storage_object(session['video_s3_key'], 'video.webm', disposition='inline')
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/sessions/{session_id}/imu-data/download")
async def download_imu_artifact(
    session_id: str,
    auth_data: tuple[str, str] = Depends(get_tenant_and_role_from_any_auth)
):
    session = await _get_authorized_session_for_artifacts(session_id, auth_data)
    if not session['imu_data_s3_key']:
        raise HTTPException(status_code=404, detail="IMU data artifact not found")
    try:
        return await _serve_storage_object(session['imu_data_s3_key'], 'imu_data.json', disposition='inline')
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/sessions/{session_id}/optical-flow/download")
async def download_optical_flow_artifact(
    session_id: str,
    auth_data: tuple[str, str] = Depends(get_tenant_and_role_from_any_auth)
):
    session = await _get_authorized_session_for_artifacts(session_id, auth_data)
    if not session['optical_flow_s3_key']:
        raise HTTPException(status_code=404, detail="Optical flow artifact not found")
    try:
        return await _serve_storage_object(session['optical_flow_s3_key'], 'optical_flow.json', disposition='inline')
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


# Authentication Endpoints
@router.get("/auth/providers")
async def auth_providers():
    adapter = get_identity_adapter()
    return {"google": adapter is not None, "local": settings.use_local_auth}


@router.get("/auth/google/login")
async def google_login():
    adapter = get_identity_adapter()
    if not adapter:
        raise HTTPException(status_code=503, detail="Google sign-in is not configured")

    state = adapter.issue_state()
    login_url = await adapter.build_login_url(state)
    response = RedirectResponse(login_url, status_code=302)
    response.set_cookie(
        settings.oidc_state_cookie_name,
        state,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite=settings.session_cookie_samesite,
        max_age=600,
        path="/",
    )
    return response


@router.get("/auth/google/callback")
async def google_callback(request: Request, code: Optional[str] = None, state: Optional[str] = None):
    adapter = get_identity_adapter()
    if not adapter:
        raise HTTPException(status_code=503, detail="Google sign-in is not configured")

    expected_state = request.cookies.get(settings.oidc_state_cookie_name)
    if not expected_state or state != expected_state:
        return RedirectResponse(f"{settings.frontend_dashboard_url}/auth/callback?error=state_mismatch", status_code=302)
    if not code:
        return RedirectResponse(f"{settings.frontend_dashboard_url}/auth/callback?error=missing_code", status_code=302)

    try:
        profile = await adapter.exchange_code(code)
        identity = await dashboard_session_manager.provision_external_identity(profile)
    except IdentityAdapterError as exc:
        logger.error(f"Google callback failed: {exc}")
        return RedirectResponse(f"{settings.frontend_dashboard_url}/auth/callback?error=google_auth_failed", status_code=302)

    response = RedirectResponse(f"{settings.frontend_dashboard_url}/auth/callback?status=success", status_code=302)
    response.delete_cookie(settings.oidc_state_cookie_name, path="/")
    await dashboard_session_manager.create_session(
        response,
        user_id=identity["user_id"],
        tenant_id=identity["tenant_id"],
        email=identity["email"],
        active_environment_slug=DEFAULT_ENVIRONMENT,
    )
    return response


@router.get("/auth/session", response_model=AuthSessionResponse)
async def auth_session(request: Request, context: AuthContext = Depends(get_auth_context)):
    if not context.tenant_id or not context.user_id:
        return {"authenticated": False}

    csrf_token = request.cookies.get(settings.csrf_cookie_name)
    role = next(iter(context.roles), "Admin") if context.roles else "Admin"
    available_environments = []
    active_environment = None
    if not context.is_platform_admin:
        available_environments = [_serialize_environment(env) for env in await list_tenant_environments(str(context.tenant_id))]
        active_environment = next((env for env in available_environments if env['environment_id'] == context.environment_id), None)
        if not active_environment:
            active_environment = next((env for env in available_environments if env['slug'] == context.environment_slug), None)
    return {
        "authenticated": True,
        "auth_type": context.auth_type,
        "csrf_token": csrf_token,
        "user": AuthenticatedUser(
            user_id=str(context.user_id),
            tenant_id=str(context.tenant_id),
            email=context.email or "",
            role=role,
            roles=sorted(context.roles),
            permissions=sorted(context.permissions),
        ),
        "active_environment": active_environment,
        "available_environments": available_environments,
    }


@router.get("/environments")
async def list_environments(context: AuthContext = Depends(require_authenticated_context)):
    if context.is_platform_admin:
        return []
    return [_serialize_environment(env) for env in await list_tenant_environments(str(context.tenant_id))]


@router.post("/environments/select")
async def select_environment(request: Request, payload: dict, context: AuthContext = Depends(require_authenticated_context)):
    if context.is_platform_admin:
        raise HTTPException(status_code=400, detail='Platform admins do not use tenant environments')
    environment_slug = (payload or {}).get('environment')
    if not environment_slug:
        raise HTTPException(status_code=400, detail='environment is required')
    active_environment = await dashboard_session_manager.update_session_environment(request, environment_slug)
    if not active_environment:
        raise HTTPException(status_code=401, detail='Authentication required')
    db_manager.set_request_context(
        tenant_id=str(context.tenant_id),
        environment_id=active_environment['environment_id'],
        environment_slug=active_environment['slug'],
        actor_id=context.user_id,
        actor_type=context.actor_type,
    )
    return _serialize_environment(active_environment)


@router.get("/auth/runtime-key-status")
async def get_tenant_runtime_key_status(context: AuthContext = Depends(require_permission("org.members.manage"))):
    return dashboard_session_manager.get_tenant_runtime_key_status(str(context.tenant_id))


@router.post("/auth/runtime-key")
async def set_tenant_runtime_key(payload: dict, context: AuthContext = Depends(require_permission("org.members.manage"))):
    passphrase = (payload or {}).get("passphrase")
    if not passphrase:
        raise HTTPException(status_code=400, detail="passphrase is required")
    dashboard_session_manager.set_tenant_runtime_key(str(context.tenant_id), passphrase)
    return dashboard_session_manager.get_tenant_runtime_key_status(str(context.tenant_id))


@router.delete("/auth/runtime-key")
async def clear_tenant_runtime_key(context: AuthContext = Depends(require_permission("org.members.manage"))):
    dashboard_session_manager.clear_tenant_runtime_key(str(context.tenant_id))
    return {"status": "cleared"}

def _assert_same_org(org_id: str, context: AuthContext):
    if str(context.tenant_id) != str(org_id):
        raise HTTPException(status_code=403, detail="Access denied")


@router.get("/orgs/{org_id}/roles")
async def list_org_roles(org_id: str, context: AuthContext = Depends(require_permission("org.members.manage"))):
    _assert_same_org(org_id, context)
    query = """
        SELECT r.role_slug, r.description, r.is_platform_role,
               COALESCE(array_agg(rp.permission_slug ORDER BY rp.permission_slug)
                        FILTER (WHERE rp.permission_slug IS NOT NULL), '{}') AS permissions
        FROM roles r
        LEFT JOIN role_permissions rp ON rp.role_slug = r.role_slug
        WHERE r.is_platform_role = FALSE
        GROUP BY r.role_slug, r.description, r.is_platform_role
        ORDER BY r.role_slug
    """
    return await db_manager.fetch_all(query, tenant_id=str(context.tenant_id))


@router.get("/orgs/{org_id}/members")
async def list_org_members(org_id: str, context: AuthContext = Depends(require_permission("org.members.manage"))):
    _assert_same_org(org_id, context)
    query = """
        SELECT om.membership_id, om.org_id, om.user_id, om.role_slug, om.status,
               om.created_at, om.updated_at, u.email, u.full_name
        FROM org_memberships om
        JOIN users u ON u.user_id = om.user_id
        WHERE om.org_id = $1
        ORDER BY u.email ASC
    """
    return await db_manager.fetch_all(query, org_id, tenant_id=str(context.tenant_id))


@router.get("/orgs/{org_id}/invitations")
async def list_org_invitations(org_id: str, context: AuthContext = Depends(require_permission("org.members.manage"))):
    _assert_same_org(org_id, context)
    query = """
        SELECT invitation_id, org_id, tenant_id, email, scope, role_slug, status,
               created_at, updated_at, expires_at, accepted_at, revoked_at
        FROM user_invitations
        WHERE org_id = $1 AND scope = 'organization'
        ORDER BY created_at DESC
    """
    return await db_manager.fetch_all(query, org_id, tenant_id=str(context.tenant_id))


@router.post("/orgs/{org_id}/invitations")
async def create_org_invitation(
    org_id: str,
    payload: dict,
    context: AuthContext = Depends(require_permission("org.members.manage"))
):
    import uuid

    _assert_same_org(org_id, context)
    email = ((payload or {}).get('email') or '').strip().lower()
    role_slug = (payload or {}).get('role_slug') or 'org_viewer'
    if not email:
        raise HTTPException(status_code=400, detail='email is required')

    role_record = await db_manager.fetch_one(
        "SELECT role_slug, is_platform_role FROM roles WHERE role_slug = $1",
        role_slug,
        tenant_id=str(context.tenant_id),
    )
    if not role_record or role_record.get('is_platform_role'):
        raise HTTPException(status_code=400, detail='Invalid organization role')

    existing_user = await db_manager.fetch_one(
        "SELECT user_id, tenant_id FROM users WHERE email = $1",
        email,
        tenant_id=str(context.tenant_id),
    )
    if existing_user and str(existing_user['tenant_id']) != str(context.tenant_id):
        raise HTTPException(status_code=400, detail='This email already belongs to a different tenant')

    existing_invitation = await db_manager.fetch_one(
        """
        SELECT invitation_id, email, role_slug, status, created_at, updated_at, expires_at
        FROM user_invitations
        WHERE org_id = $1 AND LOWER(email) = LOWER($2) AND scope = 'organization' AND status = 'pending' AND revoked_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
        """,
        org_id,
        email,
        tenant_id=str(context.tenant_id),
    )
    if existing_invitation:
        return existing_invitation

    query = """
        INSERT INTO user_invitations (
            invitation_id, tenant_id, org_id, email, scope, role_slug,
            invited_by_user_id, status, created_at, updated_at, expires_at
        ) VALUES ($1, $2, $3, $4, 'organization', $5, $6, 'pending', NOW(), NOW(), NOW() + INTERVAL '7 days')
        RETURNING invitation_id, org_id, tenant_id, email, scope, role_slug, status,
                  created_at, updated_at, expires_at, accepted_at, revoked_at
    """
    return await db_manager.fetch_one(
        query,
        str(uuid.uuid4()),
        str(context.tenant_id),
        org_id,
        email,
        role_slug,
        context.user_id,
        tenant_id=str(context.tenant_id),
    )


@router.delete("/orgs/{org_id}/invitations/{invitation_id}")
async def revoke_org_invitation(
    org_id: str,
    invitation_id: str,
    context: AuthContext = Depends(require_permission("org.members.manage"))
):
    _assert_same_org(org_id, context)
    record = await db_manager.fetch_one(
        """
        UPDATE user_invitations
        SET status = 'revoked', revoked_at = NOW(), updated_at = NOW()
        WHERE invitation_id = $1 AND org_id = $2 AND scope = 'organization'
        RETURNING invitation_id, org_id, tenant_id, email, scope, role_slug, status,
                  created_at, updated_at, expires_at, accepted_at, revoked_at
        """,
        invitation_id,
        org_id,
        tenant_id=str(context.tenant_id),
    )
    if not record:
        raise HTTPException(status_code=404, detail='Invitation not found')
    return record


@router.put("/orgs/{org_id}/members/{user_id}")
async def upsert_org_member(
    org_id: str,
    user_id: str,
    payload: dict,
    context: AuthContext = Depends(require_permission("org.members.manage"))
):
    import uuid

    _assert_same_org(org_id, context)
    role_slug = (payload or {}).get('role_slug')
    status = (payload or {}).get('status', 'active')
    if not role_slug:
        raise HTTPException(status_code=400, detail='role_slug is required')

    role_record = await db_manager.fetch_one(
        "SELECT role_slug, is_platform_role FROM roles WHERE role_slug = $1",
        role_slug,
        tenant_id=str(context.tenant_id),
    )
    if not role_record or role_record.get('is_platform_role'):
        raise HTTPException(status_code=400, detail='Invalid organization role')

    user_record = await db_manager.fetch_one(
        "SELECT user_id FROM users WHERE user_id = $1",
        user_id,
        tenant_id=str(context.tenant_id),
    )
    if not user_record:
        raise HTTPException(status_code=404, detail='User not found')

    query = """
        INSERT INTO org_memberships (membership_id, org_id, user_id, role_slug, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT (org_id, user_id)
        DO UPDATE SET role_slug = EXCLUDED.role_slug, status = EXCLUDED.status, updated_at = NOW()
        RETURNING membership_id, org_id, user_id, role_slug, status, created_at, updated_at
    """
    return await db_manager.fetch_one(
        query,
        str(uuid.uuid4()),
        org_id,
        user_id,
        role_slug,
        status,
        tenant_id=str(context.tenant_id),
    )


@router.get("/orgs/{org_id}/encryption")
async def get_org_encryption_settings(org_id: str, context: AuthContext = Depends(require_permission("org.members.manage"))):
    _assert_same_org(org_id, context)
    query = "SELECT tenant_id, encryption_mode, encryption_key_version FROM tenants WHERE tenant_id = $1"
    record = await db_manager.fetch_one(query, org_id, tenant_id=str(context.tenant_id))
    if not record:
        raise HTTPException(status_code=404, detail='Organization not found')
    return record


@router.put("/orgs/{org_id}/encryption")
async def update_org_encryption_settings(
    org_id: str,
    payload: dict,
    context: AuthContext = Depends(require_permission("org.members.manage"))
):
    _assert_same_org(org_id, context)
    encryption_mode = (payload or {}).get('encryption_mode')
    rotate_key = bool((payload or {}).get('rotate_key'))
    if encryption_mode not in {'managed', 'tenant_managed'}:
        raise HTTPException(status_code=400, detail='encryption_mode must be managed or tenant_managed')

    query = """
        UPDATE tenants
        SET encryption_mode = $1,
            encryption_key_version = CASE WHEN $2 THEN encryption_key_version + 1 ELSE encryption_key_version END
        WHERE tenant_id = $3
        RETURNING tenant_id, encryption_mode, encryption_key_version
    """
    record = await db_manager.fetch_one(query, encryption_mode, rotate_key, org_id, tenant_id=str(context.tenant_id))
    if not record:
        raise HTTPException(status_code=404, detail='Organization not found')
    return record


@router.post("/auth/signup")
async def signup(request: SignupRequest, response: Response):
    if not settings.use_local_auth:
        raise HTTPException(status_code=400, detail="Local signup is disabled")
    try:
        await local_auth_manager.signup(request.email, request.password)
        result = await local_auth_manager.login(request.email, request.password)
        await dashboard_session_manager.create_session(
            response,
            user_id=result["user"]["user_id"],
            tenant_id=result["user"]["tenant_id"],
            email=result["user"]["email"],
            roles={result["user"]["role"]},
            active_environment_slug=DEFAULT_ENVIRONMENT,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/auth/login")
async def login(request: LoginRequest, response: Response):
    if not settings.use_local_auth:
        raise HTTPException(status_code=400, detail="Local login is disabled")
    try:
        result = await local_auth_manager.login(request.email, request.password)
        await dashboard_session_manager.create_session(
            response,
            user_id=result["user"]["user_id"],
            tenant_id=result["user"]["tenant_id"],
            email=result["user"]["email"],
            roles={result["user"]["role"]},
            active_environment_slug=DEFAULT_ENVIRONMENT,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/auth/refresh")
async def refresh_token(refresh_token: str):
    try:
        result = await local_auth_manager.refresh_token(refresh_token)
        return result
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/auth/logout")
async def logout(request: Request, response: Response, refresh_token: Optional[str] = None):
    if refresh_token:
        try:
            await local_auth_manager.logout(refresh_token)
        except ValueError:
            pass
    await dashboard_session_manager.revoke_session(request, response)
    return {"message": "Logged out successfully"}


# API Key Management
@router.post("/api-keys")
async def generate_api_key(
    request: dict,
    tenant_id: str = Depends(require_tenant_permission("api_keys.manage"))
):
    """Generate new API key (requires JWT authentication)"""
    environment = request.get("environment") or db_manager.current_environment_slug() or DEFAULT_ENVIRONMENT
    key = await api_key_manager.generate_key(tenant_id, environment)
    return key


@router.get("/api-keys")
async def list_api_keys(tenant_id: str = Depends(require_tenant_permission("api_keys.manage"))):
    """List API keys for the active tenant environment"""
    environment_id, _environment_slug = _current_environment_context()
    query = """
        SELECT key_id, api_key, environment, created_at, revoked_at
        FROM api_keys
        WHERE tenant_id = $1
    """
    args = [tenant_id]
    if environment_id:
        query += " AND tenant_environment_id = $2"
        args.append(environment_id)
    query += " ORDER BY created_at DESC"

    records = await db_manager.fetch_all(query, *args, tenant_id=tenant_id)

    keys = []
    for record in records:
        keys.append({
            "key_id": str(record["key_id"]),
            "api_key": record["api_key"],
            "environment": record["environment"],
            "created_at": record["created_at"].isoformat() if record["created_at"] else None,
            "last_used_at": None,
            "total_calls": 0,
            "revoked_at": record["revoked_at"].isoformat() if record["revoked_at"] else None
        })
    return keys


@router.delete("/api-keys/{key_id}")
async def revoke_api_key(
    key_id: str,
    tenant_id: str = Depends(require_tenant_permission("api_keys.manage"))
):
    """Revoke API key"""
    await api_key_manager.revoke_key(key_id, tenant_id=tenant_id)
    return {"message": "API key revoked"}


@router.get("/api-keys/{key_id}/usage")
async def get_key_usage(
    key_id: str,
    tenant_id: str = Depends(require_tenant_permission("api_keys.manage"))
):
    """Get API key usage statistics"""
    return {
        "key_id": key_id,
        "environment": db_manager.current_environment_slug() or DEFAULT_ENVIRONMENT,
        "total_requests": 0,
        "requests_today": 0,
        "requests_this_week": 0,
        "requests_this_month": 0,
        "last_used": None
    }


# Branding Endpoints
@router.post("/branding/logo")
async def upload_logo(
    file: UploadFile = File(...),
    tenant_id: str = Depends(require_tenant_permission("branding.manage"))
):
    """Upload branding logo"""
    file_data = await file.read()
    
    logo_url = await branding_manager.upload_logo(
        tenant_id=tenant_id,
        file_data=file_data,
        content_type=file.content_type,
        filename=file.filename
    )
    
    return {"logo_url": logo_url}


@router.put("/branding/colors")
async def update_colors(
    config: ColorConfig,
    tenant_id: str = Depends(require_tenant_permission("branding.manage"))
):
    """Update branding colors"""
    await branding_manager.update_colors(
        tenant_id=tenant_id,
        primary_color=config.primary_color,
        secondary_color=config.secondary_color,
        button_color=config.button_color
    )
    
    return {"message": "Branding colors updated"}


@router.get("/branding")
async def get_branding(tenant_id: str = Depends(require_tenant_permission("branding.manage"))):
    """Get branding configuration"""
    branding = await branding_manager.get_branding(tenant_id)
    return branding


@router.post("/branding/reset")
async def reset_branding(tenant_id: str = Depends(require_tenant_permission("branding.manage"))):
    """Reset branding to defaults"""
    await branding_manager.reset_branding(tenant_id)
    return {"message": "Branding reset to defaults"}


# Webhook Management Endpoints
@router.get("/webhooks")
async def list_webhooks(tenant_id: str = Depends(require_tenant_permission("webhooks.manage"))):
    """List all webhooks for the active tenant environment"""
    environment_id, _environment_slug = _current_environment_context()
    query = """
        SELECT webhook_id, tenant_id, url, enabled, events,
               created_at, last_triggered_at, success_count, failure_count
        FROM webhooks
        WHERE tenant_id = $1
    """
    args = [tenant_id]
    if environment_id:
        query += " AND tenant_environment_id = $2"
        args.append(environment_id)
    query += " ORDER BY created_at DESC"
    webhooks = await db_manager.fetch_all(query, *args, tenant_id=tenant_id)
    return webhooks


@router.post("/webhooks")
async def create_webhook(
    config: dict,
    tenant_id: str = Depends(require_tenant_permission("webhooks.manage"))
):
    """Create a new webhook"""
    import uuid
    from datetime import datetime

    environment_id, _environment_slug = _current_environment_context()
    webhook_id = str(uuid.uuid4())
    query = """
        INSERT INTO webhooks (webhook_id, tenant_id, tenant_environment_id, url, enabled, events, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING webhook_id, tenant_id, url, enabled, events, created_at,
                  last_triggered_at, success_count, failure_count
    """
    webhook = await db_manager.fetch_one(
        query,
        webhook_id,
        tenant_id,
        environment_id,
        config['url'],
        config.get('enabled', True),
        config.get('events', ['verification.complete']),
        datetime.utcnow(),
        tenant_id=tenant_id
    )
    return webhook


@router.put("/webhooks/{webhook_id}")
async def update_webhook(
    webhook_id: str,
    config: dict,
    tenant_id: str = Depends(require_tenant_permission("webhooks.manage"))
):
    """Update webhook configuration"""
    environment_id, _environment_slug = _current_environment_context()
    query = """
        UPDATE webhooks
        SET url = $1, enabled = $2, events = $3
        WHERE webhook_id = $4 AND tenant_id = $5
    """
    args = [
        config['url'],
        config.get('enabled', True),
        config.get('events', ['verification.complete']),
        webhook_id,
        tenant_id,
    ]
    if environment_id:
        query += ' AND tenant_environment_id = $6'
        args.append(environment_id)
    query += ' RETURNING webhook_id, tenant_id, url, enabled, events, created_at, last_triggered_at, success_count, failure_count'
    webhook = await db_manager.fetch_one(query, *args, tenant_id=tenant_id)
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    return webhook


@router.delete("/webhooks/{webhook_id}")
async def delete_webhook(
    webhook_id: str,
    tenant_id: str = Depends(require_tenant_permission("webhooks.manage"))
):
    """Delete a webhook"""
    environment_id, _environment_slug = _current_environment_context()
    query = "DELETE FROM webhooks WHERE webhook_id = $1 AND tenant_id = $2"
    args = [webhook_id, tenant_id]
    if environment_id:
        query += " AND tenant_environment_id = $3"
        args.append(environment_id)
    await db_manager.execute_query(query, *args, tenant_id=tenant_id)
    return {"message": "Webhook deleted"}


@router.post("/webhooks/{webhook_id}/test")
async def test_webhook(
    webhook_id: str,
    tenant_id: str = Depends(require_tenant_permission("webhooks.manage"))
):
    """Test webhook delivery"""
    import httpx
    from datetime import datetime

    environment_id, environment_slug = _current_environment_context()
    query = "SELECT webhook_id, url, enabled FROM webhooks WHERE webhook_id = $1 AND tenant_id = $2"
    args = [webhook_id, tenant_id]
    if environment_id:
        query += " AND tenant_environment_id = $3"
        args.append(environment_id)
    webhook = await db_manager.fetch_one(query, *args, tenant_id=tenant_id)

    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")

    if not webhook['enabled']:
        raise HTTPException(status_code=400, detail="Webhook is disabled")

    test_payload = {
        "event": "webhook.test",
        "environment": environment_slug or DEFAULT_ENVIRONMENT,
        "session_id": "test-session",
        "tier_1_score": 95,
        "tier_2_score": 92,
        "final_trust_score": 93,
        "verification_status": "success",
        "timestamp": datetime.utcnow().isoformat(),
        "metadata": {"test": True}
    }

    try:
        start_time = datetime.utcnow()
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(webhook['url'], json=test_payload)
        end_time = datetime.utcnow()
        response_time_ms = int((end_time - start_time).total_seconds() * 1000)

        return {
            "success": response.status_code < 400,
            "status_code": response.status_code,
            "response_time_ms": response_time_ms,
            "error_message": None if response.status_code < 400 else response.text
        }
    except Exception as e:
        return {
            "success": False,
            "status_code": 0,
            "response_time_ms": 0,
            "error_message": str(e)
        }


@router.get("/webhooks/{webhook_id}/logs")
async def get_webhook_logs(
    webhook_id: str,
    tenant_id: str = Depends(require_tenant_permission("webhooks.manage")),
    limit: int = 50,
    offset: int = 0
):
    """Get webhook delivery logs"""
    environment_id, _environment_slug = _current_environment_context()
    query = """
        SELECT log_id,
               webhook_id,
               COALESCE(delivered_at, failed_at, NOW()) AS timestamp,
               COALESCE(event_type, 'verification.complete') AS event_type,
               COALESCE(response_status, 0) AS status_code,
               COALESCE(response_time_ms, 0) AS response_time_ms,
               COALESCE(success, response_status BETWEEN 200 AND 399, FALSE) AS success,
               NULL::TEXT AS error_message,
               retry_count
        FROM webhook_logs
        WHERE webhook_id = $1
    """
    args = [webhook_id]
    if environment_id:
        query += ' AND tenant_environment_id = $2'
        args.append(environment_id)
        query += ' ORDER BY COALESCE(delivered_at, failed_at, NOW()) DESC LIMIT $3 OFFSET $4'
        args.extend([limit, offset])
    else:
        query += ' ORDER BY COALESCE(delivered_at, failed_at, NOW()) DESC LIMIT $2 OFFSET $3'
        args.extend([limit, offset])
    logs = await db_manager.fetch_all(query, *args, tenant_id=tenant_id)
    return logs


# Billing Endpoints
@router.get("/billing/subscription")
async def get_subscription(tenant_id: str = Depends(require_tenant_permission("billing.read"))):
    """Get current subscription for the active tenant environment"""
    stats = await quota_manager.get_usage_stats(tenant_id)
    stats["estimated_cost"] = 0.0
    stats["next_renewal_date"] = stats["billing_cycle_end"]
    stats["environment"] = _serialize_environment(stats.get("environment"))
    return stats

@router.get("/billing/plans")
async def get_billing_plans():
    """Get available subscription plans"""
    return [
        {
            "plan_id": "Starter",
            "name": "Starter",
            "tier": "Starter",
            "monthly_quota": 1000,
            "price_per_month": 49.0,
            "price_per_verification": 0.05,
            "features": ["1,000 Verifications/mo", "Basic Analytics", "Standard Support"]
        },
        {
            "plan_id": "Pro",
            "name": "Professional",
            "tier": "Professional",
            "monthly_quota": 10000,
            "price_per_month": 199.0,
            "price_per_verification": 0.02,
            "features": ["10,000 Verifications/mo", "Advanced Analytics", "Priority Support", "Webhooks"],
            "recommended": True
        },
        {
            "plan_id": "Enterprise",
            "name": "Enterprise",
            "tier": "Enterprise",
            "monthly_quota": 100000,
            "price_per_month": 999.0,
            "price_per_verification": 0.01,
            "features": ["100,000+ Verifications/mo", "Custom Branding", "Dedicated Account Manager", "SLA"]
        }
    ]


@router.post("/billing/upgrade")
async def upgrade_subscription(
    request: dict,
    tenant_id: str = Depends(require_tenant_permission("billing.read"))
):
    """Upgrade subscription plan (Mocked)"""
    plan_id = request.get("plan_id", "Pro")
    await billing_manager.handle_payment_success("mock_upgrade", tenant_id, plan_id)
    return {"message": "Plan upgraded successfully", "status": "success"}


@router.post("/billing/purchase-credits")
async def purchase_credits(
    request: dict,
    tenant_id: str = Depends(require_tenant_permission("billing.read"))
):
    """Purchase credits (Mocked)"""
    amount = int(request.get("amount", 100) or 0)
    if amount <= 0:
        raise HTTPException(status_code=400, detail='amount must be greater than 0')

    environment_slug = db_manager.current_environment_slug() or DEFAULT_ENVIRONMENT
    updated = await update_environment_quota(tenant_id, environment_slug, monthly_quota_delta=amount)
    if not updated:
        raise HTTPException(status_code=404, detail='Environment not found')

    return {"message": f"{amount} credits purchased successfully", "status": "success"}


@router.get("/billing/invoices")
async def get_invoices(tenant_id: str = Depends(require_tenant_permission("billing.read"))):
    """Get invoices"""
    return {"invoices": []}


# Analytics Endpoints
@router.get("/analytics/stats")
async def get_analytics_stats(tenant_id: str = Depends(require_tenant_permission("analytics.read"))):
    """Get analytics statistics"""
    quota_stats = await quota_manager.get_usage_stats(tenant_id)
    environment_id, environment_slug = _current_environment_context()

    analytics_data = {
        "total_sessions": 0,
        "sessions_today": 0,
        "sessions_this_week": 0,
        "sessions_this_month": 0,
        "success_rate": 0.0,
        "average_trust_score": 0.0,
        "current_usage": quota_stats["current_usage"],
        "monthly_quota": quota_stats["monthly_quota"],
        "usage_percentage": quota_stats["usage_percentage"],
        "environment": environment_slug or DEFAULT_ENVIRONMENT,
    }

    try:
        total_query = "SELECT COUNT(*) as count FROM sessions WHERE tenant_id = $1"
        total_args = [tenant_id]
        if environment_id:
            total_query += " AND tenant_environment_id = $2"
            total_args.append(environment_id)
        total_result = await db_manager.fetch_one(total_query, *total_args, tenant_id=tenant_id)
        if total_result:
            analytics_data["total_sessions"] = total_result["count"]

        today_query = "SELECT COUNT(*) as count FROM sessions WHERE tenant_id = $1 AND DATE(created_at) = CURRENT_DATE"
        today_args = [tenant_id]
        if environment_id:
            today_query += " AND tenant_environment_id = $2"
            today_args.append(environment_id)
        today_result = await db_manager.fetch_one(today_query, *today_args, tenant_id=tenant_id)
        if today_result:
            analytics_data["sessions_today"] = today_result["count"]

        week_query = "SELECT COUNT(*) as count FROM sessions WHERE tenant_id = $1 AND created_at >= DATE_TRUNC('week', CURRENT_DATE)"
        week_args = [tenant_id]
        if environment_id:
            week_query += " AND tenant_environment_id = $2"
            week_args.append(environment_id)
        week_result = await db_manager.fetch_one(week_query, *week_args, tenant_id=tenant_id)
        if week_result:
            analytics_data["sessions_this_week"] = week_result["count"]

        month_query = "SELECT COUNT(*) as count FROM sessions WHERE tenant_id = $1 AND created_at >= DATE_TRUNC('month', CURRENT_DATE)"
        month_args = [tenant_id]
        if environment_id:
            month_query += " AND tenant_environment_id = $2"
            month_args.append(environment_id)
        month_result = await db_manager.fetch_one(month_query, *month_args, tenant_id=tenant_id)
        if month_result:
            analytics_data["sessions_this_month"] = month_result["count"]

        stats_query = """
            SELECT
                COUNT(*) FILTER (WHERE final_trust_score >= 50) as success_count,
                COUNT(*) as total_count,
                AVG(final_trust_score) as avg_score
            FROM sessions
            WHERE tenant_id = $1 AND final_trust_score IS NOT NULL
        """
        stats_args = [tenant_id]
        if environment_id:
            stats_query += " AND tenant_environment_id = $2"
            stats_args.append(environment_id)
        stats_result = await db_manager.fetch_one(stats_query, *stats_args, tenant_id=tenant_id)
        if stats_result and stats_result["total_count"] > 0:
            analytics_data["success_rate"] = round(
                (stats_result["success_count"] / stats_result["total_count"]) * 100, 2
            )
            analytics_data["average_trust_score"] = round(stats_result["avg_score"] or 0, 2)
    except Exception as e:
        logger.warning(f"Could not fetch session analytics: {e}")

    return analytics_data


@router.get("/analytics/sessions")
async def get_analytics_sessions(
    tenant_id: str = Depends(require_tenant_permission("analytics.read")),
    limit: int = 100,
    offset: int = 0
):
    """Get session list"""
    sessions = await session_manager.get_sessions_by_tenant(tenant_id, limit, offset)
    return {"sessions": sessions}


@router.get("/analytics/usage")
async def get_usage(tenant_id: str = Depends(require_tenant_permission("analytics.read"))):
    """Get usage statistics"""
    stats = await quota_manager.get_usage_stats(tenant_id)
    return stats


@router.get("/analytics/usage-trend")
async def get_usage_trend(
    tenant_id: str = Depends(require_tenant_permission("analytics.read")),
    period: str = "daily"
):
    """Get usage trend data"""
    # Return mock data for now
    from datetime import datetime, timedelta
    
    data = []
    days = 7 if period == "daily" else 30
    
    for i in range(days):
        date = datetime.utcnow() - timedelta(days=days-i-1)
        data.append({
            "date": date.strftime("%Y-%m-%d"),
            "session_count": 0,
            "success_count": 0,
            "failed_count": 0,
            "average_trust_score": 0
        })
    
    return data


@router.get("/analytics/outcome-distribution")
async def get_outcome_distribution(tenant_id: str = Depends(require_tenant_permission("analytics.read"))):
    """Get outcome distribution"""
    return {
        "success": 0,
        "failed": 0,
        "timeout": 0,
        "cancelled": 0
    }


@router.get("/sessions")
async def list_sessions(
    tenant_id: str = Depends(require_tenant_permission("sessions.read")),
    limit: int = 10,
    offset: int = 0
):
    """Get list of sessions for tenant"""
    sessions = await session_manager.get_sessions_by_tenant(tenant_id, limit, offset)
    return {
        "sessions": sessions,
        "total": len(sessions),
        "limit": limit,
        "offset": offset
    }


# WebSocket endpoint for verification
@router.websocket("/ws/verify/{session_id}")
async def websocket_verify(websocket: WebSocket, session_id: str, ws_token: Optional[str] = Query(default=None)):
    """WebSocket endpoint for real-time verification"""
    session = await session_manager.get_session(session_id)
    if not session:
        await websocket.close(code=1008, reason="Session not found")
        return
    db_manager.set_request_context(
        tenant_id=str(session['tenant_id']),
        environment_id=session.get('tenant_environment_id'),
        environment_slug=session.get('environment'),
        actor_type='service_account',
    )
    if not dashboard_session_manager.verify_ws_token(session_id, str(session['tenant_id']), ws_token):
        await websocket.close(code=1008, reason="Invalid websocket token")
        return

    await ws_handler.connect(session_id, websocket)
    
    try:
        # Get session and branding
        
        logger.info(f"Session retrieved: {session_id}, tenant: {session['tenant_id']}")
        
        # Send branding
        try:
            branding = await branding_manager.get_branding(session['tenant_id'])
            logger.info(f"Branding retrieved: {branding}")
            await ws_handler.send_branding(session_id, branding)
        except Exception as e:
            logger.error(f"Branding error: {e}", exc_info=True)
            # Continue without branding
        
        # Start baseline phase
        await ws_handler.send_phase_change(session_id, "baseline")
        
        # Handle messages
        while True:
            data = await websocket.receive()
            
            if "bytes" in data:
                # Video chunk
                await ws_handler.handle_video_chunk(session_id, data["bytes"])
            elif "text" in data:
                # JSON message
                import json
                message = json.loads(data["text"])
                await ws_handler.handle_message(session_id, message)
                
    except WebSocketDisconnect:
        ws_handler.disconnect(session_id)
        logger.info(f"WebSocket disconnected: {session_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
        ws_handler.disconnect(session_id)


def _parse_metadata_json(metadata: Optional[str]) -> dict:
    if not metadata:
        return {}

    import json

    try:
        parsed = json.loads(metadata)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="metadata must be valid JSON") from exc

    if not isinstance(parsed, dict):
        raise HTTPException(status_code=400, detail="metadata must be a JSON object")

    return parsed


@router.post("/media-analysis")
async def create_media_analysis_job(
    file: UploadFile = File(...),
    metadata: Optional[str] = Form(None),
    auth_data: tuple[str, str] = Depends(get_tenant_and_role_from_any_auth)
):
    """Upload an image or video and trigger asynchronous fraud analysis."""
    import asyncio
    from app.media_analysis import media_analysis_manager

    tenant_id, _role = auth_data

    await ensure_tenant_exists(tenant_id)

    if not await rate_limiter.check_api_rate_limit(tenant_id):
        raise HTTPException(status_code=429, detail="API rate limit exceeded")

    if not await quota_manager.check_quota(tenant_id):
        raise HTTPException(status_code=429, detail="Usage quota exceeded")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    try:
        job = await media_analysis_manager.create_job(
            tenant_id=tenant_id,
            filename=file.filename or "upload.bin",
            content_type=file.content_type or "application/octet-stream",
            media_bytes=file_bytes,
            metadata=_parse_metadata_json(metadata),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    asyncio.create_task(media_analysis_manager.process_job(job["job_id"], file_bytes))
    return job


@router.get("/media-analysis")
async def list_media_analysis_jobs(
    limit: int = 20,
    offset: int = 0,
    auth_data: tuple[str, str] = Depends(get_tenant_and_role_from_any_auth)
):
    """List fraud-analysis jobs for the authenticated tenant."""
    from app.media_analysis import media_analysis_manager

    tenant_id, _role = auth_data
    return await media_analysis_manager.list_jobs(tenant_id, limit, offset)


@router.get("/media-analysis/{job_id}")
async def get_media_analysis_job(
    job_id: str,
    auth_data: tuple[str, str] = Depends(get_tenant_and_role_from_any_auth)
):
    """Get fraud-analysis job status and results."""
    from app.media_analysis import media_analysis_manager

    tenant_id, role = auth_data
    job = await media_analysis_manager.get_job(job_id, tenant_id, role)
    if not job:
        raise HTTPException(status_code=404, detail="Media analysis job not found")
    return job


@router.get("/media-analysis/{job_id}/artifact")
async def get_media_analysis_artifact(
    job_id: str,
    auth_data: tuple[str, str] = Depends(get_tenant_and_role_from_any_auth)
):
    """Get a signed URL for the uploaded fraud-analysis source artifact."""
    from app.media_analysis import media_analysis_manager

    tenant_id, role = auth_data
    try:
        url = await media_analysis_manager.get_artifact_url(job_id, tenant_id, role)
        return {"url": url}
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


