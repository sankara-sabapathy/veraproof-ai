import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { ChipModule } from 'primeng/chip';
import { WebhooksService, WebhookLog } from '../services/webhooks.service';
import { WebhooksStateService } from '../services/webhooks-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-webhook-logs',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    TableModule,
    ChipModule,
    LoadingSpinnerComponent
  ],
  templateUrl: './webhook-logs.component.html',
  styleUrls: ['./webhook-logs.component.scss']
})
export class WebhookLogsComponent implements OnInit {
  selectedWebhook$ = this.webhooksState.selectedWebhook$;
  logs$ = this.webhooksState.logs$;
  loading$ = this.webhooksState.loading$;

  constructor(
    private webhooksService: WebhooksService,
    private webhooksState: WebhooksStateService,
    private notification: NotificationService
  ) {}

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

  getStatusColor(success: boolean): string {
    return success ? 'success' : 'danger';
  }

  back(): void {
    this.webhooksState.setSelectedWebhook(null);
  }
}
