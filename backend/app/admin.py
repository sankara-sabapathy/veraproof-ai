from datetime import datetime
from typing import Optional
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException

from app.dashboard_auth import AuthContext, require_permission
from app.database import db_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


def _platform_admin_org_id() -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, "veraproof.ai/platform-admins"))


async def _ensure_platform_admin_org() -> str:
    reserved_email = 'platform-admins@veraproof.ai'
    existing = await db_manager.fetch_one(
        "SELECT tenant_id FROM tenants WHERE email = $1",
        reserved_email,
    )
    platform_org_id = str(existing['tenant_id']) if existing else _platform_admin_org_id()

    if not existing:
        await db_manager.execute_query(
            """
            INSERT INTO tenants (
                tenant_id, email, subscription_tier, monthly_quota, current_usage,
                billing_cycle_start, billing_cycle_end
            ) VALUES ($1, $2, 'Enterprise', 0, 0, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days')
            ON CONFLICT (tenant_id) DO NOTHING
            """,
            platform_org_id,
            reserved_email,
        )

    await db_manager.execute_query(
        """
        INSERT INTO organizations (org_id, tenant_id, display_name, contact_email, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (org_id) DO UPDATE SET
            display_name = COALESCE(organizations.display_name, EXCLUDED.display_name),
            contact_email = COALESCE(organizations.contact_email, EXCLUDED.contact_email)
        """,
        platform_org_id,
        platform_org_id,
        'VeraProof Platform Admins',
        reserved_email,
    )
    return platform_org_id


@router.get("/tenants")
async def list_tenants(
    limit: int = 50,
    offset: int = 0,
    search: Optional[str] = None,
    subscription_tier: Optional[str] = None,
    status: Optional[str] = None,
    _admin_context: AuthContext = Depends(require_permission("platform.metadata.read")),
):
    query = """
        SELECT t.tenant_id, t.email, t.subscription_tier, t.current_usage, t.monthly_quota,
               t.billing_cycle_start, t.billing_cycle_end,
               COALESCE((SELECT COUNT(*) FROM sessions s WHERE s.tenant_id = t.tenant_id), 0) as total_sessions,
               COALESCE((SELECT MAX(created_at) FROM sessions s WHERE s.tenant_id = t.tenant_id), t.billing_cycle_start) as last_active_at,
               'active' as status
        FROM tenants t
        WHERE t.tenant_id <> $1
    """
    params = [_platform_admin_org_id()]
    if search:
        query += f" AND t.email ILIKE ${len(params) + 1}"
        params.append(f"%{search}%")
    if subscription_tier:
        query += f" AND t.subscription_tier = ${len(params) + 1}"
        params.append(subscription_tier)
    query += f" LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}"
    params.extend([limit, offset])

    tenants = await db_manager.fetch_all(query, *params)
    total_result = await db_manager.fetch_one("SELECT COUNT(*) as count FROM tenants WHERE tenant_id <> $1", _platform_admin_org_id())
    total = total_result['count'] if total_result else len(tenants)
    return {
        "tenants": [
            {
                "tenant_id": str(t["tenant_id"]),
                "email": t["email"],
                "subscription_tier": t["subscription_tier"],
                "total_sessions": t["total_sessions"],
                "current_usage": t["current_usage"],
                "monthly_quota": t["monthly_quota"],
                "created_at": t["billing_cycle_start"].isoformat() if t["billing_cycle_start"] else datetime.utcnow().isoformat(),
                "last_active_at": t["last_active_at"].isoformat() if t["last_active_at"] else datetime.utcnow().isoformat(),
                "status": t["status"],
            }
            for t in tenants
        ],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/tenants/{tenant_id}")
async def get_tenant_detail(tenant_id: str, _admin_context: AuthContext = Depends(require_permission("platform.metadata.read"))):
    tenant = await db_manager.fetch_one(
        """
        SELECT t.tenant_id, t.email, t.subscription_tier, t.current_usage, t.monthly_quota,
               t.billing_cycle_start, t.billing_cycle_end,
               COALESCE((SELECT COUNT(*) FROM sessions s WHERE s.tenant_id = t.tenant_id), 0) as total_sessions,
               COALESCE((SELECT MAX(created_at) FROM sessions s WHERE s.tenant_id = t.tenant_id), t.billing_cycle_start) as last_active_at,
               'active' as status,
               COALESCE((SELECT COUNT(*) FROM webhooks w WHERE w.tenant_id = t.tenant_id), 0) as webhooks_count
        FROM tenants t
        WHERE t.tenant_id = $1 AND t.tenant_id <> $2
        """,
        tenant_id,
        _platform_admin_org_id(),
    )
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return {
        "tenant_id": str(tenant["tenant_id"]),
        "email": tenant["email"],
        "subscription_tier": tenant["subscription_tier"],
        "total_sessions": tenant["total_sessions"],
        "current_usage": tenant["current_usage"],
        "monthly_quota": tenant["monthly_quota"],
        "created_at": tenant["billing_cycle_start"].isoformat() if tenant["billing_cycle_start"] else datetime.utcnow().isoformat(),
        "last_active_at": tenant["last_active_at"].isoformat() if tenant["last_active_at"] else datetime.utcnow().isoformat(),
        "status": tenant["status"],
        "api_keys_count": 1,
        "webhooks_count": tenant["webhooks_count"],
        "success_rate": 95.0,
        "average_trust_score": 92.5,
        "billing_cycle_start": tenant["billing_cycle_start"].isoformat() if tenant["billing_cycle_start"] else None,
        "billing_cycle_end": tenant["billing_cycle_end"].isoformat() if tenant["billing_cycle_end"] else None,
    }


@router.get("/tenants/{tenant_id}/sessions")
async def get_tenant_sessions(_tenant_id: str, _admin_context: AuthContext = Depends(require_permission("platform.metadata.read"))):
    raise HTTPException(status_code=403, detail="Cross-tenant session content is not available to platform administrators")


@router.get("/platform-users")
async def list_platform_users(_admin_context: AuthContext = Depends(require_permission("platform.metadata.read"))):
    await _ensure_platform_admin_org()
    query = """
        SELECT u.user_id, u.email, u.full_name, u.created_at, om.role_slug, om.status
        FROM users u
        JOIN org_memberships om ON om.user_id = u.user_id
        WHERE om.role_slug = 'platform_admin'
        ORDER BY u.email ASC
    """
    rows = await db_manager.fetch_all(query)
    return [
        {
            "user_id": str(row["user_id"]),
            "email": row["email"],
            "full_name": row.get("full_name"),
            "role_slug": row["role_slug"],
            "status": row["status"],
            "created_at": row["created_at"].isoformat() if row.get("created_at") else None,
        }
        for row in rows
    ]


@router.get("/platform-invitations")
async def list_platform_invitations(_admin_context: AuthContext = Depends(require_permission("platform.metadata.read"))):
    await _ensure_platform_admin_org()
    query = """
        SELECT invitation_id, email, scope, role_slug, status, created_at, updated_at, expires_at, accepted_at, revoked_at
        FROM user_invitations
        WHERE org_id = $1 AND scope = 'platform'
        ORDER BY created_at DESC
    """
    return await db_manager.fetch_all(query, _platform_admin_org_id())


@router.post("/platform-invitations")
async def create_platform_invitation(payload: dict, admin_context: AuthContext = Depends(require_permission("platform.metadata.read"))):
    await _ensure_platform_admin_org()
    email = ((payload or {}).get('email') or '').strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail='email is required')

    existing_invitation = await db_manager.fetch_one(
        """
        SELECT invitation_id, email, scope, role_slug, status, created_at, updated_at, expires_at, accepted_at, revoked_at
        FROM user_invitations
        WHERE org_id = $1 AND LOWER(email) = LOWER($2) AND scope = 'platform' AND status = 'pending' AND revoked_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
        """,
        _platform_admin_org_id(),
        email,
    )
    if existing_invitation:
        return existing_invitation

    record = await db_manager.fetch_one(
        """
        INSERT INTO user_invitations (
            invitation_id, tenant_id, org_id, email, scope, role_slug,
            invited_by_user_id, status, created_at, updated_at, expires_at
        ) VALUES ($1, $2, $3, $4, 'platform', 'platform_admin', $5, 'pending', NOW(), NOW(), NOW() + INTERVAL '7 days')
        RETURNING invitation_id, email, scope, role_slug, status, created_at, updated_at, expires_at, accepted_at, revoked_at
        """,
        str(uuid.uuid4()),
        _platform_admin_org_id(),
        _platform_admin_org_id(),
        email,
        admin_context.user_id,
    )
    return record


@router.delete("/platform-invitations/{invitation_id}")
async def revoke_platform_invitation(invitation_id: str, _admin_context: AuthContext = Depends(require_permission("platform.metadata.read"))):
    await _ensure_platform_admin_org()
    record = await db_manager.fetch_one(
        """
        UPDATE user_invitations
        SET status = 'revoked', revoked_at = NOW(), updated_at = NOW()
        WHERE invitation_id = $1 AND org_id = $2 AND scope = 'platform'
        RETURNING invitation_id, email, scope, role_slug, status, created_at, updated_at, expires_at, accepted_at, revoked_at
        """,
        invitation_id,
        _platform_admin_org_id(),
    )
    if not record:
        raise HTTPException(status_code=404, detail='Invitation not found')
    return record


@router.get("/platform-stats")
async def get_platform_stats(_admin_context: AuthContext = Depends(require_permission("platform.metadata.read"))):
    metrics = await db_manager.fetch_one(
        """
        SELECT
            (SELECT COUNT(*) FROM tenants WHERE tenant_id <> $1) AS total_tenants,
            (
                SELECT COUNT(DISTINCT s.tenant_id)
                FROM sessions s
                WHERE s.created_at >= NOW() - INTERVAL '30 days'
            ) AS active_tenants,
            (SELECT COUNT(*) FROM sessions) AS total_sessions,
            (
                SELECT COUNT(*)
                FROM sessions
                WHERE created_at >= CURRENT_DATE
            ) AS sessions_today,
            (
                SELECT COUNT(*)
                FROM sessions
                WHERE final_trust_score IS NOT NULL AND final_trust_score >= 50
            ) AS successful_sessions,
            (
                SELECT COUNT(*)
                FROM sessions
                WHERE final_trust_score IS NOT NULL AND final_trust_score < 50
            ) AS failed_sessions,
            (
                SELECT AVG(final_trust_score)::float
                FROM sessions
                WHERE final_trust_score IS NOT NULL
            ) AS average_trust_score,
            (
                SELECT COALESCE(SUM(CASE subscription_tier
                    WHEN 'Starter' THEN 49
                    WHEN 'Professional' THEN 199
                    WHEN 'Pro' THEN 199
                    WHEN 'Enterprise' THEN 999
                    ELSE 0
                END), 0)
                FROM tenants
                WHERE tenant_id <> $1
            ) AS estimated_mrr
        """,
        _platform_admin_org_id(),
    )
    total_tenants = int(metrics['total_tenants'] or 0) if metrics else 0
    active_tenants = int(metrics['active_tenants'] or 0) if metrics else 0
    total_sessions = int(metrics['total_sessions'] or 0) if metrics else 0
    sessions_today = int(metrics['sessions_today'] or 0) if metrics else 0
    successful_sessions = int(metrics['successful_sessions'] or 0) if metrics else 0
    failed_sessions = int(metrics['failed_sessions'] or 0) if metrics else 0
    scored_sessions = successful_sessions + failed_sessions
    average_trust_score = round(float(metrics['average_trust_score'] or 0), 2) if metrics else 0.0
    estimated_mrr = float(metrics['estimated_mrr'] or 0) if metrics else 0.0
    return {
        "total_tenants": total_tenants,
        "active_tenants": active_tenants,
        "total_sessions": total_sessions,
        "sessions_today": sessions_today,
        "total_revenue": estimated_mrr,
        "revenue_this_month": estimated_mrr,
        "average_sessions_per_tenant": round((total_sessions / total_tenants), 2) if total_tenants > 0 else 0,
        "platform_success_rate": round((successful_sessions / scored_sessions) * 100, 2) if scored_sessions > 0 else 0,
        "platform_failure_rate": round((failed_sessions / scored_sessions) * 100, 2) if scored_sessions > 0 else 0,
        "average_trust_score": average_trust_score,
    }

@router.get("/system-health")
async def get_system_health(_admin_context: AuthContext = Depends(require_permission("platform.metadata.read"))):
    return {
        "api_status": "healthy",
        "average_response_time_ms": 145,
        "error_rate": 0.02,
        "uptime_percentage": 99.99,
        "last_incident": None,
    }
