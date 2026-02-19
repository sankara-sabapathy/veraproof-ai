import { Injectable, inject } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, CanActivateFn } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

/**
 * AuthGuard protects routes requiring authentication.
 * Redirects unauthenticated users to login with return URL preservation.
 * 
 * Requirements: 1.5 - Protect all routes except login/signup with authentication guards
 */
@Injectable({
  providedIn: 'root'
})
export class AuthGuard {
  private authService = inject(AuthService);
  private router = inject(Router);

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.authService.isAuthenticated$.pipe(
      map(isAuthenticated => {
        if (!isAuthenticated) {
          // Preserve the attempted URL for redirecting after login
          this.router.navigate(['/auth/login'], {
            queryParams: { returnUrl: state.url }
          });
          return false;
        }
        return true;
      })
    );
  }
}

/**
 * Functional guard for use in route configuration
 */
export const canActivateAuth: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const authGuard = inject(AuthGuard);
  return authGuard.canActivate(route, state);
};
