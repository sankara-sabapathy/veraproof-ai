import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { DialogModule } from 'primeng/dialog';
import { WebhooksService, WebhookLog } from '../services/webhooks.service';
import { WebhooksStateService } from '../services/webhooks-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { ColDef, ValueFormatterParams } from 'ag-grid-community';
import { ActionRendererComponent } from '../../../shared/components/data-table/renderers/action-renderer.component';

@Component({
  selector: 'app-webhook-logs',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    DataTableComponent,
    ChipModule,
    DialogModule,
    LoadingSpinnerComponent
  ],
  providers: [DatePipe],
  templateUrl: './webhook-logs.component.html',
  styleUrls: ['./webhook-logs.component.scss']
})
export class WebhookLogsComponent implements OnInit {
  selectedWebhook$ = this.webhooksState.selectedWebhook$;
  logs$ = this.webhooksState.logs$;
  loading$ = this.webhooksState.loading$;

  columns: ColDef[] = [];
  displayDetails: boolean = false;
  selectedLog: WebhookLog | null = null;

  constructor(
    private webhooksService: WebhooksService,
    private webhooksState: WebhooksStateService,
    private notification: NotificationService,
    private datePipe: DatePipe
  ) {
    this.columns = [
      {
        field: 'timestamp',
        headerName: 'Timestamp',
        valueFormatter: (params: ValueFormatterParams) => this.datePipe.transform(params.value, 'short') || ''
      },
      {
        field: 'event_type',
        headerName: 'Event Type',
        cellRenderer: (params: any) => {
          return `<div class="p-chip p-component"><span class="p-chip-text" style="font-size:12px;">${params.value}</span></div>`;
        }
      },
      {
        field: 'status_code',
        headerName: 'Status Code',
        width: 130
      },
      {
        field: 'response_time_ms',
        headerName: 'Time (ms)',
        width: 120,
        valueFormatter: (params: ValueFormatterParams) => `${params.value}ms`
      },
      {
        field: 'success',
        headerName: 'Status',
        width: 120,
        cellRenderer: (params: any) => {
          const label = params.value ? 'Success' : 'Failed';
          const bg = params.value ? '#d1fae5' : '#fee2e2';
          const color = params.value ? '#065f46' : '#991b1b';
          return `<div class="p-chip p-component" style="background-color:${bg};color:${color};"><span class="p-chip-text" style="font-size:12px;">${label}</span></div>`;
        }
      },
      {
        field: 'retry_count',
        headerName: 'Retries',
        width: 110
      },
      {
        headerName: 'Actions',
        sortable: false,
        filter: false,
        width: 100,
        cellRenderer: ActionRendererComponent,
        cellRendererParams: {
          actions: [
            {
              icon: 'pi pi-info-circle',
              tooltip: 'View Details',
              actionCallback: (rowData: WebhookLog) => this.openDetails(rowData)
            }
          ]
        }
      }
    ];
  }

  ngOnInit(): void {
    this.selectedWebhook$.subscribe(webhook => {
      if (webhook) {
        this.loadLogs(webhook.webhook_id);
      }
    });
  }

  loadLogs(webhookId: string): void {
    this.webhooksState.setLoading(true);
    this.webhooksService.getWebhookLogs(webhookId, { limit: 100 }).subscribe({
      next: (logs) => this.webhooksState.setLogs(logs),
      error: (error) => {
        this.webhooksState.setError(error.message);
        this.notification.error('Failed to load webhook logs');
      }
    });
  }

  openDetails(log: WebhookLog): void {
    this.selectedLog = log;
    this.displayDetails = true;
  }

  getStatusColor(success: boolean): string {
    return success ? 'success' : 'danger';
  }

  back(): void {
    this.webhooksState.setSelectedWebhook(null);
  }
}
