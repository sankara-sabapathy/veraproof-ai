import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

interface Session {
  session_id: string;
  created_at: string;
  status: string;
  final_trust_score: number;
  tier_1_score: number;
  tier_2_score?: number;
}

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container">
      <h1>Analytics</h1>

      <div class="filters card">
        <div class="filter-group">
          <label>Date Range</label>
          <input type="date" [(ngModel)]="startDate" class="form-input">
          <span>to</span>
          <input type="date" [(ngModel)]="endDate" class="form-input">
        </div>

        <div class="filter-group">
          <label>Status</label>
          <select [(ngModel)]="statusFilter" class="form-input">
            <option value="">All</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="timeout">Timeout</option>
          </select>
        </div>

        <button class="btn btn-primary" (click)="applyFilters()">Apply Filters</button>
        <button class="btn btn-secondary" (click)="exportData()">Export CSV</button>
      </div>

      <div *ngIf="loading" class="spinner"></div>

      <div *ngIf="!loading" class="card">
        <h2>Recent Sessions</h2>
        <table class="table">
          <thead>
            <tr>
              <th>Session ID</th>
              <th>Date</th>
              <th>Status</th>
              <th>Trust Score</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let session of sessions">
              <td>{{ session.session_id.substring(0, 8) }}...</td>
              <td>{{ session.created_at | date:'short' }}</td>
              <td>
                <span class="badge" [ngClass]="{
                  'badge-success': session.status === 'success',
                  'badge-error': session.status === 'failed',
                  'badge-warning': session.status === 'timeout'
                }">
                  {{ session.status }}
                </span>
              </td>
              <td>{{ session.final_trust_score }}/100</td>
              <td>
                <button class="btn-link" (click)="viewDetails(session.session_id)">View</button>
              </td>
            </tr>
          </tbody>
        </table>

        <div *ngIf="sessions.length === 0" class="empty-state">
          No sessions found
        </div>
      </div>
    </div>
  `,
  styles: [`
    .filters {
      display: flex;
      gap: 1rem;
      align-items: flex-end;
      flex-wrap: wrap;
    }

    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .filter-group input,
    .filter-group select {
      min-width: 150px;
    }

    .btn-link {
      background: none;
      border: none;
      color: var(--primary-color);
      cursor: pointer;
      text-decoration: underline;
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
      color: var(--text-secondary);
    }
  `]
})
export class AnalyticsComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);

  sessions: Session[] = [];
  loading = true;
  startDate = '';
  endDate = '';
  statusFilter = '';

  ngOnInit(): void {
    this.loadSessions();
  }

  loadSessions(): void {
    let url = `${environment.apiUrl}/api/v1/analytics/sessions`;
    const params: string[] = [];

    if (this.startDate) params.push(`start_date=${this.startDate}`);
    if (this.endDate) params.push(`end_date=${this.endDate}`);
    if (this.statusFilter) params.push(`status=${this.statusFilter}`);

    if (params.length > 0) {
      url += '?' + params.join('&');
    }

    this.http.get<Session[]>(url).subscribe({
      next: (data) => {
        this.sessions = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load sessions:', err);
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    this.loading = true;
    this.loadSessions();
  }

  exportData(): void {
    const csv = this.convertToCSV(this.sessions);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sessions_${new Date().toISOString()}.csv`;
    a.click();
  }

  convertToCSV(data: Session[]): string {
    const headers = ['Session ID', 'Date', 'Status', 'Trust Score', 'Tier 1', 'Tier 2'];
    const rows = data.map(s => [
      s.session_id,
      s.created_at,
      s.status,
      s.final_trust_score,
      s.tier_1_score,
      s.tier_2_score || 'N/A'
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  viewDetails(sessionId: string): void {
    this.router.navigate(['/sessions', sessionId]);
  }
}
