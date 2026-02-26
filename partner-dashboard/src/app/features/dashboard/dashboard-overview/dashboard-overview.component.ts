import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { ChipModule } from 'primeng/chip';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { DashboardService, DashboardData } from '../services/dashboard.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AnalyticsService } from '../../analytics/services/analytics.service';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { UsageChartComponent } from '../../analytics/usage-chart/usage-chart.component';
import { OutcomeChartComponent } from '../../analytics/outcome-chart/outcome-chart.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { SessionCreateDialogComponent } from '../../sessions/session-create-dialog/session-create-dialog.component';

@Component({
  selector: 'app-dashboard-overview',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CardModule,
    ButtonModule,
    ProgressBarModule,
    ChipModule,
    TableModule,
    TooltipModule,
    StatCardComponent,
    UsageChartComponent,
    OutcomeChartComponent,
    LoadingSpinnerComponent
  ],
  providers: [DialogService],
  templateUrl: './dashboard-overview.component.html',
  styleUrls: ['./dashboard-overview.component.scss']
})
export class DashboardOverviewComponent implements OnInit {
  dashboardData: DashboardData | null = null;
  loading = false;
  usageTrendData: any[] = [];
  outcomeDistribution: any = null;
  dialogRef: DynamicDialogRef | undefined;

  constructor(
    private dashboardService: DashboardService,
    private analyticsService: AnalyticsService,
    private notification: NotificationService,
    private router: Router,
    private dialogService: DialogService
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
    this.loadCharts();
  }

  loadDashboard(): void {
    this.loading = true;
    this.dashboardService.getDashboardData().subscribe({
      next: (data) => {
        this.dashboardData = data;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.notification.error('Failed to load dashboard data');
      }
    });
  }

  loadCharts(): void {
    this.analyticsService.getUsageTrend('daily').subscribe({
      next: (data) => {
        this.usageTrendData = data;
      },
      error: () => {
        this.notification.error('Failed to load usage trends');
      }
    });

    this.analyticsService.getOutcomeDistribution().subscribe({
      next: (data) => {
        this.outcomeDistribution = data;
      },
      error: () => {
        this.notification.error('Failed to load outcome distribution');
      }
    });
  }

  createSession(): void {
    this.dialogRef = this.dialogService.open(SessionCreateDialogComponent, {
      header: 'Create Session',
      width: '600px',
      modal: true
    });

    this.dialogRef.onClose.subscribe(result => {
      if (result) {
        // Session was created, reload dashboard to show it
        this.loadDashboard();
      }
    });
  }

  generateApiKey(): void {
    this.router.navigate(['/api-keys']);
  }

  viewSession(sessionId: string): void {
    this.router.navigate(['/sessions', sessionId]);
  }

  getUsageColor(percentage: number): string {
    if (percentage >= 100) return 'warn';
    if (percentage >= 80) return 'accent';
    return 'primary';
  }

  getTrustScoreColor(score: number): string {
    if (score >= 80) return 'primary';
    if (score >= 50) return 'accent';
    return 'warn';
  }
}
