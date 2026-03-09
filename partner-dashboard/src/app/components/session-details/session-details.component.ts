import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import {
  Session,
  SessionArtifactDownload,
  SessionArtifactRecord
} from '../../core/models/interfaces';
import { NotificationService } from '../../core/services/notification.service';
import { SessionsService } from '../../features/sessions/services/sessions.service';

interface SessionDetail extends Session {
  ai_score?: number | null;
  physics_score?: number | null;
  unified_score?: number | null;
  ai_explanation?: Record<string, any> | null;
  verification_status?: string | null;
}

interface TimelineEvent {
  status: string;
  date: string;
  icon: string;
  color: string;
}

type ArtifactCardKey =
  | 'report'
  | 'bundle'
  | 'original_video'
  | 'imu_telemetry'
  | 'rekognition_raw'
  | 'optical_flow';

interface ArtifactCard {
  key: ArtifactCardKey;
  label: string;
  description: string;
  status: 'ready' | 'generate' | 'waiting' | 'legacy';
  available: boolean;
  artifact?: SessionArtifactRecord | null;
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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly notification = inject(NotificationService);
  private readonly sessionsService = inject(SessionsService);

  session: SessionDetail | null = null;
  loading = true;
  evidenceLoading = false;
  timelineEvents: TimelineEvent[] = [];
  artifacts: SessionArtifactRecord[] = [];
  evidenceCards: ArtifactCard[] = [];
  reportCard: ArtifactCard | null = null;
  bundleCard: ArtifactCard | null = null;

  videoUrl: string | null = null;
  videoLoading = false;
  videoError = false;
  private videoObjectUrl: string | null = null;

  previewTitle: string | null = null;
  previewContent: string | null = null;
  previewLoading = false;

  private readonly previewCache = new Map<string, string>();
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private readonly busyActions = new Set<ArtifactCardKey>();

  ngOnInit(): void {
    const sessionId = this.route.snapshot.paramMap.get('id');
    if (sessionId) {
      this.loadSession(sessionId);
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
    this.revokeVideoObjectUrl();
  }

  loadSession(sessionId: string): void {
    this.sessionsService.getSession(sessionId).subscribe({
      next: (data) => {
        this.session = data as SessionDetail;
        this.buildTimeline(this.session);
        this.configurePolling(sessionId, this.session);
        this.syncEvidenceCards();
        if (this.hasVideoEvidence() && !this.videoUrl && !this.videoLoading) {
          this.loadVideoArtifact();
        }
        this.loading = false;
        this.loadArtifacts(sessionId);
      },
      error: () => {
        this.loading = false;
        this.notification.error('Failed to load session details.');
      }
    });
  }

  loadArtifacts(sessionId: string): void {
    this.evidenceLoading = true;
    this.sessionsService.getSessionArtifacts(sessionId).subscribe({
      next: (artifacts) => {
        this.artifacts = artifacts;
        this.syncEvidenceCards();
        this.evidenceLoading = false;
        if (this.hasVideoEvidence() && !this.videoUrl && !this.videoLoading) {
          this.loadVideoArtifact();
        }
      },
      error: () => {
        this.evidenceLoading = false;
        this.syncEvidenceCards();
        if (this.hasVideoEvidence() && !this.videoUrl && !this.videoLoading) {
          this.loadVideoArtifact();
        }
      }
    });
  }

  buildTimeline(session: SessionDetail): void {
    this.timelineEvents = [
      {
        status: 'Session created',
        date: session.created_at,
        icon: 'pi pi-plus-circle',
        color: '#3b82f6'
      }
    ];

    if (session.tier_1_score !== null && session.tier_1_score !== undefined) {
      this.timelineEvents.push({
        status: 'Tier 1 physics correlation scored',
        date: session.created_at,
        icon: 'pi pi-compass',
        color: session.tier_1_score >= 85 ? '#10b981' : '#f59e0b'
      });
    }

    if (session.tier_2_score !== null && session.tier_2_score !== undefined) {
      this.timelineEvents.push({
        status: 'Tier 2 Rekognition context extracted',
        date: session.created_at,
        icon: 'pi pi-eye',
        color: session.tier_2_score >= 85 ? '#10b981' : '#f59e0b'
      });
    }

    if (session.unified_score !== null && session.unified_score !== undefined) {
      this.timelineEvents.push({
        status: 'Tier 3 forensic synthesis completed',
        date: session.created_at,
        icon: 'pi pi-sparkles',
        color: session.unified_score >= 85 ? '#10b981' : '#f59e0b'
      });
    }

    if (this.hasForensicResult()) {
      this.timelineEvents.push({
        status: this.isTrustedOutcome() ? 'Verification passed' : 'Verification failed',
        date: session.created_at,
        icon: this.isTrustedOutcome() ? 'pi pi-check-circle' : 'pi pi-times-circle',
        color: this.isTrustedOutcome() ? '#10b981' : '#ef4444'
      });
    }
  }

  getPhysicsScore(): number | null {
    if (!this.session) return null;
    return this.session.tier_1_score ?? this.session.physics_score ?? null;
  }

  getVisionScore(): number | null {
    if (!this.session) return null;
    return this.session.tier_2_score ?? null;
  }

  getUnifiedScore(): number | null {
    if (!this.session) return null;
    if (this.session.unified_score != null) {
      return Math.round(this.session.unified_score);
    }
    if (this.session.ai_score != null) {
      return Math.round(this.session.ai_score * 100);
    }
    return this.session.final_trust_score ?? null;
  }

  getScoreColor(score: number | undefined | null): string {
    if (score === null || score === undefined) return '#94a3b8';
    if (score >= 85) return '#10b981';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  }

  getStatusBadgeClass(state: string | null | undefined): string {
    const normalized = (state || '').toLowerCase();
    const map: Record<string, string> = {
      complete: 'badge-success',
      success: 'badge-success',
      failed: 'badge-failed',
      idle: 'badge-idle',
      processing: 'badge-processing',
      pending_ai: 'badge-processing',
      analyzing: 'badge-processing'
    };
    return map[normalized] || 'badge-pending';
  }

  getDisplayState(): string {
    if (!this.session) {
      return 'unknown';
    }
    return (this.session.verification_status || this.session.state || 'unknown').replace(/_/g, ' ');
  }

  hasVideoEvidence(): boolean {
    return !!(this.getArtifactByType('original_video') || this.session?.video_s3_key);
  }

  hasEvidenceArtifacts(): boolean {
    return this.evidenceCards.length > 0;
  }

  isActionBusy(key: ArtifactCardKey): boolean {
    return this.busyActions.has(key);
  }

  isPreviewOpen(key: ArtifactCardKey): boolean {
    return this.previewTitle !== null && this.previewTitle.toLowerCase().includes(this.previewLabelSeed(key));
  }

  loadVideoArtifact(): void {
    if (!this.session?.session_id) {
      return;
    }

    const registeredVideo = this.getArtifactByType('original_video');
    this.videoLoading = true;
    this.videoError = false;

    const request = registeredVideo
      ? this.sessionsService.getSessionArtifact(this.session.session_id, registeredVideo.artifact_id)
      : this.sessionsService.getVideoUrl(this.session.session_id);

    request.subscribe({
      next: (response: SessionArtifactDownload | { url: string }) => {
        this.http.get(response.url, { responseType: 'blob' }).subscribe({
          next: (blob) => {
            this.revokeVideoObjectUrl();
            this.videoObjectUrl = window.URL.createObjectURL(blob);
            this.videoUrl = this.videoObjectUrl;
            this.videoLoading = false;
          },
          error: () => {
            this.videoError = true;
            this.videoLoading = false;
          }
        });
      },
      error: () => {
        this.videoError = true;
        this.videoLoading = false;
      }
    });
  }

  handleCardDownload(card: ArtifactCard): void {
    if (!this.session?.session_id) {
      return;
    }

    switch (card.key) {
      case 'report':
        if (!this.canGenerateEvidencePackage()) {
          this.notification.warning('The verification report is available after AI forensics completes.');
          return;
        }
        this.downloadGeneratedArtifact('report');
        return;
      case 'bundle':
        if (!this.canGenerateEvidencePackage()) {
          this.notification.warning('The full evidence bundle is available after AI forensics completes.');
          return;
        }
        this.downloadGeneratedArtifact('bundle');
        return;
      case 'original_video':
        this.downloadArtifactFallbackAware(card, 'verification-recording.webm');
        return;
      case 'imu_telemetry':
        this.downloadArtifactFallbackAware(card, 'imu-telemetry.json');
        return;
      case 'rekognition_raw':
        this.downloadArtifactFallbackAware(card, 'rekognition-raw.json');
        return;
      case 'optical_flow':
        this.downloadArtifactFallbackAware(card, 'optical-flow.json');
        return;
      default:
        return;
    }
  }

  togglePreview(card: ArtifactCard): void {
    if (!this.session?.session_id) {
      return;
    }

    if (!['imu_telemetry', 'rekognition_raw', 'optical_flow'].includes(card.key)) {
      return;
    }

    const cacheKey = card.key;
    if (this.previewTitle && this.previewLabelSeed(card.key) === this.previewTitle.toLowerCase()) {
      this.previewTitle = null;
      this.previewContent = null;
      return;
    }

    if (this.previewCache.has(cacheKey)) {
      this.previewTitle = this.previewHeading(card.key);
      this.previewContent = this.previewCache.get(cacheKey) || null;
      return;
    }

    this.previewLoading = true;
    this.previewTitle = this.previewHeading(card.key);
    this.previewContent = null;

    const request = this.resolveArtifactRequest(card);
    if (!request) {
      this.previewLoading = false;
      this.notification.warning('This artifact is not available yet.');
      return;
    }

    request.subscribe({
      next: (response) => {
        this.http.get(response.url, { responseType: 'text' }).subscribe({
          next: (text) => {
            const normalized = this.prettyPrintJson(text);
            this.previewCache.set(cacheKey, normalized);
            this.previewContent = normalized;
            this.previewLoading = false;
          },
          error: () => {
            this.previewContent = 'Failed to load artifact preview.';
            this.previewLoading = false;
          }
        });
      },
      error: () => {
        this.previewLoading = false;
        this.notification.error('Failed to load artifact preview.');
      }
    });
  }

  copyToClipboard(text: string, label: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.notification.success(`${label} copied to clipboard`);
    }).catch(() => {
      this.notification.error('Failed to copy to clipboard');
    });
  }

  formatBytes(bytes: number | null | undefined): string {
    if (!bytes) {
      return 'Unknown size';
    }

    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }

    const precision = value >= 10 || unitIndex === 0 ? 0 : 1;
    return `${value.toFixed(precision)} ${units[unitIndex]}`;
  }

  artifactStatusLabel(card: ArtifactCard): string {
    switch (card.status) {
      case 'ready':
        return 'Ready';
      case 'generate':
        return 'Generate on demand';
      case 'waiting':
        return 'Awaiting AI evidence';
      default:
        return 'Legacy path';
    }
  }

  canPreview(card: ArtifactCard): boolean {
    return ['imu_telemetry', 'rekognition_raw', 'optical_flow'].includes(card.key) && card.available;
  }

  canDownload(card: ArtifactCard | null): boolean {
    if (!card) {
      return false;
    }
    if (card.key === 'report' || card.key === 'bundle') {
      return card.status === 'ready' || card.status === 'generate';
    }
    return card.available;
  }

  goBack(): void {
    this.router.navigate(['/sessions']);
  }

  private hasForensicResult(): boolean {
    return !!(this.session && (this.session.tier_2_score != null || this.session.unified_score != null || this.session.ai_explanation));
  }

  private isTrustedOutcome(): boolean {
    const score = this.getUnifiedScore();
    return score != null && score >= 85;
  }

  private canGenerateEvidencePackage(): boolean {
    return !!(this.session && (this.session.tier_2_score != null || this.session.unified_score != null || this.session.ai_explanation));
  }

  private configurePolling(sessionId: string, session: SessionDetail): void {
    const state = (session.state || '').toLowerCase();
    const shouldPoll = !this.canGenerateEvidencePackage() && ['pending_ai', 'analyzing', 'processing'].includes(state);

    if (shouldPoll && !this.pollingInterval) {
      this.pollingInterval = setInterval(() => {
        this.loadSession(sessionId);
      }, 3000);
      return;
    }

    if (!shouldPoll) {
      this.stopPolling();
    }
  }

  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  private syncEvidenceCards(): void {
    this.evidenceCards = this.buildEvidenceCards();
    this.reportCard = this.evidenceCards.find(card => card.key === 'report') || null;
    this.bundleCard = this.evidenceCards.find(card => card.key === 'bundle') || null;
  }

  private buildEvidenceCards(): ArtifactCard[] {
    const reportArtifact = this.getArtifactByType('verification_report_pdf');
    const bundleArtifact = this.getArtifactByType('artifact_bundle_zip');
    const videoArtifact = this.getArtifactByType('original_video');
    const imuArtifact = this.getArtifactByType('imu_telemetry');
    const rekognitionArtifact = this.getArtifactByType('rekognition_raw');
    const opticalFlowArtifact = this.getArtifactByType('optical_flow');
    const canGeneratePackage = this.canGenerateEvidencePackage();

    return [
      {
        key: 'report',
        label: 'Verification report',
        description: 'PDF summary of the verification outcome, evidence inventory, and forensic reasoning.',
        status: reportArtifact ? 'ready' : canGeneratePackage ? 'generate' : 'waiting',
        available: !!reportArtifact || canGeneratePackage,
        artifact: reportArtifact
      },
      {
        key: 'bundle',
        label: 'All artifacts bundle',
        description: 'ZIP package containing the report, original video, IMU telemetry, and raw Rekognition output.',
        status: bundleArtifact ? 'ready' : canGeneratePackage ? 'generate' : 'waiting',
        available: !!bundleArtifact || canGeneratePackage,
        artifact: bundleArtifact
      },
      {
        key: 'original_video',
        label: 'Original video',
        description: 'Recorded WebM source from the live verification session.',
        status: videoArtifact ? 'ready' : this.session?.video_s3_key ? 'legacy' : 'waiting',
        available: !!videoArtifact || !!this.session?.video_s3_key,
        artifact: videoArtifact
      },
      {
        key: 'imu_telemetry',
        label: 'IMU telemetry',
        description: 'Accelerometer and gyroscope batches captured during the playbook.',
        status: imuArtifact ? 'ready' : this.session?.imu_data_s3_key ? 'legacy' : 'waiting',
        available: !!imuArtifact || !!this.session?.imu_data_s3_key,
        artifact: imuArtifact
      },
      {
        key: 'rekognition_raw',
        label: 'Rekognition raw result',
        description: 'Stored Tier 2 provider payload with frame-level label and face analysis.',
        status: rekognitionArtifact ? 'ready' : 'waiting',
        available: !!rekognitionArtifact,
        artifact: rekognitionArtifact
      },
      {
        key: 'optical_flow',
        label: 'Optical flow trace',
        description: 'Legacy optical-flow artifact path retained for debugging and audits.',
        status: opticalFlowArtifact ? 'ready' : this.session?.optical_flow_s3_key ? 'legacy' : 'waiting',
        available: !!opticalFlowArtifact || !!this.session?.optical_flow_s3_key,
        artifact: opticalFlowArtifact
      }
    ];
  }

  private getArtifactByType(artifactType: string): SessionArtifactRecord | null {
    return this.artifacts.find(artifact => artifact.artifact_type === artifactType) || null;
  }

  private resolveArtifactRequest(card: ArtifactCard) {
    if (!this.session?.session_id) {
      return null;
    }

    if (card.artifact?.artifact_id) {
      return this.sessionsService.getSessionArtifact(this.session.session_id, card.artifact.artifact_id);
    }

    switch (card.key) {
      case 'original_video':
        return this.sessionsService.getVideoUrl(this.session.session_id);
      case 'imu_telemetry':
        return this.sessionsService.getImuDataUrl(this.session.session_id);
      case 'optical_flow':
        return this.sessionsService.getOpticalFlowUrl(this.session.session_id);
      default:
        return null;
    }
  }

  private downloadGeneratedArtifact(kind: 'report' | 'bundle'): void {
    if (!this.session?.session_id) {
      return;
    }

    this.busyActions.add(kind);
    const request = kind === 'report'
      ? this.sessionsService.getSessionReport(this.session.session_id)
      : this.sessionsService.getSessionArtifactBundle(this.session.session_id);

    request.subscribe({
      next: (response: SessionArtifactDownload) => {
        this.upsertArtifact(response.artifact);
        this.syncEvidenceCards();
        this.downloadSignedUrl(response.url, response.artifact.file_name, kind);
      },
      error: (error) => {
        this.busyActions.delete(kind);
        this.notification.error(error.message || `Failed to prepare ${kind}.`);
      }
    });
  }

  private downloadArtifactFallbackAware(card: ArtifactCard, fallbackFileName: string): void {
    const request = this.resolveArtifactRequest(card);
    if (!request) {
      this.notification.warning('This artifact is not available yet.');
      return;
    }

    this.busyActions.add(card.key);
    request.subscribe({
      next: (response: SessionArtifactDownload | { url: string }) => {
        const fileName = this.hasArtifactPayload(response) ? response.artifact.file_name : fallbackFileName;
        this.downloadSignedUrl(response.url, fileName, card.key);
      },
      error: (error) => {
        this.busyActions.delete(card.key);
        this.notification.error(error.message || 'Failed to download artifact.');
      }
    });
  }

  private downloadSignedUrl(url: string, fileName: string, busyKey?: ArtifactCardKey): void {
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const objectUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(objectUrl);
        if (busyKey) {
          this.busyActions.delete(busyKey);
        }
        this.notification.success(`${fileName} downloaded`);
      },
      error: () => {
        if (busyKey) {
          this.busyActions.delete(busyKey);
        }
        window.open(url, '_blank', 'noopener');
      }
    });
  }

  private hasArtifactPayload(response: SessionArtifactDownload | { url: string }): response is SessionArtifactDownload {
    return 'artifact' in response;
  }

  private upsertArtifact(artifact: SessionArtifactRecord): void {
    const existingIndex = this.artifacts.findIndex(item => item.artifact_id === artifact.artifact_id || item.artifact_type === artifact.artifact_type);
    if (existingIndex >= 0) {
      this.artifacts[existingIndex] = artifact;
      return;
    }
    this.artifacts = [artifact, ...this.artifacts];
  }

  private revokeVideoObjectUrl(): void {
    if (!this.videoObjectUrl) {
      return;
    }

    window.URL.revokeObjectURL(this.videoObjectUrl);
    this.videoObjectUrl = null;
  }

  private prettyPrintJson(text: string): string {
    try {
      return JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      return text;
    }
  }

  private previewHeading(key: ArtifactCardKey): string {
    switch (key) {
      case 'imu_telemetry':
        return 'IMU telemetry';
      case 'rekognition_raw':
        return 'Rekognition raw result';
      case 'optical_flow':
        return 'Optical flow trace';
      default:
        return 'Artifact preview';
    }
  }

  private previewLabelSeed(key: ArtifactCardKey): string {
    switch (key) {
      case 'imu_telemetry':
        return 'imu telemetry';
      case 'rekognition_raw':
        return 'rekognition raw result';
      case 'optical_flow':
        return 'optical flow trace';
      default:
        return 'artifact preview';
    }
  }
}
