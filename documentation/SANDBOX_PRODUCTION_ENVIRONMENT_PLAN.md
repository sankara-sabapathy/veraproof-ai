# Sandbox and Production Environment Design Plan

## Executive Summary

VeraProof should support two first-class tenant environments:

- `sandbox`: safe test traffic, low-risk experimentation, non-production credentials, shorter retention, lower limits, non-billable by default.
- `production`: customer-facing live traffic, strict quotas, billing, durable audit posture, production webhooks and keys.

The current codebase stores API key `environment` as a label, but it does not enforce end-to-end isolation or quota behavior. This plan upgrades that model to an enterprise-grade environment architecture without breaking tenant isolation or artifact security.

The target outcome is:

1. Tenant users can switch between `sandbox` and `production` in the dashboard.
2. All tenant-scoped reads and writes resolve against an active environment context.
3. API keys are bound to exactly one environment and cannot cross environments.
4. Quotas, concurrency, usage, webhooks, and retention are environment-aware.
5. Platform admins can see aggregate traffic across both environments without seeing evidence or tenant session contents.

## Design Principles

- Environment isolation is a control-plane concern inside a tenant, not a separate tenant.
- Production must be stricter than sandbox by default.
- Sandbox must be easy to use, but impossible to confuse with production.
- Artifacts and session content remain inaccessible cross-tenant and cross-environment unless explicitly authorized.
- The environment context must be explicit in backend auth, database access, API responses, telemetry, and UI state.
- Billing and quota enforcement must be deterministic and audit-friendly.

## Current State Assessment

Today the system has partial environment support:

- API keys store `environment` in `api_keys.environment`.
- Raw tokens are prefixed with `vp_sandbox_...` or `vp_production_...`.
- Validation returns the environment string for tracing.
- The dashboard create-key dialog exposes the two environment options.

What is missing:

- No dashboard-level active environment context.
- No database-level environment isolation.
- No environment-aware session, artifact, usage, or webhook scoping.
- No separate sandbox and production quota model.
- No policy that prevents a production key from affecting sandbox resources or vice versa.
- No environment-specific monitoring UX for tenant users.

## Target Domain Model

### Core Concept

Add a tenant-owned environment layer.

A tenant owns exactly two default environments:

- `sandbox`
- `production`

These are represented as durable records, not ad hoc strings.

### New Tables

#### `tenant_environments`

Purpose: canonical environment records per tenant.

Recommended columns:

- `tenant_environment_id UUID PRIMARY KEY`
- `tenant_id UUID NOT NULL REFERENCES tenants(tenant_id)`
- `environment_slug VARCHAR(32) NOT NULL CHECK (environment_slug IN ('sandbox', 'production'))`
- `display_name VARCHAR(64) NOT NULL`
- `status VARCHAR(32) NOT NULL DEFAULT 'active'`
- `is_default BOOLEAN NOT NULL DEFAULT FALSE`
- `created_at TIMESTAMP NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMP NOT NULL DEFAULT NOW()`
- `UNIQUE (tenant_id, environment_slug)`
- `UNIQUE (tenant_id, is_default) WHERE is_default = TRUE`

#### `tenant_environment_settings`

Purpose: per-environment policy and runtime controls.

Recommended columns:

- `tenant_environment_id UUID PRIMARY KEY REFERENCES tenant_environments(tenant_environment_id)`
- `webhook_url VARCHAR(500)`
- `webhook_secret VARCHAR(255)`
- `artifact_retention_days INTEGER`
- `allow_live_webhooks BOOLEAN NOT NULL DEFAULT FALSE`
- `allow_exports BOOLEAN NOT NULL DEFAULT TRUE`
- `allow_api_key_creation BOOLEAN NOT NULL DEFAULT TRUE`
- `require_runtime_key_for_downloads BOOLEAN NOT NULL DEFAULT FALSE`
- `created_at TIMESTAMP NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMP NOT NULL DEFAULT NOW()`

#### `tenant_environment_quotas`

Purpose: environment-specific quota, concurrency, and billing policy.

Recommended columns:

- `tenant_environment_id UUID PRIMARY KEY REFERENCES tenant_environments(tenant_environment_id)`
- `monthly_quota INTEGER NOT NULL`
- `hard_limit BOOLEAN NOT NULL DEFAULT TRUE`
- `max_concurrent_sessions INTEGER NOT NULL`
- `rate_limit_per_minute INTEGER NOT NULL`
- `billable BOOLEAN NOT NULL DEFAULT FALSE`
- `warning_threshold_pct INTEGER NOT NULL DEFAULT 80`
- `created_at TIMESTAMP NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMP NOT NULL DEFAULT NOW()`

#### `usage_ledger`

Purpose: immutable audit trail for quota and billing events.

Recommended columns:

- `usage_event_id UUID PRIMARY KEY`
- `tenant_id UUID NOT NULL REFERENCES tenants(tenant_id)`
- `tenant_environment_id UUID NOT NULL REFERENCES tenant_environments(tenant_environment_id)`
- `session_id UUID NULL REFERENCES sessions(session_id)`
- `api_key_id UUID NULL REFERENCES api_keys(key_id)`
- `event_type VARCHAR(64) NOT NULL`
- `units INTEGER NOT NULL`
- `billable BOOLEAN NOT NULL`
- `metadata JSONB`
- `created_at TIMESTAMP NOT NULL DEFAULT NOW()`

#### `usage_rollups_daily`

Purpose: fast analytics and quota reads.

Recommended columns:

- `tenant_id UUID NOT NULL`
- `tenant_environment_id UUID NOT NULL`
- `usage_date DATE NOT NULL`
- `session_count INTEGER NOT NULL DEFAULT 0`
- `success_count INTEGER NOT NULL DEFAULT 0`
- `failure_count INTEGER NOT NULL DEFAULT 0`
- `avg_trust_score FLOAT`
- `billable_units INTEGER NOT NULL DEFAULT 0`
- `non_billable_units INTEGER NOT NULL DEFAULT 0`
- `PRIMARY KEY (tenant_environment_id, usage_date)`

## Required Schema Changes to Existing Tables

Add `tenant_environment_id` to all environment-bound data tables.

### Must Add `tenant_environment_id`

- `api_keys`
- `sessions`
- `session_artifacts`
- `media_analysis_jobs`
- `usage_logs`
- `webhook_logs`
- `webhooks`
- `invoices` only if invoices will later track environment attribution; otherwise leave invoices tenant-wide and derive billable production usage from ledger.

### Migration Rule

For existing rows:

- map legacy `api_keys.environment` into a real `tenant_environment_id`
- backfill all other rows to the tenant's `production` environment unless a more precise mapping exists
- keep the legacy `environment` column temporarily during migration, then remove it after application cutover

## Database Isolation and RLS Model

The repository already relies on tenant-aware DB access through `backend/app/database.py`. Extend that pattern with environment context.

### New DB Settings

Add:

- `app.current_environment`
- helper function `app.current_environment_uuid()`

### Database Manager Changes

`backend/app/database.py` should set both:

- `app.current_tenant`
- `app.current_environment`

All tenant-bound and environment-bound queries must go through this path.

### RLS Policy Pattern

For environment-bound tables:

- `tenant_id = app.current_tenant_uuid()`
- `tenant_environment_id = app.current_environment_uuid()`

This ensures a sandbox session list cannot accidentally read production rows even inside the same tenant.

## Authentication and Authorization Model

### Human Dashboard Sessions

Add `active_environment_id` and `active_environment_slug` to the dashboard auth session payload.

Rules:

- human users authenticate to a tenant once
- environment is selected after authentication
- only users with tenant access can switch environments within that tenant
- platform admins do not use tenant environment switching; they stay on platform monitoring surfaces

### API Keys

API keys become environment-bound credentials.

Rules:

- each API key belongs to one `tenant_environment_id`
- environment is immutable after creation
- a key can only create, read, or mutate resources in its own environment
- environment mismatch returns `403`

### Suggested Permissions

Keep existing tenant permissions, but add environment-specific control where needed.

Recommended additions:

- `environments.read`
- `environments.switch`
- `environments.manage`

For `org_admin`, grant all three by default.

## API Contract Changes

### New Endpoints

#### `GET /api/v1/environments`

Returns the tenant's available environments plus active selection and quota summary.

Response shape:

- `active_environment`
- `environments[]` with:
  - `tenant_environment_id`
  - `environment_slug`
  - `display_name`
  - `status`
  - `monthly_quota`
  - `current_usage`
  - `usage_percentage`
  - `billable`

#### `POST /api/v1/environments/select`

Changes the active dashboard environment.

Request:

- `environment_slug` or `tenant_environment_id`

Response:

- updated auth session state
- active environment summary

### Updated Existing Endpoints

All tenant-scoped endpoints should resolve environment explicitly.

Patterns:

- dashboard cookie auth uses the server-side active environment from session
- API key auth uses the key's bound environment
- optional explicit request header `X-VeraProof-Environment` may be accepted only for validation and debugging, but it must never override the bound environment for API key traffic

### Header Recommendation

For observability and future integrations, allow:

- `X-VeraProof-Environment: sandbox|production`

Behavior:

- required for some future service-account or multi-context calls only if the auth type supports it
- if present and mismatched with the resolved environment, return `409` or `403`

## Quota Management Design

## Standard Enterprise Pattern

The enterprise norm is:

- sandbox quotas are separate from production quotas
- sandbox usage is usually not billed, but is still metered and rate-limited
- production quotas drive billing and customer-visible overage controls
- both environments have independent concurrency and rate limits

### Recommended VeraProof Policy

#### Sandbox

- default quota: generous but capped, for example `500` verifications/month
- `billable = false`
- lower concurrency than production
- shorter artifact retention, for example `7-14` days
- webhook delivery disabled by default or restricted to allowlisted non-production endpoints
- watermarked exports optional in later phase
- soft warnings at `80%`, hard stop at `100%`

#### Production

- quota derived from plan
- `billable = true`
- stricter operational controls
- durable retention according to subscription and compliance policy
- production webhooks enabled
- overage policy configurable per plan

### Usage Accounting Rules

- one completed verification session consumes one quota unit by default
- media analysis jobs may consume separate units if product policy requires it
- only successful session completion writes billable production usage unless business policy says attempted sessions are billable
- usage events append to `usage_ledger`
- real-time reads come from rollups with ledger as source of truth

### Failure Handling

If rollup update fails:

- request still completes if the verification result is already committed
- usage event must be retried asynchronously from the ledger
- never silently lose billable production usage

## Session and Artifact Behavior

### Sessions

`sessions` must always carry:

- `tenant_id`
- `tenant_environment_id`

Filtering rules:

- dashboard session list only shows the active environment
- platform admins can see aggregate counts across environments but not session contents

### Artifacts

Artifacts remain environment-bound through the parent session.

Rules:

- artifact reads require matching tenant and environment context
- environment switch in dashboard instantly hides the other environment's artifacts
- production artifacts must never appear in sandbox UX, even by ID guessing

## Webhooks and Integrations

Webhooks should be environment-specific.

Recommended behavior:

- sandbox webhooks are stored separately from production webhooks
- sandbox and production signing secrets are independent
- webhook payload includes `environment`
- webhook retry and health metrics are environment-aware

This is standard and avoids test traffic polluting production partners.

## Tenant Dashboard UX Plan

## Environment Switcher

### Placement

Place the switcher in the top toolbar, to the right of breadcrumbs and to the left of the user menu.

Reason:

- it is global context, not a page-local filter
- it should be visible on every tenant page
- it should not be buried inside API Keys because the environment affects all tenant data surfaces

### Visual Direction

Use an instrument-panel style segmented control with strong state clarity.

Aesthetic direction:

- precise
- operational
- calm but unmistakable
- more "control rail" than consumer toggle

### Control Structure

A two-option segmented toggle:

- `Sandbox`
- `Production`

Each segment includes:

- small environment status dot
- text label
- optional mini badge for quota state such as `73%`

### Color System

- sandbox: amber or copper-tinted neutral
- production: emerald or deep green
- inactive segments remain neutral and low-noise
- active segment uses filled background with subtle inner highlight, not neon glow

### Motion

- sliding active indicator using `transform`
- 160-200ms ease-out transition
- no bounce
- reduced-motion fallback uses instant state change

### Interaction Rules

- switching updates active environment session state immediately
- all tenant pages refetch against the new environment
- if there are unsaved forms, prompt before switching
- first switch to production in a session can show a one-time confirmation:
  - `You are entering production. Live traffic, billing, and production webhooks apply.`

### Mobile Behavior

On narrow screens:

- collapse into a compact environment pill that opens a bottom sheet or menu
- keep the current environment visible at all times

### Accessibility

- implement as a proper `radiogroup` or segmented button group
- keyboard support with arrow keys
- visible focus ring
- active environment announced via `aria-checked`
- color is never the only signal

## Recommended Toolbar Behavior

When tenant user is in sandbox:

- show `Sandbox` selected
- optionally show `Test traffic only` helper copy on relevant pages

When tenant user is in production:

- show `Production` selected
- optionally show `Live traffic` helper copy on session creation and webhook pages

## Page-Level Adjustments

### Dashboard

Tenant dashboard becomes environment-aware.

Cards reflect only active environment:

- total sessions
- sessions today
- success rate
- failure rate
- average trust score
- current usage vs environment quota

### API Keys

Environment selector remains in create-key dialog, but the page also reflects current environment.

Recommended behavior:

- default new key environment = current active environment
- list keys filtered to current environment by default
- optional "show both environments" only for users with `environments.read`

### Sessions, Analytics, Billing, Webhooks

All should show the active environment clearly in page chrome.

## Platform Admin Monitoring UX

Platform admins should not use the tenant environment switcher.

Instead, platform surfaces should expose aggregated monitoring cards and charts that can be split by environment.

Recommended additions to platform stats:

- total sessions by environment
- success and failure rate by environment
- active tenants by environment
- webhook failures by environment
- average trust score by environment

Platform admins may see tenant metadata and aggregate counts, but never artifact or session evidence content.

## Backend Implementation Plan

### Phase 1: Canonical Environment Model

- add `tenant_environments`, `tenant_environment_settings`, `tenant_environment_quotas`
- backfill sandbox and production rows for all tenants
- update API key creation to persist `tenant_environment_id`
- update auth/session context to carry active environment

### Phase 2: Environment Isolation

- add `tenant_environment_id` to environment-bound tables
- backfill existing records
- extend `database.py` to set `app.current_environment`
- add RLS policies for environment-bound tables

### Phase 3: Quota and Usage

- create `usage_ledger` and daily rollups
- replace naive quota counters with environment-aware counters
- separate sandbox and production limits
- add warning and overage handling

### Phase 4: Dashboard UX

- add toolbar environment switcher
- update all tenant services to refetch on environment change
- update API Keys, Sessions, Analytics, Billing, Webhooks, and Dashboard surfaces

### Phase 5: Platform Monitoring

- expand platform stats to show split-by-environment monitoring
- add environment filters to admin charts without exposing session content

## Frontend Component Design Spec

## `EnvironmentSwitcherComponent`

Recommended location:

- `partner-dashboard/src/app/layout/toolbar/environment-switcher/`

Inputs:

- `environments: TenantEnvironmentSummary[]`
- `activeEnvironmentSlug: 'sandbox' | 'production'`
- `loading: boolean`

Outputs:

- `environmentChange`

Suggested internal states:

- `idle`
- `switching`
- `error`

Recommended CSS tokens:

- `--env-switcher-track`
- `--env-switcher-border`
- `--env-switcher-shadow`
- `--env-sandbox-bg`
- `--env-sandbox-fg`
- `--env-production-bg`
- `--env-production-fg`
- `--env-active-indicator`

Recommended microcopy:

- `Sandbox`: `Safe test traffic`
- `Production`: `Live traffic`

## API and Service Layer Changes in Dashboard

Add:

- `EnvironmentService`
- `EnvironmentStateService`

Responsibilities:

- fetch available environments
- store active environment in memory
- rehydrate active environment from `/api/v1/auth/session`
- switch environment
- notify feature services to refetch scoped data

Services that should subscribe to environment state:

- dashboard
- sessions
- analytics
- billing
- webhooks
- api keys
- branding if environment-specific overrides are later introduced

## Telemetry and Audit Requirements

Every tenant-scoped operation should emit:

- `tenant.id`
- `tenant.environment_id`
- `tenant.environment_slug`
- `auth.type`
- `api_key.environment` when relevant

Audit events should include environment context for:

- API key generation
- API key revocation
- environment switching
- webhook changes
- quota threshold alerts

## Security and Compliance Requirements

- sandbox and production artifacts must never co-mingle in storage indexes
- environment switching must not allow bypassing tenant or artifact permissions
- environment context must be server-resolved for dashboard sessions
- API keys must not be able to override their bound environment
- production webhooks must require explicit enablement and endpoint validation
- sandbox exports should be identifiable as non-production where policy requires it

## Rollout and Migration Strategy

### Step 1

Ship schema and backfill with dual-read support.

### Step 2

Write new records with `tenant_environment_id`, continue reading legacy fallback temporarily.

### Step 3

Cut over dashboard to active environment session context.

### Step 4

Enable environment-aware RLS policies.

### Step 5

Remove legacy string-based environment assumptions once metrics are stable.

## Testing Strategy

### Backend

- API key bound to sandbox cannot access production resources
- dashboard session switched to sandbox cannot read production sessions
- quota exhaustion in sandbox does not affect production
- production billable usage is recorded correctly
- webhook dispatch uses environment-specific endpoints and secrets
- RLS blocks cross-environment reads inside same tenant

### Frontend

- switcher reflects current environment after page refresh
- environment change refetches visible data
- unsaved-form prompt works
- mobile switcher is usable and accessible
- API key dialog defaults to active environment

### End-to-End

- create sandbox key, create sandbox traffic, verify dashboard shows sandbox-only metrics
- switch to production, confirm zero leakage from sandbox
- create production traffic, confirm quotas and analytics differ
- platform admin sees aggregate counts across both environments without session evidence access

## Recommended First Build Slice

The best first implementation slice is:

1. canonical `tenant_environments`
2. environment-aware API keys
3. active environment in dashboard auth session
4. toolbar switcher
5. environment-aware dashboard, sessions, analytics, and webhooks
6. production and sandbox quota split

This delivers visible value quickly while establishing the correct control-plane pattern.

## Open Product Decisions

These need explicit confirmation before full build:

- Is sandbox usage always non-billable?
- Should sandbox artifact retention be shorter than production?
- Should sandbox webhooks be disabled by default?
- Should API keys list only the active environment or allow cross-environment listing with a filter?
- Should production switching require re-authentication for high-risk tenants?

## Recommendation

Adopt the full environment-record model rather than extending the current string label approach.

That is the industry-standard path because it gives:

- enforceable isolation
- correct quotas and billing
- clean telemetry
- clearer dashboard UX
- lower long-term migration cost

The toolbar environment switcher should be treated as a global context control, not a decorative toggle. It must be explicit, visible, environment-aware, and impossible to confuse with a local page filter.
