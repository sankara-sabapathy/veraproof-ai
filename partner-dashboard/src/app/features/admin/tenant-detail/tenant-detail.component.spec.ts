import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { TenantDetailComponent } from './tenant-detail.component';
import { AdminService, TenantDetail } from '../services/admin.service';
import { AdminStateService } from '../services/admin-state.service';
import { NotificationService } from '../../../core/services/notification.service';

describe('TenantDetailComponent', () => {
  let component: TenantDetailComponent;
  let fixture: ComponentFixture<TenantDetailComponent>;
  let adminServiceSpy: jasmine.SpyObj<AdminService>;
  let adminStateSpy: jasmine.SpyObj<AdminStateService>;
  let notificationSpy: jasmine.SpyObj<NotificationService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let activatedRoute: ActivatedRoute;

  const mockTenantDetail: TenantDetail = {
    tenant_id: 'tenant_123',
    email: 'test@example.com',
    subscription_tier: 'Professional',
    status: 'active',
    current_usage: 750,
    monthly_quota: 1000,
    total_sessions: 150,
    last_active_at: '2024-01-15T10:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    api_keys_count: 2,
    webhooks_count: 3,
    success_rate: 95.5,
    average_trust_score: 0.92,
    billing_cycle_start: '2024-01-01T00:00:00Z',
    billing_cycle_end: '2024-02-01T00:00:00Z'
  };

  beforeEach(async () => {
    const adminServiceSpyObj = jasmine.createSpyObj('AdminService', ['getTenantDetail']);
    const adminStateSpyObj = jasmine.createSpyObj('AdminStateService', [
      'setLoading',
      'setSelectedTenant',
      'setError'
    ], {
      selectedTenant$: of(mockTenantDetail),
      loading$: of(false)
    });
    const notificationSpyObj = jasmine.createSpyObj('NotificationService', ['error', 'success']);
    const routerSpyObj = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [TenantDetailComponent],
      providers: [
        { provide: AdminService, useValue: adminServiceSpyObj },
        { provide: AdminStateService, useValue: adminStateSpyObj },
        { provide: NotificationService, useValue: notificationSpyObj },
        { provide: Router, useValue: routerSpyObj },
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ id: 'tenant_123' })
          }
        }
      ]
    }).compileComponents();

    adminServiceSpy = TestBed.inject(AdminService) as jasmine.SpyObj<AdminService>;
    adminStateSpy = TestBed.inject(AdminStateService) as jasmine.SpyObj<AdminStateService>;
    notificationSpy = TestBed.inject(NotificationService) as jasmine.SpyObj<NotificationService>;
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    activatedRoute = TestBed.inject(ActivatedRoute);

    fixture = TestBed.createComponent(TenantDetailComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should extract tenant ID from route params', () => {
      adminServiceSpy.getTenantDetail.and.returnValue(of(mockTenantDetail));

      fixture.detectChanges();

      expect(component.tenantId).toBe('tenant_123');
    });

    it('should load tenant detail on init', () => {
      adminServiceSpy.getTenantDetail.and.returnValue(of(mockTenantDetail));

      fixture.detectChanges();

      expect(adminServiceSpy.getTenantDetail).toHaveBeenCalledWith('tenant_123');
    });
  });

  describe('loadTenantDetail', () => {
    it('should load tenant detail successfully', () => {
      adminServiceSpy.getTenantDetail.and.returnValue(of(mockTenantDetail));

      component.tenantId = 'tenant_123';
      component.loadTenantDetail();

      expect(adminStateSpy.setLoading).toHaveBeenCalledWith(true);
      expect(adminServiceSpy.getTenantDetail).toHaveBeenCalledWith('tenant_123');
      expect(adminStateSpy.setSelectedTenant).toHaveBeenCalledWith(mockTenantDetail);
    });

    it('should handle error when loading tenant detail', () => {
      const error = new Error('Tenant not found');
      adminServiceSpy.getTenantDetail.and.returnValue(throwError(() => error));

      component.tenantId = 'tenant_123';
      component.loadTenantDetail();

      expect(adminStateSpy.setError).toHaveBeenCalledWith('Tenant not found');
      expect(notificationSpy.error).toHaveBeenCalledWith('Failed to load tenant details');
    });
  });

  describe('viewSessions', () => {
    it('should navigate to tenant sessions page', () => {
      component.tenantId = 'tenant_123';

      component.viewSessions();

      expect(routerSpy.navigate).toHaveBeenCalledWith(['/admin/tenants', 'tenant_123', 'sessions']);
    });
  });

  describe('back', () => {
    it('should navigate back to tenant list', () => {
      component.back();

      expect(routerSpy.navigate).toHaveBeenCalledWith(['/admin/tenants']);
    });
  });

  describe('getUsagePercentage', () => {
    it('should calculate usage percentage correctly', () => {
      const percentage = component.getUsagePercentage(750, 1000);

      expect(percentage).toBe(75);
    });

    it('should handle 0 quota', () => {
      const percentage = component.getUsagePercentage(100, 0);

      expect(percentage).toBe(Infinity);
    });

    it('should handle 100% usage', () => {
      const percentage = component.getUsagePercentage(1000, 1000);

      expect(percentage).toBe(100);
    });

    it('should handle over 100% usage', () => {
      const percentage = component.getUsagePercentage(1200, 1000);

      expect(percentage).toBe(120);
    });
  });

  describe('template rendering', () => {
    it('should render tenant details', () => {
      adminServiceSpy.getTenantDetail.and.returnValue(of(mockTenantDetail));

      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const cards = compiled.querySelectorAll('p-card');

      expect(cards.length).toBeGreaterThan(0);
    });

    it('should render stat cards', () => {
      adminServiceSpy.getTenantDetail.and.returnValue(of(mockTenantDetail));

      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const statCards = compiled.querySelectorAll('app-stat-card');

      expect(statCards.length).toBeGreaterThan(0);
    });

    it('should render action buttons', () => {
      adminServiceSpy.getTenantDetail.and.returnValue(of(mockTenantDetail));

      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const buttons = compiled.querySelectorAll('p-button, button');

      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should display loading spinner when loading', () => {
      adminServiceSpy.getTenantDetail.and.returnValue(of(mockTenantDetail));
      
      // Override tenant$ to return null to trigger loading template
      Object.defineProperty(adminStateSpy, 'selectedTenant$', {
        get: () => of(null),
        configurable: true
      });

      const newFixture = TestBed.createComponent(TenantDetailComponent);
      newFixture.detectChanges();

      const compiled = newFixture.nativeElement;
      const loadingSpinner = compiled.querySelector('app-loading-spinner');

      expect(loadingSpinner).toBeTruthy();
    });

    it('should render usage progress bar', () => {
      adminServiceSpy.getTenantDetail.and.returnValue(of(mockTenantDetail));

      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const progressBar = compiled.querySelector('p-progressBar');

      expect(progressBar).toBeTruthy();
    });

    it('should render status chip', () => {
      adminServiceSpy.getTenantDetail.and.returnValue(of(mockTenantDetail));

      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const chip = compiled.querySelector('p-chip');

      expect(chip).toBeTruthy();
    });
  });

  describe('observables', () => {
    it('should expose tenant$ observable', (done) => {
      component.tenant$.subscribe(tenant => {
        expect(tenant).toEqual(mockTenantDetail);
        done();
      });
    });

    it('should expose loading$ observable', (done) => {
      component.loading$.subscribe(loading => {
        expect(loading).toBe(false);
        done();
      });
    });
  });
});
