-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
    webhook_secret VARCHAR(255)
);

-- Users Table (for local authentication)
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'Admin',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);

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

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

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

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Media Analysis Jobs Table
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

ALTER TABLE media_analysis_jobs ENABLE ROW LEVEL SECURITY;

-- Branding Configuration Table
CREATE TABLE IF NOT EXISTS branding_configs (
    tenant_id UUID PRIMARY KEY REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    logo_url VARCHAR(500),
    primary_color VARCHAR(7),
    secondary_color VARCHAR(7),
    button_color VARCHAR(7),
    updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE branding_configs ENABLE ROW LEVEL SECURITY;

-- Usage Logs Table
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

ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- Webhook Delivery Logs
CREATE TABLE IF NOT EXISTS webhook_logs (
    log_id BIGSERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(session_id) ON DELETE CASCADE,
    webhook_url VARCHAR(500),
    payload JSONB,
    response_status INTEGER,
    retry_count INTEGER DEFAULT 0,
    delivered_at TIMESTAMP,
    failed_at TIMESTAMP
);

ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Invoices Table
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

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_tenant_id ON sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_media_analysis_jobs_tenant_id ON media_analysis_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_media_analysis_jobs_created_at ON media_analysis_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_media_analysis_jobs_status ON media_analysis_jobs(status);
CREATE INDEX IF NOT EXISTS idx_usage_logs_tenant_timestamp ON usage_logs(tenant_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant_id ON api_keys(tenant_id);

-- ============================================================
-- Idempotent Schema Migrations
-- These ALTER statements ensure newer columns are added to
-- pre-existing tables. Safe to re-run on every container boot.
-- ============================================================

-- Sessions: columns added after initial schema
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

-- Media analysis jobs: additive columns for iterative rollout
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

-- Tenants: webhook support columns
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS webhook_url VARCHAR(500);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS webhook_secret VARCHAR(255);

-- Test tenant
INSERT INTO tenants (email, subscription_tier, monthly_quota, current_usage)
VALUES ('test@veraproof.ai', 'Sandbox', 3, 0)
ON CONFLICT (email) DO NOTHING;


