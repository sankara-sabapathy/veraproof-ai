-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.current_tenant_uuid()
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
    SELECT NULLIF(current_setting('app.current_tenant', true), '')::uuid
$$;

-- Tenants Table
CREATE TABLE IF NOT EXISTS tenants (
    tenant_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP DEFAULT NOW(),
    email VARCHAR(255) UNIQUE NOT NULL,
    subscription_tier VARCHAR(50) DEFAULT 'Sandbox',
    monthly_quota INTEGER DEFAULT 3,
    current_usage INTEGER DEFAULT 0,
    billing_cycle_start DATE,
    billing_cycle_end DATE,
    razorpay_customer_id VARCHAR(255),
    webhook_url VARCHAR(500),
    webhook_secret VARCHAR(255),
    encryption_mode VARCHAR(32) DEFAULT 'managed',
    encryption_key_version INTEGER DEFAULT 1
);

-- Users Table (for local auth + external identity mapping)
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'Admin',
    full_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);

CREATE TABLE IF NOT EXISTS organizations (
    org_id UUID PRIMARY KEY,
    tenant_id UUID UNIQUE REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    display_name VARCHAR(255),
    contact_email VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
    permission_slug VARCHAR(100) PRIMARY KEY,
    description TEXT
);

CREATE TABLE IF NOT EXISTS roles (
    role_slug VARCHAR(100) PRIMARY KEY,
    description TEXT,
    is_platform_role BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_slug VARCHAR(100) REFERENCES roles(role_slug) ON DELETE CASCADE,
    permission_slug VARCHAR(100) REFERENCES permissions(permission_slug) ON DELETE CASCADE,
    PRIMARY KEY (role_slug, permission_slug)
);

CREATE TABLE IF NOT EXISTS org_memberships (
    membership_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(org_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    role_slug VARCHAR(100) REFERENCES roles(role_slug),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (org_id, user_id)
);

CREATE TABLE IF NOT EXISTS external_identities (
    external_identity_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_subject VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (provider, provider_subject)
);

CREATE TABLE IF NOT EXISTS auth_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(org_id) ON DELETE CASCADE,
    session_secret_hash VARCHAR(255) NOT NULL UNIQUE,
    csrf_token VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    last_seen_at TIMESTAMP DEFAULT NOW(),
    revoked_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_invitations (
    invitation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(org_id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    scope VARCHAR(32) NOT NULL DEFAULT 'organization',
    role_slug VARCHAR(100) REFERENCES roles(role_slug),
    invited_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    status VARCHAR(32) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    accepted_at TIMESTAMP,
    revoked_at TIMESTAMP,
    accepted_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
    audit_event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    actor_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    actor_type VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_accounts (
    service_account_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    display_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    revoked_at TIMESTAMP
);

-- API Keys Table
CREATE TABLE IF NOT EXISTS api_keys (
    key_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    api_secret VARCHAR(255) NOT NULL,
    environment VARCHAR(20) CHECK (environment IN ('sandbox', 'production')),
    created_at TIMESTAMP DEFAULT NOW(),
    revoked_at TIMESTAMP
);

-- Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    state VARCHAR(50) DEFAULT 'idle',
    return_url VARCHAR(500),
    metadata JSONB,
    tier_1_score INTEGER,
    tier_2_score INTEGER,
    final_trust_score INTEGER,
    correlation_value FLOAT,
    reasoning TEXT,
    ai_score FLOAT,
    physics_score FLOAT,
    unified_score FLOAT,
    ai_explanation JSONB,
    verification_status VARCHAR(50),
    video_s3_key VARCHAR(500),
    imu_data_s3_key VARCHAR(500),
    optical_flow_s3_key VARCHAR(500),
    session_duration INTEGER DEFAULT 15,
    verification_commands JSONB
);

-- Session Artifacts Table
CREATE TABLE IF NOT EXISTS session_artifacts (
    artifact_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(session_id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    artifact_type VARCHAR(100) NOT NULL,
    provider VARCHAR(100),
    file_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    storage_key VARCHAR(500) NOT NULL,
    size_bytes BIGINT,
    sha256 VARCHAR(64),
    metadata JSONB,
    encryption_mode VARCHAR(32),
    encryption_key_id VARCHAR(255),
    encrypted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (session_id, artifact_type)
);

CREATE TABLE IF NOT EXISTS media_analysis_jobs (
    job_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending',
    analysis_outcome VARCHAR(50),
    media_type VARCHAR(20) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    source_filename VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    metadata JSONB,
    artifact_s3_key VARCHAR(500),
    tier_2_score INTEGER,
    final_trust_score INTEGER,
    ai_score FLOAT,
    reasoning TEXT,
    ai_explanation JSONB,
    vision_context JSONB,
    error_message TEXT
);

CREATE TABLE IF NOT EXISTS branding_configs (
    tenant_id UUID PRIMARY KEY REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    logo_url VARCHAR(500),
    primary_color VARCHAR(7),
    secondary_color VARCHAR(7),
    button_color VARCHAR(7),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usage_logs (
    log_id BIGSERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(session_id) ON DELETE CASCADE,
    timestamp TIMESTAMP DEFAULT NOW(),
    verification_status VARCHAR(50),
    tier_1_score INTEGER,
    tier_2_score INTEGER,
    final_trust_score INTEGER,
    latency_ms INTEGER
);

CREATE TABLE IF NOT EXISTS webhook_logs (
    log_id BIGSERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(session_id) ON DELETE CASCADE,
    webhook_url VARCHAR(500),
    payload JSONB,
    response_status INTEGER,
    retry_count INTEGER DEFAULT 0,
    delivered_at TIMESTAMP,
    failed_at TIMESTAMP,
    webhook_id UUID,
    event_type VARCHAR(100),
    response_time_ms INTEGER,
    success BOOLEAN
);

CREATE TABLE IF NOT EXISTS webhooks (
    webhook_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    events TEXT[] DEFAULT ARRAY['verification.complete'],
    created_at TIMESTAMP DEFAULT NOW(),
    last_triggered_at TIMESTAMP,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0
);


CREATE TABLE IF NOT EXISTS invoices (
    invoice_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    razorpay_payment_id VARCHAR(255),
    amount INTEGER,
    currency VARCHAR(3) DEFAULT 'INR',
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    paid_at TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_tenant_id ON sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_session_artifacts_session_id ON session_artifacts(session_id);
CREATE INDEX IF NOT EXISTS idx_session_artifacts_tenant_id ON session_artifacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_session_artifacts_type ON session_artifacts(artifact_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_session_artifacts_session_type ON session_artifacts(session_id, artifact_type);
CREATE INDEX IF NOT EXISTS idx_media_analysis_jobs_tenant_id ON media_analysis_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_media_analysis_jobs_created_at ON media_analysis_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_media_analysis_jobs_status ON media_analysis_jobs(status);
CREATE INDEX IF NOT EXISTS idx_usage_logs_tenant_timestamp ON usage_logs(tenant_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant_id ON api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_tenant_id ON webhooks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_org_id ON org_memberships(org_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_user_id ON org_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_secret_hash ON auth_sessions(session_secret_hash);
CREATE INDEX IF NOT EXISTS idx_external_identities_provider_subject ON external_identities(provider, provider_subject);
CREATE INDEX IF NOT EXISTS idx_audit_events_tenant_id ON audit_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_tenant_id ON user_invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_org_id ON user_invitations(org_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON user_invitations(status);

-- Idempotent Schema Migrations
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS encryption_mode VARCHAR(32) DEFAULT 'managed';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS encryption_key_version INTEGER DEFAULT 1;
ALTER TABLE session_artifacts ADD COLUMN IF NOT EXISTS encryption_mode VARCHAR(32);
ALTER TABLE session_artifacts ADD COLUMN IF NOT EXISTS encryption_key_id VARCHAR(255);
ALTER TABLE session_artifacts ADD COLUMN IF NOT EXISTS encrypted_at TIMESTAMP;
ALTER TABLE webhook_logs ADD COLUMN IF NOT EXISTS webhook_id UUID;
ALTER TABLE webhook_logs ADD COLUMN IF NOT EXISTS event_type VARCHAR(100);
ALTER TABLE webhook_logs ADD COLUMN IF NOT EXISTS response_time_ms INTEGER;
ALTER TABLE webhook_logs ADD COLUMN IF NOT EXISTS success BOOLEAN;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ai_score FLOAT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS physics_score FLOAT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS unified_score FLOAT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ai_explanation JSONB;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS video_s3_key VARCHAR(500);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS imu_data_s3_key VARCHAR(500);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS optical_flow_s3_key VARCHAR(500);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS session_duration INTEGER DEFAULT 15;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS verification_commands JSONB;
ALTER TABLE session_artifacts ADD COLUMN IF NOT EXISTS provider VARCHAR(100);
ALTER TABLE session_artifacts ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);
ALTER TABLE session_artifacts ADD COLUMN IF NOT EXISTS content_type VARCHAR(100);
ALTER TABLE session_artifacts ADD COLUMN IF NOT EXISTS storage_key VARCHAR(500);
ALTER TABLE session_artifacts ADD COLUMN IF NOT EXISTS size_bytes BIGINT;
ALTER TABLE session_artifacts ADD COLUMN IF NOT EXISTS sha256 VARCHAR(64);
ALTER TABLE session_artifacts ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE session_artifacts ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE media_analysis_jobs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
ALTER TABLE media_analysis_jobs ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE media_analysis_jobs ADD COLUMN IF NOT EXISTS analysis_outcome VARCHAR(50);
ALTER TABLE media_analysis_jobs ADD COLUMN IF NOT EXISTS media_type VARCHAR(20);
ALTER TABLE media_analysis_jobs ADD COLUMN IF NOT EXISTS content_type VARCHAR(100);
ALTER TABLE media_analysis_jobs ADD COLUMN IF NOT EXISTS source_filename VARCHAR(255);
ALTER TABLE media_analysis_jobs ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;
ALTER TABLE media_analysis_jobs ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE media_analysis_jobs ADD COLUMN IF NOT EXISTS artifact_s3_key VARCHAR(500);
ALTER TABLE media_analysis_jobs ADD COLUMN IF NOT EXISTS tier_2_score INTEGER;
ALTER TABLE media_analysis_jobs ADD COLUMN IF NOT EXISTS final_trust_score INTEGER;
ALTER TABLE media_analysis_jobs ADD COLUMN IF NOT EXISTS ai_score FLOAT;
ALTER TABLE media_analysis_jobs ADD COLUMN IF NOT EXISTS reasoning TEXT;
ALTER TABLE media_analysis_jobs ADD COLUMN IF NOT EXISTS ai_explanation JSONB;
ALTER TABLE media_analysis_jobs ADD COLUMN IF NOT EXISTS vision_context JSONB;
ALTER TABLE media_analysis_jobs ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS webhook_url VARCHAR(500);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS webhook_secret VARCHAR(255);

ALTER TABLE user_invitations ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE;
ALTER TABLE user_invitations ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(org_id) ON DELETE CASCADE;
ALTER TABLE user_invitations ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE user_invitations ADD COLUMN IF NOT EXISTS scope VARCHAR(32) DEFAULT 'organization';
ALTER TABLE user_invitations ADD COLUMN IF NOT EXISTS role_slug VARCHAR(100) REFERENCES roles(role_slug);
ALTER TABLE user_invitations ADD COLUMN IF NOT EXISTS invited_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL;
ALTER TABLE user_invitations ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'pending';
ALTER TABLE user_invitations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE user_invitations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE user_invitations ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;
ALTER TABLE user_invitations ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP;
ALTER TABLE user_invitations ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP;
ALTER TABLE user_invitations ADD COLUMN IF NOT EXISTS accepted_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL;

-- Security defaults and bootstrap RBAC
INSERT INTO roles (role_slug, description, is_platform_role)
VALUES
    ('org_admin', 'Full access to a tenant organization', FALSE),
    ('org_viewer', 'Read-only access to a tenant organization', FALSE),
    ('platform_admin', 'Metadata-only platform administration', TRUE)
ON CONFLICT (role_slug) DO NOTHING;

INSERT INTO permissions (permission_slug, description)
VALUES
    ('sessions.read', 'Read verification sessions'),
    ('sessions.create', 'Create verification sessions'),
    ('artifacts.read', 'Read verification artifacts'),
    ('webhooks.manage', 'Create or update webhooks'),
    ('branding.manage', 'Manage tenant branding'),
    ('analytics.read', 'Read analytics'),
    ('billing.read', 'Read billing metadata'),
    ('api_keys.manage', 'Manage API keys'),
    ('org.members.manage', 'Manage organization memberships'),
    ('platform.metadata.read', 'Read platform metadata'),
    ('media-analysis.create', 'Create media analysis jobs'),
    ('media-analysis.read', 'Read media analysis jobs')
ON CONFLICT (permission_slug) DO NOTHING;

INSERT INTO role_permissions (role_slug, permission_slug)
VALUES
    ('org_admin', 'sessions.read'),
    ('org_admin', 'sessions.create'),
    ('org_admin', 'artifacts.read'),
    ('org_admin', 'webhooks.manage'),
    ('org_admin', 'branding.manage'),
    ('org_admin', 'analytics.read'),
    ('org_admin', 'billing.read'),
    ('org_admin', 'api_keys.manage'),
    ('org_admin', 'org.members.manage'),
    ('org_admin', 'media-analysis.create'),
    ('org_admin', 'media-analysis.read'),
    ('org_viewer', 'sessions.read'),
    ('org_viewer', 'artifacts.read'),
    ('org_viewer', 'analytics.read'),
    ('org_viewer', 'billing.read'),
    ('org_viewer', 'media-analysis.read'),
    ('platform_admin', 'platform.metadata.read')
ON CONFLICT (role_slug, permission_slug) DO NOTHING;

INSERT INTO organizations (org_id, tenant_id, display_name, contact_email)
SELECT tenant_id, tenant_id, split_part(email, '@', 1), email
FROM tenants
ON CONFLICT (org_id) DO NOTHING;

INSERT INTO org_memberships (membership_id, org_id, user_id, role_slug, status)
SELECT uuid_generate_v4(), u.tenant_id, u.user_id,
       CASE WHEN u.role = 'Master_Admin' THEN 'platform_admin' ELSE 'org_admin' END,
       'active'
FROM users u
ON CONFLICT (org_id, user_id) DO NOTHING;

-- Enable and enforce RLS on tenant-bound data tables
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys FORCE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE session_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_artifacts FORCE ROW LEVEL SECURITY;
ALTER TABLE media_analysis_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_analysis_jobs FORCE ROW LEVEL SECURITY;
ALTER TABLE branding_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE branding_configs FORCE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks FORCE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS api_keys_tenant_isolation ON api_keys;
CREATE POLICY api_keys_tenant_isolation ON api_keys
    USING (tenant_id = app.current_tenant_uuid())
    WITH CHECK (tenant_id = app.current_tenant_uuid());

DROP POLICY IF EXISTS sessions_tenant_isolation ON sessions;
CREATE POLICY sessions_tenant_isolation ON sessions
    USING (tenant_id = app.current_tenant_uuid())
    WITH CHECK (tenant_id = app.current_tenant_uuid());

DROP POLICY IF EXISTS session_artifacts_tenant_isolation ON session_artifacts;
CREATE POLICY session_artifacts_tenant_isolation ON session_artifacts
    USING (tenant_id = app.current_tenant_uuid())
    WITH CHECK (tenant_id = app.current_tenant_uuid());

DROP POLICY IF EXISTS media_analysis_jobs_tenant_isolation ON media_analysis_jobs;
CREATE POLICY media_analysis_jobs_tenant_isolation ON media_analysis_jobs
    USING (tenant_id = app.current_tenant_uuid())
    WITH CHECK (tenant_id = app.current_tenant_uuid());

DROP POLICY IF EXISTS branding_configs_tenant_isolation ON branding_configs;
CREATE POLICY branding_configs_tenant_isolation ON branding_configs
    USING (tenant_id = app.current_tenant_uuid())
    WITH CHECK (tenant_id = app.current_tenant_uuid());

DROP POLICY IF EXISTS usage_logs_tenant_isolation ON usage_logs;
CREATE POLICY usage_logs_tenant_isolation ON usage_logs
    USING (tenant_id = app.current_tenant_uuid())
    WITH CHECK (tenant_id = app.current_tenant_uuid());

DROP POLICY IF EXISTS webhook_logs_tenant_isolation ON webhook_logs;
CREATE POLICY webhook_logs_tenant_isolation ON webhook_logs
    USING (tenant_id = app.current_tenant_uuid())
    WITH CHECK (tenant_id = app.current_tenant_uuid());

DROP POLICY IF EXISTS webhooks_tenant_isolation ON webhooks;
CREATE POLICY webhooks_tenant_isolation ON webhooks
    USING (tenant_id = app.current_tenant_uuid())
    WITH CHECK (tenant_id = app.current_tenant_uuid());

DROP POLICY IF EXISTS invoices_tenant_isolation ON invoices;
CREATE POLICY invoices_tenant_isolation ON invoices
    USING (tenant_id = app.current_tenant_uuid())
    WITH CHECK (tenant_id = app.current_tenant_uuid());

-- Test tenant
INSERT INTO tenants (email, subscription_tier, monthly_quota, current_usage)
VALUES ('test@veraproof.ai', 'Sandbox', 3, 0)
ON CONFLICT (email) DO NOTHING;


-- Sandbox / Production canonical tenant environments
CREATE OR REPLACE FUNCTION app.current_environment_uuid()
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
    SELECT NULLIF(current_setting('app.current_environment', true), '')::uuid
$$;

CREATE TABLE IF NOT EXISTS tenant_environments (
    tenant_environment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    slug VARCHAR(32) NOT NULL CHECK (slug IN ('sandbox', 'production')),
    display_name VARCHAR(64) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    is_billable BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (tenant_id, slug)
);

CREATE TABLE IF NOT EXISTS tenant_environment_quotas (
    tenant_environment_id UUID PRIMARY KEY REFERENCES tenant_environments(tenant_environment_id) ON DELETE CASCADE,
    monthly_quota INTEGER DEFAULT 0,
    current_usage INTEGER DEFAULT 0,
    billing_cycle_start DATE,
    billing_cycle_end DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS active_environment_id UUID REFERENCES tenant_environments(tenant_environment_id) ON DELETE SET NULL;
ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS active_environment_slug VARCHAR(32);
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS tenant_environment_id UUID REFERENCES tenant_environments(tenant_environment_id) ON DELETE SET NULL;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS tenant_environment_id UUID REFERENCES tenant_environments(tenant_environment_id) ON DELETE SET NULL;
ALTER TABLE session_artifacts ADD COLUMN IF NOT EXISTS tenant_environment_id UUID REFERENCES tenant_environments(tenant_environment_id) ON DELETE SET NULL;
ALTER TABLE media_analysis_jobs ADD COLUMN IF NOT EXISTS tenant_environment_id UUID REFERENCES tenant_environments(tenant_environment_id) ON DELETE SET NULL;
ALTER TABLE usage_logs ADD COLUMN IF NOT EXISTS tenant_environment_id UUID REFERENCES tenant_environments(tenant_environment_id) ON DELETE SET NULL;
ALTER TABLE webhook_logs ADD COLUMN IF NOT EXISTS tenant_environment_id UUID REFERENCES tenant_environments(tenant_environment_id) ON DELETE SET NULL;
ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS tenant_environment_id UUID REFERENCES tenant_environments(tenant_environment_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tenant_environments_tenant_slug ON tenant_environments(tenant_id, slug);
CREATE INDEX IF NOT EXISTS idx_sessions_tenant_environment_id ON sessions(tenant_environment_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant_environment_id ON api_keys(tenant_environment_id);
CREATE INDEX IF NOT EXISTS idx_session_artifacts_environment_id ON session_artifacts(tenant_environment_id);
CREATE INDEX IF NOT EXISTS idx_media_analysis_jobs_environment_id ON media_analysis_jobs(tenant_environment_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_environment_id ON usage_logs(tenant_environment_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_environment_id ON webhook_logs(tenant_environment_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_environment_id ON webhooks(tenant_environment_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_active_environment_id ON auth_sessions(active_environment_id);

INSERT INTO tenant_environments (tenant_environment_id, tenant_id, slug, display_name, is_default, is_billable, created_at, updated_at)
SELECT uuid_generate_v4(), t.tenant_id, 'sandbox', 'Sandbox', FALSE, FALSE, NOW(), NOW()
FROM tenants t
ON CONFLICT (tenant_id, slug) DO NOTHING;

INSERT INTO tenant_environments (tenant_environment_id, tenant_id, slug, display_name, is_default, is_billable, created_at, updated_at)
SELECT uuid_generate_v4(), t.tenant_id, 'production', 'Production', TRUE, TRUE, NOW(), NOW()
FROM tenants t
ON CONFLICT (tenant_id, slug) DO NOTHING;

UPDATE tenant_environments
SET is_default = (slug = 'production'),
    is_billable = (slug = 'production'),
    updated_at = NOW()
WHERE is_default IS DISTINCT FROM (slug = 'production')
   OR is_billable IS DISTINCT FROM (slug = 'production');

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
           WHEN te.slug = 'production' THEN COALESCE(t.monthly_quota, 0)
           WHEN COALESCE(t.subscription_tier, 'Sandbox') = 'Enterprise' THEN 1000
           WHEN COALESCE(t.subscription_tier, 'Sandbox') IN ('Pro', 'Professional') THEN 500
           WHEN COALESCE(t.subscription_tier, 'Sandbox') = 'Starter' THEN 250
           ELSE 100
       END AS monthly_quota,
       CASE WHEN te.slug = 'production' THEN COALESCE(t.current_usage, 0) ELSE 0 END AS current_usage,
       COALESCE(t.billing_cycle_start, CURRENT_DATE),
       COALESCE(t.billing_cycle_end, CURRENT_DATE + INTERVAL '30 days'),
       NOW(),
       NOW()
FROM tenant_environments te
JOIN tenants t ON t.tenant_id = te.tenant_id
ON CONFLICT (tenant_environment_id) DO NOTHING;

UPDATE api_keys ak
SET tenant_environment_id = te.tenant_environment_id
FROM tenant_environments te
WHERE ak.tenant_environment_id IS NULL
  AND te.tenant_id = ak.tenant_id
  AND te.slug = COALESCE(ak.environment, 'production');

UPDATE sessions s
SET tenant_environment_id = te.tenant_environment_id
FROM tenant_environments te
WHERE s.tenant_environment_id IS NULL
  AND te.tenant_id = s.tenant_id
  AND te.slug = 'production';

UPDATE session_artifacts sa
SET tenant_environment_id = COALESCE(s.tenant_environment_id, te.tenant_environment_id)
FROM sessions s, tenant_environments te
WHERE sa.tenant_environment_id IS NULL
  AND sa.session_id = s.session_id
  AND te.tenant_id = sa.tenant_id
  AND te.slug = 'production';

UPDATE media_analysis_jobs maj
SET tenant_environment_id = te.tenant_environment_id
FROM tenant_environments te
WHERE maj.tenant_environment_id IS NULL
  AND te.tenant_id = maj.tenant_id
  AND te.slug = 'production';

UPDATE usage_logs ul
SET tenant_environment_id = COALESCE(s.tenant_environment_id, te.tenant_environment_id)
FROM sessions s, tenant_environments te
WHERE ul.tenant_environment_id IS NULL
  AND ul.session_id = s.session_id
  AND te.tenant_id = ul.tenant_id
  AND te.slug = 'production';

UPDATE webhook_logs wl
SET tenant_environment_id = COALESCE(s.tenant_environment_id, te.tenant_environment_id)
FROM sessions s, tenant_environments te
WHERE wl.tenant_environment_id IS NULL
  AND wl.session_id = s.session_id
  AND te.tenant_id = wl.tenant_id
  AND te.slug = 'production';

UPDATE webhook_logs wl
SET tenant_environment_id = te.tenant_environment_id
FROM tenant_environments te
WHERE wl.tenant_environment_id IS NULL
  AND te.tenant_id = wl.tenant_id
  AND te.slug = 'production';

UPDATE webhooks w
SET tenant_environment_id = te.tenant_environment_id
FROM tenant_environments te
WHERE w.tenant_environment_id IS NULL
  AND te.tenant_id = w.tenant_id
  AND te.slug = 'production';

UPDATE auth_sessions s
SET active_environment_id = te.tenant_environment_id,
    active_environment_slug = te.slug
FROM tenant_environments te
WHERE s.active_environment_id IS NULL
  AND te.tenant_id = s.org_id
  AND te.slug = 'production';

UPDATE auth_sessions
SET active_environment_slug = 'production'
WHERE active_environment_id IS NOT NULL
  AND COALESCE(active_environment_slug, '') = '';

ALTER TABLE tenant_environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_environments FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_environment_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_environment_quotas FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_environments_tenant_isolation ON tenant_environments;
CREATE POLICY tenant_environments_tenant_isolation ON tenant_environments
    USING (tenant_id = app.current_tenant_uuid())
    WITH CHECK (tenant_id = app.current_tenant_uuid());

DROP POLICY IF EXISTS tenant_environment_quotas_tenant_isolation ON tenant_environment_quotas;
CREATE POLICY tenant_environment_quotas_tenant_isolation ON tenant_environment_quotas
    USING (
        EXISTS (
            SELECT 1
            FROM tenant_environments te
            WHERE te.tenant_environment_id = tenant_environment_quotas.tenant_environment_id
              AND te.tenant_id = app.current_tenant_uuid()
              AND (app.current_environment_uuid() IS NULL OR te.tenant_environment_id = app.current_environment_uuid())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM tenant_environments te
            WHERE te.tenant_environment_id = tenant_environment_quotas.tenant_environment_id
              AND te.tenant_id = app.current_tenant_uuid()
              AND (app.current_environment_uuid() IS NULL OR te.tenant_environment_id = app.current_environment_uuid())
        )
    );

DROP POLICY IF EXISTS api_keys_tenant_isolation ON api_keys;
CREATE POLICY api_keys_tenant_isolation ON api_keys
    USING (tenant_id = app.current_tenant_uuid() AND (app.current_environment_uuid() IS NULL OR tenant_environment_id = app.current_environment_uuid()))
    WITH CHECK (tenant_id = app.current_tenant_uuid() AND (app.current_environment_uuid() IS NULL OR tenant_environment_id = app.current_environment_uuid()));

DROP POLICY IF EXISTS sessions_tenant_isolation ON sessions;
CREATE POLICY sessions_tenant_isolation ON sessions
    USING (tenant_id = app.current_tenant_uuid() AND (app.current_environment_uuid() IS NULL OR tenant_environment_id = app.current_environment_uuid()))
    WITH CHECK (tenant_id = app.current_tenant_uuid() AND (app.current_environment_uuid() IS NULL OR tenant_environment_id = app.current_environment_uuid()));

DROP POLICY IF EXISTS session_artifacts_tenant_isolation ON session_artifacts;
CREATE POLICY session_artifacts_tenant_isolation ON session_artifacts
    USING (tenant_id = app.current_tenant_uuid() AND (app.current_environment_uuid() IS NULL OR tenant_environment_id = app.current_environment_uuid()))
    WITH CHECK (tenant_id = app.current_tenant_uuid() AND (app.current_environment_uuid() IS NULL OR tenant_environment_id = app.current_environment_uuid()));

DROP POLICY IF EXISTS media_analysis_jobs_tenant_isolation ON media_analysis_jobs;
CREATE POLICY media_analysis_jobs_tenant_isolation ON media_analysis_jobs
    USING (tenant_id = app.current_tenant_uuid() AND (app.current_environment_uuid() IS NULL OR tenant_environment_id = app.current_environment_uuid()))
    WITH CHECK (tenant_id = app.current_tenant_uuid() AND (app.current_environment_uuid() IS NULL OR tenant_environment_id = app.current_environment_uuid()));

DROP POLICY IF EXISTS usage_logs_tenant_isolation ON usage_logs;
CREATE POLICY usage_logs_tenant_isolation ON usage_logs
    USING (tenant_id = app.current_tenant_uuid() AND (app.current_environment_uuid() IS NULL OR tenant_environment_id = app.current_environment_uuid()))
    WITH CHECK (tenant_id = app.current_tenant_uuid() AND (app.current_environment_uuid() IS NULL OR tenant_environment_id = app.current_environment_uuid()));

DROP POLICY IF EXISTS webhook_logs_tenant_isolation ON webhook_logs;
CREATE POLICY webhook_logs_tenant_isolation ON webhook_logs
    USING (tenant_id = app.current_tenant_uuid() AND (app.current_environment_uuid() IS NULL OR tenant_environment_id = app.current_environment_uuid()))
    WITH CHECK (tenant_id = app.current_tenant_uuid() AND (app.current_environment_uuid() IS NULL OR tenant_environment_id = app.current_environment_uuid()));

DROP POLICY IF EXISTS webhooks_tenant_isolation ON webhooks;
CREATE POLICY webhooks_tenant_isolation ON webhooks
    USING (tenant_id = app.current_tenant_uuid() AND (app.current_environment_uuid() IS NULL OR tenant_environment_id = app.current_environment_uuid()))
    WITH CHECK (tenant_id = app.current_tenant_uuid() AND (app.current_environment_uuid() IS NULL OR tenant_environment_id = app.current_environment_uuid()));
