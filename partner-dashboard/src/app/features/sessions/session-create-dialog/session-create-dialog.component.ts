import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TooltipModule } from 'primeng/tooltip';
import { SessionsService } from '../services/sessions.service';
import { NotificationService } from '../../../core/services/notification.service';
import { CreateSessionResponse } from '../../../core/models/interfaces';

@Component({
  selector: 'app-session-create-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    ButtonModule,
    ProgressSpinnerModule,
    TooltipModule
  ],
  template: `
    <div class="dialog-container">
      <div class="dialog-content">
        <p class="description">
          Create a test verification session. You'll receive a session URL that can be opened on a mobile device.
        </p>

        <form [formGroup]="createForm">
          <div class="field">
            <span class="p-float-label">
              <input 
                pInputText 
                id="return_url"
                formControlName="return_url" 
                class="full-width"
                [class.ng-invalid]="createForm.get('return_url')?.invalid && createForm.get('return_url')?.touched">
              <label for="return_url">Return URL</label>
            </span>
            <small class="field-hint">URL where results will be sent after verification</small>
          </div>

          <div class="field">
            <span class="p-float-label">
              <input 
                pInputText 
                id="user_id"
                formControlName="user_id" 
                class="full-width">
              <label for="user_id">User ID (Optional)</label>
            </span>
            <small class="field-hint">Your internal user identifier</small>
          </div>
        </form>

        <div *ngIf="createdSession" class="session-created">
          <div class="success-message">
            <i class="pi pi-check-circle"></i>
            <span>Session created successfully!</span>
          </div>

          <div class="session-info">
            <div class="info-row">
              <span class="label">Session ID:</span>
              <code>{{ createdSession.session_id }}</code>
            </div>
            <div class="info-row">
              <span class="label">Session URL:</span>
              <div class="url-container">
                <code class="session-url">{{ createdSession.session_url }}</code>
                <p-button 
                  [icon]="urlCopied ? 'pi pi-check' : 'pi pi-copy'"
                  [text]="true"
                  [rounded]="true"
                  (onClick)="copyUrl()"
                  pTooltip="Copy URL">
                </p-button>
              </div>
            </div>
            <div class="info-row">
              <span class="label">Expires:</span>
              <span>{{ createdSession.expires_at | date:'medium' }}</span>
            </div>
          </div>

          <div class="help-text">
            <i class="pi pi-info-circle"></i>
            <span>Open this URL on a mobile device to start the verification process.</span>
          </div>
        </div>
      </div>

      <div class="dialog-actions">
        <p-button 
          label="{{ createdSession ? 'Close' : 'Cancel' }}"
          [text]="true"
          (onClick)="onClose()" 
          [disabled]="loading">
        </p-button>
        <p-button 
          *ngIf="!createdSession"
          label="Create Session"
          [loading]="loading"
          (onClick)="onCreate()"
          [disabled]="loading || createForm.invalid">
        </p-button>
      </div>
    </div>
  `,
  styles: [`
    .dialog-container {
      min-width: 500px;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .dialog-content {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .description {
      color: var(--text-color-secondary);
      margin: 0;
      line-height: 1.5;
    }

    .field {
      margin-bottom: 1.5rem;
    }

    .full-width {
      width: 100%;
    }

    .field-hint {
      display: block;
      margin-top: 0.25rem;
      color: var(--text-color-secondary);
      font-size: 0.875rem;
    }

    .session-created {
      margin-top: 0.5rem;
      padding: 1rem;
      background: var(--surface-50);
      border-radius: 8px;
    }

    .success-message {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1rem;
      color: var(--primary-color);
      font-weight: 500;
    }

    .success-message i {
      font-size: 1.25rem;
    }

    .session-info {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .info-row {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-color-secondary);
    }

    code {
      padding: 0.5rem;
      background: var(--surface-0);
      border: 1px solid var(--surface-border);
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 0.875rem;
      word-break: break-all;
    }

    .url-container {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .session-url {
      flex: 1;
    }

    .help-text {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      margin-top: 1rem;
      padding: 0.75rem;
      background: var(--blue-50);
      border-left: 3px solid var(--blue-500);
      border-radius: 4px;
      font-size: 0.875rem;
    }

    .help-text i {
      font-size: 1.25rem;
      color: var(--blue-500);
      margin-top: 0.125rem;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      padding-top: 1rem;
      border-top: 1px solid var(--surface-border);
    }
  `]
})
export class SessionCreateDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private ref = inject(DynamicDialogRef);
  private config = inject(DynamicDialogConfig);
  private sessionsService = inject(SessionsService);
  private notificationService = inject(NotificationService);

  createForm!: FormGroup;
  loading = false;
  createdSession: CreateSessionResponse | null = null;
  urlCopied = false;

  ngOnInit(): void {
    this.createForm = this.fb.group({
      return_url: ['http://localhost:4200/dashboard', Validators.required],
      user_id: ['']
    });
  }

  onCreate(): void {
    if (this.createForm.invalid) {
      return;
    }

    this.loading = true;
    const formValue = this.createForm.value;

    const request = {
      return_url: formValue.return_url,
      metadata: formValue.user_id ? { user_id: formValue.user_id } : {}
    };

    this.sessionsService.createSession(request).subscribe({
      next: (response) => {
        this.createdSession = response;
        this.loading = false;
        this.notificationService.success('Session created successfully!');
      },
      error: (error) => {
        this.loading = false;
        const errorMessage = error.error?.detail || error.message || 'Failed to create session';
        this.notificationService.error(errorMessage);
      }
    });
  }

  copyUrl(): void {
    if (this.createdSession) {
      navigator.clipboard.writeText(this.createdSession.session_url).then(() => {
        this.urlCopied = true;
        setTimeout(() => this.urlCopied = false, 2000);
        this.notificationService.success('URL copied to clipboard');
      }).catch(() => {
        this.notificationService.error('Failed to copy URL');
      });
    }
  }

  onClose(): void {
    this.ref.close(this.createdSession);
  }
}
