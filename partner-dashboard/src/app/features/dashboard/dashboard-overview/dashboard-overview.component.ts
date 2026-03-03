import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { ChipModule } from 'primeng/chip';
import { TooltipModule } from 'primeng/tooltip';
import { DashboardService, DashboardData } from '../services/dashboard.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AnalyticsService } from '../../analytics/services/analytics.service';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { UsageChartComponent } from '../../analytics/usage-chart/usage-chart.component';
import { OutcomeChartComponent } from '../../analytics/outcome-chart/outcome-chart.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { SessionCreateDialogComponent } from '../../sessions/session-create-dialog/session-create-dialog.component';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
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
    ChipModule,
    DataTableComponent,
    TooltipModule,
    StatCardComponent,
    UsageChartComponent,
    OutcomeChartComponent,
    LoadingSpinnerComponent
  ],
  providers: [DialogService, DatePipe],
  templateUrl: './dashboard-overview.component.html',
  styleUrls: ['./dashboard-overview.component.scss']
})
export class DashboardOverviewComponent implements OnInit {
  dashboardData: DashboardData | null = null;
  loading = false;
  dialogRef: DynamicDialogRef | undefined;

  columns: ColDef[] = [];

  constructor(
    private dashboardService: DashboardService,
    private analyticsService: AnalyticsService,
    private notification: NotificationService,
    private router: Router,
    private dialogService: DialogService,
    private datePipe: DatePipe
  ) {
    this.columns = [
      { field: 'session_id', headerName: 'Session ID', flex: 2 },
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
        cellRenderer: (params: any) => {
          if (!params.value) return '<span style="color: #64748b">-</span>';
          const score = params.value;
          let color = '#f44336';
          if (score >= 80) color = '#4caf50';
          else if (score >= 50) color = '#ff9800';
          return `<span style="color: ${color}; font-weight: 500;">${score.toFixed(1)}</span>`;
        }
      },
      {
        headerName: 'Actions',
        sortable: false,
        filter: false,
        width: 100,
        cellRenderer: ActionRendererComponent,
        cellRendererParams: {
          actions: (data: any) => [
            {
              icon: 'pi pi-eye',
              tooltip: 'View Details',
              actionCallback: (rowData: any) => this.viewSession(rowData.session_id)
            }
          ]
        }
      }
    ];
  }

  ngOnInit(): void {
    this.loadDashboard();
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
}
