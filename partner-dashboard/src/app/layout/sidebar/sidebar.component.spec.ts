import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSidenav } from '@angular/material/sidenav';
import { SidebarComponent } from './sidebar.component';
import { AuthService } from '../../core/services/auth.service';
import { of } from 'rxjs';

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let mockDrawer: jasmine.SpyObj<MatSidenav>;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['isAdmin']);
    mockDrawer = jasmine.createSpyObj('MatSidenav', ['close']);
    mockDrawer.mode = 'side';

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
    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    component.drawer = mockDrawer;
  });

  it('should create', () => {
    authService.isAdmin.and.returnValue(false);
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should display all navigation items for regular users', () => {
    authService.isAdmin.and.returnValue(false);
    fixture.detectChanges();

    const visibleItems = component.navigationItems.filter(item => component.shouldShowItem(item));
    expect(visibleItems.length).toBe(7); // All except Admin
  });

  it('should display all navigation items including Admin for Master_Admin', () => {
    authService.isAdmin.and.returnValue(true);
    fixture.detectChanges();

    const visibleItems = component.navigationItems.filter(item => component.shouldShowItem(item));
    expect(visibleItems.length).toBe(8); // All items including Admin
  });

  it('should hide Admin menu item for non-admin users', () => {
    authService.isAdmin.and.returnValue(false);
    fixture.detectChanges();

    const adminItem = component.navigationItems.find(item => item.adminOnly);
    expect(component.shouldShowItem(adminItem!)).toBe(false);
  });

  it('should show Admin menu item for admin users', () => {
    authService.isAdmin.and.returnValue(true);
    fixture.detectChanges();

    const adminItem = component.navigationItems.find(item => item.adminOnly);
    expect(component.shouldShowItem(adminItem!)).toBe(true);
  });

  it('should close drawer on mobile after navigation', () => {
    authService.isAdmin.and.returnValue(false);
    mockDrawer.mode = 'over';
    fixture.detectChanges();

    component.onNavItemClick();
    expect(mockDrawer.close).toHaveBeenCalled();
  });

  it('should not close drawer on desktop after navigation', () => {
    authService.isAdmin.and.returnValue(false);
    mockDrawer.mode = 'side';
    fixture.detectChanges();

    component.onNavItemClick();
    expect(mockDrawer.close).not.toHaveBeenCalled();
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

    const expectedRoutes = ['/dashboard', '/api-keys', '/sessions', '/analytics', '/billing', '/webhooks', '/branding'];
    const actualRoutes = component.navigationItems
      .filter(item => !item.adminOnly)
      .map(item => item.route);

    expectedRoutes.forEach(route => {
      expect(actualRoutes).toContain(route);
    });
  });
});
