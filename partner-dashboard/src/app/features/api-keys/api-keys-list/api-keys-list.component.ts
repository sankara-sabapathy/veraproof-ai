import { Component, OnInit, OnDestroy, inject, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { ChipModule } from 'primeng/chip';
import { MenuModule } from 'primeng/menu';
import { TooltipModule } from 'primeng/tooltip';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApiKey } from '../../../core/models/interfaces';
import { ApiKeysService } from '../services/api-keys.service';
import { ApiKeysStateService } from '../services/api-keys-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmationDialogService, ConfirmationDialogData } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { ApiKeyCreateDialogComponent } from '../api-key-create-dialog/api-key-create-dialog.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-api-keys-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    CardModule,
    ChipModule,
    MenuModule,
    TooltipModule,
    LoadingSpinnerComponent
  ],
  providers: [DialogService],
  templateUrl: './api-keys-list.component.html',
  styleUrls: ['./api-keys-list.component.scss']
})
export class ApiKeysListComponent implements OnInit, OnDestroy {
  private dialogService = inject(DialogService);
  private apiKeysService = inject(ApiKeysService);
  private stateService = inject(ApiKeysStateService);
  private notificationService = inject(NotificationService);
  private confirmationDialog = inject(ConfirmationDialogService);
  private destroy$ = new Subject<void>();

  apiKeys: ApiKey[] = [];
  filteredKeys: ApiKey[] = [];
  loading$ = this.stateService.loading$;
  searchTerm = '';

  ngOnInit(): void {
    this.loadApiKeys();
    this.subscribeToState();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadApiKeys(): void {
    this.stateService.loadKeys();
  }

  private subscribeToState(): void {
    this.stateService.keys$
      .pipe(takeUntil(this.destroy$))
      .subscribe(keys => {
        this.apiKeys = keys;
        this.applyFilter();
      });
  }

  onSearch(searchTerm: string): void {
    this.searchTerm = searchTerm.toLowerCase();
    this.applyFilter();
  }

  private applyFilter(): void {
    if (!this.searchTerm) {
      this.filteredKeys = this.apiKeys;
      return;
    }

    this.filteredKeys = this.apiKeys.filter(key => 
      key.environment.toLowerCase().includes(this.searchTerm) ||
      key.api_key.toLowerCase().includes(this.searchTerm)
    );
  }

  onRevokeKey(key: ApiKey): void {
    if (key.revoked_at) {
      this.notificationService.warning('This key is already revoked');
      return;
    }

    const dialogData: ConfirmationDialogData = {
      title: 'Revoke API Key',
      message: `Are you sure you want to revoke this ${key.environment} API key? This action cannot be undone and will immediately invalidate all API calls using this key.`,
      confirmText: 'Revoke',
      cancelText: 'Cancel',
      confirmColor: 'warn',
      requireConfirmation: true
    };

    this.confirmationDialog.confirm(dialogData).subscribe(confirmed => {
      if (confirmed) {
        this.revokeKey(key);
      }
    });
  }

  private revokeKey(key: ApiKey): void {
    this.stateService.setLoading(true);
    this.apiKeysService.revokeKey(key.key_id).subscribe({
      next: () => {
        const updatedKey: ApiKey = {
          ...key,
          revoked_at: new Date().toISOString()
        };
        this.stateService.updateKey(updatedKey);
        this.notificationService.success('API key revoked successfully');
      },
      error: (error) => {
        this.stateService.setError(error.message || 'Failed to revoke API key');
        this.notificationService.error('Failed to revoke API key');
      }
    });
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.notificationService.success('Copied to clipboard');
    }).catch(() => {
      this.notificationService.error('Failed to copy to clipboard');
    });
  }

  getMaskedKey(key: string): string {
    if (key.length <= 4) return key;
    return '••••••••••••' + key.slice(-4);
  }

  formatDate(dateString: string | null): string {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }

  isRevoked(key: ApiKey): boolean {
    return key.revoked_at !== null;
  }

  getMenuItems(key: ApiKey) {
    return [
      {
        label: 'Revoke Key',
        icon: 'pi pi-ban',
        command: () => this.onRevokeKey(key),
        styleClass: 'menu-item-danger'
      }
    ];
  }

  onCreateKey(): void {
    const ref: DynamicDialogRef = this.dialogService.open(ApiKeyCreateDialogComponent, {
      header: 'Generate API Key',
      width: '600px',
      closable: false,
      closeOnEscape: false
    });

    ref.onClose.subscribe(() => {
      // Dialog closed, keys are already updated via state service
    });
  }
}
