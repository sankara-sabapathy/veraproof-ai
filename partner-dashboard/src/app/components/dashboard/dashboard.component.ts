import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

interface DashboardStats {
  total_verifications: number;
  pass_rate: number;
  average_trust_score: number;
  monthly_usage: number;
  monthly_quota: number;
  tier: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard">
      <header class="dashboard-header">
        <h1>Dashboard</h1>
        <button class="btn btn-secondary" (click)="logout()">Logout</button>
      </header>

      <nav class="dashboard-nav">
        <a routerLink="/dashboard" class="nav-link active">Overview</a>
        <a routerLink="/analytics" class="nav-link">Analytics</a>
        <a routerLink="/branding" class="nav-link">Branding</a>
        <a routerLink="/api-keys" class="nav-link">API Keys</a>
        <a routerLink="/billing" class="nav-link">Billing</a>
      </nav>

      <div *ngIf="loading" class="spinner"></div>

      <div *ngIf="!loading && stats" class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total Verifications</div>
          <div class="stat-value">{{ stats.total_verifications }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Pass Rate</div>
          <div class="stat-value">{{ stats.pass_rate }}%</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Avg Trust Score</div>
          <div class="stat-value">{{ stats.average_trust_score }}/100</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Monthly Usage</div>
          <div class="stat-value">{{ stats.monthly_usage }}/{{ stats.monthly_quota }}</div>
          <div class="stat-progress">
            <div class="progress-bar" [style.width.%]="(stats.monthly_usage / stats.monthly_quota) * 100"></div>
          </div>
        </div>
      </div>

      <div class="card">
        <h2>Quick Actions</h2>
        <div class="actions-grid">
          <button class="action-btn" (click)="createSession()">
            <span class="action-icon">➕</span>
            <span>Create Session</span>
          </button>
          <button class="action-btn" routerLink="/analytics">
            <span class="action-icon">📊</span>
            <span>View Analytics</span>
          </button>
          <button class="action-btn" routerLink="/api-keys">
            <span class="action-icon">🔑</span>
            <span>Manage API Keys</span>
          </button>
          <button class="action-btn" routerLink="/branding">
            <span class="action-icon">🎨</span>
            <span>Customize Branding</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }

    .dashboard-nav {
      display: flex;
      gap: 1rem;
      margin-bottom: 2rem;
      border-bottom: 2px solid var(--border-color);
    }

    .nav-link {
      padding: 1rem;
      text-decoration: none;
      color: var(--text-secondary);
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      transition: all 0.2s;
    }

    .nav-link:hover, .nav-link.active {
      color: var(--primary-color);
      border-bottom-color: var(--primary-color);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .stat-label {
      color: var(--text-secondary);
      font-size: 0.875rem;
      margin-bottom: 0.5rem;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .stat-progress {
      margin-top: 0.5rem;
      height: 8px;
      background: var(--border-color);
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-bar {
      height: 100%;
      background: var(--primary-color);
      transition: width 0.3s;
    }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }

    .action-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 1.5rem;
      background: var(--bg-color);
      border: 2px solid var(--border-color);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .action-btn:hover {
      border-color: var(--primary-color);
      background: white;
    }

    .action-icon {
      font-size: 2rem;
    }
  `]
})
export class DashboardComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  
  stats: DashboardStats | null = null;
  loading = true;

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.http.get<DashboardStats>(`${environment.apiUrl}/api/v1/analytics/stats`)
      .subscribe({
        next: (data) => {
          this.stats = data;
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load stats:', err);
          this.loading = false;
        }
      });
  }

  createSession(): void {
    this.router.navigate(['/analytics']);
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}
