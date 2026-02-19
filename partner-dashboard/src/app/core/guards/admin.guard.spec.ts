import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AdminGuard } from './admin.guard';
import { AuthService } from '../services/auth.service';
import { User } from '../models/interfaces';

describe('AdminGuard', () => {
  let guard: AdminGuard;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['isAdmin', 'getCurrentUser']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        AdminGuard,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    guard = TestBed.inject(AdminGuard);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  describe('canActivate', () => {
    it('should allow access when user is Master_Admin', () => {
      authService.isAdmin.and.returnValue(true);

      const result = guard.canActivate();

      expect(result).toBe(true);
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should deny access when user is not Master_Admin', () => {
      authService.isAdmin.and.returnValue(false);

      const result = guard.canActivate();

      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    });

    it('should deny access when user is regular Admin', () => {
      const regularAdmin: User = {
        user_id: 'user-123',
        tenant_id: 'tenant-456',
        email: 'admin@example.com',
        role: 'Admin'
      };

      authService.getCurrentUser.and.returnValue(regularAdmin);
      authService.isAdmin.and.returnValue(false);

      const result = guard.canActivate();

      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    });

    it('should allow access for Master_Admin role', () => {
      const masterAdmin: User = {
        user_id: 'admin-123',
        tenant_id: 'system',
        email: 'master@veraproof.ai',
        role: 'Master_Admin'
      };

      authService.getCurrentUser.and.returnValue(masterAdmin);
      authService.isAdmin.and.returnValue(true);

      const result = guard.canActivate();

      expect(result).toBe(true);
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should handle null user', () => {
      authService.getCurrentUser.and.returnValue(null);
      authService.isAdmin.and.returnValue(false);

      const result = guard.canActivate();

      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    });

    it('should redirect to dashboard on access denial', () => {
      authService.isAdmin.and.returnValue(false);

      guard.canActivate();

      expect(router.navigate).toHaveBeenCalledOnceWith(['/dashboard']);
    });

    it('should call isAdmin method from AuthService', () => {
      authService.isAdmin.and.returnValue(true);

      guard.canActivate();

      expect(authService.isAdmin).toHaveBeenCalledTimes(1);
    });

    it('should not navigate when access is granted', () => {
      authService.isAdmin.and.returnValue(true);

      guard.canActivate();

      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should handle multiple consecutive calls', () => {
      authService.isAdmin.and.returnValue(false);

      const result1 = guard.canActivate();
      const result2 = guard.canActivate();
      const result3 = guard.canActivate();

      expect(result1).toBe(false);
      expect(result2).toBe(false);
      expect(result3).toBe(false);
      expect(router.navigate).toHaveBeenCalledTimes(3);
    });

    it('should handle role changes between calls', () => {
      // First call - not admin
      authService.isAdmin.and.returnValue(false);
      const result1 = guard.canActivate();
      expect(result1).toBe(false);

      // Second call - now admin
      authService.isAdmin.and.returnValue(true);
      const result2 = guard.canActivate();
      expect(result2).toBe(true);
    });
  });
});
