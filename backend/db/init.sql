-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table (for local authentication)
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'Admin',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tenant_id ON users(tenant_id);

-- Tenants Table
CREATE TABLE tenants (
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

-- API Keys Table
CREATE TABLE api_keys (
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
CREATE TABLE sessions (
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
    video_s3_key VARCHAR(500),
    imu_data_s3_key VARCHAR(500),
    optical_flow_s3_key VARCHAR(500)
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Branding Configuration Table
CREATE TABLE branding_configs (
    tenant_id UUID PRIMARY KEY REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    logo_url VARCHAR(500),
    primary_color VARCHAR(7),
    secondary_color VARCHAR(7),
    button_color VARCHAR(7),
    updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE branding_configs ENABLE ROW LEVEL SECURITY;

-- Usage Logs Table
CREATE TABLE usage_logs (
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
CREATE TABLE webhook_logs (
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
CREATE TABLE invoices (
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
CREATE INDEX idx_sessions_tenant_id ON sessions(tenant_id);
CREATE INDEX idx_sessions_created_at ON sessions(created_at);
CREATE INDEX idx_usage_logs_tenant_timestamp ON usage_logs(tenant_id, timestamp);
CREATE INDEX idx_api_keys_tenant_id ON api_keys(tenant_id);

-- Test tenant
INSERT INTO tenants (email, subscription_tier, monthly_quota, current_usage)
VALUES ('test@veraproof.ai', 'Sandbox', 3, 0);
