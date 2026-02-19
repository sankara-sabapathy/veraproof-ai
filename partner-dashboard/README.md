# VeraProof Partner Dashboard

Enterprise-grade Angular Material SaaS dashboard for VeraProof AI B2B partners.

## Features

- **API Key Management**: Generate and manage sandbox/production API keys
- **Session Monitoring**: Real-time session tracking with WebSocket updates
- **Analytics Dashboard**: Usage trends, outcome distribution, and quota tracking
- **Billing & Subscriptions**: Manage subscription tiers, view invoices, purchase credits
- **Webhook Configuration**: Configure and test webhooks for session events
- **Custom Branding**: Upload logos and customize colors for verification interface
- **Admin Panel**: Master admin view for tenant management and platform analytics
- **Security**: CSRF protection, XSS prevention, automatic logout, HTTPS enforcement

## Tech Stack

- **Framework**: Angular 17+ (Standalone Components)
- **UI Library**: Angular Material 17+
- **State Management**: RxJS BehaviorSubjects
- **Testing**: Jasmine/Karma (unit), Playwright (E2E), fast-check (property-based)
- **Charts**: Chart.js with ng2-charts
- **Security**: DOMPurify for XSS prevention

## Prerequisites

- Node.js 18+ and npm
- Angular CLI 17+

## Installation

```bash
# Install dependencies
npm install

# Install Angular CLI globally (if not already installed)
npm install -g @angular/cli@17
```

## Development

```bash
# Start development server
npm start

# The app will be available at http://localhost:4200
```

## Building

```bash
# Development build
npm run build

# Production build
ng build --configuration production
```

## Testing

```bash
# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests in headed mode
npm run test:e2e:headed
```

## Project Structure

```
partner-dashboard/
├── src/
│   ├── app/
│   │   ├── components/          # Legacy components (to be migrated)
│   │   ├── core/                # Core services, guards, interceptors
│   │   │   ├── guards/          # Auth and admin route guards
│   │   │   ├── interceptors/    # HTTP interceptors
│   │   │   ├── models/          # TypeScript interfaces
│   │   │   └── services/        # Core services (auth, API, security)
│   │   ├── features/            # Feature modules
│   │   │   ├── admin/           # Admin panel (tenant management)
│   │   │   ├── analytics/       # Analytics dashboard
│   │   │   ├── api-keys/        # API key management
│   │   │   ├── billing/         # Billing and subscriptions
│   │   │   ├── branding/        # Custom branding
│   │   │   ├── dashboard/       # Main dashboard
│   │   │   ├── sessions/        # Session monitoring
│   │   │   └── webhooks/        # Webhook configuration
│   │   ├── layout/              # Layout components (sidebar, toolbar)
│   │   ├── shared/              # Shared components, pipes, directives
│   │   ├── app.component.ts     # Root component
│   │   └── app.routes.ts        # Application routes
│   ├── environments/            # Environment configurations
│   └── main.ts                  # Application bootstrap
├── docs/                        # Documentation
│   └── API_DOCUMENTATION.md     # Backend API endpoint documentation
├── playwright.config.ts         # Playwright E2E test configuration
└── karma.conf.js                # Karma unit test configuration
```

## Environment Configuration

### Development (`src/environments/environment.ts`)
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000',
  cognito: {
    userPoolId: 'ap-south-1_l4nlq0n8y',
    clientId: '2b7tq4gj7426iamis9snrrh2fo',
    region: 'ap-south-1'
  }
};
```

### Production (`src/environments/environment.prod.ts`)
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://veraproof-api-prod.hbcqqqvv5xfqj.ap-south-1.cs.amazonlightsail.com',
  cognito: {
    userPoolId: 'ap-south-1_l4nlq0n8y',
    clientId: '2b7tq4gj7426iamis9snrrh2fo',
    region: 'ap-south-1'
  }
};
```

## Current Status

### Completed
- ✅ Core authentication service with JWT
- ✅ HTTP interceptors (auth + error handling)
- ✅ Route guards (auth + admin)
- ✅ Shared services and components
- ✅ Main layout with responsive sidebar
- ✅ Login/Signup components
- ✅ All feature module services and state management
- ✅ Security features (CSRF, XSS prevention, inactivity logout)
- ✅ API documentation (40+ endpoints)

### In Progress
- 🔄 Converting components to standalone (Angular 17 requirement)
- 🔄 Adding missing Angular Material module imports
- 🔄 Fixing template compilation errors

### Remaining
- ⏳ Complete component migration to standalone
- ⏳ Integration testing
- ⏳ E2E test implementation
- ⏳ Property-based test implementation
- ⏳ Build and deployment configuration

## Known Issues

1. **Component Migration**: Many components need to be converted to standalone components with proper Angular Material imports
2. **Template Errors**: Some templates have syntax errors that need fixing (webhook-form JSON display)
3. **Missing Imports**: Several components are missing required Angular Material module imports

## Next Steps

1. Complete standalone component migration for all feature components
2. Fix template syntax errors
3. Run build to verify all compilation errors are resolved
4. Implement integration tests
5. Set up CI/CD pipeline

## API Backend

The dashboard requires a FastAPI backend running at the configured `apiUrl`. See `docs/API_DOCUMENTATION.md` for complete API endpoint documentation.

## Security Features

- **Token Storage**: Secure JWT storage with httpOnly cookies
- **CSRF Protection**: CSRF tokens for all state-changing operations
- **XSS Prevention**: DOMPurify sanitization for all user inputs
- **Automatic Logout**: 30-minute inactivity timeout
- **HTTPS Enforcement**: All API calls use HTTPS in production

## Contributing

1. Follow Angular style guide
2. Write unit tests for all new features
3. Ensure all tests pass before committing
4. Use conventional commits for commit messages

## License

Proprietary - VeraProof AI
