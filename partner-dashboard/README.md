# VeraProof AI - Partner Dashboard

Angular 17+ standalone components dashboard for partner management.

## Features

- Authentication (login/signup with JWT)
- Dashboard overview with stats
- Analytics with filtering and CSV export
- Session details viewer
- Branding configuration (logo + colors)
- API key management
- Billing and subscription management

## Setup

```bash
cd partner-dashboard
npm install
npm start
```

Access at: http://localhost:4200

## Build

```bash
npm run build
```

Output in `dist/partner-dashboard`

## Environment

Configure API URL in `src/environments/environment.ts`

## Components

- LoginComponent - Authentication
- DashboardComponent - Overview stats
- AnalyticsComponent - Session list with filters
- SessionDetailsComponent - Detailed session view
- BrandingComponent - Logo and color customization
- ApiKeysComponent - API key generation and management
- BillingComponent - Subscription and invoices
