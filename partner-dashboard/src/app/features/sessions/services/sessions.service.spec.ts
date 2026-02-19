import { TestBed } from '@angular/core/testing';
import { HttpParams } from '@angular/common/http';
import { SessionsService } from './sessions.service';
import { ApiService } from '../../../core/services/api.service';
import { of } from 'rxjs';
import {
  Session,
  CreateSessionRequest,
  CreateSessionResponse,
  VerificationResult,
  SessionListResponse
} from '../../../core/models/interfaces';

describe('SessionsService', () => {
  let service: SessionsService;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;

  const mockSession: Session = {
    session_id: 'sess_123',
    tenant_id: 'tenant_456',
    state: 'complete',
    tier_1_score: 85,
    tier_2_score: 90,
    final_trust_score: 87.5,
    correlation_value: 0.92,
    reasoning: 'High correlation between IMU and optical flow',
    created_at: '2024-01-15T10:00:00Z',
    completed_at: '2024-01-15T10:05:00Z',
    expires_at: '2024-01-15T11:00:00Z',
    return_url: 'https://example.com/callback',
    metadata: { user_id: 'user_789' },
    video_s3_key: 'videos/sess_123.mp4',
    imu_data_s3_key: 'imu/sess_123.json',
    optical_flow_s3_key: 'flow/sess_123.json'
  };

  beforeEach(() => {
    const spy = jasmine.createSpyObj('ApiService', ['get', 'post', 'put', 'delete']);

    TestBed.configureTestingModule({
      providers: [
        SessionsService,
        { provide: ApiService, useValue: spy }
      ]
    });

    service = TestBed.inject(SessionsService);
    apiServiceSpy = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('createSession', () => {
    it('should create a new session', (done) => {
      const request: CreateSessionRequest = {
        return_url: 'https://example.com/callback',
        metadata: { user_id: 'user_789' }
      };

      const response: CreateSessionResponse = {
        session_id: 'sess_123',
        session_url: 'https://verify.veraproof.ai/sess_123',
        expires_at: '2024-01-15T11:00:00Z'
      };

      apiServiceSpy.post.and.returnValue(of(response));

      service.createSession(request).subscribe(result => {
        expect(result).toEqual(response);
        expect(apiServiceSpy.post).toHaveBeenCalledWith('/api/v1/sessions', request);
        done();
      });
    });
  });

  describe('getSession', () => {
    it('should retrieve a specific session by ID', (done) => {
      apiServiceSpy.get.and.returnValue(of(mockSession));

      service.getSession('sess_123').subscribe(result => {
        expect(result).toEqual(mockSession);
        expect(apiServiceSpy.get).toHaveBeenCalledWith('/api/v1/sessions/sess_123');
        done();
      });
    });
  });

  describe('getSessions', () => {
    it('should retrieve sessions list without parameters', (done) => {
      const response: SessionListResponse = {
        sessions: [mockSession],
        total: 1,
        limit: 25,
        offset: 0
      };

      apiServiceSpy.get.and.returnValue(of(response));

      service.getSessions().subscribe(result => {
        expect(result).toEqual(response);
        expect(apiServiceSpy.get).toHaveBeenCalledWith('/api/v1/sessions', jasmine.any(HttpParams));
        done();
      });
    });

    it('should retrieve sessions list with query parameters', (done) => {
      const response: SessionListResponse = {
        sessions: [mockSession],
        total: 1,
        limit: 10,
        offset: 0
      };

      apiServiceSpy.get.and.returnValue(of(response));

      service.getSessions({
        limit: 10,
        offset: 0,
        status: 'complete',
        date_from: '2024-01-01',
        date_to: '2024-01-31',
        search: 'user_789'
      }).subscribe(result => {
        expect(result).toEqual(response);
        const callArgs = apiServiceSpy.get.calls.mostRecent().args;
        expect(callArgs[0]).toBe('/api/v1/sessions');
        
        const params = callArgs[1] as HttpParams;
        expect(params.get('limit')).toBe('10');
        expect(params.get('offset')).toBe('0');
        expect(params.get('status')).toBe('complete');
        expect(params.get('date_from')).toBe('2024-01-01');
        expect(params.get('date_to')).toBe('2024-01-31');
        expect(params.get('search')).toBe('user_789');
        done();
      });
    });
  });

  describe('getSessionResults', () => {
    it('should retrieve verification results for a session', (done) => {
      const results: VerificationResult = {
        session_id: 'sess_123',
        tier_1_score: 85,
        tier_2_score: 90,
        final_trust_score: 87.5,
        correlation_value: 0.92,
        reasoning: 'High correlation between IMU and optical flow',
        state: 'complete'
      };

      apiServiceSpy.get.and.returnValue(of(results));

      service.getSessionResults('sess_123').subscribe(result => {
        expect(result).toEqual(results);
        expect(apiServiceSpy.get).toHaveBeenCalledWith('/api/v1/sessions/sess_123/results');
        done();
      });
    });
  });

  describe('artifact URL methods', () => {
    it('should get video URL', (done) => {
      const urlResponse = { url: 'https://s3.amazonaws.com/signed-url-video' };
      apiServiceSpy.get.and.returnValue(of(urlResponse));

      service.getVideoUrl('sess_123').subscribe(result => {
        expect(result).toEqual(urlResponse);
        expect(apiServiceSpy.get).toHaveBeenCalledWith('/api/v1/sessions/sess_123/video');
        done();
      });
    });

    it('should get IMU data URL', (done) => {
      const urlResponse = { url: 'https://s3.amazonaws.com/signed-url-imu' };
      apiServiceSpy.get.and.returnValue(of(urlResponse));

      service.getImuDataUrl('sess_123').subscribe(result => {
        expect(result).toEqual(urlResponse);
        expect(apiServiceSpy.get).toHaveBeenCalledWith('/api/v1/sessions/sess_123/imu-data');
        done();
      });
    });

    it('should get optical flow URL', (done) => {
      const urlResponse = { url: 'https://s3.amazonaws.com/signed-url-flow' };
      apiServiceSpy.get.and.returnValue(of(urlResponse));

      service.getOpticalFlowUrl('sess_123').subscribe(result => {
        expect(result).toEqual(urlResponse);
        expect(apiServiceSpy.get).toHaveBeenCalledWith('/api/v1/sessions/sess_123/optical-flow');
        done();
      });
    });
  });
});
