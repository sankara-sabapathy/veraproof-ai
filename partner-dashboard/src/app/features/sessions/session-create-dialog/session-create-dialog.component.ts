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
            <span class="p-float-label full-width">
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
            <span class="p-float-label full-width">
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
      min-width: 480px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .dialog-content {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .description {
      color: #64748b;
      margin: 0;
      line-height: 1.6;
      font-size: 14px;
    }

    .field {
      margin-bottom: 20px;
    }

    .full-width {
      width: 100%;
    }

    .field-hint {
      display: block;
      margin-top: 6px;
      color: #94a3b8;
      font-size: 12px;
    }

    .session-created {
      margin-top: 8px;
      padding: 20px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
    }

    .success-message {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      color: #10b981;
      font-weight: 600;
      font-size: 14px;
    }

    .success-message i {
      font-size: 18px;
    }

    .session-info {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .info-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .label {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    code {
      padding: 10px 14px;
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 8px;
      font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
      font-size: 12px;
      color: #e2e8f0;
      word-break: break-all;
      display: block;
    }

    .url-container {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .session-url {
      flex: 1;
    }

    .help-text {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin-top: 16px;
      padding: 12px 16px;
      background: #eff6ff;
      border-left: 3px solid #3b82f6;
      border-radius: 6px;
      font-size: 13px;
      color: #1e40af;
      line-height: 1.5;
    }

    .help-text i {
      font-size: 16px;
      color: #3b82f6;
      margin-top: 1px;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
      padding-top: 16px;
      padding-bottom: 8px;
      border-top: 1px solid #f1f5f9;
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
