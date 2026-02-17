# Implementation Plan: VeraProof AI Browser Prototype

## Overview

This implementation plan breaks down the VeraProof AI browser prototype into discrete, actionable tasks. The plan follows an incremental approach, building core functionality first, then adding features, and finally integrating all components.

## Tasks

- [x] 1. Local Development Environment Setup
  - Set up Docker Compose with PostgreSQL and LocalStack
  - Configure environment variables for local development
  - Create database initialization scripts
  - Test local stack connectivity
  - _Requirements: 1A.3, 1A.4, 26.1, 26.2_

- [ ] 2. Database Schema and Multi-Tenancy
  - [x] 2.1 Create PostgreSQL database schema
    - Define tables: tenants, api_keys, sessions, branding_configs, usage_logs, webhook_logs, invoices
    - Implement row-level security policies for tenant isolation
    - Create indexes for performance
    - _Requirements: 12.1, 12.2, 12.3_
  
  - [ ]* 2.2 Write property test for tenant data isolation
    - **Property 17: Tenant Data Isolation**
    - **Validates: Requirements 12.3, 12.6, 20.6, 25.7, 27.6**
  
  - [x] 2.3 Implement database connection manager with tenant context
    - Create TenantDatabaseManager class
    - Implement automatic tenant_id filtering
    - _Requirements: 12.3, 12.4_

- [ ] 3. Local Authentication System
  - [x] 3.1 Implement LocalAuthManager for development
    - Create in-memory user store
    - Implement JWT token generation and verification
    - Create login and signup endpoints
    - _Requirements: 13.1, 13.2, 13.3_
  
  - [ ]* 3.2 Write property test for JWT token structure
    - **Property 18: JWT Token Structure**
    - **Validates: Requirements 13.3**
  
  - [x] 3.3 Implement API key validation for local development
    - Create in-memory API key store
    - Implement API key validation logic
    - _Requirements: 13.7, 14.2_
  
  - [ ]* 3.4 Write property test for API key scoping
    - **Property 20: API Key Scoping**
    - **Validates: Requirements 14.2**

- [ ] 4. Backend Core Infrastructure
  - [x] 4.1 Set up FastAPI application structure
    - Create main.py with FastAPI app
    - Configure CORS for local frontends
    - Set up logging and error handling
    - _Requirements: 26.2, 26.3_
  
  - [x] 4.2 Implement session management
    - Create SessionManager class
    - Implement create_session, get_session, update_session_state
    - Implement session expiration and extension logic
    - _Requirements: 10.1, 10.2, 10.4, 10.5_
  
  - [ ]* 4.3 Write property test for session ID uniqueness
    - **Property 14: Session ID Uniqueness**
    - **Validates: Requirements 10.1, 19.2**
  
  - [ ]* 4.4 Write property test for session state machine
    - **Property 15: Session State Machine**
    - **Validates: Requirements 10.2**
  
  - [ ]* 4.5 Write property test for session expiration extension
    - **Property 16: Session Expiration Extension**
    - **Validates: Requirements 10.4**

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Video and IMU Data Handling
  - [x] 6.1 Implement WebSocket handler for verification
    - Create VerificationWebSocket class
    - Handle video chunk reception
    - Handle IMU data batch reception
    - Implement reconnection logic
    - _Requirements: 3.1, 3.2, 3.4, 4.1, 4.4_
  
  - [ ]* 6.2 Write property test for video chunk transmission completeness
    - **Property 2: Video Chunk Transmission Completeness**
    - **Validates: Requirements 3.2, 3.3**
  
  - [ ]* 6.3 Write property test for IMU data completeness
    - **Property 3: IMU Data Completeness**
    - **Validates: Requirements 4.2, 4.3**
  
  - [ ]* 6.4 Write property test for IMU-video synchronization
    - **Property 4: IMU-Video Synchronization**
    - **Validates: Requirements 4.4, 6.4**

- [ ] 7. Optical Flow Analysis (Tier 1)
  - [x] 7.1 Implement OpticalFlowEngine using OpenCV
    - Install OpenCV-Headless
    - Implement compute_flow using Farneback algorithm
    - Implement extract_horizontal_magnitude for Optical Flow X
    - _Requirements: 6.1, 6.2, 26.4_
  
  - [ ]* 7.2 Write property test for optical flow computation
    - **Property 6: Optical Flow Computation**
    - **Validates: Requirements 6.1, 6.2**

- [ ] 8. Sensor Fusion Analysis (Tier 1)
  - [x] 8.1 Implement SensorFusionAnalyzer
    - Implement calculate_pearson_correlation using NumPy/SciPy
    - Implement calculate_tier_1_score (map r to 0-100)
    - Implement should_trigger_tier_2 (threshold at r < 0.85)
    - _Requirements: 7.1, 7.2, 7.3, 7.6_
  
  - [ ]* 8.2 Write property test for Pearson correlation calculation
    - **Property 7: Pearson Correlation Calculation**
    - **Validates: Requirements 7.1**
  
  - [ ]* 8.3 Write property test for correlation threshold classification
    - **Property 8: Correlation Threshold Classification**
    - **Validates: Requirements 7.2, 7.3**
  
  - [ ]* 8.4 Write property test for Tier 1 score mapping
    - **Property 9: Tier 1 Score Mapping**
    - **Validates: Requirements 7.6, 23.1**
  
  - [ ]* 8.5 Write property test for Tier 1 score range boundaries
    - **Property 10: Tier 1 Score Range Boundaries**
    - **Validates: Requirements 23.2, 23.3**

- [ ] 9. Mock AI Forensics (Tier 2)
  - [x] 9.1 Implement MockSageMakerClient for local development
    - Create mock deepfake detection with random results
    - Simulate processing time (1-3 seconds)
    - Return realistic mock results
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [ ]* 9.2 Write property test for Tier 2 triggering
    - **Property 11: Tier 2 Triggering**
    - **Validates: Requirements 8.1, 23.3**
  
  - [ ]* 9.3 Write property test for Tier 2 score range
    - **Property 12: Tier 2 Score Range**
    - **Validates: Requirements 8.6**

- [ ] 10. Trust Score Calculation
  - [x] 10.1 Implement TrustScoreCalculator
    - Implement calculate_final_score (weighted average: 60% Tier 1, 40% Tier 2)
    - Generate detailed reasoning text
    - _Requirements: 8.7, 23.5_
  
  - [ ]* 10.2 Write property test for final trust score calculation
    - **Property 13: Final Trust Score Calculation**
    - **Validates: Requirements 8.7, 23.5**

- [x] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Artifact Storage (S3/LocalStack)
  - [x] 12.1 Implement ArtifactStorageManager
    - Configure S3 client (LocalStack for dev, real S3 for prod)
    - Implement store_video, store_imu_data, store_optical_flow
    - Implement generate_signed_url with 1-hour expiration
    - Implement schedule_deletion for 90-day retention
    - _Requirements: 18.1, 18.3, 20.5_
  
  - [ ]* 12.2 Write property test for production artifact storage
    - **Property 27: Production Artifact Storage**
    - **Validates: Requirements 18.1**
  
  - [ ]* 12.3 Write property test for sandbox artifact exclusion
    - **Property 28: Sandbox Artifact Exclusion**
    - **Validates: Requirements 18.2**
  
  - [ ]* 12.4 Write property test for artifact retention period
    - **Property 29: Artifact Retention Period**
    - **Validates: Requirements 18.3**
  
  - [ ]* 12.5 Write property test for signed URL expiration
    - **Property 30: Signed URL Expiration**
    - **Validates: Requirements 20.5**

- [ ] 13. Usage Quota and Billing
  - [x] 13.1 Implement UsageQuotaManager
    - Implement check_quota, decrement_quota
    - Implement get_usage_stats
    - Implement reset_monthly_quotas background task
    - Implement send_quota_alert (80% and 100%)
    - _Requirements: 16.1, 16.2, 16.3, 16.5, 16.6, 16.7_
  
  - [ ]* 13.2 Write property test for quota decrement
    - **Property 22: Quota Decrement**
    - **Validates: Requirements 16.2**
  
  - [ ]* 13.3 Write property test for quota enforcement
    - **Property 23: Quota Enforcement**
    - **Validates: Requirements 16.3, 19.7**
  
  - [ ]* 13.4 Write property test for monthly quota reset
    - **Property 24: Monthly Quota Reset**
    - **Validates: Requirements 16.7**
  
  - [x] 13.5 Implement MockRazorpayClient for local development
    - Create mock order creation
    - Create mock payment verification (always succeeds)
    - _Requirements: 15.5, 15.6_
  
  - [x] 13.6 Implement BillingManager
    - Implement create_subscription, purchase_credits
    - Implement handle_payment_success, handle_payment_failure
    - Implement upgrade_plan, downgrade_plan
    - _Requirements: 15.6, 15.9, 15.10_
  
  - [ ]* 13.7 Write property test for tier upgrade immediate effect
    - **Property 21: Tier Upgrade Immediate Effect**
    - **Validates: Requirements 15.10**

- [ ] 14. Rate Limiting
  - [x] 14.1 Implement InMemoryRateLimiter
    - Implement check_api_rate_limit (100 requests/minute)
    - Implement check_concurrent_sessions (10 concurrent)
    - Implement increment_sessions, decrement_sessions
    - Implement cleanup_loop background task
    - _Requirements: 17.1, 17.2, 17.3_
  
  - [ ]* 14.2 Write property test for concurrent session limit
    - **Property 25: Concurrent Session Limit**
    - **Validates: Requirements 17.1**
  
  - [ ]* 14.3 Write property test for API rate limit
    - **Property 26: API Rate Limit**
    - **Validates: Requirements 17.2**

- [x] 15. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Partner Branding
  - [x] 16.1 Implement BrandingManager
    - Implement upload_logo (validate size < 2MB, format PNG/JPG/SVG)
    - Implement update_colors (validate hex codes)
    - Implement get_branding
    - _Requirements: 22.1, 22.2, 22.3_
  
  - [ ]* 16.2 Write property test for logo file size validation
    - **Property 32: Logo File Size Validation**
    - **Validates: Requirements 22.1**
  
  - [ ]* 16.3 Write property test for branding immediate effect
    - **Property 33: Branding Immediate Effect**
    - **Validates: Requirements 22.5**

- [ ] 17. Webhook Delivery
  - [x] 17.1 Implement WebhookManager
    - Implement send_webhook with HMAC-SHA256 signature
    - Implement retry_webhook with exponential backoff (1s, 2s, 4s)
    - Implement sign_payload
    - _Requirements: 24.1, 24.2, 24.3, 24.4_
  
  - [ ]* 17.2 Write property test for webhook payload completeness
    - **Property 34: Webhook Payload Completeness**
    - **Validates: Requirements 24.2**
  
  - [ ]* 17.3 Write property test for webhook retry logic
    - **Property 35: Webhook Retry Logic**
    - **Validates: Requirements 24.3**
  
  - [ ]* 17.4 Write property test for webhook signature validity
    - **Property 36: Webhook Signature Validity**
    - **Validates: Requirements 24.4**

- [ ] 18. REST API Endpoints
  - [x] 18.1 Implement session management endpoints
    - POST /api/v1/sessions/create
    - GET /api/v1/sessions/{session_id}
    - GET /api/v1/sessions/{session_id}/results
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7_
  
  - [x] 18.2 Implement artifact access endpoints
    - GET /api/v1/sessions/{session_id}/video
    - GET /api/v1/sessions/{session_id}/imu-data
    - GET /api/v1/sessions/{session_id}/optical-flow
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7_
  
  - [x] 18.3 Implement authentication endpoints
    - POST /api/v1/auth/login
    - POST /api/v1/auth/signup
    - POST /api/v1/auth/refresh
    - POST /api/v1/auth/logout
    - _Requirements: 13.1, 13.2, 13.5, 13.9_
  
  - [x] 18.4 Implement API key management endpoints
    - POST /api/v1/api-keys/generate
    - GET /api/v1/api-keys/list
    - DELETE /api/v1/api-keys/{key_id}
    - _Requirements: 14.2, 14.3_
  
  - [x] 18.5 Implement branding endpoints
    - POST /api/v1/branding/logo
    - PUT /api/v1/branding/colors
    - GET /api/v1/branding
    - _Requirements: 22.1, 22.2, 22.3, 22.4_
  
  - [x] 18.6 Implement billing endpoints
    - GET /api/v1/billing/subscription
    - POST /api/v1/billing/upgrade
    - POST /api/v1/billing/purchase-credits
    - GET /api/v1/billing/invoices
    - _Requirements: 15.6, 15.7, 15.8, 15.9_
  
  - [x] 18.7 Implement analytics endpoints
    - GET /api/v1/analytics/stats
    - GET /api/v1/analytics/sessions
    - GET /api/v1/analytics/usage
    - _Requirements: 25.1, 25.2, 25.3, 25.4, 25.5_
  
  - [ ]* 18.8 Write property test for redirect URL construction
    - **Property 31: Redirect URL Construction**
    - **Validates: Requirements 21.2, 21.5**

- [x] 19. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 20. Verification Interface (Vanilla JS)
  - [x] 20.1 Create HTML structure and CSS styling
    - Create index.html with verification UI
    - Create styles.css with mobile-first responsive design
    - Apply branding placeholders
    - _Requirements: 1.5, 2.2_
  
  - [x] 20.2 Implement DeviceDetector module
    - Implement isDesktop() using user agent detection
    - Implement hasSensorSupport() checking DeviceMotionEvent
    - Implement getBrowserInfo() and getOSVersion()
    - _Requirements: 1.1, 1.2, 1.3, 1.6, 1.7, 1.8_
  
  - [ ]* 20.3 Write property test for device type enforcement
    - **Property 1: Device Type Enforcement**
    - **Validates: Requirements 1.1, 1.2**
  
  - [x] 20.4 Implement VideoCapture module
    - Initialize MediaRecorder with 250ms chunks
    - Implement start(), stop(), onChunk()
    - Handle camera permissions
    - _Requirements: 3.1, 3.2_
  
  - [x] 20.5 Implement IMUCollector module
    - Capture DeviceMotionEvent at 60Hz
    - Record acceleration (x, y, z) and rotation rate (alpha, beta, gamma)
    - Timestamp each sample with millisecond precision
    - _Requirements: 4.1, 4.2, 4.3, 4.5_
  
  - [x] 20.6 Implement WSManager module
    - Connect to WebSocket endpoint
    - Implement sendVideoChunk(), sendIMUBatch()
    - Implement reconnection logic with exponential backoff
    - Handle server messages (branding, phase_change, result, error)
    - _Requirements: 3.2, 3.3, 3.4, 3.5_
  
  - [x] 20.7 Implement ChallengeController module
    - Implement startBaseline() (1 second static hold)
    - Implement startPan() (tilt phone right)
    - Implement startReturn() (return to center)
    - Emit phase change events
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  
  - [x] 20.8 Implement UIController module
    - Display phase instructions
    - Apply partner branding (logo, colors)
    - Show error messages
    - Show verification result
    - Handle redirect to return_url
    - _Requirements: 5.6, 21.1, 21.2, 21.3, 21.4, 21.5, 21.7, 22.5_
  
  - [x] 20.9 Wire all modules together in main.js
    - Initialize all modules
    - Set up event listeners
    - Handle complete verification flow
    - _Requirements: All verification interface requirements_

- [ ] 21. Partner Dashboard (Angular 17+)
  - [x] 21.1 Create Angular project with standalone components
    - ng new partner-dashboard --standalone
    - Configure routing
    - Set up Angular Material
    - _Requirements: 2.1, 2.7_
  
  - [x] 21.2 Implement LoginComponent
    - Create login form with email/password
    - Call AuthService.login()
    - Store JWT in httpOnly cookie
    - Redirect to dashboard on success
    - _Requirements: 13.2, 13.3, 13.8_
  
  - [x] 21.3 Implement AuthService
    - Implement login(), logout(), refreshToken()
    - Implement getCurrentUser()
    - Store JWT securely
    - _Requirements: 13.3, 13.5, 13.6, 13.8, 13.9_
  
  - [x] 21.4 Implement DashboardComponent
    - Display total verifications, pass rate, average trust score
    - Display time-series graphs using Chart.js
    - Display usage quota and billing info
    - _Requirements: 25.2, 25.3, 25.8_
  
  - [ ]* 21.5 Write property test for dashboard metrics accuracy
    - **Property 37: Dashboard Metrics Accuracy**
    - **Validates: Requirements 25.2**
  
  - [x] 21.6 Implement AnalyticsComponent
    - Implement date range filtering
    - Implement status filtering
    - Implement data export (CSV/JSON)
    - _Requirements: 25.3, 25.4_
  
  - [x] 21.7 Implement SessionDetailsComponent
    - Load session by ID
    - Display correlation data and trust scores
    - Implement artifact download buttons
    - Display correlation graph
    - _Requirements: 25.5_
  
  - [x] 21.8 Implement BrandingConfigComponent
    - Implement logo upload with validation
    - Implement color picker for primary/secondary/button colors
    - Implement live preview
    - _Requirements: 22.1, 22.2, 22.3_
  
  - [x] 21.9 Implement APIKeysComponent
    - Display list of API keys
    - Implement generate key (sandbox/production)
    - Implement revoke key
    - _Requirements: 14.2, 14.3_
  
  - [x] 21.10 Implement BillingComponent
    - Display current subscription tier
    - Implement upgrade/downgrade plan
    - Implement purchase credits
    - Display invoices
    - Integrate Razorpay checkout
    - _Requirements: 15.6, 15.7, 15.8, 15.9, 15.10, 25.8_

- [ ] 22. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 23. Integration Testing
  - [ ]* 23.1 Write end-to-end test for complete verification flow
    - Test session creation via API
    - Test WebSocket connection
    - Test video/IMU data streaming
    - Test Tier 1 analysis
    - Test result delivery
    - Test webhook delivery
    - _Requirements: All core requirements_
  
  - [ ]* 23.2 Write integration test for multi-tenant isolation
    - Create two tenants
    - Verify tenant A cannot access tenant B's data
    - Test at database, API, and dashboard levels
    - _Requirements: 12.3, 12.6, 20.6, 25.7, 27.6_
  
  - [ ]* 23.3 Write integration test for quota enforcement
    - Create tenant with quota = 3
    - Perform 3 verifications (should succeed)
    - Attempt 4th verification (should fail with 429)
    - _Requirements: 16.2, 16.3, 19.7_
  
  - [ ]* 23.4 Write integration test for rate limiting
    - Test concurrent session limit (10)
    - Test API rate limit (100/minute)
    - Verify 429 errors returned
    - _Requirements: 17.1, 17.2, 17.3_

- [ ] 24. AWS CDK Infrastructure
  - [ ] 24.1 Create CDK project structure
    - Initialize CDK app with Python
    - Create stack files for each component
    - Configure cdk.json
    - _Requirements: 26.1, 26.2, 26.3, 26.4, 26.5, 26.6, 26.7, 26.8_
  
  - [ ] 24.2 Implement NetworkStack (optional for POC)
    - Define VPC with public subnets only (no NAT for dev)
    - Define security groups
    - _Requirements: 26.8_
  
  - [ ] 24.3 Implement DatabaseStack
    - Define Lightsail Database (Micro for dev)
    - Configure backup retention
    - _Requirements: 26.6_
  
  - [ ] 24.4 Implement StorageStack
    - Define S3 buckets (artifacts, branding)
    - Configure lifecycle policies (90-day retention, Glacier transition)
    - Configure CORS
    - _Requirements: 18.1, 18.3, 18.4, 18.5, 18.6_
  
  - [ ] 24.5 Implement ComputeStack
    - Define Lightsail Container Service (Nano for dev)
    - Configure environment variables
    - Configure health checks
    - _Requirements: 26.1, 26.2, 26.3, 26.5_
  
  - [ ] 24.6 Implement AuthStack
    - Define Cognito User Pool
    - Define User Pool Client
    - Configure password policy
    - _Requirements: 13.1, 13.2, 13.4, 13.5_
  
  - [ ] 24.7 Implement FrontendStack
    - Define S3 buckets for verification interface and dashboard
    - Define CloudFront distributions
    - Configure caching policies
    - _Requirements: 2.3, 2.4, 2.5, 2.6_
  
  - [ ] 24.8 Implement AIStack (production only)
    - Define SageMaker endpoint configuration
    - Define SageMaker endpoint
    - _Requirements: 8.2_
  
  - [ ] 24.9 Create deployment scripts
    - Create deploy.sh for each environment (dev, staging, prod)
    - Configure CI/CD pipeline (GitHub Actions)
    - _Requirements: All deployment requirements_

- [ ] 25. Documentation
  - [ ] 25.1 Write API documentation
    - Document all REST endpoints
    - Document WebSocket protocol
    - Document authentication flow
    - Generate OpenAPI/Swagger docs
    - _Requirements: 14.3_
  
  - [ ] 25.2 Write integration guide for partners
    - Document session creation flow
    - Document redirect flow
    - Document webhook handling
    - Provide code examples (JavaScript, Python, PHP)
    - _Requirements: 14.3, 14.6_
  
  - [ ] 25.3 Write deployment guide
    - Document local development setup
    - Document CDK deployment process
    - Document environment configuration
    - _Requirements: All deployment requirements_
  
  - [ ] 25.4 Write testing guide
    - Document how to run unit tests
    - Document how to run integration tests
    - Document how to run E2E tests
    - Document how to run property tests
    - _Requirements: All testing requirements_

- [ ] 26. Final Checkpoint - Complete System Verification
  - Ensure all tests pass
  - Verify local development environment works end-to-end
  - Verify all API endpoints are functional
  - Verify both frontends are functional
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (100+ iterations each)
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end flows and multi-tenant isolation
- The implementation follows an incremental approach: core backend → verification logic → frontends → infrastructure
