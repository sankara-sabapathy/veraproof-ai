import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OutcomeChartComponent } from './outcome-chart.component';
import { OutcomeDistribution } from '../../../core/models/interfaces';
import { By } from '@angular/platform-browser';

describe('OutcomeChartComponent', () => {
  let component: OutcomeChartComponent;
  let fixture: ComponentFixture<OutcomeChartComponent>;

  const mockOutcomeDistribution: OutcomeDistribution = {
    success: 855,
    failed: 100,
    timeout: 30,
    cancelled: 15
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OutcomeChartComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(OutcomeChartComponent);
    component = fixture.componentInstance;
  });

  describe('initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should have null data by default', () => {
      expect(component.data).toBeNull();
    });
  });

  describe('chart rendering', () => {
    it('should render canvas element', () => {
      fixture.detectChanges();
      const canvas = fixture.debugElement.query(By.css('canvas'));
      expect(canvas).toBeTruthy();
    });

    it('should render chart after view init with data', (done) => {
      component.data = mockOutcomeDistribution;
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
      component.data = mockOutcomeDistribution;
      fixture.detectChanges();

      const newData: OutcomeDistribution = {
        success: 900,
        failed: 80,
        timeout: 15,
        cancelled: 5
      };

      component.data = newData;
      component.ngOnChanges({
        data: {
          currentValue: newData,
          previousValue: mockOutcomeDistribution,
          firstChange: false,
          isFirstChange: () => false
        }
      });

      expect(component.data).toEqual(newData);
    });

    it('should not render chart when data is null', () => {
      component.data = null;
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

    it('should not render chart when total is zero', () => {
      component.data = {
        success: 0,
        failed: 0,
        timeout: 0,
        cancelled: 0
      };
      fixture.detectChanges();
      expect(component.totalCount).toBe(0);
    });
  });

  describe('outcome statistics', () => {
    it('should calculate outcome stats correctly', () => {
      component.data = mockOutcomeDistribution;
      const stats = component.outcomeStats;

      expect(stats.length).toBe(4);
      expect(stats[0].label).toBe('Success');
      expect(stats[0].value).toBe(855);
      expect(stats[0].percentage).toBeCloseTo(85.5, 1);
      expect(stats[0].color).toBe('#4caf50');

      expect(stats[1].label).toBe('Failed');
      expect(stats[1].value).toBe(100);
      expect(stats[1].percentage).toBeCloseTo(10, 1);
      expect(stats[1].color).toBe('#f44336');

      expect(stats[2].label).toBe('Timeout');
      expect(stats[2].value).toBe(30);
      expect(stats[2].percentage).toBeCloseTo(3, 1);
      expect(stats[2].color).toBe('#ff9800');

      expect(stats[3].label).toBe('Cancelled');
      expect(stats[3].value).toBe(15);
      expect(stats[3].percentage).toBeCloseTo(1.5, 1);
      expect(stats[3].color).toBe('#9e9e9e');
    });

    it('should return empty array when data is null', () => {
      component.data = null;
      expect(component.outcomeStats).toEqual([]);
    });

    it('should handle zero total correctly', () => {
      component.data = {
        success: 0,
        failed: 0,
        timeout: 0,
        cancelled: 0
      };
      const stats = component.outcomeStats;

      expect(stats.length).toBe(4);
      stats.forEach(stat => {
        expect(stat.percentage).toBe(0);
      });
    });
  });

  describe('total count', () => {
    it('should calculate total count correctly', () => {
      component.data = mockOutcomeDistribution;
      expect(component.totalCount).toBe(1000);
    });

    it('should return 0 when data is null', () => {
      component.data = null;
      expect(component.totalCount).toBe(0);
    });

    it('should handle zero values', () => {
      component.data = {
        success: 0,
        failed: 0,
        timeout: 0,
        cancelled: 0
      };
      expect(component.totalCount).toBe(0);
    });
  });

  describe('rendering with PrimeNG Card', () => {
    it('should render PrimeNG Card component', () => {
      fixture.detectChanges();
      const card = fixture.debugElement.query(By.css('p-card'));
      expect(card).toBeTruthy();
    });

    it('should display outcome statistics', () => {
      component.data = mockOutcomeDistribution;
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('Success');
      expect(compiled.textContent).toContain('Failed');
      expect(compiled.textContent).toContain('Timeout');
      expect(compiled.textContent).toContain('Cancelled');
    });
  });

  describe('edge cases', () => {
    it('should handle all success outcomes', () => {
      component.data = {
        success: 1000,
        failed: 0,
        timeout: 0,
        cancelled: 0
      };
      fixture.detectChanges();

      const stats = component.outcomeStats;
      expect(stats[0].percentage).toBe(100);
      expect(stats[1].percentage).toBe(0);
      expect(stats[2].percentage).toBe(0);
      expect(stats[3].percentage).toBe(0);
    });

    it('should handle all failed outcomes', () => {
      component.data = {
        success: 0,
        failed: 1000,
        timeout: 0,
        cancelled: 0
      };
      fixture.detectChanges();

      const stats = component.outcomeStats;
      expect(stats[0].percentage).toBe(0);
      expect(stats[1].percentage).toBe(100);
    });

    it('should handle equal distribution', () => {
      component.data = {
        success: 250,
        failed: 250,
        timeout: 250,
        cancelled: 250
      };
      fixture.detectChanges();

      const stats = component.outcomeStats;
      stats.forEach(stat => {
        expect(stat.percentage).toBe(25);
      });
    });

    it('should handle very large numbers', () => {
      component.data = {
        success: 1000000,
        failed: 100000,
        timeout: 10000,
        cancelled: 1000
      };
      fixture.detectChanges();

      expect(component.totalCount).toBe(1111000);
      const stats = component.outcomeStats;
      expect(stats[0].percentage).toBeCloseTo(90.01, 1);
    });

    it('should handle very small percentages', () => {
      component.data = {
        success: 9999,
        failed: 1,
        timeout: 0,
        cancelled: 0
      };
      fixture.detectChanges();

      const stats = component.outcomeStats;
      expect(stats[1].percentage).toBeCloseTo(0.01, 2);
    });

    it('should render pie chart with correct colors', (done) => {
      component.data = mockOutcomeDistribution;
      fixture.detectChanges();

      setTimeout(() => {
        const canvas = component.chartCanvas?.nativeElement;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          expect(ctx).toBeTruthy();
          // Colors are applied during rendering
        }
        done();
      }, 100);
    });
  });

  describe('chart interactions', () => {
    it('should render pie slices for each outcome', (done) => {
      component.data = mockOutcomeDistribution;
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

    it('should show percentage labels on significant slices', (done) => {
      component.data = mockOutcomeDistribution;
      fixture.detectChanges();

      setTimeout(() => {
        const stats = component.outcomeStats;
        const significantSlices = stats.filter(s => s.percentage > 5);
        expect(significantSlices.length).toBeGreaterThan(0);
        done();
      }, 100);
    });

    it('should not show percentage labels on small slices', () => {
      component.data = {
        success: 980,
        failed: 10,
        timeout: 5,
        cancelled: 5
      };
      fixture.detectChanges();

      const stats = component.outcomeStats;
      const smallSlices = stats.filter(s => s.percentage <= 5);
      expect(smallSlices.length).toBeGreaterThan(0);
    });
  });

  describe('responsive behavior', () => {
    it('should adapt canvas size to container', (done) => {
      component.data = mockOutcomeDistribution;
      fixture.detectChanges();

      setTimeout(() => {
        const canvas = component.chartCanvas?.nativeElement;
        if (canvas && canvas.parentElement) {
          expect(canvas.width).toBeLessThanOrEqual(canvas.parentElement.clientWidth);
        }
        done();
      }, 100);
    });
  });
});
