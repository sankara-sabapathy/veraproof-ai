import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalyticsOverviewComponent } from './analytics-overview.component';
import { AnalyticsStateService } from '../services/analytics-state.service';
import { AnalyticsService } from '../services/analytics.service';
import { NotificationService } from '../../../core/services/notification.service';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { AnalyticsStats, OutcomeDistribution, UsageTrendData } from '../../../core/models/interfaces';
import { By } from '@angular/platform-browser';

describe('AnalyticsOverviewComponent', () => {
  let component: AnalyticsOverviewComponent;
  let fixture: ComponentFixture<AnalyticsOverviewComponent>;
  let analyticsStateService: jasmine.SpyObj<AnalyticsStateService>;
  let analyticsService: jasmine.SpyObj<AnalyticsService>;
  let notificationService: jasmine.SpyObj<NotificationService>;

  const mockStats: AnalyticsStats = {
    total_sessions: 1000,
    success_rate: 85.5,
    average_trust_score: 78.5,
    current_usage: 750,
    monthly_quota: 1000,
    usage_percentage: 75,
    sessions_today: 50,
    sessions_this_week: 300,
    sessions_this_month: 750
  };

  const mockUsageTrend: UsageTrendData[] = [
    { date: '2024-01-01', session_count: 50, success_count: 45, failed_count: 5, average_trust_score: 78.5 },
    { date: '2024-01-02', session_count: 60, success_count: 55, failed_count: 5, average_trust_score: 79.2 }
  ];

  const mockOutcomeDistribution: OutcomeDistribution = {
    success: 855,
    failed: 100,
    timeout: 30,
    cancelled: 15
  };

  beforeEach(async () => {
    const analyticsStateServiceSpy = jasmine.createSpyObj('AnalyticsStateService', [
      'loadAll',
      'loadUsageTrend'
    ], {
      stats$: new BehaviorSubject<AnalyticsStats | null>(mockStats),
      usageTrend$: new BehaviorSubject<UsageTrendData[]>(mockUsageTrend),
      outcomeDistribution$: new BehaviorSubject<OutcomeDistribution | null>(mockOutcomeDistribution),
      selectedPeriod$: new BehaviorSubject<'daily' | 'weekly' | 'monthly'>('daily'),
      loading$: new BehaviorSubject<boolean>(false),
      error$: new BehaviorSubject<string | null>(null)
    });

    const analyticsServiceSpy = jasmine.createSpyObj('AnalyticsService', ['exportReport']);
    const notificationServiceSpy = jasmine.createSpyObj('NotificationService', ['success', 'error']);

    await TestBed.configureTestingModule({
      imports: [AnalyticsOverviewComponent],
      providers: [
        { provide: AnalyticsStateService, useValue: analyticsStateServiceSpy },
        { provide: AnalyticsService, useValue: analyticsServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy }
      ]
    }).compileComponents();

    analyticsStateService = TestBed.inject(AnalyticsStateService) as jasmine.SpyObj<AnalyticsStateService>;
    analyticsService = TestBed.inject(AnalyticsService) as jasmine.SpyObj<AnalyticsService>;
    notificationService = TestBed.inject(NotificationService) as jasmine.SpyObj<NotificationService>;

    fixture = TestBed.createComponent(AnalyticsOverviewComponent);
    component = fixture.componentInstance;
  });

  describe('initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should subscribe to state observables on init', () => {
      fixture.detectChanges();

      expect(component.stats).toEqual(mockStats);
      expect(component.usageTrend).toEqual(mockUsageTrend);
      expect(component.outcomeDistribution).toEqual(mockOutcomeDistribution);
      expect(component.selectedPeriod).toBe('daily');
      expect(component.loading).toBe(false);
      expect(component.error).toBe(null);
    });

    it('should call loadAll on init', () => {
      fixture.detectChanges();
      expect(analyticsStateService.loadAll).toHaveBeenCalled();
    });
  });

  describe('usage percentage calculation', () => {
    it('should calculate usage percentage correctly', () => {
      component.stats = mockStats;
      expect(component.usagePercentage).toBe(75);
    });

    it('should return 0 when stats is null', () => {
      component.stats = null;
      expect(component.usagePercentage).toBe(0);
    });

    it('should return 0 when monthly quota is 0', () => {
      component.stats = { ...mockStats, monthly_quota: 0 };
      expect(component.usagePercentage).toBe(0);
    });

    it('should cap at 100% when usage exceeds quota', () => {
      component.stats = { ...mockStats, current_usage: 1200, monthly_quota: 1000 };
      expect(component.usagePercentage).toBe(100);
    });
  });

  describe('quota warning', () => {
    it('should show warning when usage >= 80%', () => {
      component.stats = { ...mockStats, current_usage: 800, monthly_quota: 1000 };
      expect(component.showQuotaWarning).toBe(true);
    });

    it('should not show warning when usage < 80%', () => {
      component.stats = { ...mockStats, current_usage: 700, monthly_quota: 1000 };
      expect(component.showQuotaWarning).toBe(false);
    });

    it('should return warn color when usage >= 100%', () => {
      component.stats = { ...mockStats, current_usage: 1000, monthly_quota: 1000 };
      expect(component.quotaWarningColor).toBe('warn');
    });

    it('should return accent color when usage between 80-99%', () => {
      component.stats = { ...mockStats, current_usage: 850, monthly_quota: 1000 };
      expect(component.quotaWarningColor).toBe('accent');
    });
  });

  describe('period change', () => {
    it('should call loadUsageTrend with new period', () => {
      component.onPeriodChange('weekly');
      expect(analyticsStateService.loadUsageTrend).toHaveBeenCalledWith('weekly');
    });

    it('should handle monthly period', () => {
      component.onPeriodChange('monthly');
      expect(analyticsStateService.loadUsageTrend).toHaveBeenCalledWith('monthly');
    });
  });

  describe('CSV export', () => {
    it('should export CSV successfully', () => {
      const mockBlob = new Blob(['test'], { type: 'text/csv' });
      analyticsService.exportReport.and.returnValue(of(mockBlob));

      spyOn(window.URL, 'createObjectURL').and.returnValue('blob:test');
      spyOn(window.URL, 'revokeObjectURL');

      component.exportCSV();

      expect(analyticsService.exportReport).toHaveBeenCalledWith('csv', jasmine.objectContaining({
        include_sessions: true,
        include_analytics: true
      }));
      expect(notificationService.success).toHaveBeenCalledWith('Analytics report exported successfully');
    });

    it('should handle export error', () => {
      const error = new Error('Export failed');
      analyticsService.exportReport.and.returnValue(throwError(() => error));

      component.exportCSV();

      expect(notificationService.error).toHaveBeenCalledWith('Failed to export report: Export failed');
    });
  });

  describe('refresh', () => {
    it('should call loadAll when refresh is triggered', () => {
      analyticsStateService.loadAll.calls.reset();
      component.refresh();
      expect(analyticsStateService.loadAll).toHaveBeenCalled();
    });
  });

  describe('rendering', () => {
    it('should render stat cards when stats are available', () => {
      fixture.detectChanges();
      const statCards = fixture.debugElement.queryAll(By.css('app-stat-card'));
      expect(statCards.length).toBeGreaterThan(0);
    });

    it('should render usage chart component', () => {
      fixture.detectChanges();
      const usageChart = fixture.debugElement.query(By.css('app-usage-chart'));
      expect(usageChart).toBeTruthy();
    });

    it('should render outcome chart component', () => {
      fixture.detectChanges();
      const outcomeChart = fixture.debugElement.query(By.css('app-outcome-chart'));
      expect(outcomeChart).toBeTruthy();
    });

    it('should show loading spinner when loading', () => {
      (analyticsStateService.loading$ as BehaviorSubject<boolean>).next(true);
      fixture.detectChanges();
      const spinner = fixture.debugElement.query(By.css('app-loading-spinner'));
      expect(spinner).toBeTruthy();
    });

    it('should render PrimeNG dropdown for period selection', () => {
      fixture.detectChanges();
      const dropdown = fixture.debugElement.query(By.css('p-dropdown'));
      expect(dropdown).toBeTruthy();
    });

    it('should render export button with PrimeNG Button', () => {
      fixture.detectChanges();
      const button = fixture.debugElement.query(By.css('p-button'));
      expect(button).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('should handle null stats gracefully', () => {
      (analyticsStateService.stats$ as BehaviorSubject<AnalyticsStats | null>).next(null);
      fixture.detectChanges();
      expect(component.stats).toBeNull();
      expect(component.usagePercentage).toBe(0);
    });

    it('should handle empty usage trend data', () => {
      (analyticsStateService.usageTrend$ as BehaviorSubject<UsageTrendData[]>).next([]);
      fixture.detectChanges();
      expect(component.usageTrend).toEqual([]);
    });

    it('should handle null outcome distribution', () => {
      (analyticsStateService.outcomeDistribution$ as BehaviorSubject<OutcomeDistribution | null>).next(null);
      fixture.detectChanges();
      expect(component.outcomeDistribution).toBeNull();
    });

    it('should handle error state', () => {
      const errorMessage = 'Failed to load analytics';
      (analyticsStateService.error$ as BehaviorSubject<string | null>).next(errorMessage);
      fixture.detectChanges();
      expect(component.error).toBe(errorMessage);
    });
  });

  describe('cleanup', () => {
    it('should unsubscribe on destroy', () => {
      fixture.detectChanges();
      const destroySpy = spyOn(component['destroy$'], 'next');
      const completeSpy = spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(destroySpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });
});
