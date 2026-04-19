# VeraProof AI - Current Architecture and Operating Context

## Product Summary
VeraProof AI is a multi-tenant biometric fraud prevention and liveness verification platform.
It verifies that a live person is physically present and completing a server-driven challenge rather than replaying a video, presenting a printed photo, or using a synthetic/deepfake source.

The platform is intentionally split between:
- A lightweight public verification experience with no app install.
- A partner dashboard for tenant operators.
- A backend control/data plane that stores tenant metadata, verification sessions, artifacts, scoring results, and audit-friendly evidence.

## Current Security Model

### Authentication
- Human dashboard auth is provider-neutral OIDC, implemented through an internal identity adapter.
- Google OIDC is the first production provider.
- VeraProof owns canonical `user_id` and `org_id` values in Postgres. External provider IDs are mappings only and must never be used as primary keys.
- Dashboard auth uses secure cookie-backed sessions, not `localStorage` bearer tokens.
- Local email/password auth still exists only as a development fallback and should not be extended for production.

### Authorization
- Authorization is org-scoped RBAC.
- Core entities:
  - `organizations`
  - `org_memberships`
  - `roles`
  - `permissions`
  - `external_identities`
  - `auth_sessions`
- Platform admins are metadata-only by default. They must not have cross-tenant evidence access.
- Prefer explicit permission checks like `require_permission("sessions.read")` or `require_tenant_permission(...)` over legacy role-string branching.

### Tenant Isolation
- Tenant isolation is enforced in application code and in Postgres via tenant context + RLS policies.
- Database access must flow through `backend/app/database.py` so `app.current_tenant` is set before queries.
- New tenant-bound tables must get:
  - RLS enabled
  - `FORCE ROW LEVEL SECURITY`
  - explicit isolation policies
- Do not introduce new query paths that skip tenant context.

### Encryption
- Stored evidence supports two modes:
  - `managed`: VeraProof-managed encryption using an app master secret from environment/config.
  - `tenant_managed`: tenant-supplied runtime passphrase required for decryption.
- Newly stored evidence artifacts are encrypted at rest before being written to S3.
- Artifact download for dashboard users is served through backend proxy endpoints so encrypted artifacts can be decrypted server-side for authorized users.
- Tenant-managed mode is the zero-access path for stored evidence. If the tenant runtime key is not loaded, those artifacts must remain inaccessible.

## Core Verification Flow
1. A tenant or API key creates a verification session.
2. The backend returns a `session_url` and a short-lived websocket token.
3. The verification interface opens `/api/v1/ws/verify/{session_id}` with `ws_token`.
4. The backend runs the dynamic playbook over websocket.
5. Tier 1 computes physics correlation from IMU vs optical behavior.
6. Tier 2 uses AWS Rekognition to extract structured visual context.
7. Tier 3 uses Google Gemini to evaluate trust and reasoning.
8. Artifacts are written to S3, encrypted at rest, indexed in `session_artifacts`, and exposed via backend download endpoints.

## AI Provider Policy
- Gemini is the active and supported GenAI provider.
- Do not add Bedrock- or custom-model-first assumptions into new features.
- If provider abstraction changes are needed, keep them behind `backend/app/ai_provider.py` and related adapter boundaries.

## Repository Structure

```text
veraproof-ai/
+-- backend/
¦   +-- app/
¦   ¦   +-- admin.py                 # Metadata-only platform admin APIs
¦   ¦   +-- ai_provider.py           # Rekognition + Gemini orchestration
¦   ¦   +-- artifact_manager.py      # Session artifact registry access
¦   ¦   +-- auth.py                  # Local dev auth + API key management
¦   ¦   +-- config.py                # Runtime configuration
¦   ¦   +-- dashboard_auth.py        # Cookie sessions, CSRF, RBAC, ws tokens
¦   ¦   +-- database.py              # Tenant-aware asyncpg access layer
¦   ¦   +-- encryption.py            # Managed + tenant-managed artifact crypto
¦   ¦   +-- identity_adapter.py      # Provider-neutral OIDC adapter
¦   ¦   +-- main.py                  # FastAPI entrypoint and security middleware
¦   ¦   +-- models.py                # Pydantic models
¦   ¦   +-- reporting.py             # PDF/ZIP evidence generation
¦   ¦   +-- routes.py                # Main API routes
¦   ¦   +-- session_manager.py       # Session persistence and state updates
¦   ¦   +-- storage.py               # S3 storage and artifact retrieval
¦   ¦   +-- video_utils.py           # Sparse keyframe extraction
¦   ¦   +-- websocket_handler.py     # Realtime verification orchestration
¦   +-- db/
¦   ¦   +-- init.sql                 # Additive schema + RLS bootstrap
¦   +-- tests/
¦   +-- Dockerfile
¦   +-- requirements.txt
+-- partner-dashboard/
¦   +-- src/
¦   ¦   +-- app/
¦   ¦   ¦   +-- components/
¦   ¦   ¦   +-- core/
¦   ¦   ¦   +-- features/
¦   ¦   +-- environments/
¦   +-- package.json
¦   +-- angular.json
+-- verification-interface/
¦   +-- index.html
¦   +-- js/
¦   ¦   +-- main.js
¦   ¦   +-- ws-manager.js
¦   ¦   +-- ui-controller.js
¦   ¦   +-- challenge-controller.js
¦   +-- styles.css
+-- infrastructure/
¦   +-- app.py
¦   +-- stacks/
¦       +-- frontend_stack.py
¦       +-- lightsail_stack.py
¦       +-- storage_stack.py
+-- scripts/
    +-- start_all.py
    +-- other local orchestration helpers
```

## Frontend Reality Check
- The partner dashboard is Angular, not Next.js or React.
- The verification interface is vanilla HTML/CSS/JS and must stay lightweight.
- Avoid introducing framework-heavy changes into the verification interface.

## UI/UX Design Preferences
- Prefer a subtle, clean, professional SaaS visual language over marketing-heavy or overly expressive presentation.
- Prioritize long-term maintainability and consistency with the existing product UI before introducing new visual treatments or one-off interaction patterns.
- Keep information architecture practical and task-oriented: important operational data should appear early, with supporting detail following in a logical order.
- Avoid advertising-style hero sections, excessive gradients, ornamental copy, or visually loud layouts in dashboard and admin experiences unless explicitly requested.
- Favor restrained spacing, clear hierarchy, reusable components, and styles that can be extended across the product without redesigning each page from scratch.

## Operational Rules

### Database and Migrations
1. Never wipe database volumes unless the user explicitly asks.
2. `backend/db/init.sql` must remain additive and idempotent.
3. If a schema issue appears, add migrations or additive SQL. Do not solve it by resetting data.
4. New tenant-bound tables must be wired into RLS and tenant-aware query paths.

### Authentication and Security Changes
1. Do not reintroduce dashboard token storage in `localStorage`.
2. Do not couple application identity to Google account IDs or any other provider subject.
3. Do not add production-only secrets directly into code or committed config.
4. For production cross-site cookie auth, remember `SESSION_COOKIE_SECURE=true` and `SESSION_COOKIE_SAMESITE=none`.
5. New websocket access paths must preserve ws token checks.

### Artifact Handling
1. Prefer backend-served download endpoints for protected evidence.
2. Be careful changing artifact delivery. Direct signed URLs bypass app-layer decryption and auth checks.
3. If you add new sensitive evidence artifacts, ensure they are:
   - stored via `storage.py`
   - registered in `session_artifacts`
   - tenant-scoped
   - encryption-aware

### AI and Cost Constraints
1. Default to Gemini for GenAI.
2. Do not add paid infrastructure services unless explicitly approved.
3. Keep the architecture migration-ready, but choose low-cost primitives first.

### Temporary Scripts
1. Put ad-hoc scripts in `scripts/`.
2. If a script is local-only, add it to `.gitignore`.
3. Remove obsolete debug scripts when finished.

## Deployment Notes
- The production deployment model is:
  - backend on AWS Lightsail container service
  - PostgreSQL on Lightsail relational database
  - dashboard on S3 + CloudFront
  - verification interface on S3 + CloudFront
- Manual SSM parameters are required for Google OIDC, Gemini, encryption, and backend AWS credentials.
- CI/CD should validate backend tests, dashboard build, and verification interface syntax before deploy.

## Known Important Constraints
- Preserve the current verification flow when making security changes.
- Mobile disconnects must not cancel in-flight AI analysis or destroy buffered evidence prematurely.
- Existing artifacts may be plaintext if they were written before managed-mode encryption was enabled. New artifacts should be encrypted.
- If a feature touches auth, tenant isolation, or artifacts, audit the code path end-to-end before changing it.



## User Lifecycle
- Tenant user management is invitation-based.
- org_admin users manage their tenant members from the dashboard /users surface.
- Creating an invitation stores a pending user_invitations record with tenant/org/role context.
- The invited person signs in with Google using the exact invited email, and the backend auto-provisions them into that tenant.
- Platform admin management is separate from tenant membership.
- Initial production platform admins are bootstrapped through the PLATFORM_ADMIN_EMAILS runtime setting.
- Additional platform admins are created by existing platform admins through /admin/users invitations.
- There is no default production password-based admin account.

