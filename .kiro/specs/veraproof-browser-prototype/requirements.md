# Requirements (Condensed)

## Core Requirements

### 1. Mobile-Only Enforcement (Req 1)
- Block desktop/laptop access
- Require DeviceMotionEvent API (60Hz IMU)
- Support iOS 14+, Android 10+, Safari/Chrome/Samsung browsers

### 2. Frontend Architecture (Req 2)
- **Verification Interface**: Vanilla JS (minimal bundle)
- **Partner Dashboard**: Angular 17+ standalone components
- Deploy both on S3 + CloudFront with HTTPS/TLS 1.3

### 3. Real-Time Video Streaming (Req 3)
- MediaRecorder: 250ms chunks via WebSocket (WSS)
- Buffer and retry on transmission failure
- Reconnect on connection drop

### 4. IMU Data Collection (Req 4)
- 60Hz DeviceMotionEvent sampling
- Record: acceleration (x,y,z), rotation (α,β,γ), millisecond timestamps
- Batch transmission synchronized with video chunks

### 5. Pan & Return Protocol (Req 5)
- **Baseline**: 1s static hold
- **Pan**: "Tilt right" - track Gyro Gamma vs Optical Flow X
- **Return**: "Return center" - continue tracking
- Calculate Pearson r after completion

### 6. Optical Flow Analysis (Req 6)
- OpenCV Farneback algorithm on consecutive frames
- Extract horizontal movement (Optical Flow X)
- Synchronize timestamps with IMU data

### 7. Tier 1: Sensor Fusion (Req 7)
- Calculate Pearson r between Gyro Gamma and Optical Flow X
- **Pass**: r ≥ 0.85 → Tier_1_Score (85-100)
- **Fail**: r < 0.85 → Tier_1_Score (0-84), queue Tier 2
- **Latency**: Complete within 3 seconds

### 8. Tier 2: AI Forensics (Req 8)
- Trigger only if r < 0.85
- Amazon SageMaker: detect diffusion artifacts, GAN ghosting
- Calculate Tier_2_Score (0-100)
- Final_Trust_Score = 60% Tier1 + 40% Tier2
- Complete within 30 seconds

### 9. Sub-3-Second Latency (Req 9)
- Tier 1 results within 3s of challenge completion
- Log warning at 2.5s, timeout error at 3s

### 10. Session Management (Req 10)
- Unique session_id (UUID)
- States: idle → baseline → pan → return → analyzing → complete
- Expiration: 15min initial, extend +10min when verification starts
- Cleanup abandoned sessions after expiration

### 11. Error Handling (Req 11)
- Specific error messages for sensor/network/camera issues
- Buffer data during connectivity loss
- Provide retry options for recoverable errors

### 12. Multi-Tenancy (Req 12)
- PostgreSQL row-level security with tenant_id partitioning
- Unique tenant_id (UUID) per partner
- JWT contains tenant_id for API request filtering
- Complete cross-tenant data isolation

### 13. Authentication (Req 13)
- AWS Cognito User Pools for partners
- JWT: 1hr expiration, 30-day refresh token
- Roles: Admin, Developer, Viewer (RBAC)
- API keys map to tenant_id for programmatic access
- httpOnly cookies for XSS protection

### 14. Partner Onboarding (Req 14)
- Signup creates tenant_id + API credentials
- Sandbox tier: 3 verifications/month (free)
- Integration docs, SDKs (JS/Python/PHP), webhook registration
- Email verification required

### 15. Subscription Tiers (Req 15)
- **Sandbox**: 3/month, no artifacts (free)
- **Starter**: 100/month, full artifacts
- **Pro**: 1000/month, full artifacts
- **Enterprise**: Custom, full artifacts
- Razorpay integration (2% + ₹3 per transaction)
- Monthly/yearly billing, immediate tier changes

### 16. Usage Tracking (Req 16)
- Track verifications per tenant per billing cycle
- Decrement quota/credits on completion
- 429 error when quota exhausted
- Email alerts at 80% and 100% usage
- Reset monthly quotas on billing anniversary

### 17. Rate Limiting (Req 17)
- 10 concurrent sessions per tenant (default)
- 100 API requests/minute per tenant
- HTTP 429 with exponential backoff on exceed
- Enterprise tier: custom limits

### 18. Artifact Storage (Req 18)
- **Production**: Store video, IMU, optical flow in S3
- **Sandbox**: No artifact storage
- 90-day retention, auto-delete after
- S3 server-side encryption at rest
- Structure: `s3://{bucket}/{tenant_id}/sessions/{session_id}/`

### 19. Partner API (Req 19)
- POST /sessions/create → session_url + session_id
- Accept: return_url, metadata (user_id, transaction_id, custom_fields)
- 15-minute session expiration
- API key in Authorization header
- Check quota before creating sessions

### 20. Artifact Access APIs (Req 20)
- GET /sessions/{id}/video → signed S3 URL (1hr expiration)
- GET /sessions/{id}/imu-data → signed S3 URL
- GET /sessions/{id}/optical-flow → signed S3 URL
- GET /sessions/{id}/results → complete verification results
- Enforce tenant_id isolation
- 404 for Sandbox artifacts

### 21. User Redirect Flow (Req 21)
- Display partner branding if configured
- Redirect to return_url with query params: session_id, status (success/failed/cancelled)
- Load branding from tenant_id in session URL
- Show "Sandbox Mode" indicator in Sandbox

### 22. Partner Branding (Req 22)
- Upload logo (PNG/JPG/SVG, max 2MB)
- Configure colors: primary, secondary, button (hex codes)
- Live preview in dashboard
- Store in S3 with tenant_id prefix
- Default VeraProof branding if not configured
- Immediate effect on new sessions

### 23. Trust Score Delivery (Req 23)
- Tier_1_Score: r ≥ 0.85 → 85-100, r < 0.85 → 0-84
- Tier_2_Score: 0-100 from deepfake confidence
- Final_Trust_Score: weighted average with reasoning
- Deliver via webhook + REST API query
- Enforce tenant_id isolation

### 24. Webhook Delivery (Req 24)
- POST to partner's webhook URL on completion
- Payload: session_id, tier_1_score, tier_2_score, final_trust_score, status, timestamp
- HMAC-SHA256 signature with API secret
- Retry 3x with exponential backoff (1s, 2s, 4s)
- Log failures for manual review

### 25. Partner Dashboard (Req 25)
- Display: total verifications, pass rate, avg trust score
- Time-series graphs, date/status filtering
- Session details with correlation data
- Cognito authentication required
- Tenant_id isolation enforced
- Show subscription tier, usage quota, billing info

### 26. Backend Infrastructure (Req 26)
- AWS Lightsail Container (FastAPI, Python 3.12+, OpenCV-Headless)
- PostgreSQL with row-level security
- Auto-scaling based on CPU/memory
- Application Load Balancer for traffic distribution
- Concurrent session processing without blocking

### 27. Data Security (Req 27)
- WSS with TLS 1.3 for all transmission
- S3 server-side encryption at rest
- 90-day artifact retention, then delete
- No third-party data sharing without consent
- Anonymize PII in logs
- Tenant isolation prevents cross-partner data access
- GDPR compliance
