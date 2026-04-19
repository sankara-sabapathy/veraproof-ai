import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject, of } from 'rxjs';
import { ToolbarComponent } from './toolbar.component';
import { AuthService } from '../../core/services/auth.service';
import { TenantEnvironmentService } from '../../core/services/tenant-environment.service';

describe('ToolbarComponent', () => {
  let component: ToolbarComponent;
  let fixture: ComponentFixture<ToolbarComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;
  let currentUserSubject: BehaviorSubject<any>;
  let activeEnvironmentSubject: BehaviorSubject<any>;
  let availableEnvironmentsSubject: BehaviorSubject<any[]>;

  beforeEach(async () => {
    currentUserSubject = new BehaviorSubject({ email: 'test@example.com', role: 'Admin', roles: ['org_admin'], permissions: [] });
    activeEnvironmentSubject = new BehaviorSubject({
      environment_id: 'env-production',
      slug: 'production',
      display_name: 'Production',
      is_default: true,
      is_billable: true,
      monthly_quota: 1000,
      current_usage: 0,
      billing_cycle_start: null,
      billing_cycle_end: null,
    });
    availableEnvironmentsSubject = new BehaviorSubject([
      activeEnvironmentSubject.value,
      {
        environment_id: 'env-sandbox',
        slug: 'sandbox',
        display_name: 'Sandbox',
        is_default: false,
        is_billable: false,
        monthly_quota: 100,
        current_usage: 0,
        billing_cycle_start: null,
        billing_cycle_end: null,
      }
    ]);

    const authServiceSpy = jasmine.createSpyObj('AuthService', ['logout'], {
      currentUser$: currentUserSubject.asObservable()
    });
    authServiceSpy.logout.and.returnValue(of(undefined));

    const tenantEnvironmentServiceSpy = jasmine.createSpyObj('TenantEnvironmentService', ['selectEnvironment', 'getActiveEnvironmentSlug'], {
      activeEnvironment$: activeEnvironmentSubject.asObservable(),
      availableEnvironments$: availableEnvironmentsSubject.asObservable(),
    });
    tenantEnvironmentServiceSpy.selectEnvironment.and.returnValue(of(activeEnvironmentSubject.value));
    tenantEnvironmentServiceSpy.getActiveEnvironmentSlug.and.returnValue('production');

    await TestBed.configureTestingModule({
      imports: [
        ToolbarComponent,
        RouterTestingModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: TenantEnvironmentService, useValue: tenantEnvironmentServiceSpy }
      ]
    }).compileComponents();

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(ToolbarComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should display user email', (done) => {
    fixture.detectChanges();

    component.userEmail$.subscribe(email => {
      expect(email).toBe('test@example.com');
      done();
    });
  });

  it('should emit menuToggle event when menu button clicked', () => {
    fixture.detectChanges();
    spyOn(component.menuToggle, 'emit');

    component.onMenuToggle();

    expect(component.menuToggle.emit).toHaveBeenCalled();
  });

  it('should call logout and navigate to login', () => {
    fixture.detectChanges();
    spyOn(router, 'navigate');

    component.onLogout();

    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('should render user menu button', () => {
    fixture.detectChanges();

    const userMenuButton = fixture.nativeElement.querySelector('.user-btn');
    expect(userMenuButton).toBeTruthy();
  });

  it('should initialize user menu items on init', () => {
    fixture.detectChanges();

    expect(component.userMenuItems).toBeDefined();
    expect(component.userMenuItems.length).toBeGreaterThan(0);
    expect(component.userMenuItems[0].label).toBe('Logout');
    expect(component.userMenuItems[0].icon).toBe('pi pi-sign-out');
  });

  it('should render toolbar header', () => {
    fixture.detectChanges();

    const toolbar = fixture.nativeElement.querySelector('.vp-toolbar');
    expect(toolbar).toBeTruthy();
  });

  it('should render brand container', () => {
    fixture.detectChanges();

    const brandContainer = fixture.nativeElement.querySelector('.brand');
    expect(brandContainer).toBeTruthy();

    const brandName = brandContainer.querySelector('.brand-name');
    expect(brandName?.textContent).toContain('VeraProof');
  });

  it('should render environment switcher for tenant users', () => {
    fixture.detectChanges();

    const switcher = fixture.nativeElement.querySelector('.environment-switcher');
    expect(switcher).toBeTruthy();
  });
});
