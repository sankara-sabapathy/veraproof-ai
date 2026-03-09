import hashlib
import json
import logging
import secrets
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, Set

from fastapi import Depends, Header, HTTPException, Request, Response
from jose import JWTError, jwt

from app.auth import api_key_manager, local_auth_manager
from app.config import settings
from app.database import db_manager
from app.identity_adapter import ExternalIdentityProfile

logger = logging.getLogger(__name__)

LEGACY_ROLE_PERMISSIONS = {
    "Admin": {
        "sessions.read",
        "sessions.create",
        "artifacts.read",
        "webhooks.manage",
        "branding.manage",
        "analytics.read",
        "billing.read",
        "api_keys.manage",
        "org.members.manage",
    },
    "Master_Admin": {
        "sessions.read",
        "sessions.create",
        "artifacts.read",
        "webhooks.manage",
        "branding.manage",
        "analytics.read",
        "billing.read",
        "api_keys.manage",
        "org.members.manage",
        "platform.metadata.read",
    },
    "API_Key": {
        "sessions.create",
        "sessions.read",
        "artifacts.read",
        "media-analysis.create",
        "media-analysis.read",
    },
}


@dataclass
class AuthContext:
    tenant_id: Optional[str]
    user_id: Optional[str] = None
    email: Optional[str] = None
    actor_type: str = "anonymous"
    auth_type: str = "none"
    session_id: Optional[str] = None
    roles: Set[str] = field(default_factory=set)
    permissions: Set[str] = field(default_factory=set)

    def has_permission(self, permission: str) -> bool:
        return permission in self.permissions


class DashboardSessionManager:
    def __init__(self):
        self._memory_sessions: Dict[str, Dict[str, Any]] = {}
        self._tenant_runtime_keys: Dict[str, Dict[str, Any]] = {}

    def _hash_secret(self, secret: str) -> str:
        return hashlib.sha256(secret.encode("utf-8")).hexdigest()

    def _cookie_options(self, max_age: Optional[int] = None) -> Dict[str, Any]:
        return {
            "httponly": True,
            "secure": settings.session_cookie_secure,
            "samesite": settings.session_cookie_samesite,
            "max_age": max_age or int(timedelta(hours=settings.session_max_age_hours).total_seconds()),
            "path": "/",
        }

    def _csrf_cookie_options(self, max_age: Optional[int] = None) -> Dict[str, Any]:
        return {
            "httponly": False,
            "secure": settings.session_cookie_secure,
            "samesite": settings.session_cookie_samesite,
            "max_age": max_age or int(timedelta(hours=settings.session_max_age_hours).total_seconds()),
            "path": "/",
        }

    async def _resolve_roles_and_permissions(self, user_id: str, tenant_id: str) -> tuple[Set[str], Set[str]]:
        query = """
            SELECT om.role_slug, rp.permission_slug
            FROM org_memberships om
            LEFT JOIN role_permissions rp ON rp.role_slug = om.role_slug
            WHERE om.user_id = $1 AND om.org_id = $2 AND om.status = 'active'
        """
        rows = await db_manager.fetch_all(query, user_id, tenant_id)
        if not rows:
            return {"org_admin"}, set(LEGACY_ROLE_PERMISSIONS["Admin"])

        roles = {row["role_slug"] for row in rows if row.get("role_slug")}
        permissions = {row["permission_slug"] for row in rows if row.get("permission_slug")}
        if "platform_admin" in roles:
            permissions.update(LEGACY_ROLE_PERMISSIONS["Master_Admin"])
        if "org_admin" in roles:
            permissions.update(LEGACY_ROLE_PERMISSIONS["Admin"])
        return roles, permissions

    async def create_session(
        self,
        response: Response,
        *,
        user_id: str,
        tenant_id: str,
        email: str,
        roles: Optional[Set[str]] = None,
        permissions: Optional[Set[str]] = None,
    ) -> Dict[str, Any]:
        now = datetime.utcnow()
        expires_at = now + timedelta(hours=settings.session_max_age_hours)
        raw_secret = secrets.token_urlsafe(48)
        csrf_token = secrets.token_urlsafe(24)
        session_id = str(uuid.uuid4())

        if roles is None or permissions is None:
            roles, permissions = await self._resolve_roles_and_permissions(user_id, tenant_id)

        query = """
            INSERT INTO auth_sessions (
                session_id, user_id, org_id, session_secret_hash,
                csrf_token, created_at, expires_at, last_seen_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (session_id) DO UPDATE SET
                session_secret_hash = EXCLUDED.session_secret_hash,
                csrf_token = EXCLUDED.csrf_token,
                expires_at = EXCLUDED.expires_at,
                last_seen_at = EXCLUDED.last_seen_at,
                revoked_at = NULL
        """
        await db_manager.execute_query(
            query,
            session_id,
            user_id,
            tenant_id,
            self._hash_secret(raw_secret),
            csrf_token,
            now,
            expires_at,
            now,
        )

        session_payload = {
            "session_id": session_id,
            "user_id": user_id,
            "tenant_id": tenant_id,
            "email": email,
            "roles": sorted(roles),
            "permissions": sorted(permissions),
            "csrf_token": csrf_token,
            "expires_at": expires_at.isoformat(),
        }
        self._memory_sessions[self._hash_secret(raw_secret)] = session_payload

        response.set_cookie(settings.session_cookie_name, raw_secret, **self._cookie_options())
        response.set_cookie(settings.csrf_cookie_name, csrf_token, **self._csrf_cookie_options())
        return session_payload

    async def revoke_session(self, request: Request, response: Response):
        raw_secret = request.cookies.get(settings.session_cookie_name)
        if raw_secret:
            hashed = self._hash_secret(raw_secret)
            await db_manager.execute_query(
                "UPDATE auth_sessions SET revoked_at = NOW() WHERE session_secret_hash = $1 AND revoked_at IS NULL",
                hashed,
            )
            self._memory_sessions.pop(hashed, None)

        response.delete_cookie(settings.session_cookie_name, path="/")
        response.delete_cookie(settings.csrf_cookie_name, path="/")

    async def get_session_from_request(self, request: Request) -> Optional[Dict[str, Any]]:
        raw_secret = request.cookies.get(settings.session_cookie_name)
        if not raw_secret:
            return None

        hashed = self._hash_secret(raw_secret)
        memory_session = self._memory_sessions.get(hashed)
        if memory_session:
            return memory_session

        query = """
            SELECT s.session_id, s.user_id, s.org_id, s.csrf_token, s.expires_at,
                   u.email
            FROM auth_sessions s
            JOIN users u ON u.user_id = s.user_id
            WHERE s.session_secret_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > NOW()
        """
        session = await db_manager.fetch_one(query, hashed)
        if not session:
            return None

        roles, permissions = await self._resolve_roles_and_permissions(str(session["user_id"]), str(session["org_id"]))
        payload = {
            "session_id": str(session["session_id"]),
            "user_id": str(session["user_id"]),
            "tenant_id": str(session["org_id"]),
            "email": session["email"],
            "roles": sorted(roles),
            "permissions": sorted(permissions),
            "csrf_token": session["csrf_token"],
            "expires_at": session["expires_at"].isoformat() if session.get("expires_at") else None,
        }
        self._memory_sessions[hashed] = payload
        await db_manager.execute_query(
            "UPDATE auth_sessions SET last_seen_at = NOW() WHERE session_secret_hash = $1",
            hashed,
        )
        return payload

    async def validate_csrf(self, request: Request) -> bool:
        if request.method.upper() in {"GET", "HEAD", "OPTIONS"}:
            return True
        if request.headers.get("Authorization"):
            return True

        session = await self.get_session_from_request(request)
        if not session:
            return True

        csrf_cookie = request.cookies.get(settings.csrf_cookie_name)
        csrf_header = request.headers.get("X-CSRF-Token")
        if not csrf_cookie or not csrf_header:
            return False
        return csrf_cookie == csrf_header == session.get("csrf_token")

    def _normalize_email(self, email: str) -> str:
        return email.strip().lower()

    def _platform_admin_org_id(self) -> str:
        return str(uuid.uuid5(uuid.NAMESPACE_DNS, "veraproof.ai/platform-admins"))

    def _is_platform_admin_email(self, email: str) -> bool:
        return self._normalize_email(email) in settings.platform_admin_emails_list

    def _role_slug_from_legacy_role(self, role: str) -> str:
        return "platform_admin" if role == "Master_Admin" else "org_admin"

    async def _ensure_platform_org_shape(self):
        reserved_email = 'platform-admins@veraproof.ai'
        existing = await db_manager.fetch_one(
            "SELECT tenant_id FROM tenants WHERE email = $1",
            reserved_email,
        )
        platform_org_id = str(existing['tenant_id']) if existing else self._platform_admin_org_id()

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

    async def _find_pending_invitation(self, email: str) -> Optional[Dict[str, Any]]:
        normalized_email = self._normalize_email(email)
        invitation = await db_manager.fetch_one(
            """
            SELECT invitation_id, tenant_id, org_id, email, scope, role_slug, status, expires_at
            FROM user_invitations
            WHERE LOWER(email) = LOWER($1)
              AND status = 'pending'
              AND revoked_at IS NULL
              AND (expires_at IS NULL OR expires_at > NOW())
            ORDER BY CASE WHEN scope = 'platform' THEN 0 ELSE 1 END, created_at ASC
            LIMIT 1
            """,
            normalized_email,
        )
        if not invitation:
            return None
        return dict(invitation)

    async def _accept_invitation(self, invitation_id: str, user_id: str):
        await db_manager.execute_query(
            """
            UPDATE user_invitations
            SET status = 'accepted', accepted_user_id = $2, accepted_at = NOW(), updated_at = NOW()
            WHERE invitation_id = $1
            """,
            invitation_id,
            user_id,
        )

    async def provision_external_identity(self, profile: ExternalIdentityProfile) -> Dict[str, str]:
        normalized_email = self._normalize_email(profile.email)
        existing = await db_manager.fetch_one(
            """
            SELECT u.user_id, u.tenant_id, u.email, u.role
            FROM external_identities ei
            JOIN users u ON u.user_id = ei.user_id
            WHERE ei.provider = $1 AND ei.provider_subject = $2
            """,
            profile.provider,
            profile.subject,
        )
        if existing:
            role_slug = self._role_slug_from_legacy_role(existing.get("role") or "Admin")
            org_id = self._platform_admin_org_id() if role_slug == 'platform_admin' else str(existing["tenant_id"])
            await self._ensure_org_shape(str(existing["user_id"]), str(existing["tenant_id"]), existing["email"], profile.full_name, role_slug=role_slug, org_id=org_id)
            return {
                "user_id": str(existing["user_id"]),
                "tenant_id": str(existing["tenant_id"]),
                "email": existing["email"],
            }

        user = await db_manager.fetch_one(
            "SELECT user_id, tenant_id, email, role FROM users WHERE email = $1",
            normalized_email,
        )
        if user:
            user_id = str(user["user_id"])
            tenant_id = str(user["tenant_id"])
            role_slug = self._role_slug_from_legacy_role(user.get("role") or "Admin")
            org_id = self._platform_admin_org_id() if role_slug == 'platform_admin' else tenant_id
        else:
            invitation = await self._find_pending_invitation(normalized_email)
            is_platform_admin = self._is_platform_admin_email(normalized_email) or ((invitation or {}).get('scope') == 'platform')
            user_id = str(uuid.uuid4())
            role_slug = 'platform_admin' if is_platform_admin else (((invitation or {}).get('role_slug')) or 'org_admin')
            role = 'Master_Admin' if role_slug == 'platform_admin' else 'Admin'

            if role_slug == 'platform_admin':
                tenant_id = await self._ensure_platform_org_shape()
                org_id = tenant_id
            elif invitation:
                tenant_id = str(invitation['tenant_id'])
                org_id = str(invitation['org_id'])
            else:
                tenant_id = str(uuid.uuid4())
                org_id = tenant_id
                await db_manager.execute_query(
                    """
                    INSERT INTO tenants (
                        tenant_id, email, subscription_tier, monthly_quota, current_usage,
                        billing_cycle_start, billing_cycle_end
                    ) VALUES ($1, $2, 'Sandbox', 100, 0, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days')
                    ON CONFLICT (tenant_id) DO NOTHING
                    """,
                    tenant_id,
                    normalized_email,
                )

            await db_manager.execute_query(
                """
                INSERT INTO users (user_id, tenant_id, email, password_hash, role, full_name, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
                ON CONFLICT (user_id) DO NOTHING
                """,
                user_id,
                tenant_id,
                normalized_email,
                f"oidc::{profile.provider}",
                role,
                profile.full_name,
            )
            await self._ensure_org_shape(user_id, tenant_id, normalized_email, profile.full_name, role_slug=role_slug, org_id=org_id)
            if invitation:
                await self._accept_invitation(str(invitation['invitation_id']), user_id)

        await db_manager.execute_query(
            """
            INSERT INTO external_identities (external_identity_id, user_id, provider, provider_subject, email, created_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
            ON CONFLICT (provider, provider_subject) DO UPDATE SET email = EXCLUDED.email
            """,
            str(uuid.uuid4()),
            user_id,
            profile.provider,
            profile.subject,
            normalized_email,
        )
        return {"user_id": user_id, "tenant_id": tenant_id, "email": normalized_email}

    async def _ensure_org_shape(
        self,
        user_id: str,
        tenant_id: str,
        email: str,
        display_name: Optional[str],
        *,
        role_slug: str = 'org_admin',
        org_id: Optional[str] = None,
    ):
        normalized_email = self._normalize_email(email)
        resolved_org_id = org_id or tenant_id
        await db_manager.execute_query(
            """
            INSERT INTO organizations (org_id, tenant_id, display_name, contact_email, created_at)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (org_id) DO UPDATE SET
                display_name = COALESCE(organizations.display_name, EXCLUDED.display_name),
                contact_email = COALESCE(organizations.contact_email, EXCLUDED.contact_email)
            """,
            resolved_org_id,
            tenant_id,
            display_name or normalized_email.split("@")[0],
            normalized_email,
        )
        await db_manager.execute_query(
            """
            INSERT INTO org_memberships (membership_id, org_id, user_id, role_slug, status, created_at)
            VALUES ($1, $2, $3, $4, 'active', NOW())
            ON CONFLICT (org_id, user_id) DO UPDATE SET role_slug = EXCLUDED.role_slug, status = 'active', updated_at = NOW()
            """,
            str(uuid.uuid4()),
            resolved_org_id,
            user_id,
            role_slug,
        )

    def create_ws_token(self, session_id: str, tenant_id: str) -> str:
        now = datetime.utcnow()
        payload = {
            "session_id": session_id,
            "tenant_id": tenant_id,
            "type": "ws",
            "iat": now,
            "exp": now + timedelta(seconds=settings.ws_token_expiration_seconds),
        }
        return jwt.encode(payload, settings.app_session_secret, algorithm=settings.jwt_algorithm)

    def verify_ws_token(self, session_id: str, tenant_id: str, token: Optional[str]) -> bool:
        if not token:
            return not settings.require_ws_token
        try:
            payload = jwt.decode(token, settings.app_session_secret, algorithms=[settings.jwt_algorithm])
        except JWTError:
            return False
        return payload.get("type") == "ws" and payload.get("session_id") == session_id and str(payload.get("tenant_id")) == str(tenant_id)

    def set_tenant_runtime_key(self, tenant_id: str, passphrase: str):
        self._tenant_runtime_keys[str(tenant_id)] = {
            "passphrase": passphrase,
            "expires_at": datetime.utcnow() + timedelta(seconds=settings.tenant_runtime_key_ttl_seconds),
        }

    def get_tenant_runtime_key(self, tenant_id: str) -> Optional[str]:
        payload = self._tenant_runtime_keys.get(str(tenant_id))
        if not payload:
            return None
        if payload["expires_at"] <= datetime.utcnow():
            self._tenant_runtime_keys.pop(str(tenant_id), None)
            return None
        return payload["passphrase"]


dashboard_session_manager = DashboardSessionManager()


async def get_auth_context(
    request: Request,
    authorization: Optional[str] = Header(default=None),
) -> AuthContext:
    session = await dashboard_session_manager.get_session_from_request(request)
    if session:
        return AuthContext(
            tenant_id=session["tenant_id"],
            user_id=session["user_id"],
            email=session.get("email"),
            actor_type="user",
            auth_type="session_cookie",
            session_id=session["session_id"],
            roles=set(session.get("roles", [])),
            permissions=set(session.get("permissions", [])),
        )

    if authorization and authorization.startswith("Bearer "):
        token_or_key = authorization.replace("Bearer ", "")
        try:
            payload = await local_auth_manager.verify_jwt(token_or_key)
            role = payload.get("role", "Admin")
            permissions = set(LEGACY_ROLE_PERMISSIONS.get(role, LEGACY_ROLE_PERMISSIONS["Admin"]))
            return AuthContext(
                tenant_id=str(payload["tenant_id"]),
                user_id=payload.get("user_id"),
                email=payload.get("email"),
                actor_type="user",
                auth_type="jwt",
                roles={role},
                permissions=permissions,
            )
        except Exception:
            pass

        try:
            tenant_id, _environment = await api_key_manager.validate_key(token_or_key)
            return AuthContext(
                tenant_id=str(tenant_id),
                actor_type="service_account",
                auth_type="api_key",
                roles={"api_key"},
                permissions=set(LEGACY_ROLE_PERMISSIONS["API_Key"]),
            )
        except Exception:
            pass

    return AuthContext(tenant_id=None)


async def require_authenticated_context(
    context: AuthContext = Depends(get_auth_context),
) -> AuthContext:
    if not context.tenant_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    return context


def require_permission(permission: str):
    async def _dependency(context: AuthContext = Depends(require_authenticated_context)) -> AuthContext:
        if not context.has_permission(permission):
            raise HTTPException(status_code=403, detail="You do not have permission to perform this action")
        return context

    return _dependency
