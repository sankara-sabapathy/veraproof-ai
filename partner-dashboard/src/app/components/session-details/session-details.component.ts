import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface SessionDetail {
  session_id: string;
  created_at: string;
  status: string;
  tier_1_score: number;
  tier_2_score?: number;
  final_trust_score: number;
  correlation_value: number;
  metadata: any;
  artifacts: {
    video_url?: string;
    imu_data_url?: string;
    optical_flow_url?: string;
  };
}

@Component({
  selector: 'app-session-details',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container">
      <h1>Session Details</h1>

      <div *ngIf="loading" class="spinner"></div>

      <div *ngIf="!loading && session" class="details-grid">
        <div class="card">
          <h2>Overview</h2>
          <div class="detail-row">
            <span class="label">Session ID:</span>
            <span>{{ session.session_id }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Created:</span>
            <span>{{ session.created_at | date:'medium' }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Status:</span>
            <span class="badge" [ngClass]="{
              'badge-success': session.status === 'success',
              'badge-error': session.status === 'failed'
            }">
              {{ session.status }}
            </span>
          </div>
        </div>

        <div class="card">
          <h2>Scores</h2>
          <div class="score-item">
            <span class="label">Tier 1 (Sensor Fusion):</span>
            <span class="score">{{ session.tier_1_score }}/100</span>
          </div>
          <div class="score-item" *ngIf="session.tier_2_score">
            <span class="label">Tier 2 (AI Forensics):</span>
            <span class="score">{{ session.tier_2_score }}/100</span>
          </div>
          <div class="score-item final">
            <span class="label">Final Trust Score:</span>
            <span class="score">{{ session.final_trust_score }}/100</span>
          </div>
          <div class="score-item">
            <span class="label">Pearson Correlation:</span>
            <span class="score">{{ session.correlation_value.toFixed(3) }}</span>
          </div>
        </div>

        <div class="card full-width">
          <h2>Artifacts</h2>
          <div class="artifacts-grid">
            <button *ngIf="session.artifacts.video_url" 
                    class="btn btn-secondary" 
                    (click)="downloadArtifact(session.artifacts.video_url, 'video')">
              Download Video
            </button>
            <button *ngIf="session.artifacts.imu_data_url" 
                    class="btn btn-secondary" 
                    (click)="downloadArtifact(session.artifacts.imu_data_url, 'imu')">
              Download IMU Data
            </button>
            <button *ngIf="session.artifacts.optical_flow_url" 
                    class="btn btn-secondary" 
                    (click)="downloadArtifact(session.artifacts.optical_flow_url, 'flow')">
              Download Optical Flow
            </button>
          </div>
          <div *ngIf="!session.artifacts.video_url" class="empty-state">
            No artifacts available (sandbox mode)
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .details-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
    }

    .full-width {
      grid-column: 1 / -1;
    }

    .detail-row, .score-item {
      display: flex;
      justify-content: space-between;
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--border-color);
    }

    .detail-row:last-child, .score-item:last-child {
      border-bottom: none;
    }

    .label {
      font-weight: 500;
      color: var(--text-secondary);
    }

    .score {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--primary-color);
    }

    .score-item.final {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 2px solid var(--border-color);
    }

    .score-item.final .score {
      font-size: 1.5rem;
    }

    .artifacts-grid {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .empty-state {
      text-align: center;
      padding: 2rem;
      color: var(--text-secondary);
    }
  `]
})
export class SessionDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);

  session: SessionDetail | null = null;
  loading = true;

  ngOnInit(): void {
    const sessionId = this.route.snapshot.paramMap.get('id');
    if (sessionId) {
      this.loadSession(sessionId);
    }
  }

  loadSession(sessionId: string): void {
    this.http.get<SessionDetail>(`${environment.apiUrl}/api/v1/sessions/${sessionId}`)
      .subscribe({
        next: (data) => {
          this.session = data;
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load session:', err);
          this.loading = false;
        }
      });
  }

  downloadArtifact(url: string, type: string): void {
    window.open(url, '_blank');
  }
}
