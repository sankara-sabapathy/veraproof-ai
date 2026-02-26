import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { AnalyticsStateService } from '../services/analytics-state.service';
import { AnalyticsService } from '../services/analytics.service';
import { AnalyticsStats, OutcomeDistribution, UsageTrendData, ReportParams } from '../../../core/models/interfaces';
import { NotificationService } from '../../../core/services/notification.service';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { UsageChartComponent } from '../usage-chart/usage-chart.component';
import { OutcomeChartComponent } from '../outcome-chart/outcome-chart.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-analytics-overview',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatProgressBarModule,
    MatIconModule,
    ButtonModule,
    DropdownModule,
    StatCardComponent,
    UsageChartComponent,
    OutcomeChartComponent,
    LoadingSpinnerComponent
  ],
  templateUrl: './analytics-overview.component.html',
  styleUrls: ['./analytics-overview.component.scss']
})
export class AnalyticsOverviewComponent implements OnInit, OnDestroy {
  private analyticsStateService = inject(AnalyticsStateService);
  private analyticsService = inject(AnalyticsService);
  private notificationService = inject(NotificationService);
  private destroy$ = new Subject<void>();

  stats: AnalyticsStats | null = null;
  usageTrend: UsageTrendData[] = [];
  outcomeDistribution: OutcomeDistribution | null = null;
  selectedPeriod: 'daily' | 'weekly' | 'monthly' = 'daily';
  loading = false;
  error: string | null = null;

  // Period options for PrimeNG Dropdown
  periodOptions = [
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' }
  ];

  ngOnInit(): void {
    // Subscribe to state changes
    this.analyticsStateService.stats$
      .pipe(takeUntil(this.destroy$))
      .subscribe(stats => this.stats = stats);

    this.analyticsStateService.usageTrend$
      .pipe(takeUntil(this.destroy$))
      .subscribe(trend => this.usageTrend = trend);

    this.analyticsStateService.outcomeDistribution$
      .pipe(takeUntil(this.destroy$))
      .subscribe(distribution => this.outcomeDistribution = distribution);

    this.analyticsStateService.selectedPeriod$
      .pipe(takeUntil(this.destroy$))
      .subscribe(period => this.selectedPeriod = period);

    this.analyticsStateService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => this.loading = loading);

    this.analyticsStateService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => this.error = error);

    // Load all analytics data
    this.analyticsStateService.loadAll();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Get usage percentage for progress bar
   */
  get usagePercentage(): number {
    if (!this.stats || this.stats.monthly_quota === 0) {
      return 0;
    }
    return Math.min(100, (this.stats.current_usage / this.stats.monthly_quota) * 100);
  }

  /**
   * Check if quota warning should be displayed (>= 80%)
   */
  get showQuotaWarning(): boolean {
    return this.usagePercentage >= 80;
  }

  /**
   * Get quota warning color
   */
  get quotaWarningColor(): 'warn' | 'accent' {
    return this.usagePercentage >= 100 ? 'warn' : 'accent';
  }

  /**
   * Handle period change
   */
  onPeriodChange(period: 'daily' | 'weekly' | 'monthly'): void {
    this.analyticsStateService.loadUsageTrend(period);
  }

  /**
   * Export analytics report as CSV
   */
  exportCSV(): void {
    const params: ReportParams = {
      date_from: this.getDateFrom(),
      date_to: this.getDateTo(),
      include_sessions: true,
      include_analytics: true
    };

    this.analyticsService.exportReport('csv', params).subscribe({
      next: (blob) => {
        this.downloadFile(blob, `analytics_${this.formatDate(new Date())}.csv`);
        this.notificationService.success('Analytics report exported successfully');
      },
      error: (error) => {
        this.notificationService.error('Failed to export report: ' + error.message);
      }
    });
  }

  /**
   * Download blob as file
   */
  private downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Get date from based on selected period
   */
  private getDateFrom(): string {
    const date = new Date();
    switch (this.selectedPeriod) {
      case 'daily':
        date.setDate(date.getDate() - 30);
        break;
      case 'weekly':
        date.setDate(date.getDate() - 90);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() - 12);
        break;
    }
    return this.formatDate(date);
  }

  /**
   * Get current date as date_to
   */
  private getDateTo(): string {
    return this.formatDate(new Date());
  }

  /**
   * Format date as YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Refresh all analytics data
   */
  refresh(): void {
    this.analyticsStateService.loadAll();
  }
}
