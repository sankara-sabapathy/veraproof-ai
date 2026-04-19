import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { SecurityService } from '../services/security.service';
import { TenantEnvironmentService } from '../services/tenant-environment.service';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);
  const securityService = inject(SecurityService);
  const router = inject(Router);
  const tenantEnvironmentService = inject(TenantEnvironmentService);

  if (req.url.includes('amazonaws.com') || req.url.includes('X-Amz-Signature')) {
    return next(req);
  }

  let request = req.clone({ withCredentials: true });

  const activeEnvironmentSlug = tenantEnvironmentService.getActiveEnvironmentSlug();
  if (activeEnvironmentSlug && !isEnvironmentSelectionEndpoint(request.url)) {
    request = request.clone({ setHeaders: { 'X-VeraProof-Environment': activeEnvironmentSlug } });
  }

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

function isEnvironmentSelectionEndpoint(url: string): boolean {
  return url.includes('/api/v1/environments/select');
}
