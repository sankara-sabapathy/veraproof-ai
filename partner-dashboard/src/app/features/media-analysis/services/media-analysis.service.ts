import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';
import { MediaAnalysisJob, MediaAnalysisListResponse } from '../../../core/models/interfaces';

@Injectable({
  providedIn: 'root'
})
export class MediaAnalysisService {
  private apiService = inject(ApiService);

  uploadMedia(file: File, metadata?: Record<string, unknown>): Observable<MediaAnalysisJob> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    if (metadata && Object.keys(metadata).length > 0) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    return this.apiService.post<MediaAnalysisJob>('/api/v1/media-analysis', formData);
  }

  getJobs(limit: number = 20, offset: number = 0): Observable<MediaAnalysisListResponse> {
    return this.apiService.get<MediaAnalysisListResponse>('/api/v1/media-analysis', { limit, offset });
  }

  getJob(jobId: string): Observable<MediaAnalysisJob> {
    return this.apiService.get<MediaAnalysisJob>(`/api/v1/media-analysis/${jobId}`);
  }

  getArtifactUrl(jobId: string): Observable<{ url: string }> {
    return this.apiService.get<{ url: string }>(`/api/v1/media-analysis/${jobId}/artifact`);
  }
}
