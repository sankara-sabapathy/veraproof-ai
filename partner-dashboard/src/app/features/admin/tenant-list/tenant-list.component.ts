import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { AdminService, TenantSummary } from '../services/admin.service';
import { AdminStateService } from '../services/admin-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-tenant-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatChipsModule,
    MatProgressBarModule,
    MatIconModule,
    LoadingSpinnerComponent
  ],
  templateUrl: './tenant-list.component.html',
  styleUrls: ['./tenant-list.component.scss']
})
export class TenantListComponent implements OnInit {
  tenants$ = this.adminState.tenants$;
  loading$ = this.adminState.loading$;
  pagination$ = this.adminState.pagination$;
  displayedColumns = ['email', 'subscription_tier', 'usage', 'status', 'created_at', 'actions'];
  searchTerm = '';
  selectedTier = '';
  selectedStatus = '';

  constructor(
    private adminService: AdminService,
    private adminState: AdminStateService,
    private notification: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
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

  getStatusColor(status: string): string {
    switch (status) {
      case 'active': return 'primary';
      case 'trial': return 'accent';
      case 'suspended': return 'warn';
      default: return '';
    }
  }

  getUsagePercentage(tenant: TenantSummary): number {
    return (tenant.current_usage / tenant.monthly_quota) * 100;
  }
}
