import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpParams } from '@angular/common/http';
import { ApiService } from '../../../core/services/api.service';
import { SessionListResponse, SessionQueryParams } from '../../../core/models/interfaces';

export interface TenantQueryParams {
  limit?: number;
  offset?: number;
  search?: string;
  subscription_tier?: string;
  status?: string;
}

export interface TenantSummary {
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

export interface TenantDetail extends TenantSummary {
  api_keys_count: number;
  webhooks_count: number;
  success_rate: number;
  average_trust_score: number;
  billing_cycle_start: string;
  billing_cycle_end: string;
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

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly baseUrl = '/api/v1/admin';

  constructor(private api: ApiService) {}

  listTenants(params: TenantQueryParams): Observable<TenantListResponse> {
    let httpParams = new HttpParams();
    if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params.offset) httpParams = httpParams.set('offset', params.offset.toString());
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.subscription_tier) httpParams = httpParams.set('subscription_tier', params.subscription_tier);
    if (params.status) httpParams = httpParams.set('status', params.status);

    return this.api.get<TenantListResponse>(`${this.baseUrl}/tenants`, httpParams);
  }

  getTenantDetail(tenantId: string): Observable<TenantDetail> {
    return this.api.get<TenantDetail>(`${this.baseUrl}/tenants/${tenantId}`);
  }

  getTenantSessions(tenantId: string, params: SessionQueryParams): Observable<SessionListResponse> {
    let httpParams = new HttpParams();
    if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params.offset) httpParams = httpParams.set('offset', params.offset.toString());

    return this.api.get<SessionListResponse>(`${this.baseUrl}/tenants/${tenantId}/sessions`, httpParams);
  }

  getPlatformStats(): Observable<PlatformStats> {
    return this.api.get<PlatformStats>(`${this.baseUrl}/platform-stats`);
  }

  getSystemHealth(): Observable<SystemHealth> {
    return this.api.get<SystemHealth>(`${this.baseUrl}/system-health`);
  }
}
