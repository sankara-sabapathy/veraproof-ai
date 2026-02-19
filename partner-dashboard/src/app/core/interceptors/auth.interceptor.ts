import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, take, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { SecurityService } from '../services/security.service';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

/**
 * HTTP Interceptor that adds authentication token and CSRF token to requests
 * and handles automatic token refresh on 401 errors
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);
  const securityService = inject(SecurityService);
  const router = inject(Router);

  // Skip auth for login/signup/refresh endpoints
  if (isAuthEndpoint(req.url)) {
    return next(req);
  }

  // Add token to request
  const token = authService.getAccessToken();
  if (token) {
    req = addToken(req, token);
  }

  // Add CSRF token for state-changing operations
  if (isStateChangingRequest(req.method)) {
    const csrfToken = securityService.getCsrfToken();
    if (csrfToken) {
      req = addCsrfToken(req, csrfToken);
    }
  }

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        return handle401Error(req, next, authService, router);
      }
      return throwError(() => error);
    })
  );
};

/**
 * Add Authorization header with Bearer token
 */
function addToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
}

/**
 * Add CSRF token header for state-changing requests
 */
function addCsrfToken(req: HttpRequest<unknown>, csrfToken: string): HttpRequest<unknown> {
  return req.clone({
    setHeaders: {
      'X-CSRF-Token': csrfToken
    }
  });
}

/**
 * Check if request method is state-changing (requires CSRF protection)
 */
function isStateChangingRequest(method: string): boolean {
  return ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase());
}

/**
 * Handle 401 errors by attempting token refresh
 */
function handle401Error(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService,
  router: Router
): Observable<HttpEvent<unknown>> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return authService.refreshToken().pipe(
      switchMap((response) => {
        isRefreshing = false;
        refreshTokenSubject.next(response.access_token);
        return next(addToken(req, response.access_token));
      }),
      catchError((error) => {
        isRefreshing = false;
        authService.logout().subscribe();
        router.navigate(['/auth/login']);
        return throwError(() => error);
      })
    );
  } else {
    // Wait for token refresh to complete
    return refreshTokenSubject.pipe(
      filter((token) => token !== null),
      take(1),
      switchMap((token) => next(addToken(req, token!)))
    );
  }
}

/**
 * Check if URL is an auth endpoint that should skip token injection
 */
function isAuthEndpoint(url: string): boolean {
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/signup') ||
    url.includes('/auth/refresh')
  );
}
