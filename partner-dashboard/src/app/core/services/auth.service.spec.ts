import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { AuthResponse, User } from '../models/interfaces';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockUser: User = {
    user_id: 'test-user-id',
    tenant_id: 'test-tenant-id',
    email: 'test@example.com',
    role: 'Admin'
  };

  const mockAuthResponse: AuthResponse = {
    access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItaWQiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJ0ZW5hbnRfaWQiOiJ0ZXN0LXRlbmFudC1pZCIsInJvbGUiOiJBZG1pbiIsImV4cCI6OTk5OTk5OTk5OSwiaWF0IjoxNjAwMDAwMDAwfQ.test',
    refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItaWQiLCJleHAiOjk5OTk5OTk5OTksImlhdCI6MTYwMDAwMDAwMH0.test',
    token_type: 'Bearer',
    user: mockUser
  };

  beforeEach(() => {
    const routerSpyObj = jasmine.createSpyObj('Router', ['navigate']);
    
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: Router, useValue: routerSpyObj }
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('Email Validation', () => {
    it('should reject empty email', () => {
      const result = service.validateEmail('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Email is required');
    });

    it('should reject email longer than 254 characters', () => {
      const longEmail = 'a'.repeat(250) + '@test.com';
      const result = service.validateEmail(longEmail);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Email must be less than 254 characters');
    });

    it('should reject invalid email format', () => {
      const invalidEmails = ['notanemail', 'missing@domain', '@nodomain.com', 'spaces in@email.com'];
      invalidEmails.forEach(email => {
        const result = service.validateEmail(email);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Please enter a valid email address');
      });
    });

    it('should accept valid email', () => {
      const result = service.validateEmail('test@example.com');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should trim whitespace from email', () => {
      const result = service.validateEmail('  test@example.com  ');
      expect(result.valid).toBe(true);
    });
  });

  describe('Password Validation', () => {
    it('should reject empty password', () => {
      const result = service.validatePassword('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Password is required');
    });

    it('should reject password shorter than 8 characters', () => {
      const result = service.validatePassword('Short1!');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Password must be at least 8 characters');
    });

    it('should reject password longer than 128 characters', () => {
      const longPassword = 'A1!' + 'a'.repeat(126);
      const result = service.validatePassword(longPassword);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Password must be less than 128 characters');
    });

    it('should reject password without uppercase', () => {
      const result = service.validatePassword('password1!');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Password must contain uppercase, lowercase, number, and special character');
    });

    it('should reject password without lowercase', () => {
      const result = service.validatePassword('PASSWORD1!');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Password must contain uppercase, lowercase, number, and special character');
    });

    it('should reject password without number', () => {
      const result = service.validatePassword('Password!');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Password must contain uppercase, lowercase, number, and special character');
    });

    it('should reject password without special character', () => {
      const result = service.validatePassword('Password1');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Password must contain uppercase, lowercase, number, and special character');
    });

    it('should accept valid password', () => {
      const result = service.validatePassword('ValidPass1!');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('JWT Token Validation', () => {
    it('should validate correct JWT structure', () => {
      const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      expect(service['validateJWTStructure'](validToken)).toBe(true);
    });

    it('should reject token with less than 3 parts', () => {
      expect(service['validateJWTStructure']('invalid.token')).toBe(false);
    });

    it('should reject empty token', () => {
      expect(service['validateJWTStructure']('')).toBe(false);
    });

    it('should reject null token', () => {
      expect(service['validateJWTStructure'](null as any)).toBe(false);
    });
  });

  describe('Token Decoding', () => {
    it('should decode valid JWT token', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItaWQiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJleHAiOjk5OTk5OTk5OTl9.test';
      const decoded = service.decodeToken(token);
      expect(decoded).toBeTruthy();
      expect(decoded?.sub).toBe('test-user-id');
      expect(decoded?.email).toBe('test@example.com');
    });

    it('should return null for invalid token', () => {
      const decoded = service.decodeToken('invalid-token');
      expect(decoded).toBeNull();
    });

    it('should detect expired token', () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0IiwiZXhwIjoxfQ.test';
      expect(service.isTokenExpired(expiredToken)).toBe(true);
    });

    it('should detect valid token', () => {
      const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0IiwiZXhwIjo5OTk5OTk5OTk5fQ.test';
      expect(service.isTokenExpired(validToken)).toBe(false);
    });
  });

  describe('Login', () => {
    it('should login successfully with valid credentials', (done) => {
      service.login('test@example.com', 'ValidPass1!').subscribe({
        next: (response) => {
          expect(response).toEqual(mockAuthResponse);
          expect(service.getAccessToken()).toBe(mockAuthResponse.access_token);
          expect(service.getCurrentUser()).toEqual(mockUser);
          done();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/auth/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'test@example.com', password: 'ValidPass1!' });
      req.flush(mockAuthResponse);
    });

    it('should reject login with invalid email', (done) => {
      service.login('invalid-email', 'ValidPass1!').subscribe({
        error: (error) => {
          expect(error.message).toBe('Please enter a valid email address');
          done();
        }
      });
    });

    it('should reject login with invalid password', (done) => {
      service.login('test@example.com', 'short').subscribe({
        error: (error) => {
          expect(error.message).toBe('Password must be at least 8 characters');
          done();
        }
      });
    });

    it('should handle 401 error with user-friendly message', (done) => {
      service.login('test@example.com', 'ValidPass1!').subscribe({
        error: (error) => {
          expect(error.message).toBe('Invalid email or password');
          done();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/auth/login`);
      req.flush({ detail: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });
    });

    it('should handle 429 rate limit error', (done) => {
      service.login('test@example.com', 'ValidPass1!').subscribe({
        error: (error) => {
          expect(error.message).toContain('Too many login attempts');
          done();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/auth/login`);
      req.flush({ detail: 'Rate limit exceeded' }, { 
        status: 429, 
        statusText: 'Too Many Requests',
        headers: { 'Retry-After': '300' }
      });
    });

    it('should sanitize email input', (done) => {
      service.login('<script>alert("xss")</script>test@example.com', 'ValidPass1!').subscribe({
        next: () => done()
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/auth/login`);
      expect(req.request.body.email).toBe('test@example.com');
      req.flush(mockAuthResponse);
    });
  });

  describe('Signup', () => {
    it('should signup successfully with valid credentials', (done) => {
      service.signup('newuser@example.com', 'ValidPass1!').subscribe({
        next: (response) => {
          expect(response).toEqual(mockAuthResponse);
          expect(service.getAccessToken()).toBe(mockAuthResponse.access_token);
          expect(service.getCurrentUser()).toEqual(mockUser);
          done();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/auth/signup`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'newuser@example.com', password: 'ValidPass1!' });
      req.flush(mockAuthResponse);
    });

    it('should reject signup with invalid email', (done) => {
      service.signup('invalid-email', 'ValidPass1!').subscribe({
        error: (error) => {
          expect(error.message).toBe('Please enter a valid email address');
          done();
        }
      });
    });

    it('should reject signup with weak password', (done) => {
      service.signup('test@example.com', 'weak').subscribe({
        error: (error) => {
          expect(error.message).toBe('Password must be at least 8 characters');
          done();
        }
      });
    });
  });

  describe('Logout', () => {
    it('should clear tokens and user data on logout', (done) => {
      // Set up authenticated state
      localStorage.setItem('access_token', 'test-token');
      localStorage.setItem('refresh_token', 'test-refresh');
      localStorage.setItem('user', JSON.stringify(mockUser));

      service.logout().subscribe({
        next: () => {
          expect(service.getAccessToken()).toBeNull();
          expect(service.getCurrentUser()).toBeNull();
          expect(localStorage.getItem('access_token')).toBeNull();
          expect(localStorage.getItem('refresh_token')).toBeNull();
          expect(localStorage.getItem('user')).toBeNull();
          expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login']);
          done();
        }
      });
    });
  });

  describe('Token Refresh', () => {
    it('should refresh token successfully', (done) => {
      localStorage.setItem('refresh_token', 'old-refresh-token');

      service.refreshToken().subscribe({
        next: (response) => {
          expect(response).toEqual(mockAuthResponse);
          expect(service.getAccessToken()).toBe(mockAuthResponse.access_token);
          done();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/auth/refresh`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ refresh_token: 'old-refresh-token' });
      req.flush(mockAuthResponse);
    });

    it('should handle refresh failure and logout user', (done) => {
      localStorage.setItem('refresh_token', 'invalid-refresh-token');
      localStorage.setItem('access_token', 'old-access-token');

      service.refreshToken().subscribe({
        error: () => {
          expect(service.getAccessToken()).toBeNull();
          expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login']);
          done();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/auth/refresh`);
      req.flush({ detail: 'Invalid refresh token' }, { status: 401, statusText: 'Unauthorized' });
    });

    it('should return error when no refresh token available', (done) => {
      service.refreshToken().subscribe({
        error: (error) => {
          expect(error.message).toBe('No refresh token available');
          done();
        }
      });
    });
  });

  describe('Token Storage', () => {
    it('should store valid tokens', () => {
      const accessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0In0.test';
      const refreshToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0In0.refresh';
      
      service.setTokens(accessToken, refreshToken);
      
      expect(localStorage.getItem('access_token')).toBe(accessToken);
      expect(localStorage.getItem('refresh_token')).toBe(refreshToken);
    });

    it('should not store invalid access token', () => {
      service.setTokens('invalid-token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0In0.refresh');
      expect(localStorage.getItem('access_token')).toBeNull();
    });

    it('should not store invalid refresh token', () => {
      service.setTokens('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0In0.test', 'invalid-token');
      expect(localStorage.getItem('refresh_token')).toBeNull();
    });

    it('should clear all tokens', () => {
      localStorage.setItem('access_token', 'test-token');
      localStorage.setItem('refresh_token', 'test-refresh');
      localStorage.setItem('user', JSON.stringify(mockUser));

      service.clearTokens();

      expect(localStorage.getItem('access_token')).toBeNull();
      expect(localStorage.getItem('refresh_token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });

  describe('User Management', () => {
    it('should return current user', () => {
      service['currentUserSubject'].next(mockUser);
      expect(service.getCurrentUser()).toEqual(mockUser);
    });

    it('should return null when no user is logged in', () => {
      expect(service.getCurrentUser()).toBeNull();
    });

    it('should detect admin user', () => {
      const adminUser: User = { ...mockUser, role: 'Master_Admin' };
      service['currentUserSubject'].next(adminUser);
      expect(service.isAdmin()).toBe(true);
    });

    it('should detect non-admin user', () => {
      service['currentUserSubject'].next(mockUser);
      expect(service.isAdmin()).toBe(false);
    });
  });

  describe('Authentication State', () => {
    it('should emit authentication state changes', (done) => {
      service.isAuthenticated$.subscribe(isAuth => {
        if (isAuth) {
          expect(isAuth).toBe(true);
          done();
        }
      });

      service.login('test@example.com', 'ValidPass1!').subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/auth/login`);
      req.flush(mockAuthResponse);
    });

    it('should emit current user changes', (done) => {
      service.currentUser$.subscribe(user => {
        if (user) {
          expect(user).toEqual(mockUser);
          done();
        }
      });

      service.login('test@example.com', 'ValidPass1!').subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/auth/login`);
      req.flush(mockAuthResponse);
    });
  });

  describe('Load User from Storage', () => {
    it('should load user from storage on initialization', () => {
      localStorage.setItem('user', JSON.stringify(mockUser));
      localStorage.setItem('access_token', mockAuthResponse.access_token);

      const newService = new AuthService();
      
      expect(newService.getCurrentUser()).toEqual(mockUser);
    });

    it('should not load user if token is expired', () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0IiwiZXhwIjoxfQ.test';
      localStorage.setItem('user', JSON.stringify(mockUser));
      localStorage.setItem('access_token', expiredToken);

      const newService = new AuthService();
      
      expect(newService.getCurrentUser()).toBeNull();
      expect(localStorage.getItem('access_token')).toBeNull();
    });

    it('should handle corrupted user data in storage', () => {
      localStorage.setItem('user', 'invalid-json');
      localStorage.setItem('access_token', mockAuthResponse.access_token);

      const newService = new AuthService();
      
      expect(newService.getCurrentUser()).toBeNull();
    });
  });
});
 