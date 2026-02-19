import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { AdminService } from '../services/admin.service';
import { AdminStateService } from '../services/admin-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-tenant-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatChipsModule,
    MatProgressBarModule,
    MatIconModule,
    StatCardComponent,
    LoadingSpinnerComponent
  ],
  templateUrl: './tenant-detail.component.html',
  styleUrls: ['./tenant-detail.component.scss']
})
export class TenantDetailComponent implements OnInit {
  tenant$ = this.adminState.selectedTenant$;
  loading$ = this.adminState.loading$;
  tenantId: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private adminService: AdminService,
    private adminState: AdminStateService,
    private notification: NotificationService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.tenantId = params['id'];
      this.loadTenantDetail();
    });
  }

  loadTenantDetail(): void {
    this.adminState.setLoading(true);
    this.adminService.getTenantDetail(this.tenantId).subscribe({
      next: (tenant) => {
        this.adminState.setSelectedTenant(tenant);
      },
      error: (error) => {
        this.adminState.setError(error.message);
        this.notification.error('Failed to load tenant details');
      }
    });
  }

  viewSessions(): void {
    this.router.navigate(['/admin/tenants', this.tenantId, 'sessions']);
  }

  back(): void {
    this.router.navigate(['/admin/tenants']);
  }

  getUsagePercentage(current: number, quota: number): number {
    return (current / quota) * 100;
  }
}
