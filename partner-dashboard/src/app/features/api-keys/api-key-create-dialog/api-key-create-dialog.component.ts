import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { CardModule } from 'primeng/card';
import { ChipModule } from 'primeng/chip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TooltipModule } from 'primeng/tooltip';
import { ApiKeysService } from '../services/api-keys.service';
import { ApiKeysStateService } from '../services/api-keys-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ApiKeyResponse, ApiKey } from '../../../core/models/interfaces';

interface EnvironmentOption {
  label: string;
  value: 'sandbox' | 'production';
  icon: string;
  description: string;
}

@Component({
  selector: 'app-api-key-create-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    DropdownModule,
    CardModule,
    ChipModule,
    ProgressSpinnerModule,
    TooltipModule
  ],
  templateUrl: './api-key-create-dialog.component.html',
  styleUrls: ['./api-key-create-dialog.component.scss']
})
export class ApiKeyCreateDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(DynamicDialogRef);
  private config = inject(DynamicDialogConfig);
  private apiKeysService = inject(ApiKeysService);
  private stateService = inject(ApiKeysStateService);
  private notificationService = inject(NotificationService);

  createForm!: FormGroup;
  loading = false;
  generatedKey: ApiKeyResponse | null = null;
  keyCopied = false;
  showCloseWarning = false;

  environmentOptions: EnvironmentOption[] = [
    {
      label: 'Sandbox',
      value: 'sandbox',
      icon: 'pi pi-flask',
      description: 'For testing and development'
    },
    {
      label: 'Production',
      value: 'production',
      icon: 'pi pi-check-circle',
      description: 'For live verification sessions'
    }
  ];

  ngOnInit(): void {
    this.createForm = this.fb.group({
      environment: ['sandbox', Validators.required]
    });
  }

  onGenerate(): void {
    if (this.createForm.invalid) {
      return;
    }

    this.loading = true;
    const environment = this.createForm.value.environment as 'sandbox' | 'production';

    this.apiKeysService.generateKey(environment).subscribe({
      next: (response) => {
        this.generatedKey = response;
        this.loading = false;
        
        // Add the new key to state (without the secret)
        const newKey: ApiKey = {
          key_id: response.key_id,
          api_key: response.api_key,
          environment: response.environment,
          created_at: new Date().toISOString(),
          last_used_at: null,
          total_calls: 0,
          revoked_at: null
        };
        this.stateService.addKey(newKey);
        
        this.notificationService.success('API key generated successfully');
      },
      error: (error) => {
        this.loading = false;
        const errorMessage = error.message || 'Unable to generate API key. Please try again.';
        this.notificationService.error(errorMessage);
      }
    });
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.keyCopied = true;
      setTimeout(() => this.keyCopied = false, 2000);
      this.notificationService.success('Copied to clipboard');
    }).catch(() => {
      this.notificationService.error('Failed to copy to clipboard');
    });
  }

  onClose(): void {
    // If key was generated but not copied, show warning
    if (this.generatedKey && !this.keyCopied) {
      this.showCloseWarning = true;
    } else {
      this.dialogRef.close();
    }
  }

  confirmClose(): void {
    this.dialogRef.close();
  }

  cancelClose(): void {
    this.showCloseWarning = false;
  }

  get hasGeneratedKey(): boolean {
    return this.generatedKey !== null;
  }

  get canClose(): boolean {
    return !this.loading;
  }
}
