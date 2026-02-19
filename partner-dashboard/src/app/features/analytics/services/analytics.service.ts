import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { 
  AnalyticsStats, 
  UsageTrendData, 
  OutcomeDistribution, 
  ReportParams 
} from '../../../core/models/interfaces';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private apiService = inject(ApiService);
  private readonly baseUrl = '/api/v1/analytics';

  /**
   * Get analytics statistics for the current tenant
   */
  getStats(): Observable<AnalyticsStats> {
    return this.apiService.get<AnalyticsStats>(`${this.baseUrl}/stats`);
  }

  /**
   * Get usage trend data for a specific period
   * @param period - Time period: 'daily', 'weekly', or 'monthly'
   */
  getUsageTrend(period: 'daily' | 'weekly' | 'monthly'): Observable<UsageTrendData[]> {
    return this.apiService.get<UsageTrendData[]>(`${this.baseUrl}/usage-trend`, { period });
  }

  /**
   * Get outcome distribution (success, failed, timeout, cancelled)
   */
  getOutcomeDistribution(): Observable<OutcomeDistribution> {
    return this.apiService.get<OutcomeDistribution>(`${this.baseUrl}/outcome-distribution`);
  }

  /**
   * Export analytics report in specified format
   * @param format - Export format: 'csv' or 'json'
   * @param params - Report parameters including date range and options
   */
  exportReport(format: 'csv' | 'json', params: ReportParams): Observable<Blob> {
    const body = { format, ...params };
    return this.apiService.post<Blob>(
      `${this.baseUrl}/export`,
      body,
      { responseType: 'blob' as 'json' }
    );
  }
}
