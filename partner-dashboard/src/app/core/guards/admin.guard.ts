import { Injectable, inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * AdminGuard protects routes requiring Master_Admin privileges.
 * Redirects non-admin users to dashboard with error notification.
 * 
 * Requirements: 9.1 - Master_Admin access control for administrative views
 */
@Injectable({
  providedIn: 'root'
})
export class AdminGuard {
  private authService = inject(AuthService);
  private router = inject(Router);

  canActivate(): boolean {
    if (this.authService.isAdmin()) {
      return true;
    }

    // Redirect to dashboard if user is not an admin
    // Note: Notification service will be added in future task
    console.warn('Access denied. Admin privileges required.');
    this.router.navigate(['/dashboard']);
    return false;
  }
}

/**
 * Functional guard for use in route configuration
 */
export const canActivateAdmin: CanActivateFn = () => {
  const adminGuard = inject(AdminGuard);
  return adminGuard.canActivate();
};
