import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { InputSwitchModule } from 'primeng/inputswitch';
import { ListboxModule } from 'primeng/listbox';
import { AccordionModule } from 'primeng/accordion';
import { WebhooksService, Webhook, WebhookConfig } from '../services/webhooks.service';
import { NotificationService } from '../../../core/services/notification.service';

const URL_PATTERN = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;

const EVENT_TYPES = [
  { value: 'session.completed', label: 'Session Completed' },
  { value: 'session.failed', label: 'Session Failed' },
  { value: 'session.timeout', label: 'Session Timeout' },
  { value: 'session.cancelled', label: 'Session Cancelled' }
];

@Component({
  selector: 'app-webhook-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    ButtonModule,
    InputSwitchModule,
    ListboxModule,
    AccordionModule
  ],
  templateUrl: './webhook-form.component.html',
  styleUrls: ['./webhook-form.component.scss']
})
export class WebhookFormComponent implements OnInit {
  form: FormGroup;
  eventTypes = EVENT_TYPES;
  isEdit = false;

  constructor(
    private fb: FormBuilder,
    private webhooksService: WebhooksService,
    private notification: NotificationService,
    public ref: DynamicDialogRef,
    public config: DynamicDialogConfig
  ) {
    this.isEdit = !!config.data?.webhook;
    this.form = this.fb.group({
      url: ['', [Validators.required, Validators.pattern(URL_PATTERN), Validators.maxLength(2048)]],
      enabled: [true],
      events: [[], Validators.required]
    });
  }

  ngOnInit(): void {
    if (this.config.data?.webhook) {
      this.form.patchValue({
        url: this.config.data.webhook.url,
        enabled: this.config.data.webhook.enabled,
        events: this.config.data.webhook.events
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const config: WebhookConfig = this.form.value;

    if (config.events.length === 0) {
      this.notification.error('Please select at least one event type');
      return;
    }

    const request = this.isEdit
      ? this.webhooksService.updateWebhook(this.config.data.webhook!.webhook_id, config)
      : this.webhooksService.createWebhook(config);

    request.subscribe({
      next: () => {
        this.notification.success(`Webhook ${this.isEdit ? 'updated' : 'created'} successfully`);
        this.ref.close(true);
      },
      error: (error) => {
        this.notification.error(`Failed to ${this.isEdit ? 'update' : 'create'} webhook`);
      }
    });
  }

  onCancel(): void {
    this.ref.close(false);
  }

  getErrorMessage(field: string): string {
    const control = this.form.get(field);
    if (control?.hasError('required')) {
      return 'This field is required';
    }
    if (control?.hasError('pattern')) {
      return 'Please enter a valid HTTP or HTTPS URL';
    }
    if (control?.hasError('maxlength')) {
      return 'URL must be less than 2048 characters';
    }
    return '';
  }
}
