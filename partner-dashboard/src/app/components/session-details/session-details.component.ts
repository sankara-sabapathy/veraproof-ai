import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
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
export class SessionDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);

  session: SessionDetail | null = null;
  loading = true;
  timelineEvents: TimelineEvent[] = [];

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
          this.buildTimeline(data);
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
      },
      {
        status: 'Tier 1: Sensor Fusion Analysis',
        date: session.created_at,
        icon: 'pi pi-chart-line',
        color: session.tier_1_score >= 85 ? '#10b981' : '#f59e0b'
      }
    ];

    if (session.tier_2_score) {
      this.timelineEvents.push({
        status: 'Tier 2: AI Forensics',
        date: session.created_at,
        icon: 'pi pi-eye',
        color: session.tier_2_score >= 85 ? '#10b981' : '#f59e0b'
      });
    }

    this.timelineEvents.push({
      status: `Verification ${session.status === 'success' ? 'Passed' : 'Failed'}`,
      date: session.created_at,
      icon: session.status === 'success' ? 'pi pi-check-circle' : 'pi pi-times-circle',
      color: session.status === 'success' ? '#10b981' : '#ef4444'
    });
  }

  getStatusClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      'success': 'status-chip status-success',
      'failed': 'status-chip status-failed',
      'pending': 'status-chip status-pending',
      'processing': 'status-chip status-processing'
    };
    return statusMap[status] || 'status-chip';
  }

  getScoreColor(score: number): string {
    if (score >= 85) return '#10b981'; // green
    if (score >= 50) return '#f59e0b'; // orange
    return '#ef4444'; // red
  }

  hasArtifacts(): boolean {
    return !!(
      this.session?.artifacts.video_url ||
      this.session?.artifacts.imu_data_url ||
      this.session?.artifacts.optical_flow_url
    );
  }

  downloadArtifact(url: string, type: string): void {
    window.open(url, '_blank');
  }

  goBack(): void {
    this.router.navigate(['/sessions']);
  }
}
