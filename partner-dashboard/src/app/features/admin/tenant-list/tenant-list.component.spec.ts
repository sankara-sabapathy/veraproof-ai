import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { TenantListComponent } from './tenant-list.component';
import { AdminService, TenantSummary } from '../services/admin.service';
import { AdminStateService } from '../services/admin-state.service';
import { NotificationService } from '../../../core/services/notification.service';

describe('TenantListComponent', () => {
  let component: TenantListComponent;
  let fixture: ComponentFixture<TenantListComponent>;
  let adminServiceSpy: jasmine.SpyObj<AdminService>;
  let adminStateSpy: jasmine.SpyObj<AdminStateService>;
  let notificationSpy: jasmine.SpyObj<NotificationService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockTenants: TenantSummary[] = [
    {
      tenant_id: 'tenant_1',
      email: 'tenant1@example.com',
      subscription_tier: 'Professional',
      status: 'active',
      current_usage: 500,
      monthly_quota: 1000,
      total_sessions: 50,
      last_active_at: '2024-01-15T10:00:00Z',
      created_at: '2024-01-01T00:00:00Z'
    },
    {
      tenant_id: 'tenant_2',
      email: 'tenant2@example.com',
      subscription_tier: 'Starter',
      status: 'trial',
      current_usage: 100,
      monthly_quota: 500,
      total_sessions: 20,
      last_active_at: '2024-01-14T08:00:00Z',
      created_at: '2024-01-02T00:00:00Z'
    }
  ];

  beforeEach(async () => {
    const adminServiceSpyObj = jasmine.createSpyObj('AdminService', ['listTenants']);
    const adminStateSpyObj = jasmine.createSpyObj('AdminStateService', [
      'setLoading',
      'setTenants',
      'setError'
    ], {
      tenants$: of(mockTenants),
      loading$: of(false),
      pagination$: of({ total: 2, limit: 25, offset: 0 })
    });
    const notificationSpyObj = jasmine.createSpyObj('NotificationService', ['error', 'success']);
    const routerSpyObj = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [TenantListComponent],
      providers: [
        { provide: AdminService, useValue: adminServiceSpyObj },
        { provide: AdminStateService, useValue: adminStateSpyObj },
        { provide: NotificationService, useValue: notificationSpyObj },
        { provide: Router, useValue: routerSpyObj }
      ]
    }).compileComponents();

    adminServiceSpy = TestBed.inject(AdminService) as jasmine.SpyObj<AdminService>;
    adminStateSpy = TestBed.inject(AdminStateService) as jasmine.SpyObj<AdminStateService>;
    notificationSpy = TestBed.inject(NotificationService) as jasmine.SpyObj<NotificationService>;
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    fixture = TestBed.createComponent(TenantListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should subscribe to state observables', () => {
      adminServiceSpy.listTenants.and.returnValue(of({ tenants: mockTenants, total: 2, limit: 25, offset: 0 }));
      
      fixture.detectChanges();
      
      expect(component.tenants).toEqual(mockTenants);
      expect(component.loading).toBe(false);
      expect(component.totalItems).toBe(2);
    });

    it('should initialize columns with templates', (done) => {
      adminServiceSpy.listTenants.and.returnValue(of({ tenants: mockTenants, total: 2, limit: 25, offset: 0 }));
      
      fixture.detectChanges();
      
      setTimeout(() => {
        expect(component.columns.length).toBe(5);
        expect(component.columns[0].key).toBe('email');
        expect(component.columns[1].key).toBe('subscription_tier');
        expect(component.columns[2].key).toBe('usage');
        expect(component.columns[3].key).toBe('status');
        expect(component.columns[4].key).toBe('created_at');
        done();
      }, 10);
    });

    it('should load tenants on init', () => {
      adminServiceSpy.listTenants.and.returnValue(of({ tenants: mockTenants, total: 2, limit: 25, offset: 0 }));
      
      fixture.detectChanges();
      
      expect(adminServiceSpy.listTenants).toHaveBeenCalled();
      expect(adminStateSpy.setLoading).toHaveBeenCalledWith(true);
    });
  });

  describe('loadTenants', () => {
    it('should load tenants successfully', () => {
      adminServiceSpy.listTenants.and.returnValue(of({ tenants: mockTenants, total: 2, limit: 25, offset: 0 }));
      
      component.loadTenants();
      
      expect(adminStateSpy.setLoading).toHaveBeenCalledWith(true);
      expect(adminServiceSpy.listTenants).toHaveBeenCalledWith({
        limit: 25,
        offset: 0,
        search: undefined,
        subscription_tier: undefined,
        status: undefined
      });
      expect(adminStateSpy.setTenants).toHaveBeenCalledWith(mockTenants, 2);
    });

    it('should load tenants with search term', () => {
      component.searchTerm = 'test@example.com';
      adminServiceSpy.listTenants.and.returnValue(of({ tenants: [mockTenants[0]], total: 1, limit: 25, offset: 0 }));
      
      component.loadTenants();
      
      expect(adminServiceSpy.listTenants).toHaveBeenCalledWith({
        limit: 25,
        offset: 0,
        search: 'test@example.com',
        subscription_tier: undefined,
        status: undefined
      });
    });

    it('should load tenants with tier filter', () => {
      component.selectedTier = 'Professional';
      adminServiceSpy.listTenants.and.returnValue(of({ tenants: [mockTenants[0]], total: 1, limit: 25, offset: 0 }));
      
      component.loadTenants();
      
      expect(adminServiceSpy.listTenants).toHaveBeenCalledWith({
        limit: 25,
        offset: 0,
        search: undefined,
        subscription_tier: 'Professional',
        status: undefined
      });
    });

    it('should load tenants with status filter', () => {
      component.selectedStatus = 'active';
      adminServiceSpy.listTenants.and.returnValue(of({ tenants: [mockTenants[0]], total: 1, limit: 25, offset: 0 }));
      
      component.loadTenants();
      
      expect(adminServiceSpy.listTenants).toHaveBeenCalledWith({
        limit: 25,
        offset: 0,
        search: undefined,
        subscription_tier: undefined,
        status: 'active'
      });
    });

    it('should handle error when loading tenants', () => {
      const error = new Error('Network error');
      adminServiceSpy.listTenants.and.returnValue(throwError(() => error));
      
      component.loadTenants();
      
      expect(adminStateSpy.setError).toHaveBeenCalledWith('Network error');
      expect(notificationSpy.error).toHaveBeenCalledWith('Failed to load tenants');
    });
  });

  describe('onSearch', () => {
    it('should trigger loadTenants', () => {
      spyOn(component, 'loadTenants');
      
      component.onSearch();
      
      expect(component.loadTenants).toHaveBeenCalled();
    });
  });

  describe('onFilterChange', () => {
    it('should trigger loadTenants', () => {
      spyOn(component, 'loadTenants');
      
      component.onFilterChange();
      
      expect(component.loadTenants).toHaveBeenCalled();
    });
  });

  describe('viewTenant', () => {
    it('should navigate to tenant detail page', () => {
      const tenant = mockTenants[0];
      
      component.viewTenant(tenant);
      
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/admin/tenants', 'tenant_1']);
    });
  });

  describe('getUsagePercentage', () => {
    it('should calculate usage percentage correctly', () => {
      const tenant = mockTenants[0]; // 500/1000 = 50%
      
      const percentage = component.getUsagePercentage(tenant);
      
      expect(percentage).toBe(50);
    });

    it('should handle 100% usage', () => {
      const tenant: TenantSummary = {
        ...mockTenants[0],
        current_usage: 1000,
        monthly_quota: 1000
      };
      
      const percentage = component.getUsagePercentage(tenant);
      
      expect(percentage).toBe(100);
    });

    it('should handle over 100% usage', () => {
      const tenant: TenantSummary = {
        ...mockTenants[0],
        current_usage: 1200,
        monthly_quota: 1000
      };
      
      const percentage = component.getUsagePercentage(tenant);
      
      expect(percentage).toBe(120);
    });
  });

  describe('getUsageSeverity', () => {
    it('should return "success" for usage below 80%', () => {
      expect(component.getUsageSeverity(50)).toBe('success');
      expect(component.getUsageSeverity(79)).toBe('success');
    });

    it('should return "warning" for usage between 80% and 89%', () => {
      expect(component.getUsageSeverity(80)).toBe('warning');
      expect(component.getUsageSeverity(85)).toBe('warning');
      expect(component.getUsageSeverity(89)).toBe('warning');
    });

    it('should return "danger" for usage 90% and above', () => {
      expect(component.getUsageSeverity(90)).toBe('danger');
      expect(component.getUsageSeverity(95)).toBe('danger');
      expect(component.getUsageSeverity(100)).toBe('danger');
    });
  });

  describe('template rendering', () => {
    it('should render data table with correct columns', (done) => {
      adminServiceSpy.listTenants.and.returnValue(of({ tenants: mockTenants, total: 2, limit: 25, offset: 0 }));
      
      fixture.detectChanges();
      
      setTimeout(() => {
        fixture.detectChanges();
        const compiled = fixture.nativeElement;
        const dataTable = compiled.querySelector('app-data-table');
        
        expect(dataTable).toBeTruthy();
        done();
      }, 10);
    });

    it('should render filter dropdowns', () => {
      adminServiceSpy.listTenants.and.returnValue(of({ tenants: mockTenants, total: 2, limit: 25, offset: 0 }));
      
      fixture.detectChanges();
      
      const compiled = fixture.nativeElement;
      const dropdowns = compiled.querySelectorAll('p-dropdown');
      
      expect(dropdowns.length).toBeGreaterThanOrEqual(2); // tier and status filters
    });

    it('should render search input', () => {
      adminServiceSpy.listTenants.and.returnValue(of({ tenants: mockTenants, total: 2, limit: 25, offset: 0 }));
      
      fixture.detectChanges();
      
      const compiled = fixture.nativeElement;
      const searchInput = compiled.querySelector('input[type="text"]');
      
      expect(searchInput).toBeTruthy();
    });
  });
});
