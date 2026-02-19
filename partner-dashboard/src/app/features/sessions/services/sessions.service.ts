import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import {
  Session,
  CreateSessionRequest,
  CreateSessionResponse,
  VerificationResult,
  SessionQueryParams,
  SessionListResponse
} from '../../../core/models/interfaces';

@Injectable({
  providedIn: 'root'
})
export class SessionsService {
  private apiService = inject(ApiService);

  /**
   * Create a new verification session
   * @param request - Session creation request with return URL and optional metadata
   * @returns Observable of CreateSessionResponse containing session ID, URL, and expiration
   */
  createSession(request: CreateSessionRequest): Observable<CreateSessionResponse> {
    return this.apiService.post<CreateSessionResponse>('/api/v1/sessions', request);
  }

  /**
   * Get a specific session by ID
   * @param sessionId - The ID of the session to retrieve
   * @returns Observable of Session object
   */
  getSession(sessionId: string): Observable<Session> {
    return this.apiService.get<Session>(`/api/v1/sessions/${sessionId}`);
  }

  /**
   * Get a paginated list of sessions with optional filtering
   * @param params - Query parameters for filtering, pagination, and search
   * @returns Observable of SessionListResponse with sessions array and pagination info
   */
  getSessions(params: SessionQueryParams = {}): Observable<SessionListResponse> {
    let httpParams = new HttpParams();
    
    if (params.limit !== undefined) httpParams = httpParams.set('limit', params.limit.toString());
    if (params.offset !== undefined) httpParams = httpParams.set('offset', params.offset.toString());
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.date_from) httpParams = httpParams.set('date_from', params.date_from);
    if (params.date_to) httpParams = httpParams.set('date_to', params.date_to);
    if (params.search) httpParams = httpParams.set('search', params.search);

    return this.apiService.get<SessionListResponse>('/api/v1/sessions', httpParams);
  }

  /**
   * Get verification results for a specific session
   * @param sessionId - The ID of the session
   * @returns Observable of VerificationResult
   */
  getSessionResults(sessionId: string): Observable<VerificationResult> {
    return this.apiService.get<VerificationResult>(`/api/v1/sessions/${sessionId}/results`);
  }

  /**
   * Get a signed URL for downloading the session video
   * @param sessionId - The ID of the session
   * @returns Observable containing the signed URL
   */
  getVideoUrl(sessionId: string): Observable<{ url: string }> {
    return this.apiService.get<{ url: string }>(`/api/v1/sessions/${sessionId}/video`);
  }

  /**
   * Get a signed URL for downloading the IMU data
   * @param sessionId - The ID of the session
   * @returns Observable containing the signed URL
   */
  getImuDataUrl(sessionId: string): Observable<{ url: string }> {
    return this.apiService.get<{ url: string }>(`/api/v1/sessions/${sessionId}/imu-data`);
  }

  /**
   * Get a signed URL for downloading the optical flow data
   * @param sessionId - The ID of the session
   * @returns Observable containing the signed URL
   */
  getOpticalFlowUrl(sessionId: string): Observable<{ url: string }> {
    return this.apiService.get<{ url: string }>(`/api/v1/sessions/${sessionId}/optical-flow`);
  }
}
