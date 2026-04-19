import { Injectable, inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard {
  private authService = inject(AuthService);
  private router = inject(Router);
  private notification = inject(NotificationService);

  canActivate(): boolean {
    if (this.authService.isAdmin()) {
      return true;
    }

    this.notification.warning('You do not have access to the admin workspace.');
    this.router.navigate(['/dashboard']);
    return false;
  }
}

export const canActivateAdmin: CanActivateFn = () => {
  const adminGuard = inject(AdminGuard);
  return adminGuard.canActivate();
};
