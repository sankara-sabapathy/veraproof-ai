import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Session {
  session_id: string;
  created_at: string;
  expires_at: string;
  state: string;
  final_trust_score?: number;
  tier_1_score?: number;
  tier_2_score?: number;
  return_url?: string;
  metadata?: any;
}

export interface SessionsResponse {
  sessions: Session[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateSessionRequest {
  metadata?: any;
  return_url?: string;
}

export interface CreateSessionResponse {
  session_id: string;
  session_url: string;
  expires_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getSessions(limit: number = 10, offset: number = 0): Observable<SessionsResponse> {
    return this.http.get<SessionsResponse>(`${this.apiUrl}/api/v1/sessions`, {
      params: { limit: limit.toString(), offset: offset.toString() }
    });
  }

  getSession(sessionId: string): Observable<Session> {
    return this.http.get<Session>(`${this.apiUrl}/api/v1/sessions/${sessionId}`);
  }

  createSession(request: CreateSessionRequest): Observable<CreateSessionResponse> {
    return this.http.post<CreateSessionResponse>(`${this.apiUrl}/api/v1/sessions/create`, request);
  }
}
