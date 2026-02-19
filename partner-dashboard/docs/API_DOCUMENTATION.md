# VeraProof AI Partner Dashboard - Backend API Documentation

## Overview

This document provides comprehensive documentation for all backend API endpoints required by the VeraProof AI Partner Dashboard. The API follows RESTful principles and uses JSON for request/response payloads.

**Base URL:** `https://api.veraproof.ai/api/v1`

**Authentication:** Bearer token (JWT) in Authorization header

**Content Type:** `application/json`

---

## Table of Contents

1. [Authentication Endpoints](#authentication-endpoints)
2. [API Keys Endpoints](#api-keys-endpoints)
3. [Sessions Endpoints](#sessions-endpoints)
4. [Analytics Endpoints](#analytics-endpoints)
5. [Billing Endpoints](#billing-endpoints)
6. [Webhooks Endpoints](#webhooks-endpoints)
7. [Branding Endpoints](#branding-endpoints)
8. [Admin Endpoints](#admin-endpoints)
9. [Common Error Codes](#common-error-codes)
10. [Rate Limiting](#rate-limiting)

---

## Authentication Endpoints

### POST /auth/login

Authenticate user with email and password.

**Request Body:**
```json
{
  "email": "string (required, max 254 chars, RFC 5322 format)",
  "password": "string (required, min 8 chars, max 128 chars)"
}
```

**Validation Rules:**
- Email: RFC 5322 compliant, max 254 characters
- Password: Min 8 characters, max 128 characters, must contain uppercase, lowercase, number, special character

**Response (200 OK):**
```json
{
  "access_token": "string (JWT token)",
  "refresh_token": "string (JWT token)",
  "token_type": "Bearer",
  "user": {
    "user_id": "string (UUID)",
    "tenant_id": "string (UUID)",
    "email": "string",
    "role": "Admin | Master_Admin"
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid credentials
- `429 Too Many Requests`: Rate limit exceeded (Retry-After header included)
- `400 Bad Request`: Validation error


---

### POST /auth/signup

Create new user account.

**Request Body:**
```json
{
  "email": "string (required, max 254 chars, RFC 5322 format)",
  "password": "string (required, min 8 chars, max 128 chars)"
}
```

**Validation Rules:**
- Email: RFC 5322 compliant, max 254 characters, must be unique
- Password: Min 8 characters, max 128 characters, must contain uppercase, lowercase, number, special character

**Response (201 Created):**
```json
{
  "access_token": "string (JWT token)",
  "refresh_token": "string (JWT token)",
  "token_type": "Bearer",
  "user": {
    "user_id": "string (UUID)",
    "tenant_id": "string (UUID)",
    "email": "string",
    "role": "Admin"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validation error
- `409 Conflict`: Email already exists

---

### POST /auth/refresh

Refresh access token using refresh token.

**Request Body:**
```json
{
  "refresh_token": "string (required, JWT token)"
}
```

**Response (200 OK):**
```json
{
  "access_token": "string (JWT token)",
  "refresh_token": "string (JWT token)",
  "token_type": "Bearer"
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or expired refresh token

---

## API Keys Endpoints

### POST /api-keys

Generate new API key for tenant.

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "environment": "sandbox | production (required)"
}
```

**Validation Rules:**
- Environment: Must be 'sandbox' or 'production'

**Response (201 Created):**
```json
{
  "key_id": "string (UUID)",
  "api_key": "string (UUID format)",
  "api_secret": "string (min 32 chars, cryptographically secure)",
  "environment": "sandbox | production",
  "created_at": "string (ISO 8601 datetime)"
}
```

**Error Responses:**
- `400 Bad Request`: Validation error
- `403 Forbidden`: Quota exceeded
- `401 Unauthorized`: Invalid or missing token


---

### GET /api-keys

List all API keys for authenticated tenant.

**Authentication:** Required (Bearer token)

**Response (200 OK):**
```json
[
  {
    "key_id": "string (UUID)",
    "api_key": "string (masked, shows last 4 chars)",
    "environment": "sandbox | production",
    "created_at": "string (ISO 8601 datetime)",
    "last_used_at": "string | null (ISO 8601 datetime)",
    "total_calls": "number",
    "revoked_at": "string | null (ISO 8601 datetime)"
  }
]
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing token

---

### DELETE /api-keys/{id}

Revoke API key.

**Authentication:** Required (Bearer token)

**Path Parameters:**
- `id`: API key ID (UUID)

**Response (204 No Content)**

**Error Responses:**
- `404 Not Found`: API key not found
- `403 Forbidden`: Not owner of API key
- `401 Unauthorized`: Invalid or missing token

---

### GET /api-keys/{id}/usage

Get usage statistics for specific API key.

**Authentication:** Required (Bearer token)

**Path Parameters:**
- `id`: API key ID (UUID)

**Response (200 OK):**
```json
{
  "key_id": "string (UUID)",
  "total_calls": "number",
  "calls_today": "number",
  "calls_this_week": "number",
  "calls_this_month": "number",
  "last_used_at": "string | null (ISO 8601 datetime)"
}
```

**Error Responses:**
- `404 Not Found`: API key not found
- `401 Unauthorized`: Invalid or missing token

---

## Sessions Endpoints

### POST /sessions

Create new verification session.

**Authentication:** Required (Bearer token or API key)

**Request Body:**
```json
{
  "return_url": "string (required, valid HTTP/HTTPS URL, max 2048 chars)",
  "metadata": "object | null (optional, max 10 keys, each key max 50 chars, each value max 500 chars)"
}
```

**Validation Rules:**
- return_url: Must be valid HTTP/HTTPS URL, max 2048 characters
- metadata: Optional JSON object, max 10 keys, alphanumeric keys only

**Response (201 Created):**
```json
{
  "session_id": "string (UUID)",
  "session_url": "string (full URL to verification interface)",
  "expires_at": "string (ISO 8601 datetime, 15 minutes from creation)"
}
```

**Error Responses:**
- `400 Bad Request`: Validation error
- `403 Forbidden`: Quota exceeded
- `401 Unauthorized`: Invalid or missing authentication


---

### GET /sessions

List verification sessions for authenticated tenant.

**Authentication:** Required (Bearer token)

**Query Parameters:**
- `limit`: number (optional, default 25, max 100)
- `offset`: number (optional, default 0, min 0)
- `status`: string (optional, filter by status: 'success' | 'failed' | 'timeout' | 'cancelled')
- `date_from`: string (optional, ISO 8601 date)
- `date_to`: string (optional, ISO 8601 date)
- `search`: string (optional, search by session ID or metadata, min 3 chars)

**Response (200 OK):**
```json
{
  "sessions": [
    {
      "session_id": "string (UUID)",
      "tenant_id": "string (UUID)",
      "state": "idle | baseline | pan | return | analyzing | complete",
      "tier_1_score": "number | null (0-100)",
      "tier_2_score": "number | null (0-100)",
      "final_trust_score": "number | null (0-100)",
      "correlation_value": "number | null (Pearson correlation coefficient)",
      "reasoning": "string | null",
      "created_at": "string (ISO 8601 datetime)",
      "completed_at": "string | null (ISO 8601 datetime)",
      "metadata": "object",
      "video_s3_key": "string | null",
      "imu_data_s3_key": "string | null",
      "optical_flow_s3_key": "string | null"
    }
  ],
  "total": "number (total count of sessions matching filters)",
  "limit": "number",
  "offset": "number"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid query parameters
- `401 Unauthorized`: Invalid or missing token

---

### GET /sessions/{id}

Get details of specific verification session.

**Authentication:** Required (Bearer token)

**Path Parameters:**
- `id`: Session ID (UUID)

**Response (200 OK):**
```json
{
  "session_id": "string (UUID)",
  "tenant_id": "string (UUID)",
  "state": "idle | baseline | pan | return | analyzing | complete",
  "tier_1_score": "number | null (0-100)",
  "tier_2_score": "number | null (0-100)",
  "final_trust_score": "number | null (0-100)",
  "correlation_value": "number | null",
  "reasoning": "string | null",
  "created_at": "string (ISO 8601 datetime)",
  "completed_at": "string | null (ISO 8601 datetime)",
  "metadata": "object",
  "video_s3_key": "string | null",
  "imu_data_s3_key": "string | null",
  "optical_flow_s3_key": "string | null"
}
```

**Error Responses:**
- `404 Not Found`: Session not found
- `403 Forbidden`: Not owner of session
- `401 Unauthorized`: Invalid or missing token


---

### GET /sessions/{id}/results

Get verification results for completed session.

**Authentication:** Required (Bearer token)

**Path Parameters:**
- `id`: Session ID (UUID)

**Response (200 OK):**
```json
{
  "session_id": "string (UUID)",
  "tier_1_score": "number (0-100, physics-based sensor fusion score)",
  "tier_2_score": "number | null (0-100, AI forensics score)",
  "final_trust_score": "number (0-100, weighted combination)",
  "correlation_value": "number (Pearson correlation coefficient)",
  "reasoning": "string (explanation of verification outcome)",
  "state": "complete"
}
```

**Error Responses:**
- `404 Not Found`: Session not found or not completed
- `403 Forbidden`: Not owner of session
- `401 Unauthorized`: Invalid or missing token

---

### GET /sessions/{id}/artifacts/{type}

Get signed S3 URL for session artifact download.

**Authentication:** Required (Bearer token)

**Path Parameters:**
- `id`: Session ID (UUID)
- `type`: Artifact type ('video' | 'imu' | 'optical_flow')

**Response (200 OK):**
```json
{
  "url": "string (signed S3 URL, expires in 1 hour)"
}
```

**Error Responses:**
- `404 Not Found`: Session or artifact not found
- `403 Forbidden`: Not owner of session
- `401 Unauthorized`: Invalid or missing token

---

## Analytics Endpoints

### GET /analytics/stats

Get analytics statistics for authenticated tenant.

**Authentication:** Required (Bearer token)

**Response (200 OK):**
```json
{
  "total_sessions": "number",
  "success_rate": "number (percentage, 0-100)",
  "average_trust_score": "number (0-100)",
  "current_usage": "number (sessions used in current billing cycle)",
  "monthly_quota": "number",
  "usage_percentage": "number (0-100)",
  "sessions_today": "number",
  "sessions_this_week": "number",
  "sessions_this_month": "number"
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing token

---

### GET /analytics/trends

Get usage trend data over time.

**Authentication:** Required (Bearer token)

**Query Parameters:**
- `period`: string (required, 'daily' | 'weekly' | 'monthly')

**Response (200 OK):**
```json
[
  {
    "date": "string (ISO 8601 date)",
    "session_count": "number",
    "success_count": "number",
    "failed_count": "number",
    "average_trust_score": "number (0-100)"
  }
]
```

**Error Responses:**
- `400 Bad Request`: Invalid period parameter
- `401 Unauthorized`: Invalid or missing token


---

### GET /analytics/outcome-distribution

Get distribution of verification outcomes.

**Authentication:** Required (Bearer token)

**Response (200 OK):**
```json
{
  "success": "number (count)",
  "failed": "number (count)",
  "timeout": "number (count)",
  "cancelled": "number (count)"
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing token

---

### GET /analytics/export

Export analytics data as CSV or JSON.

**Authentication:** Required (Bearer token)

**Query Parameters:**
- `date_from`: string (required, ISO 8601 date)
- `date_to`: string (required, ISO 8601 date)
- `format`: string (required, 'csv' | 'json')
- `include_sessions`: boolean (optional, default false)
- `include_analytics`: boolean (optional, default true)

**Validation Rules:**
- date_from must be <= date_to
- Date range max 1 year

**Response (200 OK):**
- Content-Type: `text/csv` or `application/json`
- Body: CSV or JSON file with analytics data

**Error Responses:**
- `400 Bad Request`: Invalid parameters or date range too large
- `401 Unauthorized`: Invalid or missing token

---

## Billing Endpoints

### GET /billing/subscription

Get current subscription details for authenticated tenant.

**Authentication:** Required (Bearer token)

**Response (200 OK):**
```json
{
  "tenant_id": "string (UUID)",
  "subscription_tier": "Sandbox | Starter | Professional | Enterprise",
  "monthly_quota": "number",
  "current_usage": "number",
  "remaining_quota": "number",
  "usage_percentage": "number (0-100)",
  "billing_cycle_start": "string (ISO 8601 date)",
  "billing_cycle_end": "string (ISO 8601 date)",
  "next_renewal_date": "string (ISO 8601 date)",
  "estimated_cost": "number (USD)"
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing token

---

### GET /billing/plans

Get all available subscription plans.

**Authentication:** Required (Bearer token)

**Response (200 OK):**
```json
[
  {
    "plan_id": "string (UUID)",
    "name": "string",
    "tier": "Sandbox | Starter | Professional | Enterprise",
    "monthly_quota": "number",
    "price_per_month": "number (USD)",
    "price_per_verification": "number (USD, for overage)",
    "features": ["string"],
    "recommended": "boolean (optional)"
  }
]
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing token


---

### POST /billing/upgrade

Upgrade subscription to higher tier.

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "plan_id": "string (required, UUID)"
}
```

**Validation Rules:**
- plan_id must exist
- Target plan must be higher tier than current plan (no downgrades)

**Response (200 OK):**
```json
{
  "order_id": "string (UUID)",
  "plan": "string (plan name)",
  "effective_date": "string (ISO 8601 datetime)",
  "new_quota": "number"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid plan or downgrade attempt
- `403 Forbidden`: Downgrade not allowed
- `401 Unauthorized`: Invalid or missing token

---

### POST /billing/credits

Purchase additional verification credits.

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "amount": "number (required, min 1, max 100000)"
}
```

**Validation Rules:**
- amount: Must be > 0 and <= 100000

**Response (200 OK):**
```json
{
  "order_id": "string (UUID)",
  "credits_purchased": "number",
  "total_cost": "number (USD)",
  "new_quota": "number"
}
```

**Error Responses:**
- `400 Bad Request`: Validation error
- `402 Payment Required`: Payment failed
- `401 Unauthorized`: Invalid or missing token

---

### GET /billing/invoices

Get billing history for authenticated tenant.

**Authentication:** Required (Bearer token)

**Response (200 OK):**
```json
[
  {
    "invoice_id": "string (UUID)",
    "invoice_number": "string (e.g., INV-00001)",
    "date": "string (ISO 8601 date)",
    "amount": "number (USD)",
    "status": "paid | pending | overdue",
    "download_url": "string (URL to download PDF)"
  }
]
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing token

---

### GET /billing/invoices/{id}/download

Download invoice PDF.

**Authentication:** Required (Bearer token)

**Path Parameters:**
- `id`: Invoice ID (UUID)

**Response (200 OK):**
- Content-Type: `application/pdf`
- Body: PDF file

**Error Responses:**
- `404 Not Found`: Invoice not found
- `401 Unauthorized`: Invalid or missing token

---

## Webhooks Endpoints

### GET /webhooks

List all webhooks for authenticated tenant.

**Authentication:** Required (Bearer token)

**Response (200 OK):**
```json
[
  {
    "webhook_id": "string (UUID)",
    "tenant_id": "string (UUID)",
    "url": "string (HTTP/HTTPS URL)",
    "enabled": "boolean",
    "events": ["string (event types)"],
    "created_at": "string (ISO 8601 datetime)",
    "last_triggered_at": "string | null (ISO 8601 datetime)",
    "success_count": "number",
    "failure_count": "number"
  }
]
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing token


---

### POST /webhooks

Create new webhook.

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "url": "string (required, valid HTTP/HTTPS URL, max 2048 chars)",
  "enabled": "boolean (required)",
  "events": ["string (required, non-empty array)"]
}
```

**Validation Rules:**
- url: Must be valid HTTP/HTTPS URL, max 2048 characters
- events: Must be non-empty array, valid event types: 'session.completed', 'session.failed', 'session.timeout', 'session.cancelled'

**Response (201 Created):**
```json
{
  "webhook_id": "string (UUID)",
  "tenant_id": "string (UUID)",
  "url": "string",
  "enabled": "boolean",
  "events": ["string"],
  "created_at": "string (ISO 8601 datetime)",
  "last_triggered_at": "null",
  "success_count": 0,
  "failure_count": 0
}
```

**Error Responses:**
- `400 Bad Request`: Validation error
- `409 Conflict`: Duplicate webhook URL
- `401 Unauthorized`: Invalid or missing token

---

### PUT /webhooks/{id}

Update existing webhook.

**Authentication:** Required (Bearer token)

**Path Parameters:**
- `id`: Webhook ID (UUID)

**Request Body:**
```json
{
  "url": "string (required, valid HTTP/HTTPS URL, max 2048 chars)",
  "enabled": "boolean (required)",
  "events": ["string (required, non-empty array)"]
}
```

**Response (200 OK):**
```json
{
  "webhook_id": "string (UUID)",
  "tenant_id": "string (UUID)",
  "url": "string",
  "enabled": "boolean",
  "events": ["string"],
  "created_at": "string (ISO 8601 datetime)",
  "last_triggered_at": "string | null (ISO 8601 datetime)",
  "success_count": "number",
  "failure_count": "number"
}
```

**Error Responses:**
- `404 Not Found`: Webhook not found
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Invalid or missing token

---

### DELETE /webhooks/{id}

Delete webhook.

**Authentication:** Required (Bearer token)

**Path Parameters:**
- `id`: Webhook ID (UUID)

**Response (204 No Content)**

**Error Responses:**
- `404 Not Found`: Webhook not found
- `401 Unauthorized`: Invalid or missing token

---

### POST /webhooks/{id}/test

Test webhook by sending sample payload.

**Authentication:** Required (Bearer token)

**Path Parameters:**
- `id`: Webhook ID (UUID)

**Response (200 OK):**
```json
{
  "success": "boolean",
  "status_code": "number (HTTP status code)",
  "response_time_ms": "number",
  "error_message": "string | null"
}
```

**Error Responses:**
- `404 Not Found`: Webhook not found
- `401 Unauthorized`: Invalid or missing token


---

### GET /webhooks/{id}/logs

Get delivery logs for webhook.

**Authentication:** Required (Bearer token)

**Path Parameters:**
- `id`: Webhook ID (UUID)

**Query Parameters:**
- `limit`: number (optional, default 25, max 100)
- `offset`: number (optional, default 0, min 0)
- `date_from`: string (optional, ISO 8601 date)
- `date_to`: string (optional, ISO 8601 date)

**Response (200 OK):**
```json
[
  {
    "log_id": "string (UUID)",
    "webhook_id": "string (UUID)",
    "timestamp": "string (ISO 8601 datetime)",
    "event_type": "string",
    "status_code": "number",
    "response_time_ms": "number",
    "success": "boolean",
    "error_message": "string | null",
    "retry_count": "number"
  }
]
```

**Error Responses:**
- `404 Not Found`: Webhook not found
- `401 Unauthorized`: Invalid or missing token

---

### Webhook Payload Format

When a webhook event is triggered, the following payload is sent to the configured URL:

**POST to webhook URL:**
```json
{
  "event_type": "session.completed | session.failed | session.timeout | session.cancelled",
  "timestamp": "string (ISO 8601 datetime)",
  "session_id": "string (UUID)",
  "tenant_id": "string (UUID)",
  "data": {
    "session_id": "string (UUID)",
    "state": "string",
    "tier_1_score": "number | null",
    "tier_2_score": "number | null",
    "final_trust_score": "number | null",
    "correlation_value": "number | null",
    "reasoning": "string | null",
    "completed_at": "string (ISO 8601 datetime)",
    "metadata": "object"
  }
}
```

**Expected Response:**
- Status Code: 200-299 (success)
- Timeout: 10 seconds
- Retry Policy: 3 retries with exponential backoff (1s, 2s, 4s)

---

## Branding Endpoints

### GET /branding

Get current branding configuration for authenticated tenant.

**Authentication:** Required (Bearer token)

**Response (200 OK):**
```json
{
  "logo_url": "string | null (S3 URL)",
  "primary_color": "string (hex format #RRGGBB)",
  "secondary_color": "string (hex format #RRGGBB)",
  "button_color": "string (hex format #RRGGBB)"
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing token

---

### POST /branding/logo

Upload custom logo.

**Authentication:** Required (Bearer token)

**Request:**
- Content-Type: `multipart/form-data`
- Body: File upload (field name: 'file')

**Validation Rules:**
- File type: PNG, JPG, or SVG only
- File size: Max 2MB
- MIME type validation required

**Response (200 OK):**
```json
{
  "logo_url": "string (S3 URL)"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid file type or validation error
- `413 Payload Too Large`: File exceeds 2MB
- `401 Unauthorized`: Invalid or missing token


---

### PUT /branding/colors

Update branding colors.

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "primary_color": "string (required, hex format #RRGGBB)",
  "secondary_color": "string (required, hex format #RRGGBB)",
  "button_color": "string (required, hex format #RRGGBB)"
}
```

**Validation Rules:**
- All colors must be valid hex format: #RRGGBB
- Contrast ratio validation: primary and button colors must have >= 4.5:1 contrast with white (WCAG AA)

**Response (204 No Content)**

**Error Responses:**
- `400 Bad Request`: Invalid color format or contrast ratio too low
- `401 Unauthorized`: Invalid or missing token

---

### POST /branding/reset

Reset branding to default values.

**Authentication:** Required (Bearer token)

**Response (204 No Content)**

**Error Responses:**
- `401 Unauthorized`: Invalid or missing token

---

## Admin Endpoints

**Note:** All admin endpoints require Master_Admin role.

### GET /admin/tenants

List all tenants (Master_Admin only).

**Authentication:** Required (Bearer token with Master_Admin role)

**Query Parameters:**
- `limit`: number (optional, default 25, max 100)
- `offset`: number (optional, default 0, min 0)
- `search`: string (optional, search by email, min 3 chars)
- `subscription_tier`: string (optional, filter by tier)
- `status`: string (optional, filter by status: 'active' | 'suspended' | 'trial')

**Response (200 OK):**
```json
{
  "tenants": [
    {
      "tenant_id": "string (UUID)",
      "email": "string",
      "subscription_tier": "Sandbox | Starter | Professional | Enterprise",
      "total_sessions": "number",
      "current_usage": "number",
      "monthly_quota": "number",
      "created_at": "string (ISO 8601 datetime)",
      "last_active_at": "string (ISO 8601 datetime)",
      "status": "active | suspended | trial"
    }
  ],
  "total": "number",
  "limit": "number",
  "offset": "number"
}
```

**Error Responses:**
- `403 Forbidden`: Not Master_Admin
- `401 Unauthorized`: Invalid or missing token

---

### GET /admin/tenants/{id}

Get detailed information for specific tenant (Master_Admin only).

**Authentication:** Required (Bearer token with Master_Admin role)

**Path Parameters:**
- `id`: Tenant ID (UUID)

**Response (200 OK):**
```json
{
  "tenant_id": "string (UUID)",
  "email": "string",
  "subscription_tier": "Sandbox | Starter | Professional | Enterprise",
  "total_sessions": "number",
  "current_usage": "number",
  "monthly_quota": "number",
  "created_at": "string (ISO 8601 datetime)",
  "last_active_at": "string (ISO 8601 datetime)",
  "status": "active | suspended | trial",
  "api_keys_count": "number",
  "webhooks_count": "number",
  "success_rate": "number (percentage, 0-100)",
  "average_trust_score": "number (0-100)",
  "billing_cycle_start": "string (ISO 8601 date)",
  "billing_cycle_end": "string (ISO 8601 date)"
}
```

**Error Responses:**
- `404 Not Found`: Tenant not found
- `403 Forbidden`: Not Master_Admin
- `401 Unauthorized`: Invalid or missing token


---

### GET /admin/tenants/{id}/sessions

Get sessions for specific tenant (Master_Admin only, read-only).

**Authentication:** Required (Bearer token with Master_Admin role)

**Path Parameters:**
- `id`: Tenant ID (UUID)

**Query Parameters:**
- `limit`: number (optional, default 25, max 100)
- `offset`: number (optional, default 0, min 0)

**Response (200 OK):**
```json
{
  "sessions": [
    {
      "session_id": "string (UUID)",
      "tenant_id": "string (UUID)",
      "state": "idle | baseline | pan | return | analyzing | complete",
      "tier_1_score": "number | null",
      "tier_2_score": "number | null",
      "final_trust_score": "number | null",
      "correlation_value": "number | null",
      "reasoning": "string | null",
      "created_at": "string (ISO 8601 datetime)",
      "completed_at": "string | null (ISO 8601 datetime)",
      "metadata": "object"
    }
  ],
  "total": "number",
  "limit": "number",
  "offset": "number"
}
```

**Error Responses:**
- `404 Not Found`: Tenant not found
- `403 Forbidden`: Not Master_Admin
- `401 Unauthorized`: Invalid or missing token

---

### GET /admin/platform-stats

Get platform-wide statistics (Master_Admin only).

**Authentication:** Required (Bearer token with Master_Admin role)

**Response (200 OK):**
```json
{
  "total_tenants": "number",
  "active_tenants": "number",
  "total_sessions": "number",
  "sessions_today": "number",
  "total_revenue": "number (USD)",
  "revenue_this_month": "number (USD)",
  "average_sessions_per_tenant": "number",
  "platform_success_rate": "number (percentage, 0-100)"
}
```

**Error Responses:**
- `403 Forbidden`: Not Master_Admin
- `401 Unauthorized`: Invalid or missing token

---

### GET /admin/system-health

Get system health metrics (Master_Admin only).

**Authentication:** Required (Bearer token with Master_Admin role)

**Response (200 OK):**
```json
{
  "api_status": "healthy | degraded | down",
  "average_response_time_ms": "number",
  "error_rate": "number (percentage, 0-100)",
  "uptime_percentage": "number (0-100)",
  "last_incident": "string | null (ISO 8601 datetime)"
}
```

**Status Determination:**
- `healthy`: error_rate < 1%
- `degraded`: error_rate >= 1% and < 5%
- `down`: error_rate >= 5%

**Error Responses:**
- `403 Forbidden`: Not Master_Admin
- `401 Unauthorized`: Invalid or missing token

---

## Common Error Codes

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "detail": "string (error message)",
  "errors": [
    {
      "field": "string (field name)",
      "message": "string (validation error)"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "detail": "Invalid or expired authentication token"
}
```

### 403 Forbidden
```json
{
  "detail": "string (permission error message)"
}
```

### 404 Not Found
```json
{
  "detail": "Resource not found"
}
```

### 409 Conflict
```json
{
  "detail": "string (conflict description)"
}
```

### 413 Payload Too Large
```json
{
  "detail": "Request payload exceeds maximum size"
}
```

### 429 Too Many Requests
```json
{
  "detail": "Rate limit exceeded. Please try again later."
}
```
**Headers:**
- `Retry-After`: number (seconds until rate limit resets)

### 500 Internal Server Error
```json
{
  "detail": "An unexpected error occurred. Please try again later."
}
```


---

## Rate Limiting

All API endpoints are subject to rate limiting to ensure fair usage and system stability.

### Rate Limit Headers

All responses include the following headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

- `X-RateLimit-Limit`: Maximum requests allowed per window
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Unix timestamp when the rate limit resets

### Rate Limits by Endpoint Category

| Endpoint Category | Rate Limit | Window |
|------------------|------------|--------|
| Authentication | 10 requests | 1 minute |
| API Keys | 100 requests | 1 minute |
| Sessions (Create) | 60 requests | 1 minute |
| Sessions (Read) | 1000 requests | 1 minute |
| Analytics | 100 requests | 1 minute |
| Billing | 100 requests | 1 minute |
| Webhooks | 100 requests | 1 minute |
| Branding | 50 requests | 1 minute |
| Admin | 1000 requests | 1 minute |

### Rate Limit Exceeded Response

When rate limit is exceeded, the API returns:

**Status:** 429 Too Many Requests

**Headers:**
```
Retry-After: 60
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1640995200
```

**Body:**
```json
{
  "detail": "Rate limit exceeded. Please try again in 60 seconds."
}
```

### Best Practices

1. **Monitor Rate Limit Headers**: Check `X-RateLimit-Remaining` to avoid hitting limits
2. **Implement Exponential Backoff**: When receiving 429, wait before retrying
3. **Cache Responses**: Cache GET requests where appropriate to reduce API calls
4. **Batch Operations**: Use pagination efficiently to minimize requests
5. **Use Webhooks**: Instead of polling for session updates, configure webhooks

---

## Authentication

### Bearer Token Authentication

Most endpoints require authentication using a JWT Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### Token Lifecycle

1. **Access Token**: Valid for 1 hour
2. **Refresh Token**: Valid for 30 days
3. **Automatic Refresh**: Frontend should automatically refresh tokens when access token expires

### Token Refresh Flow

1. Access token expires (401 response)
2. Call `/auth/refresh` with refresh token
3. Receive new access token and refresh token
4. Retry original request with new access token

### API Key Authentication

Session creation endpoint (`POST /sessions`) can also use API key authentication:

```
X-API-Key: <api_key>
X-API-Secret: <api_secret>
```

---

## Data Types and Formats

### Date/Time Format

All dates and timestamps use ISO 8601 format:

- Date: `YYYY-MM-DD` (e.g., `2024-01-15`)
- DateTime: `YYYY-MM-DDTHH:mm:ss.sssZ` (e.g., `2024-01-15T14:30:00.000Z`)

### UUID Format

All IDs use UUID v4 format:
```
550e8400-e29b-41d4-a716-446655440000
```

### Color Format

Colors use hex format with hash prefix:
```
#FF5733
```

### URL Format

URLs must be valid HTTP or HTTPS:
```
https://example.com/callback
```

---

## Pagination

List endpoints support pagination using `limit` and `offset` parameters:

**Request:**
```
GET /sessions?limit=25&offset=50
```

**Response:**
```json
{
  "sessions": [...],
  "total": 150,
  "limit": 25,
  "offset": 50
}
```

**Pagination Calculation:**
- Current page: `Math.floor(offset / limit) + 1`
- Total pages: `Math.ceil(total / limit)`
- Has next page: `offset + limit < total`
- Has previous page: `offset > 0`

---

## Filtering and Search

### Date Range Filtering

Use `date_from` and `date_to` parameters:

```
GET /sessions?date_from=2024-01-01&date_to=2024-01-31
```

### Status Filtering

Use `status` parameter:

```
GET /sessions?status=success
```

### Search

Use `search` parameter (minimum 3 characters):

```
GET /sessions?search=test-session
```

### Combined Filters

Filters can be combined:

```
GET /sessions?status=success&date_from=2024-01-01&search=test&limit=50
```

---

## WebSocket Connections

Real-time session updates are available via WebSocket connections.

### Connection URL

```
wss://api.veraproof.ai/ws/sessions/{session_id}
```

### Authentication

Include JWT token in connection URL:

```
wss://api.veraproof.ai/ws/sessions/{session_id}?token=<access_token>
```

### Message Format

**Server to Client:**
```json
{
  "type": "session.update",
  "session_id": "string (UUID)",
  "state": "idle | baseline | pan | return | analyzing | complete",
  "tier_1_score": "number | null",
  "tier_2_score": "number | null",
  "final_trust_score": "number | null",
  "correlation_value": "number | null",
  "timestamp": "string (ISO 8601 datetime)"
}
```

### Connection Lifecycle

1. **Connect**: Establish WebSocket connection with authentication
2. **Subscribe**: Automatically subscribed to session updates
3. **Receive**: Receive real-time updates as session progresses
4. **Disconnect**: Close connection when no longer needed

### Reconnection Strategy

- Implement exponential backoff for reconnection attempts
- Maximum 5 reconnection attempts
- Backoff delays: 1s, 2s, 4s, 8s, 16s

---

## Security Best Practices

1. **HTTPS Only**: All API calls must use HTTPS in production
2. **Token Storage**: Store tokens securely (httpOnly cookies or encrypted storage)
3. **CSRF Protection**: Include CSRF token in state-changing requests
4. **Input Validation**: Validate and sanitize all user inputs
5. **Rate Limiting**: Respect rate limits to avoid service disruption
6. **Error Handling**: Don't expose sensitive information in error messages
7. **Token Rotation**: Refresh tokens regularly, rotate on sensitive operations
8. **Webhook Security**: Validate webhook signatures (if implemented)

---

## Support and Contact

For API support, technical questions, or to report issues:

- **Email**: api-support@veraproof.ai
- **Documentation**: https://docs.veraproof.ai
- **Status Page**: https://status.veraproof.ai

---

**Document Version:** 1.0.0  
**Last Updated:** 2024-01-15  
**API Version:** v1
