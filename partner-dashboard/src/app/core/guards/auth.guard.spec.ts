import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { AuthGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let isAuthenticatedSubject: BehaviorSubject<boolean>;

  beforeEach(() => {
    isAuthenticatedSubject = new BehaviorSubject<boolean>(false);

    const authServiceSpy = jasmine.createSpyObj('AuthService', ['isAdmin'], {
      isAuthenticated$: isAuthenticatedSubject.asObservable()
    });

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
      isAuthenticatedSubject.next(true);

      guard.canActivate(route, state).subscribe(result => {
        expect(result).toBe(true);
        expect(router.navigate).not.toHaveBeenCalled();
        done();
      });
    });

    it('should deny access when user is not authenticated', (done) => {
      isAuthenticatedSubject.next(false);

      guard.canActivate(route, state).subscribe(result => {
        expect(result).toBe(false);
        expect(router.navigate).toHaveBeenCalledWith(['/auth/login'], {
          queryParams: { returnUrl: '/dashboard' }
        });
        done();
      });
    });

    it('should preserve return URL in query params', (done) => {
      const protectedUrl = '/api-keys';
      state = { url: protectedUrl } as RouterStateSnapshot;
      isAuthenticatedSubject.next(false);

      guard.canActivate(route, state).subscribe(result => {
        expect(result).toBe(false);
        expect(router.navigate).toHaveBeenCalledWith(['/auth/login'], {
          queryParams: { returnUrl: protectedUrl }
        });
        done();
      });
    });

    it('should preserve complex URLs with query params', (done) => {
      const complexUrl = '/sessions?status=complete&date_from=2024-01-01';
      state = { url: complexUrl } as RouterStateSnapshot;
      isAuthenticatedSubject.next(false);

      guard.canActivate(route, state).subscribe(result => {
        expect(result).toBe(false);
        expect(router.navigate).toHaveBeenCalledWith(['/auth/login'], {
          queryParams: { returnUrl: complexUrl }
        });
        done();
      });
    });

    it('should handle authentication state changes', (done) => {
      // Start unauthenticated
      isAuthenticatedSubject.next(false);

      guard.canActivate(route, state).subscribe(result => {
        expect(result).toBe(false);
        done();
      });
    });

    it('should handle root path redirect', (done) => {
      state = { url: '/' } as RouterStateSnapshot;
      isAuthenticatedSubject.next(false);

      guard.canActivate(route, state).subscribe(result => {
        expect(result).toBe(false);
        expect(router.navigate).toHaveBeenCalledWith(['/auth/login'], {
          queryParams: { returnUrl: '/' }
        });
        done();
      });
    });

    it('should handle nested routes', (done) => {
      state = { url: '/admin/tenants/123' } as RouterStateSnapshot;
      isAuthenticatedSubject.next(false);

      guard.canActivate(route, state).subscribe(result => {
        expect(result).toBe(false);
        expect(router.navigate).toHaveBeenCalledWith(['/auth/login'], {
          queryParams: { returnUrl: '/admin/tenants/123' }
        });
        done();
      });
    });
  });
});
