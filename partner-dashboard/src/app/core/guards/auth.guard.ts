import { Injectable, inject } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, CanActivateFn } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard {
  private authService = inject(AuthService);
  private router = inject(Router);

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    return this.authService.initializeAuth().pipe(
      map((session) => {
        if (!session.authenticated) {
          this.router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
          return false;
        }
        return true;
      }),
      catchError(() => {
        this.router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
        return of(false);
      })
    );
  }
}

export const canActivateAuth: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const authGuard = inject(AuthGuard);
  return authGuard.canActivate(route, state);
};
