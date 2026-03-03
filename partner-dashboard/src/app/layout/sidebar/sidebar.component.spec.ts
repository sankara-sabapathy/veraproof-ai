import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SidebarComponent } from './sidebar.component';
import { AuthService } from '../../core/services/auth.service';

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['isAdmin']);

    await TestBed.configureTestingModule({
      imports: [
        SidebarComponent,
        RouterTestingModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    authService.isAdmin.and.returnValue(false);
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should display all standard navigation items for regular users', () => {
    authService.isAdmin.and.returnValue(false);
    fixture.detectChanges();

    expect(component.visibleNavItems.length).toBe(7); // All except Admin
    expect(component.showAdminSection).toBeFalse();
  });

  it('should show Admin section for Master_Admin', () => {
    authService.isAdmin.and.returnValue(true);
    fixture.detectChanges();

    expect(component.visibleNavItems.length).toBe(7); // Standard items
    expect(component.showAdminSection).toBeTrue();
  });

  it('should emit navItemClick event when navigation item is clicked', () => {
    authService.isAdmin.and.returnValue(false);
    fixture.detectChanges();

    spyOn(component.navItemClick, 'emit');
    component.onNavItemClicked();
    expect(component.navItemClick.emit).toHaveBeenCalled();
  });

  it('should render brand name in sidebar', () => {
    authService.isAdmin.and.returnValue(false);
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('.vp-sidebar')).toBeTruthy();
  });

  it('should have correct standard navigation routes', () => {
    authService.isAdmin.and.returnValue(false);
    fixture.detectChanges();

    const expectedRoutes = [
      { route: '/dashboard', label: 'Dashboard' },
      { route: '/api-keys', label: 'API Keys' },
      { route: '/sessions', label: 'Sessions' },
      { route: '/analytics', label: 'Analytics' },
      { route: '/billing', label: 'Billing' },
      { route: '/webhooks', label: 'Webhooks' },
      { route: '/branding', label: 'Branding' }
    ];

    expectedRoutes.forEach(expected => {
      const navItem = component.visibleNavItems.find(item => item.label === expected.label);
      expect(navItem).toBeDefined();
      expect(navItem?.route).toBe(expected.route);
    });
  });

  it('isActiveRoute should correctly determine active state', () => {
    authService.isAdmin.and.returnValue(false);

    // Test base /dashboard URL logic
    Object.defineProperty(router, 'url', {
      get: () => '/dashboard',
      configurable: true
    });
    fixture.detectChanges();
    expect(component.isActiveRoute('/dashboard')).toBeTrue();
    expect(component.isActiveRoute('/analytics')).toBeFalse();

    // Test sub-route URL logic
    Object.defineProperty(router, 'url', {
      get: () => '/analytics/overview',
      configurable: true
    });
    expect(component.isActiveRoute('/analytics')).toBeTrue();
  });

  it('should use PrimeIcons', () => {
    authService.isAdmin.and.returnValue(false);
    fixture.detectChanges();

    component.visibleNavItems.forEach(item => {
      expect(item.icon).toMatch(/^pi pi-/);
    });
  });
});
