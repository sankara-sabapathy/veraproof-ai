# Design Document (Condensed)

## Architecture Overview

**Principles**: Physics-First (Tier 1 math > Tier 2 AI), Sub-3s latency, API-first, Multi-tenant isolation, Mobile-only

**Components**:
1. **Verification Interface** (Vanilla JS): Mobile web app for end-user verification
2. **Partner Dashboard** (Angular 17+): Admin interface for partners
3. **Backend API** (FastAPI + Python 3.12): WebSocket + REST server with sensor fusion engine

## System Architecture

```
[Mobile Browser] --WSS--> [ALB] --> [FastAPI Instances] --> [PostgreSQL + S3]
[Partner App] --REST--> [ALB] --> [FastAPI Instances] --> [SageMaker + Razorpay]
[Dashboard] --HTTPS--> [CloudFront] --> [S3 Static Site]
```

## Key Interfaces

### 1. Verification Interface (Vanilla JS)

**Modules**:
- `DeviceDetector`: isDesktop(), hasSensorSupport()
- `VideoCapture`: initialize(), start(), stop(), onChunk()
- `IMUCollector`: start(), stop(), onData()
- `WSManager`: connect(), sendVideoChunk(), sendIMUBatch(), onMessage(), reconnect()
- `ChallengeController`: startBaseline(), startPan(), startReturn()
- `UIController`: showInstructions(), applyBranding(), showError(), showResult()

**Data Types**:
```typescript
interface IMUData {
  timestamp: number;
  acceleration: { x, y, z };
  rotationRate: { alpha, beta, gamma };
}

interface VerificationResult {
  status: 'success' | 'failed' | 'timeout';
  tier_1_score: number;
  tier_2_score?: number;
  final_trust_score: number;
  reasoning: string;
}
```

### 2. Partner Dashboard (Angular 17+)

**Components**:
- `LoginComponent`: login(), signup()
- `DashboardComponent`: Display stats, graphs, usage, billing
- `AnalyticsComponent`: filterByDateRange(), filterByStatus(), exportData()
- `SessionDetailsComponent`: loadSession(), downloadArtifact(), viewCorrelationGraph()
- `BrandingConfigComponent`: uploadLogo(), updateColors(), previewBranding()
- `APIKeysComponent`: generateKey(), revokeKey(), listKeys()
- `BillingComponent`: getCurrentPlan(), upgradePlan(), purchaseCredits()

### 3. Backend API (FastAPI)

**Core Classes**:

```python
# WebSocket Handler
class VerificationWebSocket:
    async def connect(session_id, websocket)
    async def handle_video_chunk(chunk)
    async def handle_imu_batch(imu_data)
    async def send_phase_change(phase)
    async def send_result(result)

# Optical Flow Engine
class OpticalFlowEngine:
    def compute_flow(frame) -> OpticalFlowResult
    def extract_horizontal_magnitude(flow) -> float

# Sensor Fusion Analyzer (Tier 1)
class SensorFusionAnalyzer:
    def calculate_pearson_correlation(gyro_gamma, optical_flow_x) -> float
    def calculate_tier_1_score(r) -> int  # Map r to 0-100
    def should_trigger_tier_2(r) -> bool  # r < 0.85

# AI Forensics Engine (Tier 2)
class AIForensicsEngine:
    async def detect_deepfake(video_path) -> DeepfakeResult
    def calculate_tier_2_score(result) -> int

# Trust Score Calculator
class TrustScoreCalculator:
    def calculate_final_score(tier_1, tier_2) -> (int, str)
    # If tier_2 is None: return tier_1
    # Otherwise: 60% tier_1 + 40% tier_2

# Session Manager
class SessionManager:
    async def create_session(tenant_id, metadata, return_url) -> Session
    async def get_session(session_id) -> Session
    async def update_session_state(session_id, state)
    async def extend_expiration(session_id)  # +10 minutes

# Artifact Storage Manager
class ArtifactStorageManager:
    async def store_video(tenant_id, session_id, video_data) -> s3_key
    async def store_imu_data(tenant_id, session_id, imu_data) -> s3_key
    async def generate_signed_url(s3_key, expiration=3600) -> url
    async def schedule_deletion(s3_key, days=90)

# Usage Quota Manager
class UsageQuotaManager:
    async def check_quota(tenant_id) -> bool
    async def decrement_quota(tenant_id)
    async def get_usage_stats(tenant_id) -> UsageStats
    async def send_quota_alert(tenant_id, percentage)

# Rate Limiter
class RateLimiter:
    async def check_rate_limit(tenant_id, limit_type) -> bool
    # limit_type: 'concurrent_sessions' or 'api_requests'

# Billing Manager
class BillingManager:
    async def create_subscription(tenant_id, plan, billing_cycle) -> RazorpayOrder
    async def purchase_credits(tenant_id, amount) -> RazorpayOrder
    async def handle_payment_success(payment_id)
    async def handle_payment_failure(payment_id)

# Webhook Manager
class WebhookManager:
    async def send_webhook(tenant_id, webhook_url, payload)
    async def retry_webhook(webhook_id, max_retries=3)
    def sign_payload(payload, secret) -> hmac_signature
```

**REST Endpoints**:
```
POST   /api/v1/sessions/create
GET    /api/v1/sessions/{id}
GET    /api/v1/sessions/{id}/results
GET    /api/v1/sessions/{id}/video
GET    /api/v1/sessions/{id}/imu-data
GET    /api/v1/sessions/{id}/optical-flow

POST   /api/v1/auth/signup
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout

POST   /api/v1/api-keys/generate
GET    /api/v1/api-keys/list
DELETE /api/v1/api-keys/{key_id}

POST   /api/v1/branding/logo
PUT    /api/v1/branding/colors
GET    /api/v1/branding

GET    /api/v1/billing/subscription
POST   /api/v1/billing/upgrade
POST   /api/v1/billing/purchase-credits
GET    /api/v1/billing/invoices

GET    /api/v1/analytics/stats
GET    /api/v1/analytics/sessions
GET    /api/v1/analytics/usage

POST   /api/v1/webhooks/configure
POST   /api/v1/webhooks/razorpay
```

## Database Schema (PostgreSQL)

```sql
-- Tenants (partners)
CREATE TABLE tenants (
    tenant_id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    subscription_tier VARCHAR(50) DEFAULT 'Sandbox',
    monthly_quota INTEGER DEFAULT 3,
    current_usage INTEGER DEFAULT 0,
    billing_cycle_start DATE,
    billing_cycle_end DATE,
    webhook_url VARCHAR(500),
    webhook_secret VARCHAR(255)
);

-- API Keys
CREATE TABLE api_keys (
    key_id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(tenant_id),
    api_key VARCHAR(255) UNIQUE,
    environment VARCHAR(20) CHECK (environment IN ('sandbox', 'production')),
    created_at TIMESTAMP,
    revoked_at TIMESTAMP
);

-- Sessions
CREATE TABLE sessions (
    session_id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(tenant_id),
    created_at TIMESTAMP,
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

-- Branding
CREATE TABLE branding_configs (
    tenant_id UUID PRIMARY KEY REFERENCES tenants(tenant_id),
    logo_url VARCHAR(500),
    primary_color VARCHAR(7),
    secondary_color VARCHAR(7),
    button_color VARCHAR(7)
);

-- Row-Level Security
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_api_keys ON api_keys
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_sessions ON sessions
    USING (tenant_id = current_setting('app.current_tenant')::UUID);
```

## S3 Bucket Structure

```
veraproof-artifacts/
├── {tenant_id}/
│   ├── sessions/
│   │   ├── {session_id}/
│   │   │   ├── video.webm
│   │   │   ├── imu_data.json
│   │   │   └── optical_flow.json
│   └── branding/
│       └── logo.png
```

## Error Handling

**Error Response Format**:
```json
{
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "Monthly verification quota exceeded",
    "details": { "current_usage": 100, "monthly_quota": 100 },
    "retry_after": null
  }
}
```

**Error Categories**:
- 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 429 Too Many Requests
- 500 Internal Server Error, 503 Service Unavailable, 504 Gateway Timeout

## Testing Strategy

**Dual Approach**:
- **Unit Tests**: Specific examples, edge cases, error conditions
- **Property Tests**: Universal properties across all inputs (100+ iterations)

**Property Test Library**: `hypothesis` (Python), `fast-check` (JavaScript)

**Tag Format**: `# Feature: veraproof-browser-prototype, Property X: Description`

## Correctness Properties (38 Total)

**Core Verification**:
1. Device Type Enforcement: Grant access iff mobile with sensors
2. Video Chunk Completeness: All chunks transmitted (immediate or buffered)
3. IMU Data Completeness: All fields present with ms timestamps
4. IMU-Video Sync: Timestamps within 50ms tolerance
5. Challenge Protocol: Complete baseline → pan → return sequence
6. Optical Flow Computation: Extract horizontal magnitude from frame pairs

**Sensor Fusion**:
7. Pearson Correlation: Deterministic, symmetric, range [-1, 1]
8. Correlation Threshold: Flag if r < 0.85, pass if r ≥ 0.85
9. Tier 1 Score Mapping: Monotonic, range [0, 100]
10. Tier 1 Score Boundaries: r ≥ 0.85 → [85,100], r < 0.85 → [0,84]
11. Tier 2 Triggering: Queue iff r < 0.85
12. Tier 2 Score Range: [0, 100]
13. Final Trust Score: tier_1 only OR 60% tier_1 + 40% tier_2, range [0,100]

**Session Management**:
14. Session ID Uniqueness: No collisions
15. Session State Machine: Valid transitions only
16. Session Expiration: +10min extension on verification start

**Multi-Tenancy & Security**:
17. Tenant Data Isolation: Query results filtered by tenant_id
18. JWT Token Structure: Contains user_id, tenant_id, role
19. JWT Signature Validation: Reject invalid signatures with 401
20. API Key Scoping: Unique tenant_id + environment per key

**Billing & Quota**:
21. Tier Upgrade Effect: Immediate quota/feature changes
22. Quota Decrement: -1 per completed verification
23. Quota Enforcement: 429 error when quota = 0
24. Monthly Quota Reset: Reset on billing anniversary

**Rate Limiting**:
25. Concurrent Session Limit: Max 10, reject 11th with 429
26. API Rate Limit: Max 100/min, reject excess with 429

**Artifact Storage**:
27. Production Artifact Storage: Store video, IMU, flow in S3
28. Sandbox Artifact Exclusion: No S3 storage for Sandbox
29. Artifact Retention: Delete after exactly 90 days
30. Signed URL Expiration: Valid for exactly 1 hour

**Redirect & Branding**:
31. Redirect URL Construction: return_url + session_id + status params
32. Logo File Size Validation: Reject > 2MB, accept ≤ 2MB with valid format
33. Branding Immediate Effect: New sessions use new branding

**Webhook**:
34. Webhook Payload Completeness: All required fields present
35. Webhook Retry Logic: Exactly 3 retries with 1s, 2s, 4s backoff
36. Webhook Signature Validity: HMAC-SHA256 verifiable with API secret

**Analytics**:
37. Dashboard Metrics Accuracy: Match actual usage_logs values

**Concurrency**:
38. Concurrent Session Processing: N ≤ 10 sessions process without blocking

## Cost Analysis

### POC Configuration (Recommended)

**Infrastructure**: $22/month
- Lightsail Container Micro (0.25 vCPU, 512MB): $7
- Lightsail Database Micro (1 vCPU, 1GB): $15
- S3 (7-day retention): $0.10
- No CloudFront, no SageMaker Tier 2

**Capacity**: 50-100 verifications/day, 5-10 partners

**Upgrade Path**:
- Phase 1 (POC): $22/month → 100 verifications/day
- Phase 2 (Early): $55/month → 500 verifications/day
- Phase 3 (Growth): $105/month → 2000 verifications/day
- Phase 4 (Scale): $230/month → 5000 verifications/day

### Production Configuration

**Infrastructure**: $172-$184/month
- Lightsail Container (1 vCPU, 2GB) × 2 nodes: $80-$120
- RDS db.t3.micro: $20
- S3 (90-day retention): $20
- CloudFront: $5
- SageMaker (on-demand): $3-5
- Razorpay fees: $14

**Capacity**: 1000 verifications/day

## Local Development

**Docker Compose Services**:
- PostgreSQL (localhost:5432)
- LocalStack (S3/Cognito mock, localhost:4566)
- Redis (localhost:6379)

**Mock Services**:
- LocalAuthManager: In-memory JWT auth (bypass Cognito)
- MockSageMakerClient: Random deepfake results
- MockRazorpayClient: Always-successful payments

**Default Credentials**:
- Email: admin@veraproof.local
- Password: admin123
- API Key: local-api-key-sandbox

**Startup**: `./scripts/dev-start.sh`

**Environment Variables**:
```bash
ENVIRONMENT=development
USE_LOCAL_AUTH=true
DATABASE_URL=postgresql://veraproof:dev_password@localhost:5432/veraproof
AWS_ENDPOINT_URL=http://localhost:4566
USE_MOCK_SAGEMAKER=true
USE_MOCK_RAZORPAY=true
```

## Deployment

**Frontend**: S3 + CloudFront (static sites)
**Backend**: Lightsail Container Service with ALB
**Database**: PostgreSQL with row-level security
**Storage**: S3 with 90-day lifecycle policy
**AI**: SageMaker endpoint (on-demand for POC)
**Auth**: AWS Cognito User Pools (production only)
**Billing**: Razorpay integration (production only)
