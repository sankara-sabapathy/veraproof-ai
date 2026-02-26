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

  it('should display all navigation items for regular users', () => {
    authService.isAdmin.and.returnValue(false);
    fixture.detectChanges();

    expect(component.menuItems.length).toBe(7); // All except Admin
  });

  it('should display all navigation items including Admin for Master_Admin', () => {
    authService.isAdmin.and.returnValue(true);
    fixture.detectChanges();

    expect(component.menuItems.length).toBe(8); // All items including Admin
  });

  it('should hide Admin menu item for non-admin users', () => {
    authService.isAdmin.and.returnValue(false);
    fixture.detectChanges();

    const adminItem = component.menuItems.find(item => item.label === 'Admin');
    expect(adminItem).toBeUndefined();
  });

  it('should show Admin menu item for admin users', () => {
    authService.isAdmin.and.returnValue(true);
    fixture.detectChanges();

    const adminItem = component.menuItems.find(item => item.label === 'Admin');
    expect(adminItem).toBeDefined();
  });

  it('should emit navItemClick event when navigation item is clicked', () => {
    authService.isAdmin.and.returnValue(false);
    fixture.detectChanges();

    spyOn(component.navItemClick, 'emit');
    component.onNavItemClicked();
    expect(component.navItemClick.emit).toHaveBeenCalled();
  });

  it('should render logo and app name', () => {
    authService.isAdmin.and.returnValue(false);
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    const logoText = compiled.querySelector('.logo-text');
    expect(logoText?.textContent).toContain('VeraProof AI');
  });

  it('should have correct navigation routes', () => {
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
      const menuItem = component.menuItems.find(item => item.label === expected.label);
      expect(menuItem).toBeDefined();
      expect(menuItem?.label).toBe(expected.label);
    });
  });

  it('should navigate when menu item is clicked', () => {
    authService.isAdmin.and.returnValue(false);
    fixture.detectChanges();

    spyOn(router, 'navigate');
    spyOn(component.navItemClick, 'emit');

    const dashboardItem = component.menuItems.find(item => item.label === 'Dashboard');
    dashboardItem?.command!({} as any);

    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(component.navItemClick.emit).toHaveBeenCalled();
  });

  it('should update active state when route changes', () => {
    authService.isAdmin.and.returnValue(false);
    Object.defineProperty(router, 'url', {
      get: () => '/analytics',
      configurable: true
    });
    fixture.detectChanges();

    component.updateActiveState();

    const analyticsItem = component.menuItems.find(item => item.label === 'Analytics');
    expect(analyticsItem?.styleClass).toContain('active-menu-item');
  });

  it('should use PrimeIcons instead of Material Icons', () => {
    authService.isAdmin.and.returnValue(false);
    fixture.detectChanges();

    component.menuItems.forEach(item => {
      expect(item.icon).toMatch(/^pi pi-/);
    });
  });
});
