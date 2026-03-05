import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { TooltipModule } from 'primeng/tooltip';
import { SessionService } from '../services/session.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { ColDef, ValueFormatterParams } from 'ag-grid-community';
import { StatusRendererComponent } from '../../../shared/components/data-table/renderers/status-renderer.component';
import { ActionRendererComponent } from '../../../shared/components/data-table/renderers/action-renderer.component';

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
    ChipModule,
    TooltipModule,
    LoadingSpinnerComponent,
    DataTableComponent
  ],
  providers: [DatePipe],
  templateUrl: './sessions-list.component.html',
  styleUrls: ['./sessions-list.component.scss']
})
export class SessionsListComponent implements OnInit {
  sessions: Session[] = [];
  loading = false;
  totalSessions = 0;

  columns: ColDef[] = [];

  constructor(
    private sessionService: SessionService,
    private notification: NotificationService,
    private router: Router,
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
    this.loadSessions();
  }

  loadSessions(): void {
    this.loading = true;
    this.sessionService.getSessions(1000, 0).subscribe({
      next: (response) => {
        this.sessions = response.sessions;
        this.totalSessions = response.total;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.notification.error('Failed to load sessions');
        console.error('Error loading sessions:', error);
      }
    });
  }

  createSession(): void {
    this.router.navigate(['/sessions/create']);
  }

  viewSession(sessionId: string): void {
    this.router.navigate(['/sessions', sessionId]);
  }
}

