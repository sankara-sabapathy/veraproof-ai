import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { ChipModule } from 'primeng/chip';
import { InputSwitchModule } from 'primeng/inputswitch';
import { TooltipModule } from 'primeng/tooltip';
import { WebhooksService, Webhook } from '../services/webhooks.service';
import { WebhooksStateService } from '../services/webhooks-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmationDialogService } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { WebhookFormComponent } from '../webhook-form/webhook-form.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-webhook-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    TableModule,
    ChipModule,
    InputSwitchModule,
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

  constructor(
    private webhooksService: WebhooksService,
    private webhooksState: WebhooksStateService,
    private notification: NotificationService,
    private dialogService: DialogService,
    private confirmationDialog: ConfirmationDialogService
  ) {}

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
