import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['initializeAuth']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    guard = TestBed.inject(AuthGuard);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  describe('canActivate', () => {
    let route: ActivatedRouteSnapshot;
    let state: RouterStateSnapshot;

    beforeEach(() => {
      route = {} as ActivatedRouteSnapshot;
      state = { url: '/dashboard' } as RouterStateSnapshot;
    });

    it('should allow access when user is authenticated', (done) => {
      authService.initializeAuth.and.returnValue(of({ authenticated: true } as any));

      guard.canActivate(route, state).subscribe(result => {
        expect(result).toBe(true);
        expect(router.navigate).not.toHaveBeenCalled();
        done();
      });
    });

    it('should deny access when user is not authenticated', (done) => {
      authService.initializeAuth.and.returnValue(of({ authenticated: false } as any));

      guard.canActivate(route, state).subscribe(result => {
        expect(result).toBe(false);
        expect(router.navigate).toHaveBeenCalledWith(['/auth/login'], {
          queryParams: { returnUrl: '/dashboard' }
        });
        done();
      });
    });

    it('should preserve complex URLs with query params', (done) => {
      const complexUrl = '/sessions?status=complete&date_from=2024-01-01';
      state = { url: complexUrl } as RouterStateSnapshot;
      authService.initializeAuth.and.returnValue(of({ authenticated: false } as any));

      guard.canActivate(route, state).subscribe(result => {
        expect(result).toBe(false);
        expect(router.navigate).toHaveBeenCalledWith(['/auth/login'], {
          queryParams: { returnUrl: complexUrl }
        });
        done();
      });
    });

    it('should deny access when auth bootstrap errors', (done) => {
      authService.initializeAuth.and.returnValue(throwError(() => new Error('boom')));

      guard.canActivate(route, state).subscribe(result => {
        expect(result).toBe(false);
        expect(router.navigate).toHaveBeenCalledWith(['/auth/login'], {
          queryParams: { returnUrl: '/dashboard' }
        });
        done();
      });
    });
  });
});
