import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class PermissionGuard {
  private authService = inject(AuthService);
  private router = inject(Router);

  canActivate(route: ActivatedRouteSnapshot, _state: RouterStateSnapshot): boolean {
    const permission = route.data?.['permission'] as string | undefined;
    if (!permission || this.authService.hasPermission(permission)) {
      return true;
    }

    if (this.authService.isAdmin()) {
      void this.router.navigate(['/admin/platform-stats']);
    } else {
      void this.router.navigate(['/dashboard']);
    }
    return false;
  }
}

export const canActivatePermission: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const permissionGuard = inject(PermissionGuard);
  return permissionGuard.canActivate(route, state);
};
