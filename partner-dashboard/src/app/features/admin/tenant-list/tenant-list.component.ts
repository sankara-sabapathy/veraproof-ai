import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { DataTableComponent, TableColumn } from '../../../shared/components/data-table/data-table.component';

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
  templateUrl: './tenant-list.component.html',
  styleUrls: ['./tenant-list.component.scss']
})
export class TenantListComponent implements OnInit {
  @ViewChild('subscriptionTemplate', { static: true }) subscriptionTemplate!: TemplateRef<any>;
  @ViewChild('usageTemplate', { static: true }) usageTemplate!: TemplateRef<any>;
  @ViewChild('statusTemplate', { static: true }) statusTemplate!: TemplateRef<any>;
  @ViewChild('actionsTemplate', { static: true }) actionsTemplate!: TemplateRef<any>;

  tenants$ = this.adminState.tenants$;
  loading$ = this.adminState.loading$;
  pagination$ = this.adminState.pagination$;
  
  columns: TableColumn[] = [];
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
    private router: Router
  ) {}

  ngOnInit(): void {
    // Subscribe to state changes
    this.tenants$.subscribe(tenants => {
      this.tenants = tenants;
    });
    
    this.loading$.subscribe(loading => {
      this.loading = loading;
    });
    
    this.pagination$.subscribe(pagination => {
      this.totalItems = pagination.total;
    });
    
    // Initialize columns after view init to ensure templates are available
    setTimeout(() => {
      this.columns = [
        { key: 'email', label: 'Email', sortable: true },
        { key: 'subscription_tier', label: 'Subscription', sortable: true, template: this.subscriptionTemplate },
        { key: 'usage', label: 'Usage', sortable: false, template: this.usageTemplate },
        { key: 'status', label: 'Status', sortable: true, template: this.statusTemplate },
        { key: 'created_at', label: 'Created', sortable: true }
      ];
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

  getUsagePercentage(tenant: TenantSummary): number {
    return (tenant.current_usage / tenant.monthly_quota) * 100;
  }
  
  getUsageSeverity(percentage: number): string {
    if (percentage >= 90) return 'danger';
    if (percentage >= 80) return 'warning';
    return 'success';
  }
}
