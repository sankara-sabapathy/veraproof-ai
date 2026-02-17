from fastapi import APIRouter, HTTPException, Depends, Header, WebSocket, WebSocketDisconnect, UploadFile, File
from typing import Optional
import logging

from app.models import (
    CreateSessionRequest, CreateSessionResponse, LoginRequest, SignupRequest,
    ColorConfig, VerificationResult
)
from app.auth import local_auth_manager, api_key_manager
from app.session_manager import session_manager
from app.quota import quota_manager, billing_manager
from app.rate_limiter import rate_limiter
from app.branding import branding_manager
from app.webhooks import webhook_manager
from app.storage import storage_manager
from app.websocket_handler import ws_handler
from app.sensor_fusion import sensor_fusion_analyzer
from app.ai_forensics import ai_forensics_engine, trust_score_calculator
from app.database import db_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1")


# Dependency to extract tenant_id from API key
async def get_tenant_from_api_key(authorization: str = Header(...)) -> str:
    """Extract tenant_id from API key"""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    api_key = authorization.replace("Bearer ", "")
    
    try:
        tenant_id, environment = await api_key_manager.validate_key(api_key)
        return tenant_id
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid API key")


# Dependency to extract tenant_id from JWT token
async def get_tenant_from_jwt(authorization: str = Header(...)) -> str:
    """Extract tenant_id from JWT token"""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.replace("Bearer ", "")
    
    try:
        payload = await local_auth_manager.verify_jwt(token)
        return payload["tenant_id"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


# Session Management Endpoints
@router.post("/sessions/create", response_model=CreateSessionResponse)
async def create_session(
    request: CreateSessionRequest,
    tenant_id: str = Depends(get_tenant_from_api_key)
):
    """Create new verification session"""
    # Check rate limits
    if not await rate_limiter.check_api_rate_limit(tenant_id):
        raise HTTPException(status_code=429, detail="API rate limit exceeded")
    
    # Check quota
    if not await quota_manager.check_quota(tenant_id):
        raise HTTPException(status_code=429, detail="Usage quota exceeded")
    
    # Ensure tenant exists in database (for development with in-memory auth)
    from datetime import datetime, timedelta
    ensure_tenant_query = """
        INSERT INTO tenants (
            tenant_id, email, subscription_tier, 
            monthly_quota, current_usage, billing_cycle_start, billing_cycle_end
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (tenant_id) DO NOTHING
    """
    try:
        await db_manager.execute_query(
            ensure_tenant_query,
            tenant_id,
            f"tenant_{tenant_id[:8]}@veraproof.ai",
            'Sandbox',
            1000,
            0,
            datetime.utcnow().date(),
            (datetime.utcnow() + timedelta(days=30)).date()
        )
    except Exception as e:
        logger.warning(f"Could not ensure tenant exists: {e}")
    
    # Create session
    session = await session_manager.create_session(
        tenant_id=tenant_id,
        metadata=request.metadata,
        return_url=request.return_url
    )
    
    return CreateSessionResponse(**session)


@router.get("/sessions/{session_id}")
async def get_session(
    session_id: str,
    tenant_id: str = Depends(get_tenant_from_api_key)
):
    """Get session details"""
    session = await session_manager.get_session(session_id)
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Verify tenant ownership
    if session['tenant_id'] != tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return session


@router.get("/sessions/{session_id}/results")
async def get_session_results(
    session_id: str,
    tenant_id: str = Depends(get_tenant_from_api_key)
):
    """Get verification results"""
    session = await session_manager.get_session(session_id)
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session['tenant_id'] != tenant_id:
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


# Artifact Access Endpoints
@router.get("/sessions/{session_id}/video")
async def get_video_artifact(
    session_id: str,
    tenant_id: str = Depends(get_tenant_from_api_key)
):
    """Get video artifact signed URL"""
    session = await session_manager.get_session(session_id)
    
    if not session or session['tenant_id'] != tenant_id:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if not session['video_s3_key']:
        raise HTTPException(status_code=404, detail="Video artifact not found")
    
    signed_url = await storage_manager.generate_signed_url(session['video_s3_key'])
    return {"url": signed_url}


@router.get("/sessions/{session_id}/imu-data")
async def get_imu_artifact(
    session_id: str,
    tenant_id: str = Depends(get_tenant_from_api_key)
):
    """Get IMU data artifact signed URL"""
    session = await session_manager.get_session(session_id)
    
    if not session or session['tenant_id'] != tenant_id:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if not session['imu_data_s3_key']:
        raise HTTPException(status_code=404, detail="IMU data artifact not found")
    
    signed_url = await storage_manager.generate_signed_url(session['imu_data_s3_key'])
    return {"url": signed_url}


@router.get("/sessions/{session_id}/optical-flow")
async def get_optical_flow_artifact(
    session_id: str,
    tenant_id: str = Depends(get_tenant_from_api_key)
):
    """Get optical flow artifact signed URL"""
    session = await session_manager.get_session(session_id)
    
    if not session or session['tenant_id'] != tenant_id:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if not session['optical_flow_s3_key']:
        raise HTTPException(status_code=404, detail="Optical flow artifact not found")
    
    signed_url = await storage_manager.generate_signed_url(session['optical_flow_s3_key'])
    return {"url": signed_url}


# Authentication Endpoints
@router.post("/auth/signup")
async def signup(request: SignupRequest):
    """Sign up new user and return auth tokens"""
    try:
        # Create user account
        user = await local_auth_manager.signup(request.email, request.password)
        
        # Automatically log them in and return tokens
        result = await local_auth_manager.login(request.email, request.password)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/auth/login")
async def login(request: LoginRequest):
    """Login user"""
    try:
        result = await local_auth_manager.login(request.email, request.password)
        return result
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/auth/refresh")
async def refresh_token(refresh_token: str):
    """Refresh access token"""
    try:
        result = await local_auth_manager.refresh_token(refresh_token)
        return result
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/auth/logout")
async def logout(refresh_token: str):
    """Logout user"""
    try:
        await local_auth_manager.logout(refresh_token)
        return {"message": "Logged out successfully"}
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


# API Key Management
@router.post("/api-keys/generate")
async def generate_api_key(
    environment: str,
    tenant_id: str = Depends(get_tenant_from_jwt)
):
    """Generate new API key (requires JWT authentication)"""
    key = await api_key_manager.generate_key(tenant_id, environment)
    return key


@router.get("/api-keys/list")
async def list_api_keys(tenant_id: str = Depends(get_tenant_from_api_key)):
    """List API keys"""
    # In production, this would query database
    return {"keys": []}


@router.delete("/api-keys/{key_id}")
async def revoke_api_key(
    key_id: str,
    tenant_id: str = Depends(get_tenant_from_api_key)
):
    """Revoke API key"""
    await api_key_manager.revoke_key(key_id)
    return {"message": "API key revoked"}


# Branding Endpoints
@router.post("/branding/logo")
async def upload_logo(
    file: UploadFile = File(...),
    tenant_id: str = Depends(get_tenant_from_api_key)
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
    tenant_id: str = Depends(get_tenant_from_api_key)
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
async def get_branding(tenant_id: str = Depends(get_tenant_from_api_key)):
    """Get branding configuration"""
    branding = await branding_manager.get_branding(tenant_id)
    return branding


# Billing Endpoints
@router.get("/billing/subscription")
async def get_subscription(tenant_id: str = Depends(get_tenant_from_api_key)):
    """Get current subscription"""
    stats = await quota_manager.get_usage_stats(tenant_id)
    return stats


@router.post("/billing/upgrade")
async def upgrade_subscription(
    plan: str,
    tenant_id: str = Depends(get_tenant_from_api_key)
):
    """Upgrade subscription plan"""
    order = await billing_manager.create_subscription(tenant_id, plan, "monthly")
    return order


@router.post("/billing/purchase-credits")
async def purchase_credits(
    amount: int,
    tenant_id: str = Depends(get_tenant_from_api_key)
):
    """Purchase credits"""
    order = await billing_manager.purchase_credits(tenant_id, amount)
    return order


@router.get("/billing/invoices")
async def get_invoices(tenant_id: str = Depends(get_tenant_from_api_key)):
    """Get invoices"""
    # In production, query from database
    return {"invoices": []}


# Analytics Endpoints
@router.get("/analytics/stats")
async def get_analytics_stats(tenant_id: str = Depends(get_tenant_from_api_key)):
    """Get analytics statistics"""
    stats = await quota_manager.get_usage_stats(tenant_id)
    return stats


@router.get("/analytics/sessions")
async def get_analytics_sessions(
    tenant_id: str = Depends(get_tenant_from_api_key),
    limit: int = 100,
    offset: int = 0
):
    """Get session list"""
    sessions = await session_manager.get_sessions_by_tenant(tenant_id, limit, offset)
    return {"sessions": sessions}


@router.get("/analytics/usage")
async def get_usage(tenant_id: str = Depends(get_tenant_from_api_key)):
    """Get usage statistics"""
    stats = await quota_manager.get_usage_stats(tenant_id)
    return stats


# WebSocket endpoint for verification
@router.websocket("/ws/verify/{session_id}")
async def websocket_verify(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time verification"""
    await ws_handler.connect(session_id, websocket)
    
    try:
        # Get session and branding
        session = await session_manager.get_session(session_id)
        if not session:
            await websocket.close(code=1008, reason="Session not found")
            return
        
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
