# Requirements Document: Partner Dashboard Enterprise

## Introduction

The VeraProof AI Partner Portal is an enterprise-grade Angular Material SaaS dashboard that enables B2B partners to integrate, manage, and monitor their fraud detection API usage. Partners use this dashboard to manage API keys, track verification sessions, configure webhooks, customize branding, manage billing, and analyze usage patterns. The dashboard provides both tenant user access and master admin capabilities for platform oversight.

## Glossary

- **Partner**: A B2B customer who integrates VeraProof AI verification API into their application
- **Tenant**: An organizational account representing a partner company
- **Tenant_User**: A user belonging to a specific tenant with full access to that tenant's resources
- **Master_Admin**: A special administrative user who can view all tenants and their information across the platform
- **Verification_Session**: A single fraud detection verification attempt initiated via the API
- **API_Key**: Authentication credential used to access the VeraProof AI API (environment-specific: sandbox/production)
- **Trust_Score**: A numerical value (0-100) indicating the confidence level of verification authenticity
- **Tier_1_Analysis**: Physics-based sensor fusion analysis (IMU + Optical Flow correlation)
- **Tier_2_Analysis**: AI-based forensics analysis for deepfake detection
- **Webhook**: HTTP callback endpoint for receiving real-time verification result notifications
- **Branding_Config**: Customizable visual elements (logo, colors) applied to the verification interface
- **Subscription_Tier**: Service level determining monthly quota and features (Sandbox, Starter, Professional, Enterprise)
- **Usage_Quota**: Maximum number of verification sessions allowed per billing cycle
- **Dashboard**: The Angular Material web application providing the partner portal interface
- **Backend_API**: The FastAPI service providing data and business logic endpoints

## Requirements

### Requirement 1: User Authentication and Authorization

**User Story:** As a partner user, I want to securely log in to the dashboard, so that I can access my tenant's verification data and settings.

#### Acceptance Criteria

1. WHEN a user submits valid credentials, THE Dashboard SHALL authenticate via the Backend_API and store JWT tokens securely
2. WHEN a user's access token expires, THE Dashboard SHALL automatically refresh it using the refresh token without requiring re-login
3. WHEN authentication fails, THE Dashboard SHALL display a clear error message and prevent access to protected routes
4. WHEN a user logs out, THE Dashboard SHALL revoke tokens and clear all session data
5. THE Dashboard SHALL protect all routes except login/signup with authentication guards
6. WHEN a Master_Admin logs in, THE Dashboard SHALL grant access to all tenant data and administrative views

### Requirement 2: API Key Management

**User Story:** As a partner user, I want to generate and manage API keys, so that I can integrate the verification API into my application.

#### Acceptance Criteria

1. WHEN a Tenant_User generates an API key, THE Dashboard SHALL create environment-specific keys (sandbox or production) via the Backend_API
2. WHEN displaying API keys, THE Dashboard SHALL show the key value, environment, creation date, and usage statistics
3. WHEN a Tenant_User revokes an API key, THE Dashboard SHALL immediately invalidate it and prevent further API calls
4. THE Dashboard SHALL display a warning before key revocation to prevent accidental deletion
5. WHEN an API key is first generated, THE Dashboard SHALL display the secret once with a copy-to-clipboard function
6. THE Dashboard SHALL track and display per-key usage metrics including total calls and last used timestamp

### Requirement 3: Create Verification Session

**User Story:** As a partner user, I want to create new verification sessions directly from the dashboard, so that I can test the verification flow and generate session URLs for manual testing.

#### Acceptance Criteria

1. WHEN a Tenant_User clicks create session, THE Dashboard SHALL display a form to input return URL and optional metadata
2. WHEN a Tenant_User submits the create session form, THE Dashboard SHALL call the Backend_API to generate a new session
3. WHEN a session is created successfully, THE Dashboard SHALL display the session URL with a copy-to-clipboard button
4. THE Dashboard SHALL display the session expiration time and countdown timer
5. WHEN a Tenant_User copies the session URL, THE Dashboard SHALL show a confirmation notification
6. THE Dashboard SHALL provide a QR code for the session URL to enable easy mobile device scanning
7. THE Dashboard SHALL allow creating sessions in both sandbox and production environments based on selected API key

### Requirement 4: Verification Session Monitoring

**User Story:** As a partner user, I want to view all verification sessions, so that I can monitor verification activity and investigate specific cases.

#### Acceptance Criteria

1. WHEN a Tenant_User accesses the sessions view, THE Dashboard SHALL display a paginated list of all sessions for that tenant
2. WHEN displaying sessions, THE Dashboard SHALL show session ID, timestamp, status, trust score, and metadata
3. WHEN a Tenant_User clicks a session, THE Dashboard SHALL navigate to a detailed view showing complete verification results
4. THE Dashboard SHALL provide filtering by date range, status, and trust score threshold
5. THE Dashboard SHALL provide search functionality by session ID or metadata fields
6. WHEN a session has artifacts (video, IMU data, optical flow), THE Dashboard SHALL provide download links via signed URLs
7. THE Dashboard SHALL display real-time session updates using polling or WebSocket connections

### Requirement 5: Analytics and Reporting

**User Story:** As a partner user, I want to view usage analytics, so that I can understand verification patterns and optimize my integration.

#### Acceptance Criteria

1. WHEN a Tenant_User accesses analytics, THE Dashboard SHALL display total sessions, success rate, and average trust score
2. THE Dashboard SHALL visualize usage trends over time using line charts for daily/weekly/monthly views
3. THE Dashboard SHALL display verification outcome distribution using pie charts (success, failed, timeout, cancelled)
4. THE Dashboard SHALL show current quota usage with a progress indicator and remaining sessions count
5. WHEN quota exceeds 80%, THE Dashboard SHALL display a warning notification
6. THE Dashboard SHALL provide exportable reports in CSV format for external analysis

### Requirement 6: Billing and Subscription Management

**User Story:** As a partner user, I want to manage my subscription and billing, so that I can upgrade plans and track costs.

#### Acceptance Criteria

1. WHEN a Tenant_User accesses billing, THE Dashboard SHALL display current subscription tier, monthly quota, and billing cycle dates
2. THE Dashboard SHALL provide a plan comparison view showing features and pricing for all subscription tiers
3. WHEN a Tenant_User upgrades a subscription, THE Dashboard SHALL process the change via the Backend_API and update quota immediately
4. THE Dashboard SHALL display billing history with invoice dates, amounts, and download links
5. WHEN a Tenant_User purchases additional credits, THE Dashboard SHALL add them to the current quota and reflect the change immediately
6. THE Dashboard SHALL display upcoming renewal date and estimated cost based on current usage

### Requirement 7: Webhook Configuration

**User Story:** As a partner user, I want to configure webhooks, so that I can receive real-time verification result notifications in my application.

#### Acceptance Criteria

1. WHEN a Tenant_User adds a webhook, THE Dashboard SHALL validate the URL format and save the configuration via the Backend_API
2. THE Dashboard SHALL allow multiple webhook endpoints with individual enable/disable toggles
3. WHEN a webhook is configured, THE Dashboard SHALL provide a test function to send a sample payload
4. THE Dashboard SHALL display webhook delivery logs showing timestamp, status code, and response time
5. WHEN webhook delivery fails, THE Dashboard SHALL display error details and retry information
6. THE Dashboard SHALL provide webhook payload documentation with example JSON structures

### Requirement 8: Custom Branding Configuration

**User Story:** As a partner user, I want to customize the verification interface branding, so that it matches my company's visual identity.

#### Acceptance Criteria

1. WHEN a Tenant_User uploads a logo, THE Dashboard SHALL validate file type (PNG, JPG, SVG), size (max 2MB), and upload via the Backend_API
2. THE Dashboard SHALL provide a color picker for primary, secondary, and button colors with hex value input
3. WHEN branding is updated, THE Dashboard SHALL display a live preview of the verification interface
4. THE Dashboard SHALL validate color contrast ratios to ensure accessibility compliance
5. WHEN a Tenant_User saves branding changes, THE Dashboard SHALL apply them immediately to all new verification sessions
6. THE Dashboard SHALL provide a reset-to-default option to restore original branding

### Requirement 9: Master Admin Dashboard

**User Story:** As a Master_Admin, I want to view all tenants and their information, so that I can monitor platform health and support partners.

#### Acceptance Criteria

1. WHEN a Master_Admin logs in, THE Dashboard SHALL display a tenant list view with search and filtering capabilities
2. THE Dashboard SHALL show per-tenant metrics including total sessions, current usage, subscription tier, and account status
3. WHEN a Master_Admin selects a tenant, THE Dashboard SHALL display detailed tenant information and usage history
4. THE Dashboard SHALL provide platform-wide analytics showing total tenants, total sessions, and revenue metrics
5. THE Dashboard SHALL allow Master_Admin to view any tenant's sessions and configuration without modification rights
6. THE Dashboard SHALL display system health metrics including API response times and error rates

### Requirement 10: Responsive Design and Mobile Support

**User Story:** As a partner user, I want to access the dashboard on mobile devices, so that I can monitor verifications on the go.

#### Acceptance Criteria

1. THE Dashboard SHALL render correctly on screen sizes from 320px to 2560px width
2. WHEN viewed on mobile devices, THE Dashboard SHALL use a collapsible navigation menu
3. THE Dashboard SHALL adapt table layouts to card-based views on screens smaller than 768px
4. THE Dashboard SHALL maintain touch-friendly interaction targets with minimum 44px tap areas
5. THE Dashboard SHALL optimize chart rendering for mobile viewports with simplified legends
6. WHEN printing, THE Dashboard SHALL apply print-specific styles for reports and invoices

### Requirement 11: Error Handling and User Feedback

**User Story:** As a partner user, I want clear feedback on actions and errors, so that I understand system state and can resolve issues.

#### Acceptance Criteria

1. WHEN an API call fails, THE Dashboard SHALL display a user-friendly error message with actionable guidance
2. THE Dashboard SHALL show loading indicators during asynchronous operations
3. WHEN a user action succeeds, THE Dashboard SHALL display a success notification with confirmation details
4. THE Dashboard SHALL implement retry logic for transient network failures with exponential backoff
5. WHEN the Backend_API is unreachable, THE Dashboard SHALL display a connection error banner with retry option
6. THE Dashboard SHALL log client-side errors to the console for debugging purposes

### Requirement 12: Data Security and Privacy

**User Story:** As a partner user, I want my data to be secure, so that I can trust the platform with sensitive verification information.

#### Acceptance Criteria

1. THE Dashboard SHALL store JWT tokens in httpOnly cookies or secure browser storage
2. THE Dashboard SHALL never log or display sensitive data (passwords, API secrets) in plain text
3. WHEN transmitting data, THE Dashboard SHALL use HTTPS for all API communications
4. THE Dashboard SHALL implement CSRF protection for state-changing operations
5. WHEN a user is inactive for 30 minutes, THE Dashboard SHALL automatically log them out
6. THE Dashboard SHALL sanitize all user inputs to prevent XSS attacks

### Requirement 13: Performance and Optimization

**User Story:** As a partner user, I want the dashboard to load quickly, so that I can access information efficiently.

#### Acceptance Criteria

1. THE Dashboard SHALL achieve initial page load in under 3 seconds on 3G connections
2. THE Dashboard SHALL implement lazy loading for feature modules to reduce initial bundle size
3. THE Dashboard SHALL cache API responses where appropriate with configurable TTL
4. THE Dashboard SHALL implement virtual scrolling for large session lists (>100 items)
5. THE Dashboard SHALL optimize images and assets using compression and modern formats (WebP)
6. THE Dashboard SHALL achieve a Lighthouse performance score of 90+ in production builds
