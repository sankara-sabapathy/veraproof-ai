# Requirements Document: Dashboard Signup CORS Fix

## Introduction

The Partner Dashboard signup functionality is currently failing with CORS errors because the backend API is not configured to accept requests from the production CloudFront URLs. This specification addresses the configuration changes needed across deployment scripts, CI/CD pipelines, and environment configurations to enable successful signup flows in production.

## Glossary

- **Backend_API**: The FastAPI application running on AWS Lightsail Container Service that handles authentication and business logic
- **Partner_Dashboard**: The Angular 17 frontend application for partner management, deployed to S3 and served via CloudFront
- **Verification_Interface**: The Angular 17 frontend application for end-user verification, deployed to S3 and served via CloudFront
- **CORS_Middleware**: Cross-Origin Resource Sharing middleware in FastAPI that controls which origins can make requests to the API
- **Deployment_Script**: PowerShell or Bash scripts that deploy the backend container to AWS Lightsail
- **CI_CD_Pipeline**: GitHub Actions workflow that automates deployment on code changes
- **Environment_Variables**: Configuration values passed to the backend container at runtime
- **CloudFront_URL**: The production URL for frontend applications served through AWS CloudFront CDN

## Requirements

### Requirement 1: Backend CORS Configuration

**User Story:** As a partner, I want to sign up through the production dashboard, so that I can access the VeraProof platform.

#### Acceptance Criteria

1. WHEN the Backend_API receives a request from the production Partner_Dashboard CloudFront_URL, THE CORS_Middleware SHALL accept the request
2. WHEN the Backend_API receives a request from the production Verification_Interface CloudFront_URL, THE CORS_Middleware SHALL accept the request
3. WHEN the Backend_API receives a request from localhost development URLs, THE CORS_Middleware SHALL accept the request
4. THE Backend_API SHALL read CORS origins from the CORS_ORIGINS environment variable
5. THE CORS_ORIGINS environment variable SHALL contain all required URLs: production dashboard, production verification interface, and localhost URLs

### Requirement 2: Local Deployment Script Configuration

**User Story:** As a developer, I want to deploy the backend locally with correct CORS settings, so that I can test production-like configurations.

#### Acceptance Criteria

1. WHEN executing the PowerShell Deployment_Script, THE script SHALL set the CORS_ORIGINS environment variable with all required URLs
2. WHEN executing the Bash Deployment_Script, THE script SHALL set the CORS_ORIGINS environment variable with all required URLs
3. WHEN deploying via Deployment_Script, THE Backend_API SHALL receive all required Environment_Variables including JWT_SECRET, BACKEND_URL, FRONTEND_DASHBOARD_URL, and FRONTEND_VERIFICATION_URL
4. THE Deployment_Script SHALL URL-encode special characters in the database password
5. WHEN the deployment completes, THE Backend_API container SHALL be in ACTIVE state

### Requirement 3: CI/CD Pipeline Configuration

**User Story:** As a developer, I want automated deployments to include correct CORS settings, so that production deployments work without manual intervention.

#### Acceptance Criteria

1. WHEN the CI_CD_Pipeline deploys the backend, THE pipeline SHALL set the CORS_ORIGINS environment variable with all required URLs
2. WHEN the CI_CD_Pipeline deploys the backend, THE pipeline SHALL include all required Environment_Variables
3. WHEN the CI_CD_Pipeline completes, THE Backend_API container SHALL be in ACTIVE state
4. THE CI_CD_Pipeline SHALL use GitHub Secrets for sensitive values like JWT_SECRET and database credentials

### Requirement 4: Frontend Production Configuration

**User Story:** As a developer, I want the frontend to use production API endpoints, so that the dashboard communicates with the correct backend.

#### Acceptance Criteria

1. WHEN building the Partner_Dashboard for production, THE build process SHALL use the production environment configuration
2. THE production environment configuration SHALL specify the correct Backend_API URL
3. WHEN the Partner_Dashboard is deployed to CloudFront, THE application SHALL make API requests to the production Backend_API URL
4. WHEN CloudFront cache is invalidated, THE updated frontend SHALL be available within 3 minutes

### Requirement 5: End-to-End Signup Verification

**User Story:** As a partner, I want to complete the signup process without errors, so that I can start using the platform.

#### Acceptance Criteria

1. WHEN a user submits the signup form on the production Partner_Dashboard, THE Backend_API SHALL process the request without CORS errors
2. WHEN the signup is successful, THE Backend_API SHALL return a success response with authentication tokens
3. WHEN the signup fails due to validation errors, THE Backend_API SHALL return appropriate error messages
4. THE signup flow SHALL complete within 3 seconds to meet the sub-3-second latency requirement
5. WHEN the signup is successful, THE user SHALL be redirected to the dashboard home page

### Requirement 6: Configuration Validation

**User Story:** As a developer, I want to validate that all configurations are correct before deployment, so that I can catch errors early.

#### Acceptance Criteria

1. WHEN reviewing deployment configurations, THE CORS_ORIGINS SHALL include exactly these URLs: https://d3gc0en9my7apv.cloudfront.net, https://dmieqia655oqd.cloudfront.net, http://localhost:3000, http://localhost:4200
2. WHEN reviewing Environment_Variables, THE configuration SHALL include JWT_SECRET, CORS_ORIGINS, BACKEND_URL, FRONTEND_DASHBOARD_URL, FRONTEND_VERIFICATION_URL, and database credentials
3. THE database password SHALL be properly URL-encoded in all deployment configurations
4. THE Backend_API URL SHALL match the Lightsail container service endpoint: https://veraproof-api-prod.hbcqqqvv5xfqj.ap-south-1.cs.amazonlightsail.com
