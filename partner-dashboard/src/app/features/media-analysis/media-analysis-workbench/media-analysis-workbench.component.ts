import { CommonModule, DatePipe, DecimalPipe, JsonPipe } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription, interval } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChipModule } from 'primeng/chip';
import { ProgressBarModule } from 'primeng/progressbar';
import { TooltipModule } from 'primeng/tooltip';

import { NotificationService } from '../../../core/services/notification.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { MediaAnalysisJob } from '../../../core/models/interfaces';
import { MediaAnalysisService } from '../services/media-analysis.service';

@Component({
  selector: 'app-media-analysis-workbench',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    ChipModule,
    ProgressBarModule,
    TooltipModule,
    LoadingSpinnerComponent,
    DatePipe,
    DecimalPipe,
    JsonPipe
  ],
  templateUrl: './media-analysis-workbench.component.html',
  styleUrls: ['./media-analysis-workbench.component.scss']
})
export class MediaAnalysisWorkbenchComponent implements OnInit, OnDestroy {
  jobs: MediaAnalysisJob[] = [];
  selectedJob: MediaAnalysisJob | null = null;
  selectedFile: File | null = null;
  metadataText = '{\n  "verification_profile": "static_human"\n}';
  loading = true;
  refreshing = false;
  uploading = false;

  private pollSubscription?: Subscription;

  constructor(
    private mediaAnalysisService: MediaAnalysisService,
    private notification: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadJobs();
    this.pollSubscription = interval(5000).subscribe(() => {
      if (this.hasActiveJobs || this.selectedJob) {
        this.loadJobs(false);
      }
    });
  }

  ngOnDestroy(): void {
    this.pollSubscription?.unsubscribe();
  }

  get hasActiveJobs(): boolean {
    return this.jobs.some(job => job.status === 'pending' || job.status === 'analyzing');
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

  submitUpload(): void {
    if (!this.selectedFile) {
      this.notification.warning('Choose an image or video before starting analysis.');
      return;
    }

    let metadata: Record<string, unknown> | undefined;
    try {
      metadata = this.parseMetadata();
    } catch (error) {
      this.notification.error(error instanceof Error ? error.message : 'Metadata must be valid JSON.');
      return;
    }

    this.uploading = true;
    this.mediaAnalysisService.uploadMedia(this.selectedFile, metadata).subscribe({
      next: (job) => {
        this.uploading = false;
        this.selectedJob = job;
        this.selectedFile = null;
        this.notification.success('Upload accepted. Fraud analysis started.');
        this.loadJobs(false);
      },
      error: (error) => {
        this.uploading = false;
        this.notification.error(error.message || 'Failed to upload media for analysis.');
      }
    });
  }

  loadJobs(showLoader: boolean = true): void {
    if (showLoader) {
      this.loading = true;
    } else {
      this.refreshing = true;
    }

    this.mediaAnalysisService.getJobs(24, 0).subscribe({
      next: (response) => {
        this.jobs = response.jobs;
        if (this.selectedJob) {
          this.selectedJob = this.jobs.find(job => job.job_id === this.selectedJob?.job_id) ?? this.selectedJob;
        } else if (this.jobs.length > 0) {
          [this.selectedJob] = this.jobs;
        }
        this.loading = false;
        this.refreshing = false;
      },
      error: (error) => {
        this.loading = false;
        this.refreshing = false;
        this.notification.error(error.message || 'Failed to load fraud analysis jobs.');
      }
    });
  }

  selectJob(job: MediaAnalysisJob): void {
    this.selectedJob = job;
    this.refreshJob(job.job_id, false);
  }

  refreshSelectedJob(): void {
    if (!this.selectedJob) {
      return;
    }
    this.refreshJob(this.selectedJob.job_id, true);
  }

  openArtifact(job: MediaAnalysisJob): void {
    this.mediaAnalysisService.getArtifactUrl(job.job_id).subscribe({
      next: ({ url }) => {
        window.open(url, '_blank', 'noopener');
      },
      error: (error) => {
        this.notification.error(error.message || 'Failed to open source artifact.');
      }
    });
  }

  statusLabel(job: MediaAnalysisJob): string {
    return job.status.replace('_', ' ');
  }

  outcomeLabel(job: MediaAnalysisJob): string {
    if (!job.analysis_outcome) {
      return 'Awaiting result';
    }

    switch (job.analysis_outcome) {
      case 'authentic':
        return 'Authentic signal';
      case 'suspicious':
        return 'Suspicious signal';
      case 'spoof_detected':
        return 'Spoof detected';
      default:
        return 'Analysis error';
    }
  }

  scoreLabel(job: MediaAnalysisJob): string {
    if (job.final_trust_score == null) {
      return '--';
    }
    return `${job.final_trust_score}`;
  }

  formatBytes(bytes: number): string {
    if (!bytes) {
      return '0 B';
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

  trackByJobId(index: number, job: MediaAnalysisJob): string {
    return job.job_id;
  }

  private parseMetadata(): Record<string, unknown> | undefined {
    const raw = this.metadataText.trim();
    if (!raw) {
      return undefined;
    }

    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Metadata must be a JSON object.');
    }

    return parsed as Record<string, unknown>;
  }

  private refreshJob(jobId: string, notifyOnError: boolean): void {
    this.mediaAnalysisService.getJob(jobId).subscribe({
      next: (job) => {
        this.selectedJob = job;
        this.jobs = this.jobs.map(existing => existing.job_id === job.job_id ? job : existing);
      },
      error: (error) => {
        if (notifyOnError) {
          this.notification.error(error.message || 'Failed to refresh analysis job.');
        }
      }
    });
  }
}
