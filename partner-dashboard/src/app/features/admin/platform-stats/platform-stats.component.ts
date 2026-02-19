import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { AdminService } from '../services/admin.service';
import { AdminStateService } from '../services/admin-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-platform-stats',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    StatCardComponent,
    LoadingSpinnerComponent
  ],
  templateUrl: './platform-stats.component.html',
  styleUrls: ['./platform-stats.component.scss']
})
export class PlatformStatsComponent implements OnInit {
  stats$ = this.adminState.platformStats$;
  health$ = this.adminState.systemHealth$;
  loading$ = this.adminState.loading$;

  constructor(
    private adminService: AdminService,
    private adminState: AdminStateService,
    private notification: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadHealth();
  }

  loadStats(): void {
    this.adminState.setLoading(true);
    this.adminService.getPlatformStats().subscribe({
      next: (stats) => {
        this.adminState.setPlatformStats(stats);
      },
      error: (error) => {
        this.adminState.setError(error.message);
        this.notification.error('Failed to load platform statistics');
      }
    });
  }

  loadHealth(): void {
    this.adminService.getSystemHealth().subscribe({
      next: (health) => {
        this.adminState.setSystemHealth(health);
      },
      error: (error) => {
        this.notification.error('Failed to load system health');
      }
    });
  }

  getHealthColor(status: string): string {
    switch (status) {
      case 'healthy': return 'primary';
      case 'degraded': return 'accent';
      case 'down': return 'warn';
      default: return '';
    }
  }
}
