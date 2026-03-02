import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { CardModule } from 'primeng/card';
import { ChipModule } from 'primeng/chip';
import { ButtonModule } from 'primeng/button';
import { TabViewModule } from 'primeng/tabview';
import { TimelineModule } from 'primeng/timeline';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { environment } from '../../../environments/environment';

interface SessionDetail {
  session_id: string;
  created_at: string;
  state: string; // backend uses 'state', not 'status'
  tier_1_score?: number;
  tier_2_score?: number;
  final_trust_score?: number;
  correlation_value?: number;
  ai_score?: number;
  physics_score?: number;
  unified_score?: number;
  ai_explanation?: any;
  reasoning?: string;
  metadata: any;
  video_s3_key?: string;
  imu_data_s3_key?: string;
  optical_flow_s3_key?: string;
}

interface TimelineEvent {
  status: string;
  date: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-session-details',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ChipModule,
    ButtonModule,
    TabViewModule,
    TimelineModule,
    ProgressSpinnerModule
  ],
  templateUrl: './session-details.component.html',
  styleUrls: ['./session-details.component.scss']
})
export class SessionDetailsComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private sanitizer = inject(DomSanitizer);

  session: SessionDetail | null = null;
  loading = true;
  timelineEvents: TimelineEvent[] = [];

  videoUrl: SafeUrl | null = null;
  videoLoading = false;
  videoError = false;

  private pollingInterval: any;

  ngOnInit(): void {
    const sessionId = this.route.snapshot.paramMap.get('id');
    if (sessionId) {
      this.loadSession(sessionId);
    }
  }

  ngOnDestroy(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
  }

  loadSession(sessionId: string): void {
    this.http.get<SessionDetail>(`${environment.apiUrl}/api/v1/sessions/${sessionId}`)
      .subscribe({
        next: (data) => {
          this.session = data;
          this.buildTimeline(data);

          if (data.state === 'pending_ai') {
            if (!this.pollingInterval) {
              this.pollingInterval = setInterval(() => {
                this.loadSession(sessionId);
              }, 3000);
            }
          } else {
            if (this.pollingInterval) {
              clearInterval(this.pollingInterval);
              this.pollingInterval = null;
            }
          }

          if (data.video_s3_key) {
            this.loadVideoArtifact();
          }

          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load session:', err);
          this.loading = false;
        }
      });
  }

  buildTimeline(session: SessionDetail): void {
    this.timelineEvents = [
      {
        status: 'Session Created',
        date: session.created_at,
        icon: 'pi pi-plus-circle',
        color: '#3b82f6'
      }
    ];

    if (session.tier_1_score !== null && session.tier_1_score !== undefined) {
      this.timelineEvents.push({
        status: 'Tier 1: Sensor Fusion Analysis',
        date: session.created_at,
        icon: 'pi pi-chart-line',
        color: session.tier_1_score >= 85 ? '#10b981' : '#f59e0b'
      });
    }

    if (session.ai_score !== null && session.ai_score !== undefined) {
      this.timelineEvents.push({
        status: 'Tier 2: AI Forensics',
        date: session.created_at,
        icon: 'pi pi-eye',
        color: session.ai_score >= 85 ? '#10b981' : '#f59e0b'
      });
    }

    if (session.state === 'complete' || session.state === 'success' || session.state === 'failed') {
      const isSuccess = session.state === 'success' || session.state === 'complete' || (session.unified_score && session.unified_score >= 85);
      this.timelineEvents.push({
        status: `Verification ${isSuccess ? 'Passed' : 'Failed'}`,
        date: session.created_at,
        icon: isSuccess ? 'pi pi-check-circle' : 'pi pi-times-circle',
        color: isSuccess ? '#10b981' : '#ef4444'
      });
    }
  }

  getStatusClass(state: string): string {
    const statusMap: { [key: string]: string } = {
      'complete': 'status-chip status-success',
      'success': 'status-chip status-success',
      'failed': 'status-chip status-failed',
      'idle': 'status-chip status-pending',
      'processing': 'status-chip status-processing',
      'pending_ai': 'status-chip status-processing'
    };
    return statusMap[state] || 'status-chip';
  }

  getScoreColor(score: number | undefined | null): string {
    if (score === null || score === undefined) return '#94a3b8'; // gray for pending
    if (score >= 85) return '#10b981'; // green
    if (score >= 50) return '#f59e0b'; // orange
    return '#ef4444'; // red
  }

  hasArtifacts(): boolean {
    return !!(
      this.session?.video_s3_key ||
      this.session?.imu_data_s3_key ||
      this.session?.optical_flow_s3_key
    );
  }

  loadVideoArtifact(): void {
    if (!this.session?.session_id) return;
    this.videoLoading = true;

    this.http.get<{ url: string }>(`${environment.apiUrl}/api/v1/sessions/${this.session.session_id}/video`)
      .subscribe({
        next: (response) => {
          if (response.url) {
            this.videoUrl = this.sanitizer.bypassSecurityTrustUrl(response.url);
          }
          this.videoLoading = false;
        },
        error: (err) => {
          console.error('Failed to load video artifact URL:', err);
          this.videoError = true;
          this.videoLoading = false;
        }
      });
  }

  downloadArtifact(type: string): void {
    if (!this.session) return;

    // Map artifact type to endpoint path
    const endpointMap: { [key: string]: string } = {
      'video': 'video',
      'imu': 'imu-data',
      'flow': 'optical-flow'
    };

    const endpoint = endpointMap[type];
    if (!endpoint) return;

    this.http.get<{ url: string }>(`${environment.apiUrl}/api/v1/sessions/${this.session.session_id}/${endpoint}`)
      .subscribe({
        next: (response) => {
          if (response.url) {
            window.open(response.url, '_blank');
          }
        },
        error: (err) => {
          console.error(`Failed to get signed URL for ${type}:`, err);
          alert(`Failed to download ${type} artifact. Check console for details.`);
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/sessions']);
  }
}
