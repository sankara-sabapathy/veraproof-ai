import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChipModule } from 'primeng/chip';
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
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { ColDef, ValueFormatterParams } from 'ag-grid-community';
import { ActionRendererComponent } from '../../../shared/components/data-table/renderers/action-renderer.component';
import { CopyTextRendererComponent } from '../../../shared/components/data-table/renderers/copy-text-renderer.component';

@Component({
  selector: 'app-api-keys-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DataTableComponent,
    ButtonModule,
    CardModule,
    ChipModule,
    TooltipModule,
    LoadingSpinnerComponent
  ],
  providers: [DialogService, DatePipe],
  templateUrl: './api-keys-list.component.html',
  styleUrls: ['./api-keys-list.component.scss']
})
export class ApiKeysListComponent implements OnInit, OnDestroy {
  private dialogService = inject(DialogService);
  private apiKeysService = inject(ApiKeysService);
  private stateService = inject(ApiKeysStateService);
  private notificationService = inject(NotificationService);
  private confirmationDialog = inject(ConfirmationDialogService);
  private datePipe = inject(DatePipe);
  private destroy$ = new Subject<void>();

  apiKeys: ApiKey[] = [];
  loading$ = this.stateService.loading$;
  columns: ColDef[] = [];

  constructor() {
    this.columns = [
      {
        field: 'environment',
        headerName: 'Environment',
        cellRenderer: (params: any) => {
          const envClass = params.value === 'sandbox' ? 'chip-sandbox' : 'chip-production';
          let html = `<div class="p-chip p-component ${envClass}"><span class="p-chip-text">${this.capitalize(params.value)}</span></div>`;
          if (params.data.revoked_at) {
            html += ` <div class="p-chip p-component chip-revoked"><span class="p-chip-text">Revoked</span></div>`;
          }
          return `<div style="display:flex; gap:8px;">${html}</div>`;
        }
      },
      {
        field: 'api_key',
        headerName: 'API Key',
        flex: 2,
        cellRenderer: CopyTextRendererComponent,
        cellRendererParams: {
          mask: (val: string) => this.getMaskedKey(val),
          disabled: (data: any) => this.isRevoked(data),
          copyCallback: (val: string) => this.copyToClipboard(val)
        }
      },
      {
        field: 'created_at',
        headerName: 'Created',
        valueFormatter: (params: ValueFormatterParams) => this.formatDate(params.value)
      },
      {
        field: 'total_calls',
        headerName: 'Usage',
        cellRenderer: (params: any) => {
          return `<div class="usage-stats"><span class="usage-count">${params.value?.toLocaleString() || 0}</span><span class="usage-label" style="font-size:12px;color:gray;display:block;">calls</span></div>`;
        }
      },
      {
        field: 'last_used_at',
        headerName: 'Last Used',
        valueFormatter: (params: ValueFormatterParams) => this.formatDate(params.value)
      },
      {
        headerName: 'Actions',
        sortable: false,
        filter: false,
        width: 100,
        cellRenderer: ActionRendererComponent,
        cellRendererParams: {
          actions: (data: ApiKey) => [
            {
              isMenu: true,
              disabled: this.isRevoked(data),
              menuItems: this.getMenuItems(data)
            }
          ]
        }
      }
    ];
  }

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
      });
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
    return this.datePipe.transform(dateString, 'short') || 'Never';
  }

  isRevoked(key: ApiKey): boolean {
    return key.revoked_at !== null;
  }

  capitalize(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
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
