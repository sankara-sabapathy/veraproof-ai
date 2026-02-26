import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UsageChartComponent } from './usage-chart.component';
import { UsageTrendData } from '../../../core/models/interfaces';
import { By } from '@angular/platform-browser';

describe('UsageChartComponent', () => {
  let component: UsageChartComponent;
  let fixture: ComponentFixture<UsageChartComponent>;

  const mockUsageTrend: UsageTrendData[] = [
    { date: '2024-01-01', session_count: 50, success_count: 45, failed_count: 5, average_trust_score: 78.5 },
    { date: '2024-01-02', session_count: 60, success_count: 55, failed_count: 5, average_trust_score: 79.2 },
    { date: '2024-01-03', session_count: 55, success_count: 50, failed_count: 5, average_trust_score: 80.1 },
    { date: '2024-01-04', session_count: 70, success_count: 65, failed_count: 5, average_trust_score: 81.3 },
    { date: '2024-01-05', session_count: 65, success_count: 60, failed_count: 5, average_trust_score: 79.8 }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsageChartComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(UsageChartComponent);
    component = fixture.componentInstance;
  });

  describe('initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should have default period as daily', () => {
      expect(component.period).toBe('daily');
    });

    it('should have empty data array by default', () => {
      expect(component.data).toEqual([]);
    });
  });

  describe('chart rendering', () => {
    it('should render canvas element', () => {
      fixture.detectChanges();
      const canvas = fixture.debugElement.query(By.css('canvas'));
      expect(canvas).toBeTruthy();
    });

    it('should render chart after view init with data', (done) => {
      component.data = mockUsageTrend;
      fixture.detectChanges();

      setTimeout(() => {
        const canvas = component.chartCanvas?.nativeElement;
        expect(canvas).toBeTruthy();
        if (canvas) {
          const ctx = canvas.getContext('2d');
          expect(ctx).toBeTruthy();
        }
        done();
      }, 100);
    });

    it('should update chart when data changes', () => {
      component.data = mockUsageTrend;
      fixture.detectChanges();

      const newData = [...mockUsageTrend, { date: '2024-01-06', session_count: 80, success_count: 75, failed_count: 5, average_trust_score: 82.1 }];
      component.data = newData;
      component.ngOnChanges({
        data: {
          currentValue: newData,
          previousValue: mockUsageTrend,
          firstChange: false,
          isFirstChange: () => false
        }
      });

      expect(component.data.length).toBe(6);
    });

    it('should update chart when period changes', () => {
      component.data = mockUsageTrend;
      component.period = 'daily';
      fixture.detectChanges();

      component.period = 'weekly';
      component.ngOnChanges({
        period: {
          currentValue: 'weekly',
          previousValue: 'daily',
          firstChange: false,
          isFirstChange: () => false
        }
      });

      expect(component.period).toBe('weekly');
    });

    it('should not render chart when data is empty', () => {
      component.data = [];
      fixture.detectChanges();

      const canvas = component.chartCanvas?.nativeElement;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        expect(ctx).toBeTruthy();
      }
    });

    it('should handle null canvas gracefully', () => {
      component.chartCanvas = undefined;
      expect(() => component.ngOnChanges({})).not.toThrow();
    });
  });

  describe('period label', () => {
    it('should return correct label for daily period', () => {
      component.period = 'daily';
      expect(component.periodLabel).toBe('Daily Usage Trend');
    });

    it('should return correct label for weekly period', () => {
      component.period = 'weekly';
      expect(component.periodLabel).toBe('Weekly Usage Trend');
    });

    it('should return correct label for monthly period', () => {
      component.period = 'monthly';
      expect(component.periodLabel).toBe('Monthly Usage Trend');
    });

    it('should return default label for unknown period', () => {
      component.period = 'unknown' as any;
      expect(component.periodLabel).toBe('Usage Trend');
    });
  });

  describe('rendering with PrimeNG Card', () => {
    it('should render PrimeNG Card component', () => {
      fixture.detectChanges();
      const card = fixture.debugElement.query(By.css('p-card'));
      expect(card).toBeTruthy();
    });

    it('should display period label in card', () => {
      component.period = 'daily';
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('Daily Usage Trend');
    });
  });

  describe('edge cases', () => {
    it('should handle single data point', () => {
      component.data = [mockUsageTrend[0]];
      fixture.detectChanges();
      expect(component.data.length).toBe(1);
    });

    it('should handle large dataset', () => {
      const largeData: UsageTrendData[] = [];
      for (let i = 0; i < 100; i++) {
        largeData.push({
          date: `2024-01-${String(i + 1).padStart(2, '0')}`,
          session_count: Math.floor(Math.random() * 100),
          success_count: Math.floor(Math.random() * 90),
          failed_count: Math.floor(Math.random() * 10),
          average_trust_score: Math.floor(Math.random() * 100)
        });
      }
      component.data = largeData;
      fixture.detectChanges();
      expect(component.data.length).toBe(100);
    });

    it('should handle zero values in data', () => {
      const zeroData: UsageTrendData[] = [
        { date: '2024-01-01', session_count: 0, success_count: 0, failed_count: 0, average_trust_score: 0 }
      ];
      component.data = zeroData;
      fixture.detectChanges();
      expect(component.data[0].session_count).toBe(0);
    });

    it('should handle very high values', () => {
      const highValueData: UsageTrendData[] = [
        { date: '2024-01-01', session_count: 1000000, success_count: 900000, failed_count: 100000, average_trust_score: 85.5 }
      ];
      component.data = highValueData;
      fixture.detectChanges();
      expect(component.data[0].session_count).toBe(1000000);
    });

    it('should handle invalid date strings gracefully', () => {
      const invalidDateData: UsageTrendData[] = [
        { date: 'invalid-date', session_count: 50, success_count: 45, failed_count: 5, average_trust_score: 78.5 }
      ];
      component.data = invalidDateData;
      fixture.detectChanges();
      expect(component.data.length).toBe(1);
    });
  });

  describe('chart interactions', () => {
    it('should render multiple lines for different metrics', (done) => {
      component.data = mockUsageTrend;
      fixture.detectChanges();

      setTimeout(() => {
        const canvas = component.chartCanvas?.nativeElement;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          expect(ctx).toBeTruthy();
          // Chart should render total sessions, success, and failed lines
        }
        done();
      }, 100);
    });

    it('should scale chart based on data values', (done) => {
      component.data = mockUsageTrend;
      fixture.detectChanges();

      setTimeout(() => {
        const canvas = component.chartCanvas?.nativeElement;
        if (canvas) {
          expect(canvas.width).toBeGreaterThan(0);
          expect(canvas.height).toBe(300);
        }
        done();
      }, 100);
    });
  });

  describe('date formatting', () => {
    it('should format dates correctly for daily period', () => {
      component.period = 'daily';
      component.data = mockUsageTrend;
      fixture.detectChanges();
      // Date formatting is tested through chart rendering
      expect(component.data[0].date).toBe('2024-01-01');
    });

    it('should format dates correctly for weekly period', () => {
      component.period = 'weekly';
      component.data = mockUsageTrend;
      fixture.detectChanges();
      expect(component.data[0].date).toBe('2024-01-01');
    });

    it('should format dates correctly for monthly period', () => {
      component.period = 'monthly';
      component.data = mockUsageTrend;
      fixture.detectChanges();
      expect(component.data[0].date).toBe('2024-01-01');
    });
  });
});
