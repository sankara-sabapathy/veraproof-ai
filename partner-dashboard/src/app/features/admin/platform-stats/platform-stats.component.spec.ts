import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { PlatformStatsComponent } from './platform-stats.component';
import { AdminService, PlatformStats, SystemHealth } from '../services/admin.service';
import { AdminStateService } from '../services/admin-state.service';
import { NotificationService } from '../../../core/services/notification.service';

describe('PlatformStatsComponent', () => {
  let component: PlatformStatsComponent;
  let fixture: ComponentFixture<PlatformStatsComponent>;
  let adminServiceSpy: jasmine.SpyObj<AdminService>;
  let adminStateSpy: jasmine.SpyObj<AdminStateService>;
  let notificationSpy: jasmine.SpyObj<NotificationService>;

  const mockPlatformStats: PlatformStats = {
    total_tenants: 150,
    active_tenants: 120,
    total_sessions: 5000,
    sessions_today: 250,
    total_revenue: 50000,
    revenue_this_month: 5000,
    average_sessions_per_tenant: 33.3,
    platform_success_rate: 98.5
  };

  const mockSystemHealth: SystemHealth = {
    api_status: 'healthy',
    average_response_time_ms: 120,
    error_rate: 0.5,
    uptime_percentage: 99.9,
    last_incident: null
  };

  beforeEach(async () => {
    const adminServiceSpyObj = jasmine.createSpyObj('AdminService', [
      'getPlatformStats',
      'getSystemHealth'
    ]);
    const adminStateSpyObj = jasmine.createSpyObj('AdminStateService', [
      'setLoading',
      'setPlatformStats',
      'setSystemHealth',
      'setError'
    ], {
      platformStats$: of(mockPlatformStats),
      systemHealth$: of(mockSystemHealth),
      loading$: of(false)
    });
    const notificationSpyObj = jasmine.createSpyObj('NotificationService', ['error', 'success']);

    await TestBed.configureTestingModule({
      imports: [PlatformStatsComponent],
      providers: [
        { provide: AdminService, useValue: adminServiceSpyObj },
        { provide: AdminStateService, useValue: adminStateSpyObj },
        { provide: NotificationService, useValue: notificationSpyObj }
      ]
    }).compileComponents();

    adminServiceSpy = TestBed.inject(AdminService) as jasmine.SpyObj<AdminService>;
    adminStateSpy = TestBed.inject(AdminStateService) as jasmine.SpyObj<AdminStateService>;
    notificationSpy = TestBed.inject(NotificationService) as jasmine.SpyObj<NotificationService>;

    fixture = TestBed.createComponent(PlatformStatsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load stats and health on init', () => {
      adminServiceSpy.getPlatformStats.and.returnValue(of(mockPlatformStats));
      adminServiceSpy.getSystemHealth.and.returnValue(of(mockSystemHealth));

      fixture.detectChanges();

      expect(component.loadStats).toBeDefined();
      expect(component.loadHealth).toBeDefined();
      expect(adminServiceSpy.getPlatformStats).toHaveBeenCalled();
      expect(adminServiceSpy.getSystemHealth).toHaveBeenCalled();
    });
  });

  describe('loadStats', () => {
    it('should load platform stats successfully', () => {
      adminServiceSpy.getPlatformStats.and.returnValue(of(mockPlatformStats));

      component.loadStats();

      expect(adminStateSpy.setLoading).toHaveBeenCalledWith(true);
      expect(adminServiceSpy.getPlatformStats).toHaveBeenCalled();
      expect(adminStateSpy.setPlatformStats).toHaveBeenCalledWith(mockPlatformStats);
    });

    it('should handle error when loading stats', () => {
      const error = new Error('Failed to fetch stats');
      adminServiceSpy.getPlatformStats.and.returnValue(throwError(() => error));

      component.loadStats();

      expect(adminStateSpy.setError).toHaveBeenCalledWith('Failed to fetch stats');
      expect(notificationSpy.error).toHaveBeenCalledWith('Failed to load platform statistics');
    });
  });

  describe('loadHealth', () => {
    it('should load system health successfully', () => {
      adminServiceSpy.getSystemHealth.and.returnValue(of(mockSystemHealth));

      component.loadHealth();

      expect(adminServiceSpy.getSystemHealth).toHaveBeenCalled();
      expect(adminStateSpy.setSystemHealth).toHaveBeenCalledWith(mockSystemHealth);
    });

    it('should handle error when loading health', () => {
      const error = new Error('Health check failed');
      adminServiceSpy.getSystemHealth.and.returnValue(throwError(() => error));

      component.loadHealth();

      expect(notificationSpy.error).toHaveBeenCalledWith('Failed to load system health');
    });
  });

  describe('template rendering', () => {
    it('should render stat cards', () => {
      adminServiceSpy.getPlatformStats.and.returnValue(of(mockPlatformStats));
      adminServiceSpy.getSystemHealth.and.returnValue(of(mockSystemHealth));

      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const statCards = compiled.querySelectorAll('app-stat-card');

      expect(statCards.length).toBeGreaterThan(0);
    });

    it('should display loading spinner when loading', () => {
      adminServiceSpy.getPlatformStats.and.returnValue(of(mockPlatformStats));
      adminServiceSpy.getSystemHealth.and.returnValue(of(mockSystemHealth));
      
      // Override stats$ to return null to trigger loading template
      Object.defineProperty(adminStateSpy, 'platformStats$', {
        get: () => of(null),
        configurable: true
      });

      const newFixture = TestBed.createComponent(PlatformStatsComponent);
      newFixture.detectChanges();

      const compiled = newFixture.nativeElement;
      const loadingSpinner = compiled.querySelector('app-loading-spinner');

      expect(loadingSpinner).toBeTruthy();
    });

    it('should render system health status', () => {
      adminServiceSpy.getPlatformStats.and.returnValue(of(mockPlatformStats));
      adminServiceSpy.getSystemHealth.and.returnValue(of(mockSystemHealth));

      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const healthSection = compiled.querySelector('.health-status, p-card');

      expect(healthSection).toBeTruthy();
    });
  });

  describe('observables', () => {
    it('should expose stats$ observable', (done) => {
      component.stats$.subscribe(stats => {
        expect(stats).toEqual(mockPlatformStats);
        done();
      });
    });

    it('should expose health$ observable', (done) => {
      component.health$.subscribe(health => {
        expect(health).toEqual(mockSystemHealth);
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
