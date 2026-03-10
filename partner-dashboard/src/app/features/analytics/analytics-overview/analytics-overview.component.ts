import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { skip, takeUntil } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { CardModule } from 'primeng/card';
import { ProgressBarModule } from 'primeng/progressbar';
import { AnalyticsStateService } from '../services/analytics-state.service';
import { AnalyticsService } from '../services/analytics.service';
import { AnalyticsStats, OutcomeDistribution, ReportParams, TenantEnvironmentSummary, UsageTrendData } from '../../../core/models/interfaces';
import { NotificationService } from '../../../core/services/notification.service';
import { TenantEnvironmentService } from '../../../core/services/tenant-environment.service';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { UsageChartComponent } from '../usage-chart/usage-chart.component';
import { OutcomeChartComponent } from '../outcome-chart/outcome-chart.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ContentStateComponent } from '../../../shared/components/content-state/content-state.component';
import { getUsagePresentation } from '../../../shared/utils/ui-presenters';

@Component({
  selector: 'app-analytics-overview',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    DropdownModule,
    CardModule,
    ProgressBarModule,
    StatCardComponent,
    UsageChartComponent,
    OutcomeChartComponent,
    LoadingSpinnerComponent,
    PageHeaderComponent,
    ContentStateComponent
  ],
  templateUrl: './analytics-overview.component.html',
  styleUrls: ['./analytics-overview.component.scss']
})
export class AnalyticsOverviewComponent implements OnInit, OnDestroy {
  private analyticsStateService = inject(AnalyticsStateService);
  private analyticsService = inject(AnalyticsService);
  private notificationService = inject(NotificationService);
  private tenantEnvironmentService = inject(TenantEnvironmentService);
  private destroy$ = new Subject<void>();

  stats: AnalyticsStats | null = null;
  usageTrend: UsageTrendData[] = [];
  outcomeDistribution: OutcomeDistribution | null = null;
  selectedPeriod: 'daily' | 'weekly' | 'monthly' = 'daily';
  loading = false;
  error: string | null = null;
  activeEnvironment: TenantEnvironmentSummary | null = null;

  periodOptions = [
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' }
  ];

  ngOnInit(): void {
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

    this.tenantEnvironmentService.activeEnvironment$
      .pipe(takeUntil(this.destroy$))
      .subscribe(environment => this.activeEnvironment = environment);

    this.tenantEnvironmentService.activeEnvironment$
      .pipe(skip(1), takeUntil(this.destroy$))
      .subscribe(() => this.refresh());

    this.analyticsStateService.loadAll();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get pageSubtitle(): string {
    return `Review verification trends, outcomes, and quota usage for ${this.usage.environmentLabel.toLowerCase()}.`;
  }

  get usage() {
    return getUsagePresentation(this.stats, this.activeEnvironment);
  }

  get showQuotaWarning(): boolean {
    return this.usage.usagePercentage >= 80;
  }

  get usagePercentage(): number {
    return this.usage.usagePercentage;
  }

  get quotaWarningColor(): 'warn' | 'accent' {
    return this.usagePercentage >= 100 ? 'warn' : 'accent';
  }


  onPeriodChange(period: 'daily' | 'weekly' | 'monthly'): void {
    this.analyticsStateService.loadUsageTrend(period);
  }

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

  refresh(): void {
    this.analyticsStateService.loadAll();
  }

  private downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

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

  private getDateTo(): string {
    return this.formatDate(new Date());
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

