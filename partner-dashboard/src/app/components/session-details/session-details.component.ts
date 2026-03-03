import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { environment } from '../../../environments/environment';
import { NotificationService } from '../../core/services/notification.service';

interface SessionDetail {
  session_id: string;
  created_at: string;
  state: string;
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
    ButtonModule,
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
  private notification = inject(NotificationService);

  session: SessionDetail | null = null;
  loading = true;
  timelineEvents: TimelineEvent[] = [];

  videoUrl: SafeUrl | null = null;
  videoLoading = false;
  videoError = false;

  showImuData = false;
  imuDataContent: string | null = null;
  imuDataLoading = false;

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
          } else if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
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
      const isSuccess = session.state === 'success' || session.state === 'complete' || (session.unified_score != null && session.unified_score >= 85);
      this.timelineEvents.push({
        status: `Verification ${isSuccess ? 'Passed' : 'Failed'}`,
        date: session.created_at,
        icon: isSuccess ? 'pi pi-check-circle' : 'pi pi-times-circle',
        color: isSuccess ? '#10b981' : '#ef4444'
      });
    }
  }

  // ── Score Helpers ──────────────────────────────────────
  getPhysicsScore(): number | null {
    if (!this.session) return null;
    return this.session.physics_score ?? this.session.tier_1_score ?? null;
  }

  getUnifiedScore(): number | null {
    if (!this.session) return null;
    return this.session.unified_score ?? this.session.final_trust_score ?? null;
  }

  getScoreColor(score: number | undefined | null): string {
    if (score === null || score === undefined) return '#94a3b8';
    if (score >= 85) return '#10b981';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  }

  getStatusBadgeClass(state: string): string {
    const map: Record<string, string> = {
      'complete': 'badge-success',
      'success': 'badge-success',
      'failed': 'badge-failed',
      'idle': 'badge-idle',
      'processing': 'badge-processing',
      'pending_ai': 'badge-processing'
    };
    return map[state] || 'badge-pending';
  }

  // ── Artifacts ──────────────────────────────────────────
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
        error: () => {
          this.videoError = true;
          this.videoLoading = false;
        }
      });
  }

  /**
   * Download an artifact as a file by fetching the signed URL, then the blob,
   * and triggering a browser download. This ensures the file downloads instead
   * of opening in a new tab.
   */
  downloadArtifactAsFile(type: string, filename: string): void {
    if (!this.session) return;

    const endpointMap: Record<string, string> = {
      'video': 'video',
      'imu': 'imu-data',
      'flow': 'optical-flow'
    };

    const endpoint = endpointMap[type];
    if (!endpoint) return;

    this.notification.success(`Preparing ${filename}…`);

    this.http.get<{ url: string }>(`${environment.apiUrl}/api/v1/sessions/${this.session.session_id}/${endpoint}`)
      .subscribe({
        next: (response) => {
          if (response.url) {
            // Fetch as blob and trigger download
            this.http.get(response.url, { responseType: 'blob' }).subscribe({
              next: (blob) => {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                this.notification.success(`${filename} downloaded`);
              },
              error: () => {
                // Fallback: open signed URL directly (works in prod)
                window.open(response.url, '_blank');
              }
            });
          }
        },
        error: () => {
          this.notification.error(`Failed to download ${type} artifact`);
        }
      });
  }

  /**
   * Toggle the IMU data inline viewer.
   * First time opens: fetch the JSON and display it.
   */
  toggleImuViewer(): void {
    if (this.showImuData) {
      this.showImuData = false;
      return;
    }

    if (this.imuDataContent) {
      this.showImuData = true;
      return;
    }

    if (!this.session) return;
    this.showImuData = true;
    this.imuDataLoading = true;

    this.http.get<{ url: string }>(`${environment.apiUrl}/api/v1/sessions/${this.session.session_id}/imu-data`)
      .subscribe({
        next: (response) => {
          if (response.url) {
            this.http.get(response.url, { responseType: 'text' }).subscribe({
              next: (text) => {
                try {
                  const parsed = JSON.parse(text);
                  this.imuDataContent = JSON.stringify(parsed, null, 2);
                } catch {
                  this.imuDataContent = text;
                }
                this.imuDataLoading = false;
              },
              error: () => {
                this.imuDataContent = 'Failed to load IMU data content.';
                this.imuDataLoading = false;
              }
            });
          }
        },
        error: () => {
          this.notification.error('Failed to load IMU data');
          this.imuDataLoading = false;
          this.showImuData = false;
        }
      });
  }

  /**
   * Copy text to clipboard with toast feedback.
   */
  copyToClipboard(text: string, label: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.notification.success(`${label} copied to clipboard`);
    }).catch(() => {
      this.notification.error('Failed to copy to clipboard');
    });
  }

  goBack(): void {
    this.router.navigate(['/sessions']);
  }
}
