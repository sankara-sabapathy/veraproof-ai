import { TestBed } from '@angular/core/testing';
import { SessionsStateService } from './sessions-state.service';
import { SessionsService } from './sessions.service';
import { of, throwError } from 'rxjs';
import { Session, SessionListResponse } from '../../../core/models/interfaces';

describe('SessionsStateService', () => {
  let service: SessionsStateService;
  let sessionsServiceSpy: jasmine.SpyObj<SessionsService>;

  const mockSession: Session = {
    session_id: 'sess_123',
    tenant_id: 'tenant_456',
    state: 'complete',
    tier_1_score: 85,
    tier_2_score: 90,
    final_trust_score: 87.5,
    correlation_value: 0.92,
    reasoning: 'High correlation',
    created_at: '2024-01-15T10:00:00Z',
    completed_at: '2024-01-15T10:05:00Z',
    expires_at: '2024-01-15T11:00:00Z',
    return_url: 'https://example.com/callback',
    metadata: { user_id: 'user_789' },
    video_s3_key: 'videos/sess_123.mp4',
    imu_data_s3_key: 'imu/sess_123.json',
    optical_flow_s3_key: 'flow/sess_123.json'
  };

  const mockSession2: Session = {
    ...mockSession,
    session_id: 'sess_456',
    state: 'analyzing'
  };

  beforeEach(() => {
    const spy = jasmine.createSpyObj('SessionsService', [
      'getSessions',
      'getSession',
      'createSession',
      'getSessionResults',
      'getVideoUrl',
      'getImuDataUrl',
      'getOpticalFlowUrl'
    ]);

    TestBed.configureTestingModule({
      providers: [
        SessionsStateService,
        { provide: SessionsService, useValue: spy }
      ]
    });

    service = TestBed.inject(SessionsStateService);
    sessionsServiceSpy = TestBed.inject(SessionsService) as jasmine.SpyObj<SessionsService>;
  });

  afterEach(() => {
    service.reset();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = service.snapshot();
      expect(state.sessions).toEqual([]);
      expect(state.selectedSession).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.filters).toEqual({});
      expect(state.pagination).toEqual({ total: 0, limit: 25, offset: 0 });
    });
  });

  describe('setLoading', () => {
    it('should update loading state', () => {
      service.setLoading(true);
      expect(service.snapshot().loading).toBe(true);
    });
  });

  describe('setSessions', () => {
    it('should update sessions and pagination', () => {
      service.setSessions([mockSession, mockSession2], 2);
      
      const state = service.snapshot();
      expect(state.sessions).toEqual([mockSession, mockSession2]);
      expect(state.pagination.total).toBe(2);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('setSelectedSession', () => {
    it('should update selected session', () => {
      service.setSelectedSession(mockSession);
      expect(service.snapshot().selectedSession).toEqual(mockSession);
    });
  });

  describe('setError', () => {
    it('should update error state and clear loading', () => {
      service.setError('Test error');
      
      const state = service.snapshot();
      expect(state.error).toBe('Test error');
      expect(state.loading).toBe(false);
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      service.setError('Test error');
      service.clearError();
      expect(service.snapshot().error).toBeNull();
    });
  });

  describe('updateFilters', () => {
    it('should update filters and reset offset', () => {
      service.updatePagination({ offset: 25 });
      service.updateFilters({ status: 'complete', search: 'test' });
      
      const state = service.snapshot();
      expect(state.filters.status).toBe('complete');
      expect(state.filters.search).toBe('test');
      expect(state.pagination.offset).toBe(0);
    });
  });

  describe('clearFilters', () => {
    it('should clear all filters and reset offset', () => {
      service.updateFilters({ status: 'complete', search: 'test' });
      service.clearFilters();
      
      const state = service.snapshot();
      expect(state.filters).toEqual({});
      expect(state.pagination.offset).toBe(0);
    });
  });

  describe('updatePagination', () => {
    it('should update pagination state', () => {
      service.updatePagination({ limit: 50, offset: 25 });
      
      const pagination = service.snapshot().pagination;
      expect(pagination.limit).toBe(50);
      expect(pagination.offset).toBe(25);
    });
  });

  describe('loadSessions', () => {
    it('should load sessions successfully', (done) => {
      const response: SessionListResponse = {
        sessions: [mockSession],
        total: 1,
        limit: 25,
        offset: 0
      };

      sessionsServiceSpy.getSessions.and.returnValue(of(response));

      service.loadSessions();

      setTimeout(() => {
        const state = service.snapshot();
        expect(state.sessions).toEqual([mockSession]);
        expect(state.pagination.total).toBe(1);
        expect(state.loading).toBe(false);
        expect(state.error).toBeNull();
        expect(sessionsServiceSpy.getSessions).toHaveBeenCalled();
        done();
      }, 10);
    });

    it('should handle load sessions error', (done) => {
      sessionsServiceSpy.getSessions.and.returnValue(
        throwError(() => new Error('Network error'))
      );

      service.loadSessions();

      setTimeout(() => {
        const state = service.snapshot();
        expect(state.error).toBe('Network error');
        expect(state.loading).toBe(false);
        done();
      }, 10);
    });

    it('should load sessions with filters and pagination', (done) => {
      const response: SessionListResponse = {
        sessions: [mockSession],
        total: 1,
        limit: 10,
        offset: 20
      };

      sessionsServiceSpy.getSessions.and.returnValue(of(response));

      service.updateFilters({ status: 'complete', search: 'test' });
      service.updatePagination({ limit: 10, offset: 20 });
      service.loadSessions();

      setTimeout(() => {
        expect(sessionsServiceSpy.getSessions).toHaveBeenCalledWith({
          limit: 10,
          offset: 20,
          status: 'complete',
          search: 'test',
          date_from: undefined,
          date_to: undefined
        });
        done();
      }, 10);
    });
  });

  describe('loadSession', () => {
    it('should load a specific session', (done) => {
      sessionsServiceSpy.getSession.and.returnValue(of(mockSession));

      service.loadSession('sess_123');

      setTimeout(() => {
        const selectedSession = service.snapshot().selectedSession;
        expect(selectedSession).toEqual(mockSession);
        expect(sessionsServiceSpy.getSession).toHaveBeenCalledWith('sess_123');
        done();
      }, 10);
    });

    it('should handle load session error', (done) => {
      sessionsServiceSpy.getSession.and.returnValue(
        throwError(() => new Error('Session not found'))
      );

      service.loadSession('sess_123');

      setTimeout(() => {
        const error = service.snapshot().error;
        expect(error).toBe('Session not found');
        done();
      }, 10);
    });
  });

  describe('addSession', () => {
    it('should add a new session to the beginning of the list', () => {
      service.setSessions([mockSession2], 1);
      service.addSession(mockSession);
      
      const state = service.snapshot();
      expect(state.sessions.length).toBe(2);
      expect(state.sessions[0]).toEqual(mockSession);
      expect(state.sessions[1]).toEqual(mockSession2);
      expect(state.pagination.total).toBe(2);
    });
  });

  describe('updateSession', () => {
    it('should update an existing session in the list', () => {
      service.setSessions([mockSession, mockSession2], 2);
      
      const updatedSession = { ...mockSession, state: 'analyzing' as const };
      service.updateSession(updatedSession);
      
      const sessions = service.snapshot().sessions;
      expect(sessions[0].state).toBe('analyzing');
      expect(sessions[1]).toEqual(mockSession2);
    });

    it('should update selected session if it matches', () => {
      service.setSelectedSession(mockSession);
      
      const updatedSession = { ...mockSession, state: 'analyzing' as const };
      service.updateSession(updatedSession);
      
      const selectedSession = service.snapshot().selectedSession;
      expect(selectedSession?.state).toBe('analyzing');
    });
  });

  describe('snapshot', () => {
    it('should return current state snapshot', () => {
      service.setSessions([mockSession], 1);
      const snapshot = service.snapshot();
      
      expect(snapshot.sessions).toEqual([mockSession]);
      expect(snapshot.pagination.total).toBe(1);
    });
  });

  describe('reset', () => {
    it('should reset state to initial values', () => {
      service.setSessions([mockSession], 1);
      service.setSelectedSession(mockSession);
      service.updateFilters({ status: 'complete' });
      
      service.reset();
      
      const state = service.snapshot();
      expect(state.sessions).toEqual([]);
      expect(state.selectedSession).toBeNull();
      expect(state.filters).toEqual({});
      expect(state.pagination).toEqual({ total: 0, limit: 25, offset: 0 });
    });
  });

  describe('WebSocket functionality', () => {
    it('should expose sessionUpdates observable', () => {
      const observable = service.sessionUpdates();
      expect(observable).toBeDefined();
      
      // Verify it's subscribable
      const subscription = observable.subscribe();
      expect(subscription).toBeDefined();
      subscription.unsubscribe();
    });

    it('should emit session updates when WebSocket receives messages', (done) => {
      // This test verifies the integration would work, but we can't easily test
      // WebSocket in unit tests. We verify the observable is set up correctly.
      const subscription = service.sessionUpdates().subscribe(session => {
        expect(session).toBeDefined();
        subscription.unsubscribe();
        done();
      });
      
      // Manually trigger what the WebSocket onmessage handler would do
      // by directly calling next on the subject (simulating WebSocket behavior)
      (service as any).sessionUpdates$.next(mockSession);
    });
  });
});
