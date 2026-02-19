import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SessionsService } from '../services/sessions.service';
import { NotificationService } from '../../../core/services/notification.service';
import { CreateSessionResponse } from '../../../core/models/interfaces';

@Component({
  selector: 'app-session-create-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="dialog-container">
      <h2 mat-dialog-title>Create Test Session</h2>

      <mat-dialog-content>
        <p class="description">
          Create a test verification session. You'll receive a session URL that can be opened on a mobile device.
        </p>

        <form [formGroup]="createForm">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Return URL</mat-label>
            <input matInput formControlName="return_url" placeholder="https://yourapp.com/callback">
            <mat-hint>URL where results will be sent after verification</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>User ID (Optional)</mat-label>
            <input matInput formControlName="user_id" placeholder="user-123">
            <mat-hint>Your internal user identifier</mat-hint>
          </mat-form-field>
        </form>

        <div *ngIf="createdSession" class="session-created">
          <div class="success-message">
            <mat-icon color="primary">check_circle</mat-icon>
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
                <button mat-icon-button (click)="copyUrl()" matTooltip="Copy URL">
                  <mat-icon>{{ urlCopied ? 'check' : 'content_copy' }}</mat-icon>
                </button>
              </div>
            </div>
            <div class="info-row">
              <span class="label">Expires:</span>
              <span>{{ createdSession.expires_at | date:'medium' }}</span>
            </div>
          </div>

          <div class="help-text">
            <mat-icon>info</mat-icon>
            <span>Open this URL on a mobile device to start the verification process.</span>
          </div>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onClose()" [disabled]="loading">
          {{ createdSession ? 'Close' : 'Cancel' }}
        </button>
        <button *ngIf="!createdSession" 
                mat-raised-button 
                color="primary" 
                (click)="onCreate()"
                [disabled]="loading || createForm.invalid">
          <mat-spinner *ngIf="loading" diameter="20" class="button-spinner"></mat-spinner>
          <span *ngIf="!loading">Create Session</span>
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dialog-container {
      min-width: 500px;
    }

    .description {
      color: var(--text-secondary);
      margin-bottom: 1.5rem;
    }

    .full-width {
      width: 100%;
      margin-bottom: 1rem;
    }

    .session-created {
      margin-top: 1.5rem;
      padding: 1rem;
      background: var(--background-secondary);
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
      color: var(--text-secondary);
    }

    code {
      padding: 0.5rem;
      background: var(--background);
      border: 1px solid var(--border-color);
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
      background: var(--info-background);
      border-left: 3px solid var(--info-color);
      border-radius: 4px;
      font-size: 0.875rem;
    }

    .help-text mat-icon {
      font-size: 1.25rem;
      width: 1.25rem;
      height: 1.25rem;
      color: var(--info-color);
    }

    .button-spinner {
      display: inline-block;
      margin-right: 0.5rem;
    }
  `]
})
export class SessionCreateDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<SessionCreateDialogComponent>);
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
    this.dialogRef.close(this.createdSession);
  }
}
