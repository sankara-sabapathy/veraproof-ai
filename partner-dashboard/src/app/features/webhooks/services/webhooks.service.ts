import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpParams } from '@angular/common/http';
import { ApiService } from '../../../core/services/api.service';

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

@Injectable({
  providedIn: 'root'
})
export class WebhooksService {
  private readonly baseUrl = '/api/v1/webhooks';

  constructor(private api: ApiService) {}

  listWebhooks(): Observable<Webhook[]> {
    return this.api.get<Webhook[]>(this.baseUrl);
  }

  createWebhook(config: WebhookConfig): Observable<Webhook> {
    return this.api.post<Webhook>(this.baseUrl, config);
  }

  updateWebhook(webhookId: string, config: WebhookConfig): Observable<Webhook> {
    return this.api.put<Webhook>(`${this.baseUrl}/${webhookId}`, config);
  }

  deleteWebhook(webhookId: string): Observable<void> {
    return this.api.delete<void>(`${this.baseUrl}/${webhookId}`);
  }

  testWebhook(webhookId: string): Observable<WebhookTestResult> {
    return this.api.post<WebhookTestResult>(`${this.baseUrl}/${webhookId}/test`, {});
  }

  getWebhookLogs(webhookId: string, params: LogQueryParams): Observable<WebhookLog[]> {
    let httpParams = new HttpParams();
    if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params.offset) httpParams = httpParams.set('offset', params.offset.toString());
    if (params.date_from) httpParams = httpParams.set('date_from', params.date_from);
    if (params.date_to) httpParams = httpParams.set('date_to', params.date_to);

    return this.api.get<WebhookLog[]>(`${this.baseUrl}/${webhookId}/logs`, httpParams);
  }
}
