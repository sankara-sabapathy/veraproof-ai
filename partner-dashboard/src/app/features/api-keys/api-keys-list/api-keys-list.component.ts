import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { skip, takeUntil } from 'rxjs/operators';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ApiKey, TenantEnvironmentSummary } from '../../../core/models/interfaces';
import { ApiKeysService } from '../services/api-keys.service';
import { ApiKeysStateService } from '../services/api-keys-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { TenantEnvironmentService } from '../../../core/services/tenant-environment.service';
import { ConfirmationDialogService, ConfirmationDialogData } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { ApiKeyCreateDialogComponent } from '../api-key-create-dialog/api-key-create-dialog.component';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ColDef, ValueFormatterParams } from 'ag-grid-community';
import { ActionRendererComponent } from '../../../shared/components/data-table/renderers/action-renderer.component';
import { CopyTextRendererComponent } from '../../../shared/components/data-table/renderers/copy-text-renderer.component';
import { formatEnvironmentLabel } from '../../../shared/utils/ui-presenters';

@Component({
  selector: 'app-api-keys-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DataTableComponent,
    ButtonModule,
    CardModule,
    PageHeaderComponent
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
  private tenantEnvironmentService = inject(TenantEnvironmentService);
  private confirmationDialog = inject(ConfirmationDialogService);
  private datePipe = inject(DatePipe);
  private destroy$ = new Subject<void>();

  apiKeys: ApiKey[] = [];
  loading = false;
  errorMessage: string | null = null;
  activeEnvironment: TenantEnvironmentSummary | null = null;
  columns: ColDef[] = [];

  constructor() {
    this.columns = [
      {
        field: 'environment',
        headerName: 'Environment',
        cellRenderer: (params: any) => {
          const isProduction = params.value === 'production';
          const environmentLabel = formatEnvironmentLabel(params.value);
          let html = `<span class="environment-pill ${isProduction ? 'environment-pill--production' : 'environment-pill--sandbox'}">${environmentLabel}</span>`;
          if (params.data.revoked_at) {
            html += ' <span class="environment-pill environment-pill--revoked">Revoked</span>';
          }
          return `<div class="environment-cell">${html}</div>`;
        }
      },
      {
        field: 'api_key',
        headerName: 'API Key',
        flex: 2,
        minWidth: 400,
        cellRenderer: CopyTextRendererComponent,
        cellRendererParams: {
          mask: (value: string) => this.getMaskedKey(value),
          disabled: (data: ApiKey) => this.isRevoked(data),
          copyCallback: (value: string) => this.copyToClipboard(value)
        }
      },
      {
        field: 'created_at',
        headerName: 'Created',
        valueFormatter: (params: ValueFormatterParams) => this.formatDate(params.value)
      },
      {
        field: 'usage_count',
        headerName: 'Usage',
        valueGetter: (params: any) => params.data.usage_count || params.data.total_calls || 0,
        cellRenderer: (params: any) => `<div class="usage-stats"><span class="usage-count">${params.value.toLocaleString()}</span><span class="usage-label">calls</span></div>`
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
    this.stateService.keys$
      .pipe(takeUntil(this.destroy$))
      .subscribe(keys => this.apiKeys = keys);

    this.stateService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => this.loading = loading);

    this.stateService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => this.errorMessage = error);

    this.tenantEnvironmentService.activeEnvironment$
      .pipe(takeUntil(this.destroy$))
      .subscribe(environment => this.activeEnvironment = environment);

    this.tenantEnvironmentService.activeEnvironment$
      .pipe(skip(1), takeUntil(this.destroy$))
      .subscribe(() => this.loadApiKeys());

    this.loadApiKeys();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get pageSubtitle(): string {
    const environment = this.activeEnvironment?.display_name || 'the selected environment';
    return `Manage credential access and key lifecycle for ${environment.toLowerCase()}.`;
  }

  loadApiKeys(): void {
    this.stateService.loadKeys();
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
    if (key.length <= 4) {
      return key;
    }
    return '••••••••••••' + key.slice(-4);
  }

  formatDate(dateString: string | null): string {
    if (!dateString) {
      return 'Never';
    }
    return this.datePipe.transform(dateString, 'short') || 'Never';
  }

  isRevoked(key: ApiKey): boolean {
    return key.revoked_at !== null;
  }

  capitalize(str: string): string {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
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
      // Keys are updated via the shared state service.
    });
  }
}


