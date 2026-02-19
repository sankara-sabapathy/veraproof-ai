import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ApiKeysService } from './api-keys.service';
import { ApiService } from '../../../core/services/api.service';
import { ApiKey, ApiKeyResponse, KeyUsageStats } from '../../../core/models/interfaces';
import { environment } from '../../../../environments/environment';

describe('ApiKeysService', () => {
  let service: ApiKeysService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ApiKeysService, ApiService]
    });
    service = TestBed.inject(ApiKeysService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('generateKey', () => {
    it('should generate a sandbox API key', (done) => {
      const mockResponse: ApiKeyResponse = {
        key_id: 'key-123',
        api_key: 'vp_sandbox_abc123',
        environment: 'sandbox'
      };

      service.generateKey('sandbox').subscribe({
        next: (response) => {
          expect(response).toEqual(mockResponse);
          expect(response.environment).toBe('sandbox');
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/api/v1/api-keys`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ environment: 'sandbox' });
      req.flush(mockResponse);
    });

    it('should generate a production API key', (done) => {
      const mockResponse: ApiKeyResponse = {
        key_id: 'key-456',
        api_key: 'vp_prod_def456',
        environment: 'production'
      };

      service.generateKey('production').subscribe({
        next: (response) => {
          expect(response).toEqual(mockResponse);
          expect(response.environment).toBe('production');
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/api/v1/api-keys`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ environment: 'production' });
      req.flush(mockResponse);
    });

    it('should handle errors when generating a key', (done) => {
      service.generateKey('sandbox').subscribe({
        error: (error) => {
          expect(error).toBeTruthy();
          expect(error.message).toContain('error');
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/api/v1/api-keys`);
      req.error(new ProgressEvent('error'), { status: 500, statusText: 'Server Error' });
    });
  });

  describe('listKeys', () => {
    it('should retrieve all API keys', (done) => {
      const mockKeys: ApiKey[] = [
        {
          key_id: 'key-1',
          api_key: 'vp_sandbox_abc',
          environment: 'sandbox',
          created_at: '2024-01-01T00:00:00Z',
          last_used_at: '2024-01-15T10:30:00Z',
          total_calls: 150,
          revoked_at: null
        },
        {
          key_id: 'key-2',
          api_key: 'vp_prod_xyz',
          environment: 'production',
          created_at: '2024-01-05T00:00:00Z',
          last_used_at: null,
          total_calls: 0,
          revoked_at: null
        }
      ];

      service.listKeys().subscribe({
        next: (keys) => {
          expect(keys).toEqual(mockKeys);
          expect(keys.length).toBe(2);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/api/v1/api-keys`);
      expect(req.request.method).toBe('GET');
      req.flush(mockKeys);
    });

    it('should return empty array when no keys exist', (done) => {
      service.listKeys().subscribe({
        next: (keys) => {
          expect(keys).toEqual([]);
          expect(keys.length).toBe(0);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/api/v1/api-keys`);
      req.flush([]);
    });

    it('should handle errors when listing keys', (done) => {
      service.listKeys().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          done();
        }
      });

      // Handle initial request
      const req1 = httpMock.expectOne(`${baseUrl}/api/v1/api-keys`);
      req1.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
      
      // Handle retry
      const req2 = httpMock.expectOne(`${baseUrl}/api/v1/api-keys`);
      req2.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
    });
  });

  describe('revokeKey', () => {
    it('should revoke an API key', (done) => {
      const keyId = 'key-123';

      service.revokeKey(keyId).subscribe({
        next: () => {
          expect(true).toBe(true);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/api/v1/api-keys/${keyId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    it('should handle errors when revoking a key', (done) => {
      const keyId = 'key-invalid';

      service.revokeKey(keyId).subscribe({
        error: (error) => {
          expect(error).toBeTruthy();
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/api/v1/api-keys/${keyId}`);
      req.error(new ProgressEvent('error'), { status: 404, statusText: 'Not Found' });
    });
  });

  describe('getKeyUsage', () => {
    it('should retrieve usage statistics for a key', (done) => {
      const keyId = 'key-123';
      const mockUsage: KeyUsageStats = {
        key_id: keyId,
        total_calls: 1500,
        calls_today: 50,
        calls_this_week: 300,
        calls_this_month: 1200,
        last_used_at: '2024-01-15T14:30:00Z'
      };

      service.getKeyUsage(keyId).subscribe({
        next: (usage) => {
          expect(usage).toEqual(mockUsage);
          expect(usage.total_calls).toBe(1500);
          expect(usage.calls_today).toBe(50);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/api/v1/api-keys/${keyId}/usage`);
      expect(req.request.method).toBe('GET');
      req.flush(mockUsage);
    });

    it('should handle key with no usage', (done) => {
      const keyId = 'key-new';
      const mockUsage: KeyUsageStats = {
        key_id: keyId,
        total_calls: 0,
        calls_today: 0,
        calls_this_week: 0,
        calls_this_month: 0,
        last_used_at: null
      };

      service.getKeyUsage(keyId).subscribe({
        next: (usage) => {
          expect(usage.total_calls).toBe(0);
          expect(usage.last_used_at).toBeNull();
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/api/v1/api-keys/${keyId}/usage`);
      req.flush(mockUsage);
    });

    it('should handle errors when getting usage', (done) => {
      const keyId = 'key-invalid';

      service.getKeyUsage(keyId).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          done();
        }
      });

      // Handle initial request
      const req1 = httpMock.expectOne(`${baseUrl}/api/v1/api-keys/${keyId}/usage`);
      req1.flush('Not Found', { status: 404, statusText: 'Not Found' });
      
      // Handle retry
      const req2 = httpMock.expectOne(`${baseUrl}/api/v1/api-keys/${keyId}/usage`);
      req2.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in key ID', (done) => {
      const keyId = 'key-with-special-chars-!@#';

      service.revokeKey(keyId).subscribe({
        next: () => {
          expect(true).toBe(true);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/api/v1/api-keys/${keyId}`);
      req.flush(null);
    });

    it('should handle very long key IDs', (done) => {
      const keyId = 'a'.repeat(256);

      service.getKeyUsage(keyId).subscribe({
        next: () => fail('should have failed'),
        error: () => {
          expect(true).toBe(true);
          done();
        }
      });

      // Handle initial request
      const req1 = httpMock.expectOne(`${baseUrl}/api/v1/api-keys/${keyId}/usage`);
      req1.flush('Bad Request', { status: 400, statusText: 'Bad Request' });
      
      // Handle retry
      const req2 = httpMock.expectOne(`${baseUrl}/api/v1/api-keys/${keyId}/usage`);
      req2.flush('Bad Request', { status: 400, statusText: 'Bad Request' });
    });

    it('should handle revoked keys in list', (done) => {
      const mockKeys: ApiKey[] = [
        {
          key_id: 'key-revoked',
          api_key: 'vp_sandbox_revoked',
          environment: 'sandbox',
          created_at: '2024-01-01T00:00:00Z',
          last_used_at: '2024-01-10T10:00:00Z',
          total_calls: 100,
          revoked_at: '2024-01-12T15:00:00Z'
        }
      ];

      service.listKeys().subscribe({
        next: (keys) => {
          expect(keys[0].revoked_at).not.toBeNull();
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/api/v1/api-keys`);
      req.flush(mockKeys);
    });
  });
});
