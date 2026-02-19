import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { Router } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';
import { of, throwError } from 'rxjs';
import { AuthResponse } from '../models/interfaces';

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  const mockAuthResponse: AuthResponse = {
    access_token: 'new-access-token',
    refresh_token: 'new-refresh-token',
    token_type: 'Bearer',
    user: {
      user_id: 'user-123',
      tenant_id: 'tenant-123',
      email: 'test@example.com',
      role: 'Admin'
    }
  };

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', [
      'getAccessToken',
      'refreshToken',
      'logout'
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    authService.logout.and.returnValue(of(void 0));
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Token Injection', () => {
    it('should add Authorization header with Bearer token to requests', () => {
      authService.getAccessToken.and.returnValue('test-token');

      httpClient.get('/api/v1/sessions').subscribe();

      const req = httpMock.expectOne('/api/v1/sessions');
      expect(req.request.headers.has('Authorization')).toBe(true);
      expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
      req.flush({});
    });

    it('should not add Authorization header when token is null', () => {
      authService.getAccessToken.and.returnValue(null);

      httpClient.get('/api/v1/sessions').subscribe();

      const req = httpMock.expectOne('/api/v1/sessions');
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({});
    });

    it('should skip auth for login endpoint', () => {
      authService.getAccessToken.and.returnValue('test-token');

      httpClient.post('/api/v1/auth/login', {}).subscribe();

      const req = httpMock.expectOne('/api/v1/auth/login');
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({});
    });

    it('should skip auth for signup endpoint', () => {
      authService.getAccessToken.and.returnValue('test-token');

      httpClient.post('/api/v1/auth/signup', {}).subscribe();

      const req = httpMock.expectOne('/api/v1/auth/signup');
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({});
    });

    it('should skip auth for refresh endpoint', () => {
      authService.getAccessToken.and.returnValue('test-token');

      httpClient.post('/api/v1/auth/refresh', {}).subscribe();

      const req = httpMock.expectOne('/api/v1/auth/refresh');
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({});
    });
  });

  describe('Token Refresh on 401', () => {
    it('should refresh token and retry request on 401 error', (done) => {
      authService.getAccessToken.and.returnValue('expired-token');
      authService.refreshToken.and.returnValue(of(mockAuthResponse));

      httpClient.get('/api/v1/sessions').subscribe({
        next: (response) => {
          expect(response).toEqual({ data: 'success' });
          expect(authService.refreshToken).toHaveBeenCalledTimes(1);
          done();
        },
        error: () => fail('Should not error')
      });

      // First request with expired token
      const req1 = httpMock.expectOne('/api/v1/sessions');
      expect(req1.request.headers.get('Authorization')).toBe('Bearer expired-token');
      req1.flush({ error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

      // Retry with new token
      const req2 = httpMock.expectOne('/api/v1/sessions');
      expect(req2.request.headers.get('Authorization')).toBe('Bearer new-access-token');
      req2.flush({ data: 'success' });
    });

    it('should logout and navigate to login when refresh fails', (done) => {
      authService.getAccessToken.and.returnValue('expired-token');
      authService.refreshToken.and.returnValue(
        throwError(() => new Error('Refresh failed'))
      );

      httpClient.get('/api/v1/sessions').subscribe({
        next: () => fail('Should not succeed'),
        error: (error) => {
          expect(error.message).toBe('Refresh failed');
          expect(authService.logout).toHaveBeenCalledTimes(1);
          expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
          done();
        }
      });

      const req = httpMock.expectOne('/api/v1/sessions');
      req.flush({ error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    });

    it('should handle multiple concurrent 401 errors', (done) => {
      authService.getAccessToken.and.returnValue('expired-token');
      authService.refreshToken.and.returnValue(of(mockAuthResponse));

      let completedRequests = 0;
      const checkDone = () => {
        completedRequests++;
        if (completedRequests === 2) {
          // Both requests should complete successfully
          done();
        }
      };

      // Make two concurrent requests
      httpClient.get('/api/v1/sessions').subscribe({
        next: () => checkDone(),
        error: () => fail('Request 1 should not error')
      });

      httpClient.get('/api/v1/analytics').subscribe({
        next: () => checkDone(),
        error: () => fail('Request 2 should not error')
      });

      // Both requests fail with 401
      const req1 = httpMock.expectOne('/api/v1/sessions');
      const req2 = httpMock.expectOne('/api/v1/analytics');
      
      req1.flush({ error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
      req2.flush({ error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

      // Both requests retry with new token
      const retryReq1 = httpMock.expectOne('/api/v1/sessions');
      const retryReq2 = httpMock.expectOne('/api/v1/analytics');
      
      expect(retryReq1.request.headers.get('Authorization')).toBe('Bearer new-access-token');
      expect(retryReq2.request.headers.get('Authorization')).toBe('Bearer new-access-token');
      
      retryReq1.flush({ data: 'success' });
      retryReq2.flush({ data: 'success' });
    });
  });

  describe('Non-401 Errors', () => {
    it('should pass through 403 errors without refresh', (done) => {
      authService.getAccessToken.and.returnValue('valid-token');

      httpClient.get('/api/v1/admin').subscribe({
        next: () => fail('Should not succeed'),
        error: (error) => {
          expect(error.status).toBe(403);
          expect(authService.refreshToken).not.toHaveBeenCalled();
          done();
        }
      });

      const req = httpMock.expectOne('/api/v1/admin');
      req.flush({ error: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    });

    it('should pass through 404 errors without refresh', (done) => {
      authService.getAccessToken.and.returnValue('valid-token');

      httpClient.get('/api/v1/notfound').subscribe({
        next: () => fail('Should not succeed'),
        error: (error) => {
          expect(error.status).toBe(404);
          expect(authService.refreshToken).not.toHaveBeenCalled();
          done();
        }
      });

      const req = httpMock.expectOne('/api/v1/notfound');
      req.flush({ error: 'Not Found' }, { status: 404, statusText: 'Not Found' });
    });

    it('should pass through 500 errors without refresh', (done) => {
      authService.getAccessToken.and.returnValue('valid-token');

      httpClient.get('/api/v1/sessions').subscribe({
        next: () => fail('Should not succeed'),
        error: (error) => {
          expect(error.status).toBe(500);
          expect(authService.refreshToken).not.toHaveBeenCalled();
          done();
        }
      });

      const req = httpMock.expectOne('/api/v1/sessions');
      req.flush({ error: 'Server Error' }, { status: 500, statusText: 'Internal Server Error' });
    });
  });
});
