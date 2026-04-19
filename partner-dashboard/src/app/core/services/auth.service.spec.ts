import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';

import { AuthService } from './auth.service';
import { SecurityService } from './security.service';
import { AuthProviders, AuthResponse, AuthSessionState, User } from '../models/interfaces';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;
  let securityService: SecurityService;

  const mockUser: User = {
    user_id: 'test-user-id',
    tenant_id: 'test-tenant-id',
    email: 'test@example.com',
    role: 'Admin',
    roles: ['org_admin'],
    permissions: ['sessions.read', 'analytics.read']
  };

  const mockAuthResponse: AuthResponse = {
    access_token: 'legacy-access-token',
    refresh_token: 'legacy-refresh-token',
    token_type: 'Bearer',
    user: mockUser,
  };

  const authenticatedSession: AuthSessionState = {
    authenticated: true,
    auth_type: 'session_cookie',
    csrf_token: 'csrf-token',
    user: mockUser,
  };

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        SecurityService,
        { provide: Router, useValue: routerSpy },
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    securityService = TestBed.inject(SecurityService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('validates email addresses', () => {
    expect(service.validateEmail('').valid).toBeFalse();
    expect(service.validateEmail('bad-email').valid).toBeFalse();
    expect(service.validateEmail('test@example.com').valid).toBeTrue();
  });

  it('validates passwords', () => {
    expect(service.validatePassword('').valid).toBeFalse();
    expect(service.validatePassword('short').valid).toBeFalse();
    expect(service.validatePassword('ValidPass1!').valid).toBeTrue();
  });

  it('loads an authenticated cookie session and stores csrf state', () => {
    service.initializeAuth().subscribe((session) => {
      expect(session.authenticated).toBeTrue();
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/auth/session`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBeTrue();
    req.flush(authenticatedSession);

    expect(service.getCurrentUser()).toEqual(mockUser);
    expect(service.isAdmin()).toBeFalse();
    expect(securityService.getCsrfToken()).toBe('csrf-token');
  });

  it('returns cached auth state after initialization', () => {
    service.initializeAuth().subscribe();
    httpMock.expectOne(`${environment.apiUrl}/api/v1/auth/session`).flush(authenticatedSession);

    service.initializeAuth().subscribe((session) => {
      expect(session.authenticated).toBeTrue();
      expect(session.user).toEqual(mockUser);
    });
  });

  it('loads auth providers and caches them', () => {
    const providers: AuthProviders = { google: true, local: false };

    service.getAuthProviders().subscribe((result) => {
      expect(result).toEqual(providers);
    });
    httpMock.expectOne(`${environment.apiUrl}/api/v1/auth/providers`).flush(providers);

    service.getAuthProviders().subscribe((result) => {
      expect(result).toEqual(providers);
    });
  });

  it('logs in with credentials and refreshes cookie session state', (done) => {
    service.login('test@example.com', 'ValidPass1!').subscribe({
      next: (response) => {
        expect(response).toEqual(mockAuthResponse);
        expect(service.getCurrentUser()).toEqual(mockUser);
        done();
      },
      error: done.fail,
    });

    const loginReq = httpMock.expectOne(`${environment.apiUrl}/api/v1/auth/login`);
    expect(loginReq.request.method).toBe('POST');
    expect(loginReq.request.withCredentials).toBeTrue();
    expect(loginReq.request.body).toEqual({ email: 'test@example.com', password: 'ValidPass1!' });
    loginReq.flush(mockAuthResponse);

    const sessionReq = httpMock.expectOne(`${environment.apiUrl}/api/v1/auth/session`);
    expect(sessionReq.request.method).toBe('GET');
    expect(sessionReq.request.withCredentials).toBeTrue();
    sessionReq.flush(authenticatedSession);
  });

  it('rejects invalid login input before making a request', (done) => {
    service.login('invalid-email', 'ValidPass1!').subscribe({
      next: () => done.fail('login should not succeed'),
      error: (error) => {
        expect(error.message).toBe('Please enter a valid email address');
        done();
      }
    });
  });

  it('signs up locally and refreshes cookie session state', (done) => {
    service.signup('newuser@example.com', 'ValidPass1!').subscribe({
      next: (response) => {
        expect(response).toEqual(mockAuthResponse);
        done();
      },
      error: done.fail,
    });

    const signupReq = httpMock.expectOne(`${environment.apiUrl}/api/v1/auth/signup`);
    expect(signupReq.request.method).toBe('POST');
    expect(signupReq.request.withCredentials).toBeTrue();
    signupReq.flush(mockAuthResponse);

    const sessionReq = httpMock.expectOne(`${environment.apiUrl}/api/v1/auth/session`);
    sessionReq.flush(authenticatedSession);
  });

  it('clears auth state on logout', (done) => {
    service['currentUserSubject'].next(mockUser);
    service['isAuthenticatedSubject'].next(true);
    securityService.setCsrfToken('csrf-token');

    service.logout().subscribe({
      next: () => {
        expect(service.getCurrentUser()).toBeNull();
        expect(securityService.getCsrfToken()).toBeNull();
        done();
      },
      error: done.fail,
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/auth/logout`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBeTrue();
    req.flush({});
  });

  it('redirects to login when unauthorized handling is triggered', () => {
    service['currentUserSubject'].next(mockUser);
    service['isAuthenticatedSubject'].next(true);
    securityService.setCsrfToken('csrf-token');

    service.handleUnauthorized();

    expect(service.getCurrentUser()).toBeNull();
    expect(securityService.getCsrfToken()).toBeNull();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('detects platform admins from permissions or roles', () => {
    service['currentUserSubject'].next({
      ...mockUser,
      role: 'platform_admin',
      roles: ['platform_admin'],
      permissions: ['platform.metadata.read']
    });

    expect(service.isAdmin()).toBeTrue();
  });
});
