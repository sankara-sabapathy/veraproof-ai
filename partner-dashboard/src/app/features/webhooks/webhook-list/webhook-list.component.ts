import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { WebhooksService, Webhook } from '../services/webhooks.service';
import { WebhooksStateService } from '../services/webhooks-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmationDialogComponent } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { WebhookFormComponent } from '../webhook-form/webhook-form.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-webhook-list',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatCardModule,
    MatButtonModule,
    MatTableModule,
    MatChipsModule,
    MatSlideToggleModule,
    MatIconModule,
    MatTooltipModule,
    LoadingSpinnerComponent
  ],
  templateUrl: './webhook-list.component.html',
  styleUrls: ['./webhook-list.component.scss']
})
export class WebhookListComponent implements OnInit {
  webhooks$ = this.webhooksState.webhooks$;
  loading$ = this.webhooksState.loading$;
  displayedColumns = ['url', 'enabled', 'events', 'stats', 'actions'];

  constructor(
    private webhooksService: WebhooksService,
    private webhooksState: WebhooksStateService,
    private notification: NotificationService,
    private dialog: MatDialog
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
    const dialogRef = this.dialog.open(WebhookFormComponent, {
      width: '600px',
      data: { webhook: null }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadWebhooks();
      }
    });
  }

  openEditDialog(webhook: Webhook): void {
    const dialogRef = this.dialog.open(WebhookFormComponent, {
      width: '600px',
      data: { webhook }
    });

    dialogRef.afterClosed().subscribe(result => {
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
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Delete Webhook',
        message: `Are you sure you want to delete this webhook? This action cannot be undone.`,
        confirmText: 'Delete',
        confirmColor: 'warn'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
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
