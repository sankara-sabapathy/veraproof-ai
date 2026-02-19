import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatTableModule } from '@angular/material/table';
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
    MatDialogModule,
    MatCardModule,
    MatButtonModule,
    MatProgressBarModule,
    MatChipsModule,
    MatIconModule,
    MatListModule,
    MatTableModule,
    StatCardComponent,
    UsageChartComponent,
    OutcomeChartComponent,
    LoadingSpinnerComponent
  ],
  templateUrl: './dashboard-overview.component.html',
  styleUrls: ['./dashboard-overview.component.scss']
})
export class DashboardOverviewComponent implements OnInit {
  dashboardData: DashboardData | null = null;
  loading = false;
  usageTrendData: any[] = [];
  outcomeDistribution: any = null;

  constructor(
    private dashboardService: DashboardService,
    private analyticsService: AnalyticsService,
    private notification: NotificationService,
    private router: Router,
    private dialog: MatDialog
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
    const dialogRef = this.dialog.open(SessionCreateDialogComponent, {
      width: '600px',
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
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
