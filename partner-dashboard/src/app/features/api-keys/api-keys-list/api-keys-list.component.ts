import { Component, OnInit, OnDestroy, inject, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatSortModule } from '@angular/material/sort';
import { MatCardModule } from '@angular/material/card';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApiKey } from '../../../core/models/interfaces';
import { ApiKeysService } from '../services/api-keys.service';
import { ApiKeysStateService } from '../services/api-keys-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { ApiKeyCreateDialogComponent } from '../api-key-create-dialog/api-key-create-dialog.component';
import { TableColumn } from '../../../shared/components/data-table/data-table.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-api-keys-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatMenuModule,
    MatSortModule,
    MatCardModule,
    LoadingSpinnerComponent
  ],
  templateUrl: './api-keys-list.component.html',
  styleUrls: ['./api-keys-list.component.scss']
})
export class ApiKeysListComponent implements OnInit, OnDestroy {
  private dialog = inject(MatDialog);
  private apiKeysService = inject(ApiKeysService);
  private stateService = inject(ApiKeysStateService);
  private notificationService = inject(NotificationService);
  private destroy$ = new Subject<void>();

  @ViewChild('environmentTemplate', { static: true }) environmentTemplate!: TemplateRef<any>;
  @ViewChild('keyValueTemplate', { static: true }) keyValueTemplate!: TemplateRef<any>;
  @ViewChild('usageTemplate', { static: true }) usageTemplate!: TemplateRef<any>;
  @ViewChild('actionsTemplate', { static: true }) actionsTemplate!: TemplateRef<any>;

  dataSource = new MatTableDataSource<ApiKey>();
  columns: TableColumn[] = [];
  loading$ = this.stateService.loading$;
  searchTerm = '';

  ngOnInit(): void {
    this.setupColumns();
    this.loadApiKeys();
    this.subscribeToState();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupColumns(): void {
    this.columns = [
      { key: 'environment', label: 'Environment', sortable: true, template: this.environmentTemplate },
      { key: 'api_key', label: 'API Key', sortable: false, template: this.keyValueTemplate },
      { key: 'created_at', label: 'Created', sortable: true },
      { key: 'usage', label: 'Usage', sortable: true, template: this.usageTemplate },
      { key: 'last_used_at', label: 'Last Used', sortable: true },
      { key: 'actions', label: 'Actions', sortable: false, template: this.actionsTemplate }
    ];
  }

  private loadApiKeys(): void {
    this.stateService.loadKeys();
  }

  private subscribeToState(): void {
    this.stateService.keys$
      .pipe(takeUntil(this.destroy$))
      .subscribe(keys => {
        this.dataSource.data = keys;
      });
  }

  onSearch(searchTerm: string): void {
    this.searchTerm = searchTerm.toLowerCase();
    this.dataSource.filter = this.searchTerm;
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
      confirmColor: 'warn',
      requireConfirmation: true
    };

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '500px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(confirmed => {
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

  onCreateKey(): void {
    const dialogRef = this.dialog.open(ApiKeyCreateDialogComponent, {
      width: '600px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(() => {
      // Dialog closed, keys are already updated via state service
    });
  }
}
