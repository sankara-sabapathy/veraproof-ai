import { Injectable } from '@angular/core';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { AnalyticsService } from '../../analytics/services/analytics.service';
import { SessionsService } from '../../sessions/services/sessions.service';
import { BillingService } from '../../billing/services/billing.service';

export interface DashboardData {
  stats: {
    sessions_today: number;
    sessions_this_week: number;
    sessions_this_month: number;
    success_rate: number;
    average_trust_score: number;
  };
  quota: {
    current_usage: number;
    monthly_quota: number;
    usage_percentage: number;
  };
  recentSessions: any[];
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  constructor(
    private analyticsService: AnalyticsService,
    private sessionsService: SessionsService,
    private billingService: BillingService
  ) { }

  getDashboardData(): Observable<DashboardData> {
    return forkJoin({
      analytics: this.analyticsService.getStats(),
      subscription: this.billingService.getSubscription(),
      sessions: this.sessionsService.getSessions({ limit: 10, offset: 0 })
    }).pipe(
      map(({ analytics, subscription, sessions }) => ({
        stats: {
          sessions_today: analytics.sessions_today,
          sessions_this_week: analytics.sessions_this_week,
          sessions_this_month: analytics.sessions_this_month,
          success_rate: analytics.success_rate,
          average_trust_score: analytics.average_trust_score
        },
        quota: {
          current_usage: subscription.current_usage || analytics.sessions_this_month,
          monthly_quota: subscription.monthly_quota || 100,
          usage_percentage: subscription.current_usage ? subscription.usage_percentage : (analytics.sessions_this_month / (subscription.monthly_quota || 100)) * 100
        },
        recentSessions: sessions.sessions
      }))
    );
  }
}
