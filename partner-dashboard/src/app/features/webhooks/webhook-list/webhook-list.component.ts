import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { skip, takeUntil } from 'rxjs/operators';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { WebhooksService, Webhook } from '../services/webhooks.service';
import { WebhooksStateService } from '../services/webhooks-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { TenantEnvironmentService } from '../../../core/services/tenant-environment.service';
import { TenantEnvironmentSummary } from '../../../core/models/interfaces';
import { ConfirmationDialogService } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ColDef } from 'ag-grid-community';
import { ActionRendererComponent } from '../../../shared/components/data-table/renderers/action-renderer.component';
import { SwitchRendererComponent } from '../../../shared/components/data-table/renderers/switch-renderer.component';
import { WebhookFormComponent } from '../webhook-form/webhook-form.component';

@Component({
  selector: 'app-webhook-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    DataTableComponent,
    PageHeaderComponent
  ],
  providers: [DialogService],
  templateUrl: './webhook-list.component.html',
  styleUrls: ['./webhook-list.component.scss']
})
export class WebhookListComponent implements OnInit, OnDestroy {
  webhooks: Webhook[] = [];
  loading = false;
  errorMessage: string | null = null;
  activeEnvironment: TenantEnvironmentSummary | null = null;
  dialogRef: DynamicDialogRef | undefined;
  private destroy$ = new Subject<void>();

  columns: ColDef[] = [];

  constructor(
    private webhooksService: WebhooksService,
    private webhooksState: WebhooksStateService,
    private notification: NotificationService,
    private tenantEnvironmentService: TenantEnvironmentService,
    private dialogService: DialogService,
    private confirmationDialog: ConfirmationDialogService
  ) {
    this.columns = [
      {
        field: 'url',
        headerName: 'URL',
        flex: 2,
        cellRenderer: (params: any) => {
          let html = `<span class="code-pill">${params.value}</span>`;
          if (!params.data.enabled) {
            html += ` <span class="inline-badge inline-badge--danger">Disabled</span>`;
          }
          return `<div class="table-inline-group">${html}</div>`;
        }
      },
      {
        field: 'enabled',
        headerName: 'Status',
        width: 120,
        cellRenderer: SwitchRendererComponent,
        cellRendererParams: {
          toggleCallback: (data: Webhook, checked: boolean) => this.toggleWebhookDirectly(data, checked)
        }
      },
      {
        field: 'events',
        headerName: 'Events',
        flex: 1.5,
        cellRenderer: (params: any) => {
          if (!params.value || !Array.isArray(params.value)) {
            return '';
          }
          const chips = params.value
            .map((evt: string) => `<span class="inline-badge inline-badge--neutral">${evt}</span>`)
            .join('');
          return `<div class="table-inline-wrap">${chips}</div>`;
        }
      },
      {
        headerName: 'Statistics',
        width: 160,
        valueGetter: (params) => params.data,
        cellRenderer: (params: any) => {
          const data = params.value;
          return `<div class="metric-pair"><span class="metric metric--success">Success ${data?.success_count || 0}</span><span class="metric metric--danger">Failed ${data?.failure_count || 0}</span></div>`;
        }
      },
      {
        headerName: 'Actions',
        sortable: false,
        filter: false,
        width: 180,
        cellRenderer: ActionRendererComponent,
        cellRendererParams: {
          actions: [
            {
              icon: 'pi pi-play',
              tooltip: 'Test webhook',
              actionCallback: (rowData: Webhook) => this.testWebhook(rowData)
            },
            {
              icon: 'pi pi-history',
              tooltip: 'View logs',
              actionCallback: (rowData: Webhook) => this.viewLogs(rowData)
            },
            {
              icon: 'pi pi-pencil',
              tooltip: 'Edit',
              actionCallback: (rowData: Webhook) => this.openEditDialog(rowData)
            },
            {
              icon: 'pi pi-trash',
              tooltip: 'Delete',
              actionCallback: (rowData: Webhook) => this.deleteWebhook(rowData)
            }
          ]
        }
      }
    ];
  }

  ngOnInit(): void {
    this.webhooksState.webhooks$
      .pipe(takeUntil(this.destroy$))
      .subscribe(webhooks => this.webhooks = webhooks);

    this.webhooksState.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => this.loading = loading);

    this.webhooksState.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => this.errorMessage = error);

    this.tenantEnvironmentService.activeEnvironment$
      .pipe(takeUntil(this.destroy$))
      .subscribe(environment => this.activeEnvironment = environment);

    this.tenantEnvironmentService.activeEnvironment$
      .pipe(skip(1), takeUntil(this.destroy$))
      .subscribe(() => this.loadWebhooks());

    this.loadWebhooks();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get pageSubtitle(): string {
    const environment = this.activeEnvironment?.display_name || 'the selected environment';
    return `Manage outbound event delivery and monitor webhook health for ${environment.toLowerCase()}.`;
  }

  loadWebhooks(): void {
    this.webhooksState.setLoading(true);
    this.webhooksState.clearError();

    this.webhooksService.listWebhooks().subscribe({
      next: (webhooks) => this.webhooksState.setWebhooks(webhooks),
      error: (error) => {
        this.webhooksState.setError(error.message || 'Failed to load webhooks');
        this.notification.error('Failed to load webhooks');
      }
    });
  }

  openCreateDialog(): void {
    this.dialogRef = this.dialogService.open(WebhookFormComponent, {
      header: 'Add Webhook',
      width: '600px',
      data: { webhook: null }
    });

    this.dialogRef.onClose.subscribe(result => {
      if (result) {
        this.loadWebhooks();
      }
    });
  }

  openEditDialog(webhook: Webhook): void {
    this.dialogRef = this.dialogService.open(WebhookFormComponent, {
      header: 'Edit Webhook',
      width: '600px',
      data: { webhook }
    });

    this.dialogRef.onClose.subscribe(result => {
      if (result) {
        this.loadWebhooks();
      }
    });
  }

  toggleWebhookDirectly(webhook: Webhook, checked: boolean): void {
    const config = {
      url: webhook.url,
      enabled: checked,
      events: webhook.events
    };

    this.webhooksService.updateWebhook(webhook.webhook_id, config).subscribe({
      next: () => {
        this.notification.success(`Webhook ${config.enabled ? 'enabled' : 'disabled'}`);
        this.loadWebhooks();
      },
      error: () => {
        this.notification.error('Failed to update webhook');
        this.loadWebhooks();
      }
    });
  }

  testWebhook(webhook: Webhook): void {
    this.webhooksState.setLoading(true);
    this.webhooksService.testWebhook(webhook.webhook_id).subscribe({
      next: (result) => {
        this.webhooksState.setLoading(false);
        if (result.success) {
          this.notification.success(`Webhook test successful (${result.status_code}, ${result.response_time_ms}ms)`);
          return;
        }

        this.notification.error(`Webhook test failed: ${result.error_message}`);
      },
      error: () => {
        this.webhooksState.setLoading(false);
        this.notification.error('Failed to test webhook');
      }
    });
  }

  deleteWebhook(webhook: Webhook): void {
    this.confirmationDialog.confirm({
      title: 'Delete Webhook',
      message: 'Are you sure you want to delete this webhook? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmColor: 'warn'
    }).subscribe(confirmed => {
      if (!confirmed) {
        return;
      }

      this.webhooksService.deleteWebhook(webhook.webhook_id).subscribe({
        next: () => {
          this.notification.success('Webhook deleted');
          this.loadWebhooks();
        },
        error: () => {
          this.notification.error('Failed to delete webhook');
        }
      });
    });
  }

  viewLogs(webhook: Webhook): void {
    this.webhooksState.setSelectedWebhook(webhook);
  }
}
