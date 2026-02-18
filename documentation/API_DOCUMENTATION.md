# VeraProof AI - API Documentation

## Base URL

**Development:** `http://localhost:8000`  
**Production:** `https://api.veraproof.ai`

## Authentication

VeraProof AI uses two authentication methods:

### 1. JWT Tokens (Dashboard)
Used for partner dashboard access.

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. API Keys (B2B Integration)
Used for programmatic API access.

```http
Authorization: Bearer vp_sandbox_a1b2c3d4e5f6g7h8i9j0...
```

## API Endpoints

### Authentication

#### POST /api/v1/auth/signup
Create a new partner account.

**Request:**
```json
{
  "email": "partner@example.com",
  "password": "securepassword123"
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGci...",
  "refresh_token": "eyJhbGci...",
  "token_type": "bearer",
  "user": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "tenant_id": "660e8400-e29b-41d4-a716-446655440000",
    "email": "partner@example.com",
    "role": "Admin"
  }
}
```

**Errors:**
- `400`: User already exists
- `400`: Invalid email format
- `400`: Password too short

---

#### POST /api/v1/auth/login
Login to partner account.

**Request:**
```json
{
  "email": "partner@example.com",
  "password": "securepassword123"
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGci...",
  "refresh_token": "eyJhbGci...",
  "token_type": "bearer",
  "user": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "tenant_id": "660e8400-e29b-41d4-a716-446655440000",
    "email": "partner@example.com",
    "role": "Admin"
  }
}
```

**Errors:**
- `401`: Invalid credentials

---

#### POST /api/v1/auth/refresh
Refresh access token using refresh token.

**Request:**
```json
{
  "refresh_token": "eyJhbGci..."
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGci...",
  "token_type": "bearer"
}
```

**Errors:**
- `401`: Invalid or expired refresh token

---

#### POST /api/v1/auth/logout
Logout and invalidate refresh token.

**Request:**
```json
{
  "refresh_token": "eyJhbGci..."
}
```

**Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

---

### API Key Management

#### POST /api/v1/api-keys/generate
Generate a new API key.

**Authentication:** JWT Token (Dashboard)

**Request:**
```json
{
  "environment": "sandbox"
}
```

**Parameters:**
- `environment`: "sandbox" or "production"

**Response (200 OK):**
```json
{
  "key_id": "770e8400-e29b-41d4-a716-446655440000",
  "api_key": "vp_sandbox_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "api_secret": "q7r8s9t0u1v2w3x4y5z6",
  "environment": "sandbox"
}
```

**Note:** Store the `api_key` securely. It cannot be retrieved again.

---

#### GET /api/v1/api-keys/list
List all API keys for the tenant.

**Authentication:** API Key

**Response (200 OK):**
```json
{
  "keys": [
    {
      "key_id": "770e8400-e29b-41d4-a716-446655440000",
      "api_key": "vp_sandbox_a1b2...****o5p6",
      "environment": "sandbox",
      "created_at": "2026-02-18T10:30:00Z",
      "revoked_at": null
    }
  ]
}
```

---

#### DELETE /api/v1/api-keys/{key_id}
Revoke an API key.

**Authentication:** API Key

**Response (200 OK):**
```json
{
  "message": "API key revoked"
}
```

**Errors:**
- `404`: API key not found

---

### Session Management

#### POST /api/v1/sessions/create
Create a new verification session.

**Authentication:** API Key

**Request:**
```json
{
  "metadata": {
    "user_id": "user-123",
    "transaction_id": "txn-456",
    "custom_field": "custom_value"
  },
  "return_url": "https://yourapp.com/verification/callback"
}
```

**Parameters:**
- `metadata` (optional): Custom key-value pairs
- `return_url` (optional): URL to redirect after verification

**Response (200 OK):**
```json
{
  "session_id": "880e8400-e29b-41d4-a716-446655440000",
  "session_url": "https://verify.veraproof.ai/?session_id=880e8400...",
  "expires_at": "2026-02-18T11:00:00Z",
  "state": "pending"
}
```

**Errors:**
- `429`: Usage quota exceeded
- `429`: API rate limit exceeded
- `401`: Invalid API key

---

#### GET /api/v1/sessions/{session_id}
Get session details.

**Authentication:** API Key

**Response (200 OK):**
```json
{
  "session_id": "880e8400-e29b-41d4-a716-446655440000",
  "tenant_id": "660e8400-e29b-41d4-a716-446655440000",
  "state": "completed",
  "created_at": "2026-02-18T10:30:00Z",
  "expires_at": "2026-02-18T11:00:00Z",
  "completed_at": "2026-02-18T10:35:00Z",
  "metadata": {
    "user_id": "user-123",
    "transaction_id": "txn-456"
  },
  "return_url": "https://yourapp.com/verification/callback",
  "tier_1_score": 92,
  "tier_2_score": null,
  "final_trust_score": 92,
  "correlation_value": 0.92,
  "reasoning": "Strong correlation between sensor and video data indicates authentic verification."
}
```

**States:**
- `pending`: Session created, awaiting user
- `in_progress`: User started verification
- `processing`: Analyzing data
- `completed`: Verification complete
- `failed`: Verification failed
- `expired`: Session expired

**Errors:**
- `404`: Session not found
- `403`: Access denied (wrong tenant)

---

#### GET /api/v1/sessions/{session_id}/results
Get verification results.

**Authentication:** API Key

**Response (200 OK):**
```json
{
  "session_id": "880e8400-e29b-41d4-a716-446655440000",
  "tier_1_score": 92,
  "tier_2_score": null,
  "final_trust_score": 92,
  "correlation_value": 0.92,
  "reasoning": "Strong correlation between sensor and video data indicates authentic verification.",
  "state": "completed"
}
```

**Score Interpretation:**
- `85-100`: Verified (high confidence)
- `70-84`: Likely authentic (medium confidence)
- `50-69`: Suspicious (low confidence)
- `0-49`: Fraudulent (very low confidence)

**Errors:**
- `404`: Session not found
- `403`: Access denied

---

### Artifact Access

#### GET /api/v1/sessions/{session_id}/video
Get signed URL for video artifact.

**Authentication:** API Key

**Response (200 OK):**
```json
{
  "url": "https://s3.amazonaws.com/veraproof-artifacts/video/880e8400...?X-Amz-Signature=..."
}
```

**Note:** URL expires in 1 hour.

**Errors:**
- `404`: Session not found or video not available
- `403`: Access denied

---

#### GET /api/v1/sessions/{session_id}/imu-data
Get signed URL for IMU data artifact.

**Authentication:** API Key

**Response (200 OK):**
```json
{
  "url": "https://s3.amazonaws.com/veraproof-artifacts/imu/880e8400...?X-Amz-Signature=..."
}
```

**IMU Data Format (JSON):**
```json
{
  "samples": [
    {
      "timestamp": 1708254600000,
      "acceleration": {
        "x": 0.12,
        "y": -0.05,
        "z": 9.81
      },
      "rotation_rate": {
        "alpha": 0.01,
        "beta": 0.02,
        "gamma": 0.15
      }
    }
  ]
}
```

---

#### GET /api/v1/sessions/{session_id}/optical-flow
Get signed URL for optical flow data artifact.

**Authentication:** API Key

**Response (200 OK):**
```json
{
  "url": "https://s3.amazonaws.com/veraproof-artifacts/flow/880e8400...?X-Amz-Signature=..."
}
```

**Optical Flow Data Format (JSON):**
```json
{
  "frames": [
    {
      "timestamp": 1708254600000,
      "horizontal_magnitude": 12.5,
      "vertical_magnitude": 2.3
    }
  ]
}
```

---

### Branding

#### POST /api/v1/branding/logo
Upload partner logo.

**Authentication:** API Key

**Request:** `multipart/form-data`
- `file`: Logo file (PNG/JPG/SVG, max 2MB)

**Response (200 OK):**
```json
{
  "logo_url": "https://s3.amazonaws.com/veraproof-branding/660e8400.../logo.png"
}
```

**Errors:**
- `400`: File too large (max 2MB)
- `400`: Invalid file format

---

#### PUT /api/v1/branding/colors
Update brand colors.

**Authentication:** API Key

**Request:**
```json
{
  "primary_color": "#FF5733",
  "secondary_color": "#33FF57",
  "button_color": "#3357FF"
}
```

**Response (200 OK):**
```json
{
  "message": "Branding colors updated"
}
```

**Errors:**
- `400`: Invalid hex color format

---

#### GET /api/v1/branding
Get current branding configuration.

**Authentication:** API Key

**Response (200 OK):**
```json
{
  "logo_url": "https://s3.amazonaws.com/veraproof-branding/660e8400.../logo.png",
  "primary_color": "#FF5733",
  "secondary_color": "#33FF57",
  "button_color": "#3357FF"
}
```

---

### Billing

#### GET /api/v1/billing/subscription
Get current subscription details.

**Authentication:** API Key

**Response (200 OK):**
```json
{
  "tenant_id": "660e8400-e29b-41d4-a716-446655440000",
  "subscription_tier": "Sandbox",
  "monthly_quota": 100,
  "current_usage": 45,
  "billing_cycle_start": "2026-02-01",
  "billing_cycle_end": "2026-03-01"
}
```

**Subscription Tiers:**
- `Sandbox`: 100 verifications/month (free)
- `Starter`: 1,000 verifications/month
- `Professional`: 10,000 verifications/month
- `Enterprise`: Custom quota

---

#### POST /api/v1/billing/upgrade
Upgrade subscription plan.

**Authentication:** API Key

**Request:**
```json
{
  "plan": "Professional"
}
```

**Response (200 OK):**
```json
{
  "order_id": "order_123",
  "amount": 9900,
  "currency": "INR",
  "payment_url": "https://razorpay.com/checkout/order_123"
}
```

---

#### POST /api/v1/billing/purchase-credits
Purchase additional credits.

**Authentication:** API Key

**Request:**
```json
{
  "amount": 500
}
```

**Response (200 OK):**
```json
{
  "order_id": "order_124",
  "amount": 2500,
  "currency": "INR",
  "payment_url": "https://razorpay.com/checkout/order_124"
}
```

---

#### GET /api/v1/billing/invoices
Get billing invoices.

**Authentication:** API Key

**Response (200 OK):**
```json
{
  "invoices": [
    {
      "invoice_id": "inv_123",
      "date": "2026-02-01",
      "amount": 9900,
      "currency": "INR",
      "status": "paid",
      "pdf_url": "https://..."
    }
  ]
}
```

---

### Analytics

#### GET /api/v1/analytics/stats
Get analytics statistics.

**Authentication:** API Key

**Response (200 OK):**
```json
{
  "total_verifications": 1250,
  "verified_count": 1100,
  "suspicious_count": 150,
  "pass_rate": 88.0,
  "average_trust_score": 87.5,
  "average_correlation": 0.89
}
```

---

#### GET /api/v1/analytics/sessions
Get session list with filtering.

**Authentication:** API Key

**Query Parameters:**
- `limit` (optional): Max results (default: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response (200 OK):**
```json
{
  "sessions": [
    {
      "session_id": "880e8400-e29b-41d4-a716-446655440000",
      "created_at": "2026-02-18T10:30:00Z",
      "state": "completed",
      "final_trust_score": 92,
      "metadata": {
        "user_id": "user-123"
      }
    }
  ]
}
```

---

#### GET /api/v1/analytics/usage
Get usage statistics.

**Authentication:** API Key

**Response (200 OK):**
```json
{
  "monthly_quota": 100,
  "current_usage": 45,
  "remaining": 55,
  "usage_percentage": 45.0,
  "billing_cycle_start": "2026-02-01",
  "billing_cycle_end": "2026-03-01"
}
```

---

## WebSocket Protocol

### Connection

```javascript
const ws = new WebSocket('wss://api.veraproof.ai/api/v1/ws/verify/SESSION_ID');
```

### Server → Client Messages

#### Branding
```json
{
  "type": "branding",
  "data": {
    "logo_url": "https://...",
    "primary_color": "#FF5733",
    "secondary_color": "#33FF57",
    "button_color": "#3357FF"
  }
}
```

#### Phase Change
```json
{
  "type": "phase_change",
  "phase": "baseline"
}
```

**Phases:** `baseline`, `pan`, `return`, `processing`, `complete`

#### Result
```json
{
  "type": "result",
  "data": {
    "tier_1_score": 92,
    "tier_2_score": null,
    "final_trust_score": 92,
    "correlation_value": 0.92,
    "reasoning": "Strong correlation...",
    "return_url": "https://yourapp.com/callback"
  }
}
```

#### Error
```json
{
  "type": "error",
  "message": "Session expired"
}
```

### Client → Server Messages

#### Video Chunk (Binary)
Send video chunks as binary WebSocket frames.

#### IMU Batch (JSON)
```json
{
  "type": "imu_batch",
  "samples": [
    {
      "timestamp": 1708254600000,
      "acceleration": {"x": 0.12, "y": -0.05, "z": 9.81},
      "rotation_rate": {"alpha": 0.01, "beta": 0.02, "gamma": 0.15}
    }
  ]
}
```

---

## Rate Limits

- **API Requests:** 100 requests/minute per tenant
- **Concurrent Sessions:** 10 simultaneous verifications per tenant
- **Session Creation:** Unlimited (subject to quota)

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1708254660
```

**Rate Limit Error (429):**
```json
{
  "detail": "API rate limit exceeded"
}
```

---

## Webhooks

Configure webhook URL in dashboard to receive real-time notifications.

### Webhook Payload

```json
{
  "event": "verification.completed",
  "session_id": "880e8400-e29b-41d4-a716-446655440000",
  "tenant_id": "660e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-02-18T10:35:00Z",
  "data": {
    "state": "completed",
    "tier_1_score": 92,
    "tier_2_score": null,
    "final_trust_score": 92,
    "correlation_value": 0.92,
    "metadata": {
      "user_id": "user-123",
      "transaction_id": "txn-456"
    }
  }
}
```

### Webhook Signature

Verify webhook authenticity using HMAC-SHA256:

```python
import hmac
import hashlib

def verify_webhook(payload, signature, secret):
    expected = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
```

**Header:** `X-VeraProof-Signature`

### Webhook Events

- `verification.completed`: Verification finished
- `verification.failed`: Verification failed
- `quota.warning`: 80% quota reached
- `quota.exceeded`: 100% quota reached

### Retry Logic

Failed webhooks are retried with exponential backoff:
- Attempt 1: Immediate
- Attempt 2: +1 second
- Attempt 3: +2 seconds
- Attempt 4: +4 seconds

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid or missing authentication |
| 403 | Forbidden - Access denied |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limit or quota exceeded |
| 500 | Internal Server Error - Server error |

---

## SDKs and Examples

### cURL Example

```bash
curl -X POST https://api.veraproof.ai/api/v1/sessions/create \
  -H "Authorization: Bearer vp_sandbox_..." \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {"user_id": "user-123"},
    "return_url": "https://yourapp.com/callback"
  }'
```

### Python Example

```python
import requests

API_KEY = "vp_sandbox_..."
BASE_URL = "https://api.veraproof.ai"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# Create session
response = requests.post(
    f"{BASE_URL}/api/v1/sessions/create",
    headers=headers,
    json={
        "metadata": {"user_id": "user-123"},
        "return_url": "https://yourapp.com/callback"
    }
)

session = response.json()
print(f"Session URL: {session['session_url']}")
```

### JavaScript Example

```javascript
const API_KEY = "vp_sandbox_...";
const BASE_URL = "https://api.veraproof.ai";

// Create session
const response = await fetch(`${BASE_URL}/api/v1/sessions/create`, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${API_KEY}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    metadata: { user_id: "user-123" },
    return_url: "https://yourapp.com/callback"
  })
});

const session = await response.json();
console.log(`Session URL: ${session.session_url}`);
```

---

## Support

- **Documentation:** https://docs.veraproof.ai
- **API Status:** https://status.veraproof.ai
- **Support Email:** support@veraproof.ai
- **Dashboard:** https://dashboard.veraproof.ai
