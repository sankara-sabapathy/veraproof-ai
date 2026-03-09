import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of, throwError, timer } from 'rxjs';
import { catchError, delayWhen, finalize, retryWhen, scan, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthProviders, AuthResponse, AuthSessionState, LoginRequest, SignupRequest, User } from '../models/interfaces';
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

  private authReadySubject = new BehaviorSubject<boolean>(false);
  public authReady$ = this.authReadySubject.asObservable();

  private authProvidersSubject = new BehaviorSubject<AuthProviders>({
    google: false,
    local: !environment.production,
  });
  public authProviders$ = this.authProvidersSubject.asObservable();

  private sessionLoadInFlight$: Observable<AuthSessionState> | null = null;
  private providersLoadInFlight$: Observable<AuthProviders> | null = null;
  private providersLoaded = false;

  private readonly EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  private readonly PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,128}$/;

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

  private sanitizeInput(input: string): string {
    return this.securityService.sanitizeInput(input);
  }

  initializeAuth(force = false): Observable<AuthSessionState> {
    return this.loadSession(force);
  }

  loadSession(force = false): Observable<AuthSessionState> {
    if (!force && this.sessionLoadInFlight$) {
      return this.sessionLoadInFlight$;
    }

    if (!force && this.authReadySubject.value) {
      return of(this.buildCurrentSessionState());
    }

    const request$ = this.http.get<AuthSessionState>(`${environment.apiUrl}/api/v1/auth/session`, { withCredentials: true }).pipe(
      tap((response) => {
        if (response.authenticated && response.user) {
          this.securityService.setCsrfToken(response.csrf_token || '');
          this.currentUserSubject.next(response.user);
          this.isAuthenticatedSubject.next(true);
        } else {
          this.currentUserSubject.next(null);
          this.isAuthenticatedSubject.next(false);
          this.securityService.clearCsrfToken();
        }
        this.authReadySubject.next(true);
      }),
      catchError(() => {
        this.currentUserSubject.next(null);
        this.isAuthenticatedSubject.next(false);
        this.securityService.clearCsrfToken();
        this.authReadySubject.next(true);
        return of({ authenticated: false } as AuthSessionState);
      }),
      finalize(() => {
        this.sessionLoadInFlight$ = null;
      }),
      shareReplay(1)
    );

    this.sessionLoadInFlight$ = request$;
    return request$;
  }

  getAuthProviders(force = false): Observable<AuthProviders> {
    if (!force && this.providersLoadInFlight$) {
      return this.providersLoadInFlight$;
    }

    if (!force && this.providersLoaded) {
      return of(this.authProvidersSubject.value);
    }

    const request$ = this.http.get<AuthProviders>(`${environment.apiUrl}/api/v1/auth/providers`, { withCredentials: true }).pipe(
      tap((providers) => {
        this.providersLoaded = true;
        this.authProvidersSubject.next(providers);
      }),
      catchError(() => {
        const fallback = { google: false, local: !environment.production };
        this.providersLoaded = true;
        this.authProvidersSubject.next(fallback);
        return of(fallback);
      }),
      finalize(() => {
        this.providersLoadInFlight$ = null;
      }),
      shareReplay(1)
    );

    this.providersLoadInFlight$ = request$;
    return request$;
  }

  startGoogleLogin(): void {
    window.location.href = `${environment.apiUrl}/api/v1/auth/google/login`;
  }

  completeAuthCallback(): Observable<AuthSessionState> {
    return this.loadSession(true);
  }

  login(email: string, password: string): Observable<AuthResponse> {
    const sanitizedEmail = this.sanitizeInput(email);
    const emailValidation = this.validateEmail(sanitizedEmail);
    if (!emailValidation.valid) {
      return throwError(() => new Error(emailValidation.error));
    }
    const passwordValidation = this.validatePassword(password);
    if (!passwordValidation.valid) {
      return throwError(() => new Error(passwordValidation.error));
    }
    const loginRequest: LoginRequest = { email: sanitizedEmail, password };
    return this.http.post<AuthResponse>(`${environment.apiUrl}/api/v1/auth/login`, loginRequest, { withCredentials: true }).pipe(
      retryWhen(errors => this.retryWithBackoff(errors)),
      tap((response) => {
        this.currentUserSubject.next(response.user);
        this.isAuthenticatedSubject.next(true);
        this.authReadySubject.next(true);
        void this.loadSession(true).subscribe();
      }),
      catchError(error => this.handleAuthError(error))
    );
  }

  signup(email: string, password: string): Observable<AuthResponse> {
    const sanitizedEmail = this.sanitizeInput(email);
    const emailValidation = this.validateEmail(sanitizedEmail);
    if (!emailValidation.valid) {
      return throwError(() => new Error(emailValidation.error));
    }
    const passwordValidation = this.validatePassword(password);
    if (!passwordValidation.valid) {
      return throwError(() => new Error(passwordValidation.error));
    }
    const signupRequest: SignupRequest = { email: sanitizedEmail, password };
    return this.http.post<AuthResponse>(`${environment.apiUrl}/api/v1/auth/signup`, signupRequest, { withCredentials: true }).pipe(
      retryWhen(errors => this.retryWithBackoff(errors)),
      tap((response) => {
        this.currentUserSubject.next(response.user);
        this.isAuthenticatedSubject.next(true);
        this.authReadySubject.next(true);
        void this.loadSession(true).subscribe();
      }),
      catchError(error => this.handleAuthError(error))
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/api/v1/auth/logout`, {}, { withCredentials: true }).pipe(
      tap(() => this.resetAuthState()),
      catchError((error) => {
        this.resetAuthState();
        return throwError(() => error);
      })
    );
  }

  handleUnauthorized(): void {
    this.resetAuthState();
    void this.router.navigate(['/auth/login']);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return Boolean(user?.permissions?.includes('platform.metadata.read') || user?.role === 'Master_Admin' || user?.roles?.includes('platform_admin'));
  }

  hasPermission(permission: string): boolean {
    const user = this.getCurrentUser();
    return Boolean(user?.permissions?.includes(permission));
  }

  private buildCurrentSessionState(): AuthSessionState {
    const user = this.currentUserSubject.value;
    return {
      authenticated: Boolean(user),
      auth_type: user ? 'session_cookie' : null,
      csrf_token: this.securityService.getCsrfToken(),
      user,
    };
  }

  private resetAuthState(): void {
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    this.securityService.clearCsrfToken();
    this.authReadySubject.next(true);
  }

  private handleAuthError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unexpected error occurred';
    if (error.status === 401) {
      errorMessage = 'Invalid email or password';
    } else if (error.status === 429) {
      const retryAfter = error.headers.get('Retry-After');
      const minutes = retryAfter ? Math.ceil(parseInt(retryAfter, 10) / 60) : 5;
      errorMessage = `Too many login attempts. Please try again in ${minutes} minutes`;
    } else if (error.status === 0) {
      errorMessage = 'Unable to connect to server. Please check your connection.';
    } else if (error.error?.detail) {
      errorMessage = error.error.detail;
    }
    return throwError(() => new Error(errorMessage));
  }

  private retryWithBackoff(errors: Observable<any>): Observable<any> {
    return errors.pipe(
      scan((retryCount, error) => {
        if (error.status >= 400 && error.status < 500 && error.status !== 429) {
          throw error;
        }
        if (retryCount >= 3) {
          throw error;
        }
        return retryCount + 1;
      }, 0),
      delayWhen(retryCount => timer(Math.pow(2, retryCount - 1) * 1000))
    );
  }
}
