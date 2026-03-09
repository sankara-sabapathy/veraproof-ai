import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { SecurityService } from '../services/security.service';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);
  const securityService = inject(SecurityService);
  const router = inject(Router);

  if (req.url.includes('amazonaws.com') || req.url.includes('X-Amz-Signature')) {
    return next(req);
  }

  let request = req.clone({ withCredentials: true });

  if (isStateChangingRequest(request.method)) {
    const csrfToken = securityService.getCsrfToken();
    if (csrfToken) {
      request = request.clone({ setHeaders: { 'X-CSRF-Token': csrfToken } });
    }
  }

  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !isAuthEndpoint(request.url)) {
        authService.handleUnauthorized();
        router.navigate(['/auth/login']);
      }
      return throwError(() => error);
    })
  );
};

function isStateChangingRequest(method: string): boolean {
  return ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase());
}

function isAuthEndpoint(url: string): boolean {
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/signup') ||
    url.includes('/auth/session') ||
    url.includes('/auth/google/') ||
    url.includes('/auth/logout')
  );
}
