import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { skip, takeUntil } from 'rxjs/operators';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { DashboardService, DashboardData } from '../services/dashboard.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { TenantEnvironmentService } from '../../../core/services/tenant-environment.service';
import { TenantEnvironmentSummary } from '../../../core/models/interfaces';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { UsageChartComponent } from '../../analytics/usage-chart/usage-chart.component';
import { OutcomeChartComponent } from '../../analytics/outcome-chart/outcome-chart.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ContentStateComponent } from '../../../shared/components/content-state/content-state.component';
import { getTrustScoreTone, getUsagePresentation } from '../../../shared/utils/ui-presenters';
import { ColDef, ValueFormatterParams } from 'ag-grid-community';
import { ActionRendererComponent } from '../../../shared/components/data-table/renderers/action-renderer.component';
import { StatusRendererComponent } from '../../../shared/components/data-table/renderers/status-renderer.component';

@Component({
  selector: 'app-dashboard-overview',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CardModule,
    ButtonModule,
    ProgressBarModule,
    DataTableComponent,
    StatCardComponent,
    UsageChartComponent,
    OutcomeChartComponent,
    LoadingSpinnerComponent,
    PageHeaderComponent,
    ContentStateComponent
  ],
  providers: [DatePipe],
  templateUrl: './dashboard-overview.component.html',
  styleUrls: ['./dashboard-overview.component.scss']
})
export class DashboardOverviewComponent implements OnInit, OnDestroy {
  dashboardData: DashboardData | null = null;
  loading = false;
  errorMessage: string | null = null;
  activeEnvironment: TenantEnvironmentSummary | null = null;
  private destroy$ = new Subject<void>();

  columns: ColDef[] = [];

  constructor(
    private dashboardService: DashboardService,
    private notification: NotificationService,
    private authService: AuthService,
    private tenantEnvironmentService: TenantEnvironmentService,
    private router: Router,
    private datePipe: DatePipe
  ) {
    this.columns = [
      {
        field: 'session_id',
        headerName: 'Session ID',
        flex: 2,
        cellRenderer: (params: any) => `<span class="session-id-pill">${params.value}</span>`
      },
      {
        field: 'created_at',
        headerName: 'Created',
        valueFormatter: (params: ValueFormatterParams) => this.datePipe.transform(params.value, 'short') || ''
      },
      {
        field: 'state',
        headerName: 'Status',
        cellRenderer: StatusRendererComponent
      },
      {
        field: 'final_trust_score',
        headerName: 'Trust Score',
        cellRenderer: (params: any) => this.renderTrustScore(params.value)
      },
      {
        headerName: 'Actions',
        sortable: false,
        filter: false,
        width: 100,
        cellRenderer: ActionRendererComponent,
        cellRendererParams: {
          actions: () => [
            {
              icon: 'pi pi-eye',
              tooltip: 'View details',
              actionCallback: (rowData: any) => this.viewSession(rowData.session_id)
            }
          ]
        }
      }
    ];
  }

  ngOnInit(): void {
    if (this.authService.isAdmin()) {
      void this.router.navigate(['/admin/platform-stats']);
      return;
    }

    this.tenantEnvironmentService.activeEnvironment$
      .pipe(takeUntil(this.destroy$))
      .subscribe((environment) => {
        this.activeEnvironment = environment;
      });

    this.tenantEnvironmentService.activeEnvironment$
      .pipe(skip(1), takeUntil(this.destroy$))
      .subscribe(() => this.loadDashboard());

    this.loadDashboard();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get pageSubtitle(): string {
    const usage = this.usage;
    return `Monitor verification activity, trust outcomes, and quota usage for ${usage.environmentLabel.toLowerCase()}.`;
  }

  get usage() {
    return getUsagePresentation(this.dashboardData?.quota, this.activeEnvironment);
  }

  loadDashboard(): void {
    this.loading = true;
    this.errorMessage = null;

    this.dashboardService.getDashboardData().subscribe({
      next: (data) => {
        this.dashboardData = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'We could not load the latest dashboard data for this environment.';
        this.notification.error('Failed to load dashboard data');
      }
    });
  }

  createSession(): void {
    this.router.navigate(['/sessions/create']);
  }

  generateApiKey(): void {
    this.router.navigate(['/api-keys']);
  }

  viewSession(sessionId: string): void {
    this.router.navigate(['/sessions', sessionId]);
  }

  private renderTrustScore(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '<span class="trust-score trust-score--neutral">Not scored</span>';
    }

    const tone = getTrustScoreTone(value);
    return `<span class="trust-score trust-score--${tone}">${Number(value).toFixed(1)}</span>`;
  }
}
