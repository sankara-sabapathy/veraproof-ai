import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { skip, takeUntil } from 'rxjs/operators';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SessionService } from '../services/session.service';
import { NotificationService } from '../../../core/services/notification.service';
import { TenantEnvironmentService } from '../../../core/services/tenant-environment.service';
import { TenantEnvironmentSummary } from '../../../core/models/interfaces';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ColDef, ValueFormatterParams } from 'ag-grid-community';
import { StatusRendererComponent } from '../../../shared/components/data-table/renderers/status-renderer.component';
import { ActionRendererComponent } from '../../../shared/components/data-table/renderers/action-renderer.component';
import { getTrustScoreTone } from '../../../shared/utils/ui-presenters';

interface Session {
  session_id: string;
  created_at: string;
  expires_at: string;
  state: string;
  final_trust_score?: number;
  tier_1_score?: number;
  return_url?: string;
}

@Component({
  selector: 'app-sessions-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CardModule,
    ButtonModule,
    DataTableComponent,
    PageHeaderComponent
  ],
  providers: [DatePipe],
  templateUrl: './sessions-list.component.html',
  styleUrls: ['./sessions-list.component.scss']
})
export class SessionsListComponent implements OnInit, OnDestroy {
  sessions: Session[] = [];
  loading = false;
  totalSessions = 0;
  errorMessage: string | null = null;
  activeEnvironment: TenantEnvironmentSummary | null = null;
  private destroy$ = new Subject<void>();

  columns: ColDef[] = [];

  constructor(
    private sessionService: SessionService,
    private notification: NotificationService,
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
    this.tenantEnvironmentService.activeEnvironment$
      .pipe(takeUntil(this.destroy$))
      .subscribe(environment => this.activeEnvironment = environment);

    this.tenantEnvironmentService.activeEnvironment$
      .pipe(skip(1), takeUntil(this.destroy$))
      .subscribe(() => this.loadSessions());

    this.loadSessions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get pageSubtitle(): string {
    const environment = this.activeEnvironment?.display_name || 'the selected environment';
    return `Review verification history and trust results for ${environment.toLowerCase()}.`;
  }

  loadSessions(): void {
    this.loading = true;
    this.errorMessage = null;

    this.sessionService.getSessions(1000, 0).subscribe({
      next: (response) => {
        this.sessions = response.sessions;
        this.totalSessions = response.total;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'We could not load session history for the selected environment.';
        this.notification.error('Failed to load sessions');
      }
    });
  }

  createSession(): void {
    this.router.navigate(['/sessions/create']);
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
