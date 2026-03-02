import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { TooltipModule } from 'primeng/tooltip';
import { WebhooksService, Webhook } from '../services/webhooks.service';
import { WebhooksStateService } from '../services/webhooks-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmationDialogService } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { WebhookFormComponent } from '../webhook-form/webhook-form.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { ColDef } from 'ag-grid-community';
import { ActionRendererComponent } from '../../../shared/components/data-table/renderers/action-renderer.component';
import { SwitchRendererComponent } from '../../../shared/components/data-table/renderers/switch-renderer.component';

@Component({
  selector: 'app-webhook-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    DataTableComponent,
    ChipModule,
    TooltipModule,
    LoadingSpinnerComponent
  ],
  providers: [DialogService],
  templateUrl: './webhook-list.component.html',
  styleUrls: ['./webhook-list.component.scss']
})
export class WebhookListComponent implements OnInit {
  webhooks$ = this.webhooksState.webhooks$;
  loading$ = this.webhooksState.loading$;
  dialogRef: DynamicDialogRef | undefined;

  columns: ColDef[] = [];

  constructor(
    private webhooksService: WebhooksService,
    private webhooksState: WebhooksStateService,
    private notification: NotificationService,
    private dialogService: DialogService,
    private confirmationDialog: ConfirmationDialogService
  ) {
    this.columns = [
      {
        field: 'url',
        headerName: 'URL',
        flex: 2,
        cellRenderer: (params: any) => {
          let html = `<span style="font-family: monospace; font-size: 13px;">${params.value}</span>`;
          if (!params.data.enabled) {
            html += ` <div class="p-chip p-component chip-warn" style="margin-left:8px;"><span class="p-chip-text" style="font-size:11px;">Disabled</span></div>`;
          }
          return `<div style="display:flex; align-items:center;">${html}</div>`;
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
          if (!params.value || !Array.isArray(params.value)) return '';
          const chips = params.value.map((evt: string) => `<div class="p-chip p-component event-chip" style="margin-right:4px;"><span class="p-chip-text" style="font-size:11px;">${evt}</span></div>`).join('');
          return `<div style="display:flex; flex-wrap:wrap; align-items:center; height:100%;">${chips}</div>`;
        }
      },
      {
        headerName: 'Statistics',
        width: 150,
        valueGetter: (params) => params.data,
        cellRenderer: (params: any) => {
          const d = params.value;
          return `<div style="display:flex;gap:12px;font-weight:500;align-items:center;height:100%;">
             <span style="color:#059669;">✓ ${d?.success_count || 0}</span>
             <span style="color:#dc2626;">✗ ${d?.failure_count || 0}</span>
           </div>`;
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
              tooltip: 'Test Webhook',
              actionCallback: (rowData: Webhook) => this.testWebhook(rowData)
            },
            {
              icon: 'pi pi-history',
              tooltip: 'View Logs',
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
    this.loadWebhooks();
  }

  loadWebhooks(): void {
    this.webhooksState.setLoading(true);
    this.webhooksService.listWebhooks().subscribe({
      next: (webhooks) => this.webhooksState.setWebhooks(webhooks),
      error: (error) => {
        this.webhooksState.setError(error.message);
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
    // Overridden toggle callback for switch renderer 
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
        this.loadWebhooks(); // Refresh to rollback
      }
    });
  }

  toggleWebhook(webhook: Webhook): void {
    const config = {
      url: webhook.url,
      enabled: !webhook.enabled,
      events: webhook.events
    };

    this.webhooksService.updateWebhook(webhook.webhook_id, config).subscribe({
      next: () => {
        this.notification.success(`Webhook ${config.enabled ? 'enabled' : 'disabled'}`);
        this.loadWebhooks();
      },
      error: () => {
        this.notification.error('Failed to update webhook');
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
        } else {
          this.notification.error(`Webhook test failed: ${result.error_message}`);
        }
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
      message: `Are you sure you want to delete this webhook? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmColor: 'warn'
    }).subscribe(confirmed => {
      if (confirmed) {
        this.webhooksService.deleteWebhook(webhook.webhook_id).subscribe({
          next: () => {
            this.notification.success('Webhook deleted');
            this.loadWebhooks();
          },
          error: () => {
            this.notification.error('Failed to delete webhook');
          }
        });
      }
    });
  }

  viewLogs(webhook: Webhook): void {
    this.webhooksState.setSelectedWebhook(webhook);
  }
}
