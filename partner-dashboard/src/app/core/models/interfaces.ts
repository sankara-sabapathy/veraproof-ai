// ============================================================================
// Authentication Models
// ============================================================================

export interface User {
  user_id: string;
  tenant_id: string;
  email: string;
  role: 'Admin' | 'Master_Admin';
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
}

export interface DecodedToken {
  sub: string;
  email: string;
  tenant_id: string;
  role: string;
  exp: number;
  iat: number;
}

// ============================================================================
// API Keys Models
// ============================================================================

export interface ApiKeyResponse {
  key_id: string;
  api_key: string;
  environment: 'sandbox' | 'production';
}

export interface ApiKey {
  key_id: string;
  api_key: string;
  environment: 'sandbox' | 'production';
  created_at: string;
  last_used_at: string | null;
  total_calls: number;
  revoked_at: string | null;
}

export interface KeyUsageStats {
  key_id: string;
  total_calls: number;
  calls_today: number;
  calls_this_week: number;
  calls_this_month: number;
  last_used_at: string | null;
}

// ============================================================================
// Session Models
// ============================================================================

export type SessionState = 'idle' | 'baseline' | 'pan' | 'return' | 'analyzing' | 'complete';

export interface Session {
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

export interface CreateSessionRequest {
  return_url: string;
  metadata?: Record<string, any>;
}

export interface CreateSessionResponse {
  session_id: string;
  session_url: string;
  expires_at: string;
}

export interface VerificationResult {
  session_id: string;
  tier_1_score: number;
  tier_2_score: number | null;
  final_trust_score: number;
  correlation_value: number;
  reasoning: string;
  state: SessionState;
}

export interface SessionQueryParams {
  limit?: number;
  offset?: number;
  status?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface SessionListResponse {
  sessions: Session[];
  total: number;
  limit: number;
  offset: number;
}

// ============================================================================
// Analytics Models
// ============================================================================

export interface AnalyticsStats {
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

export interface UsageTrendData {
  date: string;
  session_count: number;
  success_count: number;
  failed_count: number;
  average_trust_score: number;
}

export interface OutcomeDistribution {
  success: number;
  failed: number;
  timeout: number;
  cancelled: number;
}

export interface ReportParams {
  date_from: string;
  date_to: string;
  include_sessions?: boolean;
  include_analytics?: boolean;
}

// ============================================================================
// Billing Models
// ============================================================================

export type SubscriptionTier = 'Sandbox' | 'Starter' | 'Professional' | 'Enterprise';

export interface Subscription {
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

export interface SubscriptionPlan {
  plan_id: string;
  name: string;
  tier: SubscriptionTier;
  monthly_quota: number;
  price_per_month: number;
  price_per_verification: number;
  features: string[];
  recommended?: boolean;
}

export interface UpgradeResponse {
  order_id: string;
  plan: string;
  effective_date: string;
  new_quota: number;
}

export interface PurchaseResponse {
  order_id: string;
  credits_purchased: number;
  total_cost: number;
  new_quota: number;
}

export interface Invoice {
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

export interface Webhook {
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

export interface WebhookConfig {
  url: string;
  enabled: boolean;
  events: string[];
}

export interface WebhookTestResult {
  success: boolean;
  status_code: number;
  response_time_ms: number;
  error_message?: string;
}

export interface WebhookLog {
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

export interface LogQueryParams {
  limit?: number;
  offset?: number;
  date_from?: string;
  date_to?: string;
}

// ============================================================================
// Branding Models
// ============================================================================

export interface BrandingConfig {
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  button_color: string;
}

export interface ColorConfig {
  primary_color: string;
  secondary_color: string;
  button_color: string;
}

// ============================================================================
// Admin Models
// ============================================================================

export interface TenantSummary {
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

export interface TenantDetail extends TenantSummary {
  api_keys_count: number;
  webhooks_count: number;
  success_rate: number;
  average_trust_score: number;
  billing_cycle_start: string;
  billing_cycle_end: string;
}

export interface TenantQueryParams {
  limit?: number;
  offset?: number;
  search?: string;
  subscription_tier?: string;
  status?: string;
}

export interface TenantListResponse {
  tenants: TenantSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface PlatformStats {
  total_tenants: number;
  active_tenants: number;
  total_sessions: number;
  sessions_today: number;
  total_revenue: number;
  revenue_this_month: number;
  average_sessions_per_tenant: number;
  platform_success_rate: number;
}

export interface SystemHealth {
  api_status: 'healthy' | 'degraded' | 'down';
  average_response_time_ms: number;
  error_rate: number;
  uptime_percentage: number;
  last_incident: string | null;
}
