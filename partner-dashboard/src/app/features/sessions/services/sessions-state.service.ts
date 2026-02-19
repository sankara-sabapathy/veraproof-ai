import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { Session, SessionQueryParams } from '../../../core/models/interfaces';
import { SessionsService } from './sessions.service';

interface SessionFilters {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

interface PaginationState {
  total: number;
  limit: number;
  offset: number;
}

interface SessionsState {
  sessions: Session[];
  selectedSession: Session | null;
  loading: boolean;
  error: string | null;
  filters: SessionFilters;
  pagination: PaginationState;
}

@Injectable({
  providedIn: 'root'
})
export class SessionsStateService {
  private sessionsService = inject(SessionsService);
  
  private initialState: SessionsState = {
    sessions: [],
    selectedSession: null,
    loading: false,
    error: null,
    filters: {},
    pagination: { total: 0, limit: 25, offset: 0 }
  };

  private state$ = new BehaviorSubject<SessionsState>(this.initialState);
  private sessionUpdates$ = new Subject<Session>();
  private ws: WebSocket | null = null;

  // Selectors
  sessions$ = this.state$.pipe(map(state => state.sessions));
  selectedSession$ = this.state$.pipe(map(state => state.selectedSession));
  loading$ = this.state$.pipe(map(state => state.loading));
  error$ = this.state$.pipe(map(state => state.error));
  filters$ = this.state$.pipe(map(state => state.filters));
  pagination$ = this.state$.pipe(map(state => state.pagination));

  /**
   * Observable stream of real-time session updates from WebSocket
   */
  sessionUpdates(): Observable<Session> {
    return this.sessionUpdates$.asObservable();
  }

  /**
   * Get the current state snapshot
   */
  snapshot(): SessionsState {
    return this.state$.value;
  }

  /**
   * Get the full state as an observable
   */
  select(): Observable<SessionsState> {
    return this.state$.asObservable();
  }

  /**
   * Update the state with partial changes
   */
  private patchState(partial: Partial<SessionsState>): void {
    this.state$.next({ ...this.state$.value, ...partial });
  }

  /**
   * Set loading state
   */
  setLoading(loading: boolean): void {
    this.patchState({ loading });
  }

  /**
   * Set sessions list with pagination info
   */
  setSessions(sessions: Session[], total: number): void {
    this.patchState({ 
      sessions, 
      pagination: { ...this.snapshot().pagination, total },
      loading: false,
      error: null
    });
  }

  /**
   * Set selected session
   */
  setSelectedSession(session: Session | null): void {
    this.patchState({ selectedSession: session });
  }

  /**
   * Set error state
   */
  setError(error: string): void {
    this.patchState({ error, loading: false });
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.patchState({ error: null });
  }

  /**
   * Update filters and reset pagination to first page
   */
  updateFilters(filters: Partial<SessionFilters>): void {
    this.patchState({ 
      filters: { ...this.snapshot().filters, ...filters },
      pagination: { ...this.snapshot().pagination, offset: 0 }
    });
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.patchState({ 
      filters: {},
      pagination: { ...this.snapshot().pagination, offset: 0 }
    });
  }

  /**
   * Update pagination state
   */
  updatePagination(pagination: Partial<PaginationState>): void {
    this.patchState({ 
      pagination: { ...this.snapshot().pagination, ...pagination }
    });
  }

  /**
   * Load sessions from the backend with current filters and pagination
   */
  loadSessions(): void {
    this.setLoading(true);
    const state = this.snapshot();
    
    const params: SessionQueryParams = {
      limit: state.pagination.limit,
      offset: state.pagination.offset,
      status: state.filters.status,
      date_from: state.filters.dateFrom,
      date_to: state.filters.dateTo,
      search: state.filters.search
    };

    this.sessionsService.getSessions(params).subscribe({
      next: (response) => this.setSessions(response.sessions, response.total),
      error: (error) => this.setError(error.message || 'Failed to load sessions')
    });
  }

  /**
   * Load a specific session by ID and set it as selected
   */
  loadSession(sessionId: string): void {
    this.setLoading(true);
    this.sessionsService.getSession(sessionId).subscribe({
      next: (session) => {
        this.setSelectedSession(session);
        this.setLoading(false);
      },
      error: (error) => this.setError(error.message || 'Failed to load session')
    });
  }

  /**
   * Add a newly created session to the state
   */
  addSession(session: Session): void {
    const currentSessions = this.snapshot().sessions;
    const currentPagination = this.snapshot().pagination;
    this.patchState({
      sessions: [session, ...currentSessions],
      pagination: { ...currentPagination, total: currentPagination.total + 1 }
    });
  }

  /**
   * Update a session in the state (e.g., from WebSocket update)
   */
  updateSession(updatedSession: Session): void {
    const currentSessions = this.snapshot().sessions;
    const updatedSessions = currentSessions.map(s => 
      s.session_id === updatedSession.session_id ? updatedSession : s
    );
    this.patchState({ sessions: updatedSessions });

    // Also update selected session if it matches
    const selectedSession = this.snapshot().selectedSession;
    if (selectedSession && selectedSession.session_id === updatedSession.session_id) {
      this.setSelectedSession(updatedSession);
    }
  }

  /**
   * Connect to WebSocket for real-time session updates
   * @param wsUrl - WebSocket URL (e.g., 'wss://api.veraproof.ai/ws/sessions')
   * @param token - Authentication token
   */
  connectWebSocket(wsUrl: string, token: string): void {
    // Close existing connection if any
    this.disconnectWebSocket();

    try {
      this.ws = new WebSocket(`${wsUrl}?token=${token}`);

      this.ws.onopen = () => {
        console.log('WebSocket connected for session updates');
      };

      this.ws.onmessage = (event) => {
        try {
          const session: Session = JSON.parse(event.data);
          this.updateSession(session);
          this.sessionUpdates$.next(session);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (this.ws?.readyState === WebSocket.CLOSED) {
            this.connectWebSocket(wsUrl, token);
          }
        }, 5000);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnectWebSocket(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Reset state to initial values and disconnect WebSocket
   */
  reset(): void {
    this.disconnectWebSocket();
    this.state$.next(this.initialState);
  }
}
