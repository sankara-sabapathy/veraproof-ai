import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';
import { SecurityService } from '../services/security.service';

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let authService: jasmine.SpyObj<AuthService>;
  let securityService: jasmine.SpyObj<SecurityService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['handleUnauthorized', 'logout']);
    securityService = jasmine.createSpyObj<SecurityService>('SecurityService', ['getCsrfToken']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);

    authService.logout.and.returnValue(of(void 0));
    securityService.getCsrfToken.and.returnValue('csrf-token');

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
        { provide: SecurityService, useValue: securityService },
        { provide: Router, useValue: router },
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('adds credentials and CSRF header for state-changing requests', () => {
    httpClient.post('/api/v1/sessions', {}).subscribe();

    const req = httpMock.expectOne('/api/v1/sessions');
    expect(req.request.withCredentials).toBeTrue();
    expect(req.request.headers.get('X-CSRF-Token')).toBe('csrf-token');
    req.flush({});
  });

  it('adds credentials without CSRF header for GET requests', () => {
    httpClient.get('/api/v1/sessions').subscribe();

    const req = httpMock.expectOne('/api/v1/sessions');
    expect(req.request.withCredentials).toBeTrue();
    expect(req.request.headers.has('X-CSRF-Token')).toBeFalse();
    req.flush({});
  });

  it('bypasses signed storage URLs', () => {
    httpClient.get('https://example.s3.amazonaws.com/file?X-Amz-Signature=test').subscribe();

    const req = httpMock.expectOne('https://example.s3.amazonaws.com/file?X-Amz-Signature=test');
    expect(req.request.withCredentials).toBeFalse();
    expect(req.request.headers.has('X-CSRF-Token')).toBeFalse();
    req.flush({});
  });

  it('handles 401 on non-auth endpoints by resetting auth and redirecting', (done) => {
    httpClient.get('/api/v1/sessions').subscribe({
      error: (error) => {
        expect(error.status).toBe(401);
        expect(authService.handleUnauthorized).toHaveBeenCalledTimes(1);
        expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
        done();
      }
    });

    const req = httpMock.expectOne('/api/v1/sessions');
    req.flush({ detail: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
  });

  it('does not redirect on auth endpoint 401 responses', (done) => {
    httpClient.get('/api/v1/auth/session').subscribe({
      error: (error) => {
        expect(error.status).toBe(401);
        expect(authService.handleUnauthorized).not.toHaveBeenCalled();
        expect(router.navigate).not.toHaveBeenCalled();
        done();
      }
    });

    const req = httpMock.expectOne('/api/v1/auth/session');
    req.flush({ detail: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
  });
});
