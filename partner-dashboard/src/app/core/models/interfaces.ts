// ============================================================================
// Authentication Models
// ============================================================================

export type TenantEnvironmentSlug = 'sandbox' | 'production';

export interface TenantEnvironmentSummary {
  environment_id: string;
  slug: TenantEnvironmentSlug;
  display_name: string;
  is_default: boolean;
  is_billable: boolean;
  monthly_quota: number;
  current_usage: number;
  billing_cycle_start: string | null;
  billing_cycle_end: string | null;
}

export interface User {
  user_id: string;
  tenant_id: string;
  email: string;
  role: 'Admin' | 'Master_Admin' | 'org_admin' | 'platform_admin';
  roles?: string[];
  permissions?: string[];
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface AuthSessionState {
  authenticated: boolean;
  auth_type?: string | null;
  csrf_token?: string | null;
  user?: User | null;
  active_environment?: TenantEnvironmentSummary | null;
  available_environments?: TenantEnvironmentSummary[];
}

export interface AuthProviders {
  google: boolean;
  local: boolean;
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
  environment: TenantEnvironmentSlug;
}

export interface ApiKey {
  key_id: string;
  api_key: string;
  environment: TenantEnvironmentSlug;
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
  environment?: TenantEnvironmentSlug | string | null;
}

export interface SessionArtifactRecord {
  artifact_id: string;
  session_id: string;
  tenant_id: string;
  artifact_type: string;
  provider: string | null;
  file_name: string;
  content_type: string;
  storage_key: string;
  size_bytes: number | null;
  sha256: string | null;
  metadata: Record<string, any>;
  encryption_mode?: string | null;
  encryption_key_id?: string | null;
  created_at: string;
}

export interface SessionArtifactDownload {
  artifact: SessionArtifactRecord;
  url: string;
}

export interface VerificationCommand {
  text: string;
  lens: 'user' | 'environment';
  duration: number;
}

export interface CreateSessionRequest {
  return_url: string;
  session_duration?: number;
  verification_commands?: VerificationCommand[];
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

export type MediaAnalysisStatus = 'pending' | 'analyzing' | 'completed' | 'failed';

export interface MediaAnalysisJob {
  job_id: string;
  tenant_id: string;
  status: MediaAnalysisStatus;
  analysis_outcome: 'authentic' | 'suspicious' | 'spoof_detected' | 'error' | null;
  media_type: 'image' | 'video';
  content_type: string;
  source_filename: string;
  file_size_bytes: number;
  metadata: Record<string, any>;
  artifact_s3_key: string | null;
  tier_2_score: number | null;
  final_trust_score: number | null;
  ai_score: number | null;
  reasoning: string | null;
  ai_explanation: Record<string, any> | null;
  vision_context: Record<string, any> | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
  environment?: TenantEnvironmentSlug | string | null;
}

export interface MediaAnalysisListResponse {
  jobs: MediaAnalysisJob[];
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
  environment?: TenantEnvironmentSlug | string;
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
