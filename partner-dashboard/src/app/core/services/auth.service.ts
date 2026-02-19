import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, throwError, timer } from 'rxjs';
import { tap, catchError, retry, delayWhen, retryWhen, scan } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { User, AuthResponse, LoginRequest, SignupRequest, DecodedToken } from '../models/interfaces';
import { SecurityService } from './security.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private securityService = inject(SecurityService);
  
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  private readonly TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_KEY = 'user';
  private readonly EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  private readonly PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,128}$/;

  constructor() {
    this.loadUserFromStorage();
  }

  /**
   * Validates email format according to RFC 5322
   */
  validateEmail(email: string): { valid: boolean; error?: string } {
    if (!email || email.trim().length === 0) {
      return { valid: false, error: 'Email is required' };
    }

    const trimmedEmail = email.trim();
    
    if (trimmedEmail.length > 254) {
      return { valid: false, error: 'Email must be less than 254 characters' };
    }

    if (!this.EMAIL_REGEX.test(trimmedEmail)) {
      return { valid: false, error: 'Please enter a valid email address' };
    }

    return { valid: true };
  }

  /**
   * Validates password strength
   */
  validatePassword(password: string): { valid: boolean; error?: string } {
    if (!password || password.length === 0) {
      return { valid: false, error: 'Password is required' };
    }

    if (password.length < 8) {
      return { valid: false, error: 'Password must be at least 8 characters' };
    }

    if (password.length > 128) {
      return { valid: false, error: 'Password must be less than 128 characters' };
    }

    if (!this.PASSWORD_REGEX.test(password)) {
      return { valid: false, error: 'Password must contain uppercase, lowercase, number, and special character' };
    }

    return { valid: true };
  }

  /**
   * Sanitizes input by removing HTML tags and trimming whitespace
   */
  private sanitizeInput(input: string): string {
    return this.securityService.sanitizeInput(input);
  }

  /**
   * Login with email and password
   */
  login(email: string, password: string): Observable<AuthResponse> {
    const sanitizedEmail = this.sanitizeInput(email);
    
    // Validate inputs
    const emailValidation = this.validateEmail(sanitizedEmail);
    if (!emailValidation.valid) {
      return throwError(() => new Error(emailValidation.error));
    }

    const passwordValidation = this.validatePassword(password);
    if (!passwordValidation.valid) {
      return throwError(() => new Error(passwordValidation.error));
    }

    const loginRequest: LoginRequest = {
      email: sanitizedEmail,
      password: password
    };

    return this.http.post<AuthResponse>(`${environment.apiUrl}/api/v1/auth/login`, loginRequest)
      .pipe(
        retryWhen(errors => this.retryWithBackoff(errors)),
        tap(response => this.handleAuthSuccess(response)),
        catchError(error => this.handleAuthError(error))
      );
  }

  /**
   * Signup with email and password
   */
  signup(email: string, password: string): Observable<AuthResponse> {
    const sanitizedEmail = this.sanitizeInput(email);
    
    // Validate inputs
    const emailValidation = this.validateEmail(sanitizedEmail);
    if (!emailValidation.valid) {
      return throwError(() => new Error(emailValidation.error));
    }

    const passwordValidation = this.validatePassword(password);
    if (!passwordValidation.valid) {
      return throwError(() => new Error(passwordValidation.error));
    }

    const signupRequest: SignupRequest = {
      email: sanitizedEmail,
      password: password
    };

    return this.http.post<AuthResponse>(`${environment.apiUrl}/api/v1/auth/signup`, signupRequest)
      .pipe(
        retryWhen(errors => this.retryWithBackoff(errors)),
        tap(response => this.handleAuthSuccess(response)),
        catchError(error => this.handleAuthError(error))
      );
  }

  /**
   * Logout and clear all session data
   */
  logout(): Observable<void> {
    return new Observable(observer => {
      this.clearTokens();
      this.currentUserSubject.next(null);
      this.isAuthenticatedSubject.next(false);
      this.router.navigate(['/auth/login']);
      observer.next();
      observer.complete();
    });
  }

  /**
   * Refresh access token using refresh token
   */
  refreshToken(): Observable<AuthResponse> {
    const refreshToken = this.getRefreshToken();
    
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http.post<AuthResponse>(`${environment.apiUrl}/api/v1/auth/refresh`, {
      refresh_token: refreshToken
    }).pipe(
      tap(response => this.handleAuthSuccess(response)),
      catchError(error => {
        // If refresh fails, logout user
        this.clearTokens();
        this.currentUserSubject.next(null);
        this.isAuthenticatedSubject.next(false);
        this.router.navigate(['/auth/login']);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Get refresh token
   */
  private getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Set tokens in secure storage
   */
  setTokens(accessToken: string, refreshToken: string): void {
    if (!this.validateJWTStructure(accessToken)) {
      console.error('Invalid access token structure');
      return;
    }

    if (!this.validateJWTStructure(refreshToken)) {
      console.error('Invalid refresh token structure');
      return;
    }

    localStorage.setItem(this.TOKEN_KEY, accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
  }

  /**
   * Clear all tokens and user data
   */
  clearTokens(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    
    // Clear CSRF token
    this.securityService.clearCsrfToken();
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Check if user is admin
   */
  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'Master_Admin';
  }

  /**
   * Decode JWT token
   */
  decodeToken(token: string): DecodedToken | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = parts[1];
      const decoded = JSON.parse(atob(payload));
      return decoded as DecodedToken;
    } catch (error) {
      console.error('Failed to decode token:', error);
      return null;
    }
  }

  /**
   * Validate JWT structure (3 parts separated by dots)
   */
  private validateJWTStructure(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    // Check each part is base64 encoded
    try {
      parts.forEach(part => {
        if (part.length === 0) {
          throw new Error('Empty part');
        }
        atob(part.replace(/-/g, '+').replace(/_/g, '/'));
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) {
      return true;
    }

    const expirationDate = new Date(decoded.exp * 1000);
    return expirationDate < new Date();
  }

  /**
   * Handle successful authentication
   */
  private handleAuthSuccess(response: AuthResponse): void {
    this.setTokens(response.access_token, response.refresh_token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
    this.currentUserSubject.next(response.user);
    this.isAuthenticatedSubject.next(true);
    
    // Generate CSRF token on successful authentication
    this.securityService.generateCsrfToken();
  }

  /**
   * Handle authentication errors with user-friendly messages
   */
  private handleAuthError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unexpected error occurred';

    if (error.status === 401) {
      errorMessage = 'Invalid email or password';
    } else if (error.status === 429) {
      const retryAfter = error.headers.get('Retry-After');
      const minutes = retryAfter ? Math.ceil(parseInt(retryAfter) / 60) : 5;
      errorMessage = `Too many login attempts. Please try again in ${minutes} minutes`;
    } else if (error.status === 0) {
      errorMessage = 'Unable to connect to server. Please check your connection.';
    } else if (error.error?.detail) {
      errorMessage = error.error.detail;
    }

    return throwError(() => new Error(errorMessage));
  }

  /**
   * Retry with exponential backoff (1s, 2s, 4s)
   */
  private retryWithBackoff(errors: Observable<any>): Observable<any> {
    return errors.pipe(
      scan((retryCount, error) => {
        // Don't retry on 4xx errors (except 429)
        if (error.status >= 400 && error.status < 500 && error.status !== 429) {
          throw error;
        }

        // Max 3 retries
        if (retryCount >= 3) {
          throw error;
        }

        return retryCount + 1;
      }, 0),
      delayWhen(retryCount => {
        const delay = Math.pow(2, retryCount - 1) * 1000; // 1s, 2s, 4s
        return timer(delay);
      })
    );
  }

  /**
   * Load user from storage on service initialization
   */
  private loadUserFromStorage(): void {
    const userJson = localStorage.getItem(this.USER_KEY);
    const token = this.getAccessToken();

    if (userJson && token) {
      try {
        const user = JSON.parse(userJson) as User;
        
        // Validate token is not expired
        if (!this.isTokenExpired(token)) {
          this.currentUserSubject.next(user);
          this.isAuthenticatedSubject.next(true);
        } else {
          // Token expired, clear storage
          this.clearTokens();
        }
      } catch (error) {
        console.error('Failed to parse user from storage:', error);
        this.clearTokens();
      }
    }
  }
}
