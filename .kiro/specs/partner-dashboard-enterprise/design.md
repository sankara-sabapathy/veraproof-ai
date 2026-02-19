# Design Document: Partner Dashboard Enterprise

## Overview

The VeraProof AI Partner Dashboard is an enterprise-grade Angular Material SaaS application that provides partners with comprehensive tools to manage their fraud detection API integration. The dashboard follows Angular best practices with a modular architecture, leveraging Angular Material components for a mature, professional UI that is fully responsive across all device sizes.

The application is structured around feature modules that encapsulate related functionality, shared services for cross-cutting concerns, and a robust state management approach using RxJS and Angular services. The design prioritizes type safety, testability, maintainability, and user experience.

### Key Design Principles

1. **Modular Architecture**: Feature-based modules with lazy loading for optimal performance
2. **Material Design**: Consistent use of Angular Material components for professional UI
3. **Reactive Programming**: RxJS observables for state management and async operations
4. **Type Safety**: Comprehensive TypeScript interfaces and strict type checking
5. **Responsive Design**: Mobile-first approach with Material breakpoints
6. **Testability**: Dependency injection and service abstraction for comprehensive testing
7. **Security**: Token-based authentication with automatic refresh and secure storage

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Angular Application                      │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Core Module (Singleton)                  │  │
│  │  - Auth Service, HTTP Interceptor, Guards            │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Shared Module (Reusable)                 │  │
│  │  - Material Components, Pipes, Directives            │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           Feature Modules (Lazy Loaded)               │  │
│  │  - Dashboard, API Keys, Sessions, Analytics          │  │
│  │  - Billing, Webhooks, Branding, Admin                │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/WebSocket
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Backend                           │
│  /api/v1/auth, /api/v1/sessions, /api/v1/analytics, etc.   │
└─────────────────────────────────────────────────────────────┘
```

### Module Structure


```
src/
├── app/
│   ├── core/                          # Singleton services and guards
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── api.service.ts
│   │   │   └── notification.service.ts
│   │   ├── interceptors/
│   │   │   ├── auth.interceptor.ts
│   │   │   └── error.interceptor.ts
│   │   ├── guards/
│   │   │   ├── auth.guard.ts
│   │   │   └── admin.guard.ts
│   │   └── core.module.ts
│   │
│   ├── shared/                        # Reusable components and utilities
│   │   ├── components/
│   │   │   ├── loading-spinner/
│   │   │   ├── confirmation-dialog/
│   │   │   ├── stat-card/
│   │   │   └── data-table/
│   │   ├── pipes/
│   │   │   ├── date-format.pipe.ts
│   │   │   └── trust-score-color.pipe.ts
│   │   ├── directives/
│   │   │   └── copy-to-clipboard.directive.ts
│   │   ├── models/
│   │   │   └── interfaces.ts
│   │   └── shared.module.ts
│   │
│   ├── features/                      # Feature modules (lazy loaded)
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   └── auth.module.ts
│   │   ├── dashboard/
│   │   │   ├── dashboard.component.ts
│   │   │   ├── dashboard.service.ts
│   │   │   └── dashboard.module.ts
│   │   ├── api-keys/
│   │   │   ├── api-keys-list/
│   │   │   ├── api-key-create-dialog/
│   │   │   ├── api-keys.service.ts
│   │   │   └── api-keys.module.ts
│   │   ├── sessions/
│   │   │   ├── session-list/
│   │   │   ├── session-detail/
│   │   │   ├── session-create-dialog/
│   │   │   ├── sessions.service.ts
│   │   │   └── sessions.module.ts
│   │   ├── analytics/
│   │   │   ├── analytics-overview/
│   │   │   ├── usage-chart/
│   │   │   ├── analytics.service.ts
│   │   │   └── analytics.module.ts
│   │   ├── billing/
│   │   │   ├── subscription-overview/
│   │   │   ├── plan-comparison/
│   │   │   ├── invoice-list/
│   │   │   ├── billing.service.ts
│   │   │   └── billing.module.ts
│   │   ├── webhooks/
│   │   │   ├── webhook-list/
│   │   │   ├── webhook-form/
│   │   │   ├── webhook-logs/
│   │   │   ├── webhooks.service.ts
│   │   │   └── webhooks.module.ts
│   │   ├── branding/
│   │   │   ├── branding-editor/
│   │   │   ├── branding-preview/
│   │   │   ├── branding.service.ts
│   │   │   └── branding.module.ts
│   │   └── admin/
│   │       ├── tenant-list/
│   │       ├── tenant-detail/
│   │       ├── platform-analytics/
│   │       ├── admin.service.ts
│   │       └── admin.module.ts
│   │
│   ├── layout/                        # Layout components
│   │   ├── main-layout/
│   │   │   ├── main-layout.component.ts
│   │   │   ├── sidebar/
│   │   │   └── toolbar/
│   │   └── layout.module.ts
│   │
│   ├── app.component.ts
│   ├── app.routes.ts
│   └── app.config.ts
│
└── environments/
    ├── environment.ts
    └── environment.prod.ts
```


## Components and Interfaces

### Core Services

#### AuthService

The authentication service manages user authentication state, token storage, and automatic token refresh.

```typescript
interface AuthService {
  // Observable of current user state
  currentUser$: Observable<User | null>;
  isAuthenticated$: Observable<boolean>;
  
  // Authentication methods
  login(email: string, password: string): Observable<AuthResponse>;
  signup(email: string, password: string): Observable<AuthResponse>;
  logout(): Observable<void>;
  refreshToken(): Observable<AuthResponse>;
  
  // Token management
  getAccessToken(): string | null;
  setTokens(accessToken: string, refreshToken: string): void;
  clearTokens(): void;
  
  // User info
  getCurrentUser(): User | null;
  isAdmin(): boolean;
}

interface User {
  user_id: string;
  tenant_id: string;
  email: string;
  role: 'Admin' | 'Master_Admin';
}

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}
```

#### ApiService

Generic HTTP service for making authenticated API calls with error handling.

```typescript
interface ApiService {
  get<T>(endpoint: string, params?: HttpParams): Observable<T>;
  post<T>(endpoint: string, body: any): Observable<T>;
  put<T>(endpoint: string, body: any): Observable<T>;
  delete<T>(endpoint: string): Observable<T>;
  upload<T>(endpoint: string, file: File): Observable<T>;
}
```

#### NotificationService

Service for displaying user notifications using Material Snackbar.

```typescript
interface NotificationService {
  success(message: string, duration?: number): void;
  error(message: string, duration?: number): void;
  info(message: string, duration?: number): void;
  warning(message: string, duration?: number): void;
}
```

### Feature Services

#### SessionsService

Manages verification session operations.

```typescript
interface SessionsService {
  createSession(request: CreateSessionRequest): Observable<CreateSessionResponse>;
  getSession(sessionId: string): Observable<Session>;
  getSessions(params: SessionQueryParams): Observable<SessionListResponse>;
  getSessionResults(sessionId: string): Observable<VerificationResult>;
  getVideoUrl(sessionId: string): Observable<{ url: string }>;
  getImuDataUrl(sessionId: string): Observable<{ url: string }>;
  getOpticalFlowUrl(sessionId: string): Observable<{ url: string }>;
}

interface CreateSessionRequest {
  return_url: string;
  metadata?: Record<string, any>;
}

interface CreateSessionResponse {
  session_id: string;
  session_url: string;
  expires_at: string;
}

interface Session {
  session_id: string;
  tenant_id: string;
  state: SessionState;
  tier_1_score: number | null;
  tier_2_score: number | null;
  final_trust_score: number | null;
  correlation_value: number | null;
  reasoning: string | null;
  created_at: string;
  completed_at: string | null;
  metadata: Record<string, any>;
  video_s3_key: string | null;
  imu_data_s3_key: string | null;
  optical_flow_s3_key: string | null;
}

type SessionState = 'idle' | 'baseline' | 'pan' | 'return' | 'analyzing' | 'complete';

interface SessionQueryParams {
  limit?: number;
  offset?: number;
  status?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

interface SessionListResponse {
  sessions: Session[];
  total: number;
  limit: number;
  offset: number;
}

interface VerificationResult {
  session_id: string;
  tier_1_score: number;
  tier_2_score: number | null;
  final_trust_score: number;
  correlation_value: number;
  reasoning: string;
  state: SessionState;
}
```


#### ApiKeysService

Manages API key operations.

```typescript
interface ApiKeysService {
  generateKey(environment: 'sandbox' | 'production'): Observable<ApiKeyResponse>;
  listKeys(): Observable<ApiKey[]>;
  revokeKey(keyId: string): Observable<void>;
  getKeyUsage(keyId: string): Observable<KeyUsageStats>;
}

interface ApiKeyResponse {
  key_id: string;
  api_key: string;
  api_secret: string;
  environment: 'sandbox' | 'production';
}

interface ApiKey {
  key_id: string;
  api_key: string;
  environment: 'sandbox' | 'production';
  created_at: string;
  last_used_at: string | null;
  total_calls: number;
  revoked_at: string | null;
}

interface KeyUsageStats {
  key_id: string;
  total_calls: number;
  calls_today: number;
  calls_this_week: number;
  calls_this_month: number;
  last_used_at: string | null;
}
```

#### AnalyticsService

Provides analytics and usage statistics.

```typescript
interface AnalyticsService {
  getStats(): Observable<AnalyticsStats>;
  getUsageTrend(period: 'daily' | 'weekly' | 'monthly'): Observable<UsageTrendData[]>;
  getOutcomeDistribution(): Observable<OutcomeDistribution>;
  exportReport(format: 'csv' | 'json', params: ReportParams): Observable<Blob>;
}

interface AnalyticsStats {
  total_sessions: number;
  success_rate: number;
  average_trust_score: number;
  current_usage: number;
  monthly_quota: number;
  usage_percentage: number;
  sessions_today: number;
  sessions_this_week: number;
  sessions_this_month: number;
}

interface UsageTrendData {
  date: string;
  session_count: number;
  success_count: number;
  failed_count: number;
  average_trust_score: number;
}

interface OutcomeDistribution {
  success: number;
  failed: number;
  timeout: number;
  cancelled: number;
}

interface ReportParams {
  date_from: string;
  date_to: string;
  include_sessions?: boolean;
  include_analytics?: boolean;
}
```

#### BillingService

Manages subscription and billing operations.

```typescript
interface BillingService {
  getSubscription(): Observable<Subscription>;
  getPlans(): Observable<SubscriptionPlan[]>;
  upgradeSubscription(planId: string): Observable<UpgradeResponse>;
  purchaseCredits(amount: number): Observable<PurchaseResponse>;
  getInvoices(): Observable<Invoice[]>;
  downloadInvoice(invoiceId: string): Observable<Blob>;
}

interface Subscription {
  tenant_id: string;
  subscription_tier: 'Sandbox' | 'Starter' | 'Professional' | 'Enterprise';
  monthly_quota: number;
  current_usage: number;
  remaining_quota: number;
  usage_percentage: number;
  billing_cycle_start: string;
  billing_cycle_end: string;
  next_renewal_date: string;
  estimated_cost: number;
}

interface SubscriptionPlan {
  plan_id: string;
  name: string;
  tier: string;
  monthly_quota: number;
  price_per_month: number;
  price_per_verification: number;
  features: string[];
  recommended?: boolean;
}

interface UpgradeResponse {
  order_id: string;
  plan: string;
  effective_date: string;
  new_quota: number;
}

interface PurchaseResponse {
  order_id: string;
  credits_purchased: number;
  total_cost: number;
  new_quota: number;
}

interface Invoice {
  invoice_id: string;
  invoice_number: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  download_url: string;
}
```


#### WebhooksService

Manages webhook configuration and monitoring.

```typescript
interface WebhooksService {
  listWebhooks(): Observable<Webhook[]>;
  createWebhook(config: WebhookConfig): Observable<Webhook>;
  updateWebhook(webhookId: string, config: WebhookConfig): Observable<Webhook>;
  deleteWebhook(webhookId: string): Observable<void>;
  testWebhook(webhookId: string): Observable<WebhookTestResult>;
  getWebhookLogs(webhookId: string, params: LogQueryParams): Observable<WebhookLog[]>;
}

interface Webhook {
  webhook_id: string;
  tenant_id: string;
  url: string;
  enabled: boolean;
  events: string[];
  created_at: string;
  last_triggered_at: string | null;
  success_count: number;
  failure_count: number;
}

interface WebhookConfig {
  url: string;
  enabled: boolean;
  events: string[];
}

interface WebhookTestResult {
  success: boolean;
  status_code: number;
  response_time_ms: number;
  error_message?: string;
}

interface WebhookLog {
  log_id: string;
  webhook_id: string;
  timestamp: string;
  event_type: string;
  status_code: number;
  response_time_ms: number;
  success: boolean;
  error_message?: string;
  retry_count: number;
}

interface LogQueryParams {
  limit?: number;
  offset?: number;
  date_from?: string;
  date_to?: string;
}
```

#### BrandingService

Manages custom branding configuration.

```typescript
interface BrandingService {
  getBranding(): Observable<BrandingConfig>;
  uploadLogo(file: File): Observable<{ logo_url: string }>;
  updateColors(colors: ColorConfig): Observable<void>;
  resetBranding(): Observable<void>;
  previewBranding(config: BrandingConfig): string; // Returns preview HTML
}

interface BrandingConfig {
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  button_color: string;
}

interface ColorConfig {
  primary_color: string;
  secondary_color: string;
  button_color: string;
}
```

#### AdminService

Provides master admin functionality for platform oversight.

```typescript
interface AdminService {
  listTenants(params: TenantQueryParams): Observable<TenantListResponse>;
  getTenantDetail(tenantId: string): Observable<TenantDetail>;
  getTenantSessions(tenantId: string, params: SessionQueryParams): Observable<SessionListResponse>;
  getPlatformStats(): Observable<PlatformStats>;
  getSystemHealth(): Observable<SystemHealth>;
}

interface TenantQueryParams {
  limit?: number;
  offset?: number;
  search?: string;
  subscription_tier?: string;
  status?: string;
}

interface TenantListResponse {
  tenants: TenantSummary[];
  total: number;
  limit: number;
  offset: number;
}

interface TenantSummary {
  tenant_id: string;
  email: string;
  subscription_tier: string;
  total_sessions: number;
  current_usage: number;
  monthly_quota: number;
  created_at: string;
  last_active_at: string;
  status: 'active' | 'suspended' | 'trial';
}

interface TenantDetail extends TenantSummary {
  api_keys_count: number;
  webhooks_count: number;
  success_rate: number;
  average_trust_score: number;
  billing_cycle_start: string;
  billing_cycle_end: string;
}

interface PlatformStats {
  total_tenants: number;
  active_tenants: number;
  total_sessions: number;
  sessions_today: number;
  total_revenue: number;
  revenue_this_month: number;
  average_sessions_per_tenant: number;
  platform_success_rate: number;
}

interface SystemHealth {
  api_status: 'healthy' | 'degraded' | 'down';
  average_response_time_ms: number;
  error_rate: number;
  uptime_percentage: number;
  last_incident: string | null;
}
```


### Shared Components

#### StatCardComponent

Reusable card component for displaying key metrics.

```typescript
@Component({
  selector: 'app-stat-card',
  template: `
    <mat-card class="stat-card">
      <mat-card-header>
        <mat-icon [color]="iconColor">{{ icon }}</mat-icon>
        <mat-card-title>{{ title }}</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <div class="stat-value">{{ value }}</div>
        <div class="stat-subtitle" *ngIf="subtitle">{{ subtitle }}</div>
        <div class="stat-trend" *ngIf="trend">
          <mat-icon [class.positive]="trend > 0" [class.negative]="trend < 0">
            {{ trend > 0 ? 'trending_up' : 'trending_down' }}
          </mat-icon>
          <span>{{ trend }}%</span>
        </div>
      </mat-card-content>
    </mat-card>
  `
})
class StatCardComponent {
  @Input() title: string;
  @Input() value: string | number;
  @Input() subtitle?: string;
  @Input() icon: string;
  @Input() iconColor: 'primary' | 'accent' | 'warn' = 'primary';
  @Input() trend?: number;
}
```

#### DataTableComponent

Generic data table with sorting, filtering, and pagination.

```typescript
@Component({
  selector: 'app-data-table',
  template: `
    <div class="table-container">
      <mat-form-field class="search-field">
        <mat-icon matPrefix>search</mat-icon>
        <input matInput placeholder="Search..." [(ngModel)]="searchTerm" 
               (ngModelChange)="onSearchChange()">
      </mat-form-field>
      
      <table mat-table [dataSource]="dataSource" matSort>
        <ng-container *ngFor="let column of columns" [matColumnDef]="column.key">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ column.label }}</th>
          <td mat-cell *matCellDef="let row">
            <ng-container *ngIf="column.template; else defaultCell">
              <ng-container *ngTemplateOutlet="column.template; context: { $implicit: row }">
              </ng-container>
            </ng-container>
            <ng-template #defaultCell>{{ row[column.key] }}</ng-template>
          </td>
        </ng-container>
        
        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;" 
            (click)="onRowClick(row)"></tr>
      </table>
      
      <mat-paginator [length]="totalItems" [pageSize]="pageSize" 
                     [pageSizeOptions]="[10, 25, 50, 100]"
                     (page)="onPageChange($event)">
      </mat-paginator>
    </div>
  `
})
class DataTableComponent<T> {
  @Input() columns: TableColumn[];
  @Input() dataSource: MatTableDataSource<T>;
  @Input() totalItems: number;
  @Input() pageSize: number = 25;
  @Output() rowClick = new EventEmitter<T>();
  @Output() pageChange = new EventEmitter<PageEvent>();
  @Output() searchChange = new EventEmitter<string>();
  
  searchTerm: string = '';
  displayedColumns: string[];
  
  ngOnInit() {
    this.displayedColumns = this.columns.map(c => c.key);
  }
  
  onRowClick(row: T) {
    this.rowClick.emit(row);
  }
  
  onPageChange(event: PageEvent) {
    this.pageChange.emit(event);
  }
  
  onSearchChange() {
    this.searchChange.emit(this.searchTerm);
  }
}

interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  template?: TemplateRef<any>;
}
```

#### ConfirmationDialogComponent

Reusable confirmation dialog for destructive actions.

```typescript
@Component({
  selector: 'app-confirmation-dialog',
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p>{{ data.message }}</p>
      <mat-form-field *ngIf="data.requireConfirmation">
        <input matInput placeholder="Type 'confirm' to proceed" 
               [(ngModel)]="confirmationText">
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button [color]="data.confirmColor || 'warn'" 
              (click)="onConfirm()" 
              [disabled]="data.requireConfirmation && confirmationText !== 'confirm'">
        {{ data.confirmText || 'Confirm' }}
      </button>
    </mat-dialog-actions>
  `
})
class ConfirmationDialogComponent {
  confirmationText: string = '';
  
  constructor(
    public dialogRef: MatDialogRef<ConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmationDialogData
  ) {}
  
  onConfirm() {
    this.dialogRef.close(true);
  }
  
  onCancel() {
    this.dialogRef.close(false);
  }
}

interface ConfirmationDialogData {
  title: string;
  message: string;
  confirmText?: string;
  confirmColor?: 'primary' | 'accent' | 'warn';
  requireConfirmation?: boolean;
}
```

#### LoadingSpinnerComponent

Loading indicator with optional message.

```typescript
@Component({
  selector: 'app-loading-spinner',
  template: `
    <div class="loading-container">
      <mat-spinner [diameter]="diameter"></mat-spinner>
      <p *ngIf="message" class="loading-message">{{ message }}</p>
    </div>
  `
})
class LoadingSpinnerComponent {
  @Input() diameter: number = 50;
  @Input() message?: string;
}
```


### Routing and Navigation

#### Route Configuration

```typescript
const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.module').then(m => m.AuthModule)
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: 'dashboard',
        loadChildren: () => import('./features/dashboard/dashboard.module').then(m => m.DashboardModule)
      },
      {
        path: 'api-keys',
        loadChildren: () => import('./features/api-keys/api-keys.module').then(m => m.ApiKeysModule)
      },
      {
        path: 'sessions',
        loadChildren: () => import('./features/sessions/sessions.module').then(m => m.SessionsModule)
      },
      {
        path: 'analytics',
        loadChildren: () => import('./features/analytics/analytics.module').then(m => m.AnalyticsModule)
      },
      {
        path: 'billing',
        loadChildren: () => import('./features/billing/billing.module').then(m => m.BillingModule)
      },
      {
        path: 'webhooks',
        loadChildren: () => import('./features/webhooks/webhooks.module').then(m => m.WebhooksModule)
      },
      {
        path: 'branding',
        loadChildren: () => import('./features/branding/branding.module').then(m => m.BrandingModule)
      },
      {
        path: 'admin',
        loadChildren: () => import('./features/admin/admin.module').then(m => m.AdminModule),
        canActivate: [AdminGuard]
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
```

#### Navigation Menu Structure

```typescript
interface NavItem {
  label: string;
  icon: string;
  route: string;
  adminOnly?: boolean;
  children?: NavItem[];
}

const navigationItems: NavItem[] = [
  {
    label: 'Dashboard',
    icon: 'dashboard',
    route: '/dashboard'
  },
  {
    label: 'API Keys',
    icon: 'vpn_key',
    route: '/api-keys'
  },
  {
    label: 'Sessions',
    icon: 'verified_user',
    route: '/sessions'
  },
  {
    label: 'Analytics',
    icon: 'analytics',
    route: '/analytics'
  },
  {
    label: 'Billing',
    icon: 'payment',
    route: '/billing'
  },
  {
    label: 'Webhooks',
    icon: 'webhook',
    route: '/webhooks'
  },
  {
    label: 'Branding',
    icon: 'palette',
    route: '/branding'
  },
  {
    label: 'Admin',
    icon: 'admin_panel_settings',
    route: '/admin',
    adminOnly: true
  }
];
```

### State Management

The application uses a service-based state management approach with RxJS BehaviorSubjects for reactive state updates.

#### State Management Pattern

```typescript
@Injectable({ providedIn: 'root' })
class StateService<T> {
  private state$ = new BehaviorSubject<T>(this.initialState);
  
  constructor(private initialState: T) {}
  
  // Observable for components to subscribe
  select(): Observable<T> {
    return this.state$.asObservable();
  }
  
  // Get current state snapshot
  snapshot(): T {
    return this.state$.value;
  }
  
  // Update state
  setState(state: T): void {
    this.state$.next(state);
  }
  
  // Partial update
  patchState(partial: Partial<T>): void {
    this.state$.next({ ...this.state$.value, ...partial });
  }
}
```

#### Example: Session State Management

```typescript
interface SessionsState {
  sessions: Session[];
  selectedSession: Session | null;
  loading: boolean;
  error: string | null;
  filters: SessionFilters;
  pagination: PaginationState;
}

interface SessionFilters {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

interface PaginationState {
  total: number;
  limit: number;
  offset: number;
}

@Injectable({ providedIn: 'root' })
class SessionsStateService extends StateService<SessionsState> {
  constructor() {
    super({
      sessions: [],
      selectedSession: null,
      loading: false,
      error: null,
      filters: {},
      pagination: { total: 0, limit: 25, offset: 0 }
    });
  }
  
  // Selectors
  sessions$ = this.select().pipe(map(state => state.sessions));
  selectedSession$ = this.select().pipe(map(state => state.selectedSession));
  loading$ = this.select().pipe(map(state => state.loading));
  error$ = this.select().pipe(map(state => state.error));
  
  // Actions
  setLoading(loading: boolean) {
    this.patchState({ loading });
  }
  
  setSessions(sessions: Session[], total: number) {
    this.patchState({ 
      sessions, 
      pagination: { ...this.snapshot().pagination, total },
      loading: false 
    });
  }
  
  setSelectedSession(session: Session | null) {
    this.patchState({ selectedSession: session });
  }
  
  setError(error: string) {
    this.patchState({ error, loading: false });
  }
  
  updateFilters(filters: Partial<SessionFilters>) {
    this.patchState({ 
      filters: { ...this.snapshot().filters, ...filters },
      pagination: { ...this.snapshot().pagination, offset: 0 }
    });
  }
  
  updatePagination(pagination: Partial<PaginationState>) {
    this.patchState({ 
      pagination: { ...this.snapshot().pagination, ...pagination }
    });
  }
}
```


### HTTP Interceptors

#### AuthInterceptor

Automatically adds authentication token to requests and handles token refresh.

```typescript
@Injectable()
class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}
  
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip auth for login/signup endpoints
    if (this.isAuthEndpoint(req.url)) {
      return next.handle(req);
    }
    
    // Add token to request
    const token = this.authService.getAccessToken();
    if (token) {
      req = this.addToken(req, token);
    }
    
    return next.handle(req).pipe(
      catchError(error => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          return this.handle401Error(req, next);
        }
        return throwError(() => error);
      })
    );
  }
  
  private addToken(req: HttpRequest<any>, token: string): HttpRequest<any> {
    return req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }
  
  private handle401Error(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);
      
      return this.authService.refreshToken().pipe(
        switchMap((response: AuthResponse) => {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(response.access_token);
          return next.handle(this.addToken(req, response.access_token));
        }),
        catchError(error => {
          this.isRefreshing = false;
          this.authService.logout();
          this.router.navigate(['/auth/login']);
          return throwError(() => error);
        })
      );
    } else {
      return this.refreshTokenSubject.pipe(
        filter(token => token !== null),
        take(1),
        switchMap(token => next.handle(this.addToken(req, token!)))
      );
    }
  }
  
  private isAuthEndpoint(url: string): boolean {
    return url.includes('/auth/login') || url.includes('/auth/signup');
  }
}
```

#### ErrorInterceptor

Handles HTTP errors and displays user-friendly messages.

```typescript
@Injectable()
class ErrorInterceptor implements HttpInterceptor {
  constructor(private notificationService: NotificationService) {}
  
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        let errorMessage = 'An unexpected error occurred';
        
        if (error.error instanceof ErrorEvent) {
          // Client-side error
          errorMessage = `Error: ${error.error.message}`;
        } else {
          // Server-side error
          errorMessage = this.getServerErrorMessage(error);
        }
        
        this.notificationService.error(errorMessage);
        return throwError(() => error);
      })
    );
  }
  
  private getServerErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return 'Unable to connect to server. Please check your connection.';
    }
    
    if (error.status === 400) {
      return error.error?.detail || 'Invalid request';
    }
    
    if (error.status === 403) {
      return 'You do not have permission to perform this action';
    }
    
    if (error.status === 404) {
      return 'The requested resource was not found';
    }
    
    if (error.status === 429) {
      return error.error?.detail || 'Rate limit exceeded. Please try again later.';
    }
    
    if (error.status >= 500) {
      return 'Server error. Please try again later.';
    }
    
    return error.error?.detail || `Error: ${error.status}`;
  }
}
```

### Guards

#### AuthGuard

Protects routes requiring authentication.

```typescript
@Injectable({ providedIn: 'root' })
class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}
  
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.authService.isAuthenticated$.pipe(
      map(isAuthenticated => {
        if (!isAuthenticated) {
          this.router.navigate(['/auth/login'], {
            queryParams: { returnUrl: state.url }
          });
          return false;
        }
        return true;
      })
    );
  }
}
```

#### AdminGuard

Protects admin-only routes.

```typescript
@Injectable({ providedIn: 'root' })
class AdminGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService
  ) {}
  
  canActivate(): boolean {
    if (this.authService.isAdmin()) {
      return true;
    }
    
    this.notificationService.error('Access denied. Admin privileges required.');
    this.router.navigate(['/dashboard']);
    return false;
  }
}
```


## Data Models

### Complete TypeScript Interfaces

```typescript
// ============================================================================
// Authentication Models
// ============================================================================

interface User {
  user_id: string;
  tenant_id: string;
  email: string;
  role: 'Admin' | 'Master_Admin';
}

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface SignupRequest {
  email: string;
  password: string;
}

// ============================================================================
// Session Models
// ============================================================================

type SessionState = 'idle' | 'baseline' | 'pan' | 'return' | 'analyzing' | 'complete';
type VerificationStatus = 'success' | 'failed' | 'timeout' | 'cancelled';

interface Session {
  session_id: string;
  tenant_id: string;
  state: SessionState;
  tier_1_score: number | null;
  tier_2_score: number | null;
  final_trust_score: number | null;
  correlation_value: number | null;
  reasoning: string | null;
  created_at: string;
  completed_at: string | null;
  expires_at: string;
  return_url: string;
  metadata: Record<string, any>;
  video_s3_key: string | null;
  imu_data_s3_key: string | null;
  optical_flow_s3_key: string | null;
}

interface CreateSessionRequest {
  return_url: string;
  metadata?: Record<string, any>;
}

interface CreateSessionResponse {
  session_id: string;
  session_url: string;
  expires_at: string;
}

interface VerificationResult {
  session_id: string;
  tier_1_score: number;
  tier_2_score: number | null;
  final_trust_score: number;
  correlation_value: number;
  reasoning: string;
  state: SessionState;
}

interface SessionQueryParams {
  limit?: number;
  offset?: number;
  status?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

interface SessionListResponse {
  sessions: Session[];
  total: number;
  limit: number;
  offset: number;
}

// ============================================================================
// API Key Models
// ============================================================================

interface ApiKey {
  key_id: string;
  api_key: string;
  environment: 'sandbox' | 'production';
  created_at: string;
  last_used_at: string | null;
  total_calls: number;
  revoked_at: string | null;
}

interface ApiKeyResponse {
  key_id: string;
  api_key: string;
  api_secret: string;
  environment: 'sandbox' | 'production';
}

interface KeyUsageStats {
  key_id: string;
  total_calls: number;
  calls_today: number;
  calls_this_week: number;
  calls_this_month: number;
  last_used_at: string | null;
}

// ============================================================================
// Analytics Models
// ============================================================================

interface AnalyticsStats {
  total_sessions: number;
  success_rate: number;
  average_trust_score: number;
  current_usage: number;
  monthly_quota: number;
  usage_percentage: number;
  sessions_today: number;
  sessions_this_week: number;
  sessions_this_month: number;
}

interface UsageTrendData {
  date: string;
  session_count: number;
  success_count: number;
  failed_count: number;
  average_trust_score: number;
}

interface OutcomeDistribution {
  success: number;
  failed: number;
  timeout: number;
  cancelled: number;
}

interface ReportParams {
  date_from: string;
  date_to: string;
  include_sessions?: boolean;
  include_analytics?: boolean;
}

// ============================================================================
// Billing Models
// ============================================================================

type SubscriptionTier = 'Sandbox' | 'Starter' | 'Professional' | 'Enterprise';

interface Subscription {
  tenant_id: string;
  subscription_tier: SubscriptionTier;
  monthly_quota: number;
  current_usage: number;
  remaining_quota: number;
  usage_percentage: number;
  billing_cycle_start: string;
  billing_cycle_end: string;
  next_renewal_date: string;
  estimated_cost: number;
}

interface SubscriptionPlan {
  plan_id: string;
  name: string;
  tier: SubscriptionTier;
  monthly_quota: number;
  price_per_month: number;
  price_per_verification: number;
  features: string[];
  recommended?: boolean;
}

interface UpgradeResponse {
  order_id: string;
  plan: string;
  effective_date: string;
  new_quota: number;
}

interface PurchaseResponse {
  order_id: string;
  credits_purchased: number;
  total_cost: number;
  new_quota: number;
}

interface Invoice {
  invoice_id: string;
  invoice_number: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  download_url: string;
}

// ============================================================================
// Webhook Models
// ============================================================================

interface Webhook {
  webhook_id: string;
  tenant_id: string;
  url: string;
  enabled: boolean;
  events: string[];
  created_at: string;
  last_triggered_at: string | null;
  success_count: number;
  failure_count: number;
}

interface WebhookConfig {
  url: string;
  enabled: boolean;
  events: string[];
}

interface WebhookTestResult {
  success: boolean;
  status_code: number;
  response_time_ms: number;
  error_message?: string;
}

interface WebhookLog {
  log_id: string;
  webhook_id: string;
  timestamp: string;
  event_type: string;
  status_code: number;
  response_time_ms: number;
  success: boolean;
  error_message?: string;
  retry_count: number;
}

// ============================================================================
// Branding Models
// ============================================================================

interface BrandingConfig {
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  button_color: string;
}

interface ColorConfig {
  primary_color: string;
  secondary_color: string;
  button_color: string;
}

// ============================================================================
// Admin Models
// ============================================================================

interface TenantSummary {
  tenant_id: string;
  email: string;
  subscription_tier: SubscriptionTier;
  total_sessions: number;
  current_usage: number;
  monthly_quota: number;
  created_at: string;
  last_active_at: string;
  status: 'active' | 'suspended' | 'trial';
}

interface TenantDetail extends TenantSummary {
  api_keys_count: number;
  webhooks_count: number;
  success_rate: number;
  average_trust_score: number;
  billing_cycle_start: string;
  billing_cycle_end: string;
}

interface TenantQueryParams {
  limit?: number;
  offset?: number;
  search?: string;
  subscription_tier?: string;
  status?: string;
}

interface TenantListResponse {
  tenants: TenantSummary[];
  total: number;
  limit: number;
  offset: number;
}

interface PlatformStats {
  total_tenants: number;
  active_tenants: number;
  total_sessions: number;
  sessions_today: number;
  total_revenue: number;
  revenue_this_month: number;
  average_sessions_per_tenant: number;
  platform_success_rate: number;
}

interface SystemHealth {
  api_status: 'healthy' | 'degraded' | 'down';
  average_response_time_ms: number;
  error_rate: number;
  uptime_percentage: number;
  last_incident: string | null;
}
```


### Responsive Design Strategy

The dashboard uses Angular Material's responsive breakpoints and layout directives for mobile-first responsive design.

#### Breakpoints

```typescript
enum Breakpoint {
  XSmall = '(max-width: 599.98px)',      // Mobile portrait
  Small = '(min-width: 600px) and (max-width: 959.98px)',  // Mobile landscape, small tablet
  Medium = '(min-width: 960px) and (max-width: 1279.98px)', // Tablet
  Large = '(min-width: 1280px) and (max-width: 1919.98px)', // Desktop
  XLarge = '(min-width: 1920px)'         // Large desktop
}
```

#### Responsive Layout Patterns

**Navigation**:
- Desktop (≥960px): Permanent sidebar navigation
- Tablet/Mobile (<960px): Collapsible drawer with hamburger menu

**Data Tables**:
- Desktop: Full table with all columns
- Tablet: Reduced columns, horizontal scroll if needed
- Mobile: Card-based list view with key information

**Forms**:
- Desktop: Multi-column layouts
- Tablet/Mobile: Single column, full-width inputs

**Charts**:
- Desktop: Side-by-side charts
- Tablet/Mobile: Stacked charts, simplified legends

#### Example Responsive Component

```typescript
@Component({
  selector: 'app-dashboard',
  template: `
    <div class="dashboard-container" [class.mobile]="isMobile$ | async">
      <!-- Stats Grid -->
      <div class="stats-grid" 
           fxLayout="row wrap" 
           fxLayout.lt-md="column"
           fxLayoutGap="16px">
        <app-stat-card *ngFor="let stat of stats" 
                       [title]="stat.title"
                       [value]="stat.value"
                       [icon]="stat.icon"
                       fxFlex.gt-sm="0 0 calc(25% - 16px)"
                       fxFlex.sm="0 0 calc(50% - 16px)"
                       fxFlex.xs="100">
        </app-stat-card>
      </div>
      
      <!-- Charts Section -->
      <div class="charts-section" 
           fxLayout="row wrap"
           fxLayout.lt-md="column"
           fxLayoutGap="16px">
        <mat-card fxFlex.gt-sm="60" fxFlex.sm="100">
          <mat-card-header>
            <mat-card-title>Usage Trend</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <app-usage-chart [data]="usageData"></app-usage-chart>
          </mat-card-content>
        </mat-card>
        
        <mat-card fxFlex.gt-sm="40" fxFlex.sm="100">
          <mat-card-header>
            <mat-card-title>Outcome Distribution</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <app-outcome-chart [data]="outcomeData"></app-outcome-chart>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `
})
class DashboardComponent {
  isMobile$: Observable<boolean>;
  
  constructor(private breakpointObserver: BreakpointObserver) {
    this.isMobile$ = this.breakpointObserver
      .observe([Breakpoint.XSmall, Breakpoint.Small])
      .pipe(map(result => result.matches));
  }
}
```

### Material Theme Configuration

```typescript
// Custom theme with VeraProof branding
@use '@angular/material' as mat;

$veraproof-primary: mat.define-palette(mat.$blue-palette, 700);
$veraproof-accent: mat.define-palette(mat.$teal-palette, 500);
$veraproof-warn: mat.define-palette(mat.$red-palette, 600);

$veraproof-theme: mat.define-light-theme((
  color: (
    primary: $veraproof-primary,
    accent: $veraproof-accent,
    warn: $veraproof-warn,
  ),
  typography: mat.define-typography-config(
    $font-family: 'Inter, "Helvetica Neue", sans-serif',
  ),
  density: 0,
));

@include mat.all-component-themes($veraproof-theme);

// Custom styles for professional look
.mat-card {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border-radius: 8px;
}

.mat-raised-button {
  border-radius: 6px;
  font-weight: 500;
  text-transform: none;
}

.mat-table {
  border-radius: 8px;
  overflow: hidden;
}
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Authentication and Authorization Properties

**Property 1: Authentication lifecycle integrity**
*For any* valid user credentials, authenticating should store valid JWT tokens, and logging out should completely clear all tokens and session data
**Validates: Requirements 1.1, 1.4**

**Property 2: Automatic token refresh**
*For any* authenticated session with an expired access token, the dashboard should automatically refresh the token using the refresh token without requiring user re-login
**Validates: Requirements 1.2**

**Property 3: Authentication failure handling**
*For any* invalid credentials, authentication should fail with a clear error message and prevent access to all protected routes
**Validates: Requirements 1.3**

**Property 4: Route protection**
*For any* protected route, accessing it without valid authentication should redirect to login and preserve the intended destination
**Validates: Requirements 1.5**

### API Key Management Properties

**Property 5: API key generation**
*For any* environment (sandbox or production), generating an API key should create a unique key with the correct environment designation
**Validates: Requirements 2.1**

**Property 6: API key information display**
*For any* API key, displaying it should show all required fields: key value, environment, creation date, usage statistics, and last used timestamp
**Validates: Requirements 2.2, 2.6**

**Property 7: API key revocation**
*For any* active API key, revoking it should immediately invalidate the key and prevent any subsequent API calls using that key
**Validates: Requirements 2.3**

**Property 8: API key usage tracking**
*For any* API key, making calls with that key should increment the usage counters and update the last used timestamp
**Validates: Requirements 2.6**

### Session Management Properties

**Property 9: Session creation**
*For any* valid return URL and metadata, creating a session should generate a unique session ID, session URL, and expiration time
**Validates: Requirements 3.2**

**Property 10: QR code generation**
*For any* session URL, generating a QR code should produce a valid, scannable QR code that encodes the complete URL
**Validates: Requirements 3.6**

**Property 11: Environment-specific session creation**
*For any* API key environment (sandbox or production), sessions created with that key should be associated with the correct environment
**Validates: Requirements 3.7**

**Property 12: Session list pagination**
*For any* tenant with multiple sessions, paginating the session list should return the correct subset of sessions based on limit and offset parameters
**Validates: Requirements 4.1**

**Property 13: Session information display**
*For any* session, displaying it should show all required fields: session ID, timestamp, status, trust score, metadata, and artifact download links (if available)
**Validates: Requirements 4.2, 4.6**

**Property 14: Session filtering**
*For any* filter criteria (date range, status, trust score), applying filters should return only sessions that match all specified criteria
**Validates: Requirements 4.4**

**Property 15: Session search**
*For any* search term, searching sessions should return all sessions where the session ID or metadata fields contain the search term
**Validates: Requirements 4.5**

**Property 16: Artifact download links**
*For any* session with artifacts (video, IMU data, optical flow), requesting download links should generate valid signed URLs that allow artifact access
**Validates: Requirements 4.6**

**Property 17: Real-time session updates**
*For any* active session, updates to the session state should appear in the dashboard without manual refresh within a reasonable time window
**Validates: Requirements 4.7**

### Analytics Properties

**Property 18: Analytics calculation accuracy**
*For any* set of sessions, calculated analytics (total sessions, success rate, average trust score) should match the actual session data
**Validates: Requirements 5.1**

**Property 19: Outcome distribution accuracy**
*For any* set of sessions, the outcome distribution counts (success, failed, timeout, cancelled) should sum to the total session count
**Validates: Requirements 5.3**

**Property 20: Quota tracking accuracy**
*For any* tenant, the displayed quota usage should equal the count of sessions in the current billing cycle, and remaining quota should equal monthly quota minus current usage
**Validates: Requirements 5.4**

**Property 21: CSV export completeness**
*For any* report export request, the generated CSV should contain all requested data fields in valid CSV format
**Validates: Requirements 5.6**

### Billing Properties

**Property 22: Billing information accuracy**
*For any* tenant, displayed billing information (subscription tier, monthly quota, billing cycle dates) should match the backend subscription data
**Validates: Requirements 6.1**

**Property 23: Subscription upgrade**
*For any* subscription upgrade, the tenant's quota should immediately update to reflect the new plan's quota
**Validates: Requirements 6.3**

**Property 24: Invoice display completeness**
*For any* tenant, the invoice history should display all invoices with dates, amounts, status, and download links
**Validates: Requirements 6.4**

**Property 25: Credit purchase**
*For any* credit purchase, the tenant's current quota should immediately increase by the purchased amount
**Validates: Requirements 6.5**

**Property 26: Renewal calculation**
*For any* tenant, the estimated renewal cost should be calculated based on current usage patterns and subscription tier pricing
**Validates: Requirements 6.6**

### Webhook Properties

**Property 27: Webhook URL validation**
*For any* webhook URL input, the dashboard should validate that it's a properly formatted HTTP/HTTPS URL before saving
**Validates: Requirements 7.1**

**Property 28: Webhook state management**
*For any* webhook, toggling its enabled state should immediately affect whether webhook deliveries are sent
**Validates: Requirements 7.2**

**Property 29: Webhook testing**
*For any* configured webhook, triggering a test should send a sample payload and return the delivery result (success/failure, status code, response time)
**Validates: Requirements 7.3**

**Property 30: Webhook log completeness**
*For any* webhook delivery, the log should record timestamp, event type, status code, response time, success status, and error message (if failed)
**Validates: Requirements 7.4, 7.5**

### Branding Properties

**Property 31: Logo upload validation**
*For any* uploaded file, the dashboard should validate file type (PNG, JPG, SVG) and size (max 2MB) before accepting the upload
**Validates: Requirements 8.1**

**Property 32: Color contrast validation**
*For any* color combination (primary, secondary, button), the dashboard should validate that contrast ratios meet accessibility standards
**Validates: Requirements 8.4**

**Property 33: Branding application**
*For any* branding configuration update, the changes should be reflected in the preview and applied to all new verification sessions immediately after saving
**Validates: Requirements 8.3, 8.5**

**Property 34: Branding reset**
*For any* customized branding configuration, resetting to defaults should restore all original colors and remove custom logo
**Validates: Requirements 8.6**

### Admin Properties

**Property 35: Tenant metrics accuracy**
*For any* tenant, displayed metrics (total sessions, current usage, subscription tier, account status) should match the actual tenant data
**Validates: Requirements 9.2**

**Property 36: Platform analytics accuracy**
*For any* point in time, platform-wide analytics (total tenants, total sessions, revenue) should equal the sum of all tenant data
**Validates: Requirements 9.4**

**Property 37: Admin read-only access**
*For any* tenant data viewed by Master_Admin, the admin should be able to view all information but not modify tenant-specific configurations
**Validates: Requirements 9.5**

**Property 38: System health metrics**
*For any* time window, system health metrics (API response times, error rates, uptime) should be calculated from actual system performance data
**Validates: Requirements 9.6**

### Responsive Design Properties

**Property 39: Responsive rendering**
*For any* screen width from 320px to 2560px, the dashboard should render without horizontal scrolling or layout breaking
**Validates: Requirements 10.1**

**Property 40: Responsive table adaptation**
*For any* data table, when viewport width is less than 768px, the table should adapt to a card-based layout
**Validates: Requirements 10.3**

**Property 41: Touch target sizing**
*For any* interactive element, the tap target should be at least 44px in both dimensions to ensure touch-friendly interaction
**Validates: Requirements 10.4**

### Error Handling Properties

**Property 42: Consistent user feedback**
*For any* user action (API call, form submission, navigation), the dashboard should display appropriate feedback: loading indicator during execution, success notification on completion, or error message on failure
**Validates: Requirements 11.1, 11.2, 11.3**

**Property 43: Retry logic**
*For any* transient network failure, the dashboard should automatically retry the request with exponential backoff before displaying an error
**Validates: Requirements 11.4**

**Property 44: Error logging**
*For any* client-side error, the error should be logged to the console with sufficient context for debugging
**Validates: Requirements 11.6**

### Security Properties

**Property 45: Secure token storage**
*For any* JWT token, it should be stored in httpOnly cookies or secure browser storage, not accessible via JavaScript
**Validates: Requirements 12.1**

**Property 46: Sensitive data protection**
*For any* sensitive data (passwords, API secrets), it should never appear in plain text in logs, console output, or UI displays
**Validates: Requirements 12.2**

**Property 47: HTTPS enforcement**
*For any* API communication, the request should use HTTPS protocol
**Validates: Requirements 12.3**

**Property 48: CSRF protection**
*For any* state-changing operation, the request should include CSRF token validation
**Validates: Requirements 12.4**

**Property 49: Input sanitization**
*For any* user input, the dashboard should sanitize it to prevent XSS attacks before rendering or storing
**Validates: Requirements 12.6**

### Performance Properties

**Property 50: Lazy loading**
*For any* feature module, it should be loaded on-demand when the route is accessed, not during initial application load
**Validates: Requirements 13.2**

**Property 51: Response caching**
*For any* cacheable API response, subsequent identical requests within the TTL should return cached data without making a new API call
**Validates: Requirements 13.3**

**Property 52: Asset optimization**
*For any* image asset, it should be served in an optimized format (WebP where supported) with appropriate compression
**Validates: Requirements 13.5**

## Error Handling

The dashboard implements comprehensive error handling at multiple levels to ensure a robust user experience.

### Error Categories

**1. Network Errors**
- Connection failures (API unreachable)
- Timeout errors (request exceeds timeout threshold)
- DNS resolution failures

**2. Authentication Errors**
- Invalid credentials (401 Unauthorized)
- Expired tokens (401 Unauthorized with token refresh attempt)
- Insufficient permissions (403 Forbidden)

**3. Validation Errors**
- Invalid input format (400 Bad Request)
- Missing required fields (400 Bad Request)
- Business rule violations (400 Bad Request)

**4. Resource Errors**
- Not found (404 Not Found)
- Already exists (409 Conflict)
- Gone/expired (410 Gone)

**5. Rate Limiting**
- Too many requests (429 Too Many Requests)

**6. Server Errors**
- Internal server error (500 Internal Server Error)
- Service unavailable (503 Service Unavailable)
- Gateway timeout (504 Gateway Timeout)

### Error Handling Strategy

**HTTP Interceptor Level:**
```typescript
// ErrorInterceptor catches all HTTP errors
// Maps status codes to user-friendly messages
// Displays notifications via NotificationService
// Logs errors for debugging
```

**Service Level:**
```typescript
// Services catch specific errors
// Transform backend errors to domain-specific messages
// Implement retry logic for transient failures
// Update state to reflect error conditions
```

**Component Level:**
```typescript
// Components subscribe to error observables
// Display inline error messages in forms
// Show error states in UI (empty states, error banners)
// Provide recovery actions (retry buttons, navigation)
```

### Error Response Format

All backend errors follow a consistent format:

```typescript
interface ErrorResponse {
  detail: string;           // Human-readable error message
  error_code?: string;      // Machine-readable error code
  field_errors?: {          // Field-specific validation errors
    [field: string]: string[];
  };
}
```

### Retry Strategy

**Automatic Retry:**
- Network errors: 3 retries with exponential backoff (1s, 2s, 4s)
- Timeout errors: 2 retries with linear backoff (2s, 4s)
- 5xx errors: 2 retries with exponential backoff (2s, 4s)

**No Retry:**
- 4xx errors (client errors - retry won't help)
- Authentication errors (requires user action)
- Validation errors (requires input correction)

**User-Initiated Retry:**
- Connection errors: Display "Retry" button
- API unavailable: Display "Retry" button with status check

### Error Notification Strategy

**Toast Notifications (Snackbar):**
- Success messages: 3 second duration, green color
- Info messages: 5 second duration, blue color
- Warning messages: 7 second duration, orange color
- Error messages: 10 second duration, red color, with action button

**Inline Errors:**
- Form validation errors: Display below field with red text
- API errors: Display in error banner above form

**Modal Dialogs:**
- Critical errors: Display in modal with explanation and actions
- Confirmation required: Display before destructive actions

### Graceful Degradation

**Offline Mode:**
- Detect offline state using navigator.onLine
- Display offline banner with auto-dismiss when online
- Queue state-changing operations for retry when online
- Cache read-only data for offline viewing

**Partial Failures:**
- If analytics fail to load, show error state but allow other features
- If webhook logs fail, show error message but allow webhook configuration
- Isolate failures to prevent cascade

### Error Logging

**Client-Side Logging:**
```typescript
// Log to console in development
// Log to monitoring service in production (e.g., Sentry)
// Include: error message, stack trace, user context, timestamp
```

**Error Context:**
- User ID and tenant ID
- Current route and component
- Browser and device information
- Recent user actions (breadcrumb trail)

## Testing Strategy

The Partner Dashboard requires comprehensive testing to ensure reliability, correctness, and maintainability. We employ a dual testing approach combining unit tests and property-based tests.

### Testing Philosophy

**Unit Tests:**
- Verify specific examples and edge cases
- Test component rendering and user interactions
- Test service methods with mocked dependencies
- Test error conditions and boundary cases
- Focus on concrete scenarios

**Property-Based Tests:**
- Verify universal properties across all inputs
- Test with randomly generated data (100+ iterations)
- Catch edge cases that manual testing might miss
- Validate business rules and invariants
- Focus on general correctness

**Together:** Unit tests catch concrete bugs, property tests verify general correctness. Both are necessary for comprehensive coverage.

### Testing Stack

**Frontend Testing:**
- **Unit Tests:** Jasmine + Karma
- **Property-Based Tests:** fast-check (TypeScript property testing library)
- **E2E Tests:** Cypress
- **Component Testing:** Angular Testing Library

**Backend Testing:**
- **Unit Tests:** pytest
- **Property-Based Tests:** Hypothesis (Python property testing library)
- **Integration Tests:** pytest with test database

### Property-Based Testing Configuration

**Minimum Iterations:** Each property test must run at least 100 iterations with randomly generated inputs to ensure comprehensive coverage.

**Test Tagging:** Each property-based test must include a comment tag referencing the design document property:

```typescript
// Feature: partner-dashboard-enterprise, Property 1: Authentication lifecycle integrity
it('should maintain authentication lifecycle integrity', () => {
  fc.assert(
    fc.property(
      fc.record({
        email: fc.emailAddress(),
        password: fc.string({ minLength: 8 })
      }),
      (credentials) => {
        // Test implementation
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property Test Structure:**
1. Generate random valid inputs using fast-check generators
2. Execute the operation under test
3. Assert the property holds
4. fast-check automatically finds counterexamples if property fails

### Unit Testing Strategy

**Component Tests:**
- Test component initialization and lifecycle hooks
- Test user interactions (clicks, form submissions)
- Test conditional rendering based on state
- Test input/output bindings
- Mock all service dependencies

**Service Tests:**
- Test service methods with various inputs
- Test error handling and edge cases
- Test state management (BehaviorSubjects)
- Mock HTTP calls using HttpClientTestingModule
- Test retry logic and caching

**Guard Tests:**
- Test authentication guard with authenticated/unauthenticated users
- Test admin guard with admin/non-admin users
- Test navigation behavior (redirects, query params)

**Interceptor Tests:**
- Test token injection into requests
- Test token refresh on 401 errors
- Test error handling and notification display

**Pipe Tests:**
- Test data transformation with various inputs
- Test edge cases (null, undefined, empty)

### Integration Testing Strategy

**E2E Tests (Cypress):**
- Test complete user workflows
- Test authentication flow (login, logout, token refresh)
- Test API key management (create, revoke, view usage)
- Test session creation and monitoring
- Test webhook configuration and testing
- Test branding customization
- Test admin dashboard (master admin only)

**API Integration Tests:**
- Test frontend-backend integration
- Test WebSocket connections for real-time updates
- Test file uploads (logo, CSV exports)
- Test multi-tenant data isolation

### Test Coverage Goals

**Code Coverage:**
- Minimum 80% line coverage
- Minimum 75% branch coverage
- 100% coverage for critical paths (auth, billing, security)

**Property Coverage:**
- Every correctness property must have a corresponding property-based test
- Every acceptance criterion marked as "testable: yes - property" must have a property test

**Feature Coverage:**
- Every user-facing feature must have E2E tests
- Every API endpoint must have integration tests

### Testing Best Practices

**1. Test Isolation:**
- Each test should be independent
- Use beforeEach/afterEach for setup/teardown
- Reset state between tests
- Use fresh test data for each test

**2. Test Readability:**
- Use descriptive test names (should/when/then format)
- Arrange-Act-Assert pattern
- Keep tests focused on single behavior
- Use helper functions for common setup

**3. Test Maintainability:**
- Use page objects for E2E tests
- Use test fixtures for common data
- Avoid brittle selectors (use data-testid attributes)
- Keep tests DRY but not too abstract

**4. Test Performance:**
- Run unit tests in parallel
- Use test doubles (mocks, stubs, spies) to avoid slow operations
- Optimize E2E tests (group related tests, minimize navigation)

**5. Continuous Integration:**
- Run all tests on every commit
- Block merges if tests fail
- Run E2E tests on staging environment
- Generate coverage reports

### Example Test Structure

**Unit Test Example:**
```typescript
describe('SessionsService', () => {
  let service: SessionsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SessionsService]
    });
    service = TestBed.inject(SessionsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create a session with valid data', () => {
    const request: CreateSessionRequest = {
      return_url: 'https://example.com/callback',
      metadata: { user_id: '123' }
    };
    const response: CreateSessionResponse = {
      session_id: 'sess_123',
      session_url: 'https://verify.veraproof.ai/sess_123',
      expires_at: '2024-01-01T12:00:00Z'
    };

    service.createSession(request).subscribe(result => {
      expect(result).toEqual(response);
    });

    const req = httpMock.expectOne('/api/v1/sessions');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(response);
  });
});
```

**Property Test Example:**
```typescript
import * as fc from 'fast-check';

describe('SessionsService Properties', () => {
  // Feature: partner-dashboard-enterprise, Property 9: Session creation
  it('should generate unique session IDs for all valid inputs', () => {
    fc.assert(
      fc.property(
        fc.record({
          return_url: fc.webUrl(),
          metadata: fc.dictionary(fc.string(), fc.anything())
        }),
        async (request) => {
          const response1 = await service.createSession(request).toPromise();
          const response2 = await service.createSession(request).toPromise();
          
          // Property: Different calls should generate different session IDs
          expect(response1.session_id).not.toEqual(response2.session_id);
          
          // Property: Session URLs should be valid and contain session ID
          expect(response1.session_url).toContain(response1.session_id);
          expect(response2.session_url).toContain(response2.session_id);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

**E2E Test Example:**
```typescript
describe('API Key Management', () => {
  beforeEach(() => {
    cy.login('user@example.com', 'password123');
    cy.visit('/api-keys');
  });

  it('should create and revoke an API key', () => {
    // Create key
    cy.get('[data-testid="create-key-button"]').click();
    cy.get('[data-testid="environment-select"]').select('sandbox');
    cy.get('[data-testid="confirm-button"]').click();
    
    // Verify key appears in list
    cy.get('[data-testid="api-key-list"]')
      .should('contain', 'sandbox');
    
    // Copy key secret
    cy.get('[data-testid="copy-secret-button"]').click();
    cy.get('[data-testid="success-notification"]')
      .should('contain', 'Copied to clipboard');
    
    // Revoke key
    cy.get('[data-testid="revoke-key-button"]').first().click();
    cy.get('[data-testid="confirm-dialog"]')
      .should('be.visible');
    cy.get('[data-testid="confirm-revoke-button"]').click();
    
    // Verify key is revoked
    cy.get('[data-testid="api-key-list"]')
      .first()
      .should('contain', 'Revoked');
  });
});
```

### Test Data Management

**Test Fixtures:**
- Create reusable test data factories
- Use realistic but anonymized data
- Maintain test data in separate files
- Version control test fixtures

**Test Database:**
- Use separate test database for integration tests
- Reset database between test runs
- Seed with minimal required data
- Use transactions for test isolation

**Mock Data:**
- Use fast-check generators for property tests
- Use faker.js for realistic mock data in unit tests
- Create custom generators for domain-specific types

### Continuous Testing

**Pre-Commit:**
- Run linter and formatter
- Run affected unit tests

**CI Pipeline:**
- Run all unit tests
- Run all property tests
- Run integration tests
- Generate coverage report
- Run E2E tests on staging

**Nightly:**
- Run extended property tests (1000+ iterations)
- Run performance tests
- Run security scans
- Generate comprehensive reports
