-- Add webhooks table for webhook management
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

CREATE INDEX IF NOT EXISTS idx_webhooks_tenant_id ON webhooks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_enabled ON webhooks(enabled);

-- Update webhook_logs table to reference webhooks table
ALTER TABLE webhook_logs 
ADD COLUMN IF NOT EXISTS webhook_id UUID REFERENCES webhooks(webhook_id) ON DELETE CASCADE;

ALTER TABLE webhook_logs
ADD COLUMN IF NOT EXISTS event_type VARCHAR(100);

ALTER TABLE webhook_logs
ADD COLUMN IF NOT EXISTS response_time_ms INTEGER;

ALTER TABLE webhook_logs
ADD COLUMN IF NOT EXISTS success BOOLEAN;

ALTER TABLE webhook_logs
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Rename columns for consistency
ALTER TABLE webhook_logs
RENAME COLUMN response_status TO status_code;

ALTER TABLE webhook_logs
RENAME COLUMN delivered_at TO timestamp;

-- Drop old columns
ALTER TABLE webhook_logs
DROP COLUMN IF EXISTS failed_at;

ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
