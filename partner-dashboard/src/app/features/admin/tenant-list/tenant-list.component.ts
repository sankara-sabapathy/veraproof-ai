import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { ChipModule } from 'primeng/chip';
import { ProgressBarModule } from 'primeng/progressbar';
import { TooltipModule } from 'primeng/tooltip';
import { AdminService, TenantSummary } from '../services/admin.service';
import { AdminStateService } from '../services/admin-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { ColDef, ValueFormatterParams } from 'ag-grid-community';
import { ActionRendererComponent } from '../../../shared/components/data-table/renderers/action-renderer.component';
import { StatusRendererComponent } from '../../../shared/components/data-table/renderers/status-renderer.component';

interface DropdownOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-tenant-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    DropdownModule,
    ChipModule,
    ProgressBarModule,
    TooltipModule,
    LoadingSpinnerComponent,
    DataTableComponent
  ],
  providers: [DatePipe],
  templateUrl: './tenant-list.component.html',
  styleUrls: ['./tenant-list.component.scss']
})
export class TenantListComponent implements OnInit {
  tenants$ = this.adminState.tenants$;
  loading$ = this.adminState.loading$;
  pagination$ = this.adminState.pagination$;

  columns: ColDef[] = [];
  tenants: TenantSummary[] = [];
  loading = false;
  totalItems = 0;

  searchTerm = '';
  selectedTier = '';
  selectedStatus = '';

  tierOptions: DropdownOption[] = [
    { label: 'All', value: '' },
    { label: 'Sandbox', value: 'Sandbox' },
    { label: 'Starter', value: 'Starter' },
    { label: 'Professional', value: 'Professional' },
    { label: 'Enterprise', value: 'Enterprise' }
  ];

  statusOptions: DropdownOption[] = [
    { label: 'All', value: '' },
    { label: 'Active', value: 'active' },
    { label: 'Trial', value: 'trial' },
    { label: 'Suspended', value: 'suspended' }
  ];

  constructor(
    private adminService: AdminService,
    private adminState: AdminStateService,
    private notification: NotificationService,
    private router: Router,
    private datePipe: DatePipe
  ) {
    this.columns = [
      { field: 'email', headerName: 'Email' },
      {
        field: 'subscription_tier',
        headerName: 'Subscription',
        cellRenderer: (params: any) => {
          return `<div class="p-chip p-component"><span class="p-chip-text" style="font-size:12px; font-weight:600;">${params.value || ''}</span></div>`;
        }
      },
      {
        headerName: 'Usage',
        valueGetter: (params) => params.data,
        cellRenderer: (params: any) => {
          const tenant = params.value;
          if (!tenant) return '';
          const percentage = (tenant.current_usage / tenant.monthly_quota) * 100;
          let color = '#4caf50'; // success
          if (percentage >= 90) color = '#f44336'; // danger
          else if (percentage >= 80) color = '#ff9800'; // warning

          return `<div style="display:flex; flex-direction:column; justify-content:center; height:100%; gap:4px; font-size:12px;">
                    <div>${tenant.current_usage.toLocaleString()} / ${tenant.monthly_quota.toLocaleString()}</div>
                    <div style="background-color:#e2e8f0; height:6px; border-radius:3px; overflow:hidden; width:100%;">
                      <div style="background-color:${color}; height:100%; width:${Math.min(100, percentage)}%;"></div>
                    </div>
                  </div>`;
        }
      },
      {
        field: 'status',
        headerName: 'Status',
        cellRenderer: StatusRendererComponent
      },
      {
        field: 'created_at',
        headerName: 'Created',
        valueFormatter: (params: ValueFormatterParams) => this.datePipe.transform(params.value, 'short') || ''
      },
      {
        headerName: 'Actions',
        sortable: false,
        filter: false,
        width: 100,
        cellRenderer: ActionRendererComponent,
        cellRendererParams: {
          actions: [
            {
              icon: 'pi pi-eye',
              tooltip: 'View Details',
              actionCallback: (rowData: TenantSummary) => this.viewTenant(rowData)
            }
          ]
        }
      }
    ];
  }

  ngOnInit(): void {
    this.tenants$.subscribe(tenants => {
      this.tenants = tenants;
    });

    this.loading$.subscribe(loading => {
      this.loading = loading;
    });

    this.pagination$.subscribe(pagination => {
      this.totalItems = pagination.total;
    });

    this.loadTenants();
  }

  loadTenants(): void {
    this.adminState.setLoading(true);
    this.adminService.listTenants({
      limit: 25,
      offset: 0,
      search: this.searchTerm || undefined,
      subscription_tier: this.selectedTier || undefined,
      status: this.selectedStatus || undefined
    }).subscribe({
      next: (response) => {
        this.adminState.setTenants(response.tenants, response.total);
      },
      error: (error) => {
        this.adminState.setError(error.message);
        this.notification.error('Failed to load tenants');
      }
    });
  }

  onSearch(): void {
    this.loadTenants();
  }

  onFilterChange(): void {
    this.loadTenants();
  }

  viewTenant(tenant: TenantSummary): void {
    this.router.navigate(['/admin/tenants', tenant.tenant_id]);
  }

}
