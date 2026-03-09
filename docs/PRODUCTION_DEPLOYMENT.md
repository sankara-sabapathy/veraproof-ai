# VeraProof AI Production Deployment Guide

## Scope
This guide reflects the current architecture:
- Backend: FastAPI on AWS Lightsail container service
- Database: AWS Lightsail PostgreSQL
- Dashboard: Angular build on S3 + CloudFront
- Verification interface: static site on S3 + CloudFront
- Human auth: Google OIDC through the backend identity adapter
- Evidence encryption: VeraProof-managed or tenant-managed mode

## CI/CD Pipeline Summary
The GitHub Actions pipeline in [ci-cd.yml](/C:/Users/krssa/projects/veraproof-ai/.github/workflows/ci-cd.yml) now runs:
1. Backend tests
2. Dashboard build
3. Verification interface syntax checks
4. Security scan
5. Infrastructure deploy on `main`
6. Backend container deploy on `main`
7. Frontend deploy on `main`
8. Smoke tests on `main`

## Manual SSM Parameters
Create these before the first production deployment.

### Required
- `/veraproof/prod/security/app_session_secret`
  - Type: `SecureString`
  - Purpose: cookie session signing secret
- `/veraproof/prod/security/app_encryption_key`
  - Type: `SecureString`
  - Purpose: app-managed artifact encryption root material
- `/veraproof/prod/google/client_id`
  - Type: `SecureString`
  - Purpose: Google OIDC client id
- `/veraproof/prod/google/client_secret`
  - Type: `SecureString`
  - Purpose: Google OIDC client secret
- `/veraproof/prod/auth/platform_admin_emails`
  - Type: `String`
  - Purpose: comma-separated bootstrap Google email addresses that should be provisioned as first platform admins
- `/veraproof/prod/gemini/api_key`
  - Type: `SecureString`
  - Purpose: Gemini API key
- `/veraproof/prod/backend/aws_access_key_id`
  - Type: `SecureString`
  - Purpose: backend access to S3, Rekognition, and SSM from Lightsail
- `/veraproof/prod/backend/aws_secret_access_key`
  - Type: `SecureString`
  - Purpose: backend access to S3, Rekognition, and SSM from Lightsail

### Optional
- `/veraproof/prod/observability/otlp_endpoint`
  - Type: `SecureString`
  - Purpose: OTLP endpoint for tracing/metrics export
- `/veraproof/prod/observability/otlp_headers`
  - Type: `SecureString`
  - Purpose: OTLP auth headers

## Recommended Secret Generation
- `app_session_secret`: at least 64 random bytes, base64-encoded
- `app_encryption_key`: at least 32 random bytes, base64-encoded or high-entropy string

Example generation commands:

```bash
openssl rand -base64 64
openssl rand -base64 64
```

## Manual Tasks Before First Deploy
- Create the Google OAuth application.
- Add the production backend callback URL as the authorized redirect URI.
- Add the production dashboard origin as an authorized JavaScript origin.
- Create `/veraproof/prod/auth/platform_admin_emails` with one or more exact Google account emails for the initial platform admin bootstrap.
- Ensure the backend runtime uses GOOGLE_OAUTH_ENABLED=true, USE_LOCAL_AUTH=false, SESSION_COOKIE_SECURE=true, SESSION_COOKIE_SAMESITE=none, and REQUIRE_WS_TOKEN=true.
- Confirm the dashboard and backend public URLs that CI/CD will inject match the Google OAuth configuration exactly.

## Required Google OIDC Configuration
Create a Google OAuth client with:
- Authorized redirect URI:
  - `https://<lightsail-api-domain>/api/v1/auth/google/callback`
- Authorized JavaScript origins:
  - dashboard CloudFront URL
  - backend API URL if required by Google console policy

Important:
- The redirect URI is the backend callback URL, not the dashboard callback route.
- The dashboard callback route exists only to complete frontend navigation after backend session setup.

## Platform Admin Bootstrap
For the first production platform admin:
1. Set `/veraproof/prod/auth/platform_admin_emails` to a comma-separated list such as `founder@company.com,security@company.com`.
2. Deploy the backend so `PLATFORM_ADMIN_EMAILS` is injected into the runtime.
3. Sign in through Google with one of those exact emails.
4. VeraProof provisions that user into the reserved platform-admin org with `platform_admin` role.
5. After the first platform admin exists, additional platform admins can be invited from `/admin/users`.

Notes:
- There is no default production password admin.
- Production should not rely on local auth.
- If the bootstrap list is only needed once, reduce or remove it after the initial platform admins are created.

## Tenant User Lifecycle
- An `org_admin` signs in to the dashboard and opens `/users`.
- They create an invitation for a tenant user email and role.
- The invited person signs in with Google using that same email.
- VeraProof provisions the user into the existing tenant automatically and applies the invited role.
- Invitation delivery is currently out-of-band; the system stores the invite, but does not send email itself.

## Production Runtime Requirements
The backend deployment must have these effective settings:
- `GOOGLE_OAUTH_ENABLED=true`
- `USE_LOCAL_AUTH=false`
- `SESSION_COOKIE_SECURE=true`
- `SESSION_COOKIE_SAMESITE=none`
- `REQUIRE_WS_TOKEN=true`
- `VERAPROOF_AI_MODEL_ID=gemini`

These are required because:
- dashboard and backend are cross-site in production
- cookie auth needs cross-site secure cookie behavior
- websocket session access should be hardened in production

## Dependencies

### AWS Resources
- Lightsail container service
- Lightsail PostgreSQL database
- S3 bucket for dashboard static assets
- S3 bucket for verification interface static assets
- S3 bucket for encrypted artifacts
- S3 bucket for branding assets
- CloudFront distributions for dashboard and verification interface
- SSM Parameter Store entries listed above

### External Providers
- Google OAuth application
- Gemini API access

### GitHub Secrets
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

## Deployment Checklist

### Before First Deploy
- Create required SSM parameters
- Create Google OAuth application
- Confirm Google redirect URI matches the production backend URL
- Confirm Gemini API key is active
- Confirm AWS IAM credentials used by the backend can access:
  - S3 artifact bucket
  - S3 branding bucket
  - Rekognition `DetectLabels`
  - SSM parameter reads under `/veraproof/prod/*`
- Confirm GitHub repository secrets for deploy are present

### Before Every Deploy
- Run backend tests locally
- Run dashboard build locally
- Run verification interface syntax checks locally
- Review any schema changes in `backend/db/init.sql` for idempotency
- Check that new tenant-bound tables or queries are RLS-safe
- Check that any new artifact flow still uses backend proxy download for protected evidence

### After Deploy
- Verify `/health` on the backend
- Verify Google sign-in redirects correctly and establishes a dashboard session
- Verify dashboard API calls include cookies successfully
- Create a verification session and complete a live run
- Confirm websocket token validation works
- Confirm new evidence artifacts are downloadable through backend endpoints
- Confirm encrypted artifact metadata is present in `session_artifacts`
- Confirm tenant-managed mode blocks artifact decrypt unless the runtime key is loaded

## Production Rollback Considerations
- Backend deploy is container-based. Roll back by redeploying the previous Lightsail image label.
- Static frontends can be rolled back by re-uploading a prior build artifact and invalidating CloudFront.
- Database schema changes are additive; do not roll back by dropping tables or volumes.

## Existing Artifact Caveat
Managed-mode encryption is now applied to newly written evidence.
Previously stored artifacts may still be plaintext until regenerated or migrated.
If full backfill is required, add a migration job that:
1. reads existing plaintext artifacts
2. rewrites them through `storage.py`
3. updates `session_artifacts.encryption_mode` and `session_artifacts.encryption_key_id`

## Local Validation Commands

### Backend
```powershell
cd backend
.\venv\Scripts\python.exe -m pytest tests -q
```

### Dashboard
```powershell
cd partner-dashboard
npm run build
```

### Verification Interface
```powershell
cd verification-interface
node --check .\js\main.js
node --check .\js\ws-manager.js
node --check .\js\ui-controller.js
```

### Unified Local Start
```powershell
python scripts/start_all.py
```

## Operational Notes
- Platform admins are metadata-only by design. Do not add cross-tenant evidence access as a shortcut.
- If tenant-managed zero-access mode is used, tenant runtime passphrase handling must remain outside VeraProof long-term storage.
- Do not switch production back to `localStorage` token auth or direct signed evidence URLs for protected artifacts.

