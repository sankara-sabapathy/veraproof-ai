from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
import logging

from app.database import db_manager

logger = logging.getLogger(__name__)

SANDBOX_ENVIRONMENT = 'sandbox'
PRODUCTION_ENVIRONMENT = 'production'
DEFAULT_ENVIRONMENT = PRODUCTION_ENVIRONMENT
VALID_ENVIRONMENTS = {SANDBOX_ENVIRONMENT, PRODUCTION_ENVIRONMENT}

_SANDBOX_BASE_QUOTAS = {
    'Sandbox': 100,
    'Starter': 250,
    'Professional': 500,
    'Pro': 500,
    'Enterprise': 1000,
}


def normalize_environment_slug(slug: Optional[str], fallback: str = DEFAULT_ENVIRONMENT) -> str:
    normalized = (slug or '').strip().lower()
    return normalized if normalized in VALID_ENVIRONMENTS else fallback


def derive_sandbox_quota(subscription_tier: Optional[str], monthly_quota: Optional[int]) -> int:
    tier_quota = _SANDBOX_BASE_QUOTAS.get(subscription_tier or '', 100)
    if monthly_quota and monthly_quota > 0:
        return max(tier_quota, min(int(monthly_quota), 1000))
    return tier_quota


async def ensure_tenant_environments(tenant_id: str) -> None:
    tenant = await db_manager.fetch_one(
        """
        SELECT tenant_id, subscription_tier, monthly_quota, current_usage, billing_cycle_start, billing_cycle_end
        FROM tenants
        WHERE tenant_id = $1
        """,
        tenant_id,
    )
    if not tenant:
        logger.warning('Cannot ensure tenant environments because tenant is missing', extra={'tenant_id': tenant_id})
        return

    sandbox_quota = derive_sandbox_quota(tenant.get('subscription_tier'), tenant.get('monthly_quota'))
    billing_cycle_start = tenant.get('billing_cycle_start') or datetime.utcnow().date()
    billing_cycle_end = tenant.get('billing_cycle_end') or (datetime.utcnow() + timedelta(days=30)).date()

    await db_manager.execute_query(
        """
        INSERT INTO tenant_environments (
            tenant_environment_id,
            tenant_id,
            slug,
            display_name,
            is_default,
            is_billable,
            created_at,
            updated_at
        )
        VALUES
            (uuid_generate_v4(), $1, 'sandbox', 'Sandbox', FALSE, FALSE, NOW(), NOW()),
            (uuid_generate_v4(), $1, 'production', 'Production', TRUE, TRUE, NOW(), NOW())
        ON CONFLICT (tenant_id, slug) DO UPDATE SET
            display_name = EXCLUDED.display_name,
            is_default = CASE WHEN tenant_environments.slug = 'production' THEN TRUE ELSE tenant_environments.is_default END,
            is_billable = CASE WHEN tenant_environments.slug = 'production' THEN TRUE ELSE FALSE END,
            updated_at = NOW()
        """,
        tenant_id,
    )

    await db_manager.execute_query(
        """
        UPDATE tenant_environments
        SET is_default = (slug = 'production'),
            is_billable = (slug = 'production'),
            updated_at = NOW()
        WHERE tenant_id = $1
          AND (is_default IS DISTINCT FROM (slug = 'production') OR is_billable IS DISTINCT FROM (slug = 'production'))
        """,
        tenant_id,
    )

    await db_manager.execute_query(
        """
        INSERT INTO tenant_environment_quotas (
            tenant_environment_id,
            monthly_quota,
            current_usage,
            billing_cycle_start,
            billing_cycle_end,
            created_at,
            updated_at
        )
        SELECT te.tenant_environment_id,
               CASE
                   WHEN te.slug = 'production' THEN COALESCE($2, 0)
                   ELSE $3
               END,
               CASE
                   WHEN te.slug = 'production' THEN COALESCE($4, 0)
                   ELSE 0
               END,
               $5,
               $6,
               NOW(),
               NOW()
        FROM tenant_environments te
        WHERE te.tenant_id = $1
        ON CONFLICT (tenant_environment_id) DO UPDATE SET
            monthly_quota = CASE
                WHEN tenant_environment_quotas.current_usage = 0 AND tenant_environment_quotas.monthly_quota = 0 AND EXCLUDED.monthly_quota > 0
                    THEN EXCLUDED.monthly_quota
                ELSE tenant_environment_quotas.monthly_quota
            END,
            billing_cycle_start = COALESCE(tenant_environment_quotas.billing_cycle_start, EXCLUDED.billing_cycle_start),
            billing_cycle_end = COALESCE(tenant_environment_quotas.billing_cycle_end, EXCLUDED.billing_cycle_end),
            updated_at = NOW()
        """,
        tenant_id,
        int(tenant.get('monthly_quota') or 0),
        sandbox_quota,
        int(tenant.get('current_usage') or 0),
        billing_cycle_start,
        billing_cycle_end,
    )


async def list_tenant_environments(tenant_id: str) -> List[Dict[str, Any]]:
    await ensure_tenant_environments(tenant_id)
    rows = await db_manager.fetch_all(
        """
        SELECT te.tenant_environment_id,
               te.tenant_id,
               te.slug,
               te.display_name,
               te.is_default,
               te.is_billable,
               q.monthly_quota,
               q.current_usage,
               q.billing_cycle_start,
               q.billing_cycle_end
        FROM tenant_environments te
        LEFT JOIN tenant_environment_quotas q ON q.tenant_environment_id = te.tenant_environment_id
        WHERE te.tenant_id = $1
        ORDER BY CASE te.slug WHEN 'production' THEN 0 ELSE 1 END, te.display_name ASC
        """,
        tenant_id,
    )
    return [_serialize_environment(row) for row in rows]


async def get_tenant_environment(tenant_id: str, slug: Optional[str] = None, environment_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    await ensure_tenant_environments(tenant_id)

    if environment_id:
        row = await db_manager.fetch_one(
            """
            SELECT te.tenant_environment_id,
                   te.tenant_id,
                   te.slug,
                   te.display_name,
                   te.is_default,
                   te.is_billable,
                   q.monthly_quota,
                   q.current_usage,
                   q.billing_cycle_start,
                   q.billing_cycle_end
            FROM tenant_environments te
            LEFT JOIN tenant_environment_quotas q ON q.tenant_environment_id = te.tenant_environment_id
            WHERE te.tenant_id = $1 AND te.tenant_environment_id = $2
            """,
            tenant_id,
            environment_id,
        )
        return _serialize_environment(row) if row else None

    normalized_slug = normalize_environment_slug(slug)
    row = await db_manager.fetch_one(
        """
        SELECT te.tenant_environment_id,
               te.tenant_id,
               te.slug,
               te.display_name,
               te.is_default,
               te.is_billable,
               q.monthly_quota,
               q.current_usage,
               q.billing_cycle_start,
               q.billing_cycle_end
        FROM tenant_environments te
        LEFT JOIN tenant_environment_quotas q ON q.tenant_environment_id = te.tenant_environment_id
        WHERE te.tenant_id = $1 AND te.slug = $2
        """,
        tenant_id,
        normalized_slug,
    )
    return _serialize_environment(row) if row else None


async def get_default_tenant_environment(tenant_id: str) -> Optional[Dict[str, Any]]:
    await ensure_tenant_environments(tenant_id)
    row = await db_manager.fetch_one(
        """
        SELECT te.tenant_environment_id,
               te.tenant_id,
               te.slug,
               te.display_name,
               te.is_default,
               te.is_billable,
               q.monthly_quota,
               q.current_usage,
               q.billing_cycle_start,
               q.billing_cycle_end
        FROM tenant_environments te
        LEFT JOIN tenant_environment_quotas q ON q.tenant_environment_id = te.tenant_environment_id
        WHERE te.tenant_id = $1
        ORDER BY te.is_default DESC, CASE te.slug WHEN 'production' THEN 0 ELSE 1 END, te.created_at ASC
        LIMIT 1
        """,
        tenant_id,
    )
    return _serialize_environment(row) if row else None


async def resolve_request_environment(
    tenant_id: str,
    requested_slug: Optional[str] = None,
    stored_environment_id: Optional[str] = None,
    stored_environment_slug: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    candidates = []
    if requested_slug:
        candidates.append(('slug', normalize_environment_slug(requested_slug)))
    if stored_environment_id:
        candidates.append(('id', stored_environment_id))
    if stored_environment_slug:
        candidates.append(('slug', normalize_environment_slug(stored_environment_slug)))

    for kind, value in candidates:
        record = await get_tenant_environment(
            tenant_id,
            slug=value if kind == 'slug' else None,
            environment_id=value if kind == 'id' else None,
        )
        if record:
            return record

    return await get_default_tenant_environment(tenant_id)


async def update_environment_quota(
    tenant_id: str,
    environment_slug: str,
    *,
    monthly_quota_delta: int = 0,
    current_usage_delta: int = 0,
    absolute_monthly_quota: Optional[int] = None,
    absolute_current_usage: Optional[int] = None,
) -> Optional[Dict[str, Any]]:
    environment = await get_tenant_environment(tenant_id, slug=environment_slug)
    if not environment:
        return None

    updates = []
    params: List[Any] = []
    next_index = 1

    if absolute_monthly_quota is not None:
        updates.append(f'monthly_quota = ${next_index}')
        params.append(absolute_monthly_quota)
        next_index += 1
    elif monthly_quota_delta:
        updates.append(f'monthly_quota = monthly_quota + ${next_index}')
        params.append(monthly_quota_delta)
        next_index += 1

    if absolute_current_usage is not None:
        updates.append(f'current_usage = ${next_index}')
        params.append(absolute_current_usage)
        next_index += 1
    elif current_usage_delta:
        updates.append(f'current_usage = current_usage + ${next_index}')
        params.append(current_usage_delta)
        next_index += 1

    if not updates:
        return environment

    params.append(environment['environment_id'])
    query = f"""
        UPDATE tenant_environment_quotas
        SET {', '.join(updates)}, updated_at = NOW()
        WHERE tenant_environment_id = ${next_index}
    """
    await db_manager.execute_query(query, *params)

    refreshed = await get_tenant_environment(tenant_id, environment_id=environment['environment_id'])
    if refreshed and refreshed['slug'] == PRODUCTION_ENVIRONMENT:
        await db_manager.execute_query(
            """
            UPDATE tenants
            SET monthly_quota = $1,
                current_usage = $2,
                billing_cycle_start = $3,
                billing_cycle_end = $4
            WHERE tenant_id = $5
            """,
            refreshed.get('monthly_quota', 0),
            refreshed.get('current_usage', 0),
            refreshed.get('billing_cycle_start'),
            refreshed.get('billing_cycle_end'),
            tenant_id,
        )
    return refreshed


def _serialize_environment(row: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not row:
        return None
    return {
        'environment_id': str(row['tenant_environment_id']),
        'tenant_id': str(row['tenant_id']),
        'slug': row['slug'],
        'display_name': row['display_name'],
        'is_default': bool(row.get('is_default')),
        'is_billable': bool(row.get('is_billable')),
        'monthly_quota': int(row.get('monthly_quota') or 0),
        'current_usage': int(row.get('current_usage') or 0),
        'billing_cycle_start': row.get('billing_cycle_start'),
        'billing_cycle_end': row.get('billing_cycle_end'),
    }
