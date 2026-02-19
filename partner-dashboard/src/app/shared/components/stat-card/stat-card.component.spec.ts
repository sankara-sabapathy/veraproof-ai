import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { StatCardComponent } from './stat-card.component';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

describe('StatCardComponent', () => {
  let component: StatCardComponent;
  let fixture: ComponentFixture<StatCardComponent>;
  let compiled: DebugElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StatCardComponent ],
      imports: [ MatCardModule, MatIconModule ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StatCardComponent);
    component = fixture.componentInstance;
    compiled = fixture.debugElement;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('rendering with various inputs', () => {
    it('should render with string value', () => {
      component.title = 'Total Sessions';
      component.value = '1,234';
      component.icon = 'verified_user';
      fixture.detectChanges();

      const valueElement = compiled.query(By.css('.stat-value'));
      expect(valueElement.nativeElement.textContent).toContain('1,234');
    });

    it('should render with number value', () => {
      component.title = 'Success Rate';
      component.value = 95.5;
      component.icon = 'check_circle';
      fixture.detectChanges();

      const valueElement = compiled.query(By.css('.stat-value'));
      expect(valueElement.nativeElement.textContent).toContain('95.5');
    });

    it('should render with large numbers formatted with commas', () => {
      component.title = 'API Calls';
      component.value = '1,234,567';
      component.icon = 'api';
      fixture.detectChanges();

      const valueElement = compiled.query(By.css('.stat-value'));
      expect(valueElement.nativeElement.textContent).toContain('1,234,567');
    });

    it('should display subtitle when present', () => {
      component.title = 'Trust Score';
      component.value = 85;
      component.subtitle = 'Average across all sessions';
      component.icon = 'shield';
      fixture.detectChanges();

      const subtitleElement = compiled.query(By.css('.stat-subtitle'));
      expect(subtitleElement).toBeTruthy();
      expect(subtitleElement.nativeElement.textContent).toContain('Average across all sessions');
    });

    it('should not display subtitle when absent', () => {
      component.title = 'Trust Score';
      component.value = 85;
      component.icon = 'shield';
      fixture.detectChanges();

      const subtitleElement = compiled.query(By.css('.stat-subtitle'));
      expect(subtitleElement).toBeFalsy();
    });

    it('should display positive trend with up arrow', () => {
      component.title = 'Sessions';
      component.value = 100;
      component.trend = 15;
      component.icon = 'trending_up';
      fixture.detectChanges();

      const trendElement = compiled.query(By.css('.stat-trend'));
      const iconElement = trendElement.query(By.css('mat-icon'));
      expect(trendElement).toBeTruthy();
      expect(iconElement.nativeElement.textContent.trim()).toBe('trending_up');
      expect(trendElement.nativeElement.textContent).toContain('+15%');
    });

    it('should display negative trend with down arrow', () => {
      component.title = 'Sessions';
      component.value = 80;
      component.trend = -10;
      component.icon = 'trending_down';
      fixture.detectChanges();

      const trendElement = compiled.query(By.css('.stat-trend'));
      const iconElement = trendElement.query(By.css('mat-icon'));
      expect(trendElement).toBeTruthy();
      expect(iconElement.nativeElement.textContent.trim()).toBe('trending_down');
      expect(trendElement.nativeElement.textContent).toContain('-10%');
    });

    it('should display zero trend with down arrow', () => {
      component.title = 'Sessions';
      component.value = 100;
      component.trend = 0;
      component.icon = 'trending_flat';
      fixture.detectChanges();

      const trendElement = compiled.query(By.css('.stat-trend'));
      const iconElement = trendElement.query(By.css('mat-icon'));
      expect(trendElement).toBeTruthy();
      expect(iconElement.nativeElement.textContent.trim()).toBe('trending_down');
      expect(trendElement.nativeElement.textContent).toContain('0%');
    });

    it('should not display trend when undefined', () => {
      component.title = 'Sessions';
      component.value = 100;
      component.icon = 'analytics';
      fixture.detectChanges();

      const trendElement = compiled.query(By.css('.stat-trend'));
      expect(trendElement).toBeFalsy();
    });

    it('should apply primary icon color', () => {
      component.title = 'Test';
      component.value = 100;
      component.icon = 'star';
      component.iconColor = 'primary';
      fixture.detectChanges();

      const iconElement = compiled.query(By.css('mat-icon'));
      expect(iconElement.nativeElement.getAttribute('ng-reflect-color')).toBe('primary');
    });

    it('should apply accent icon color', () => {
      component.title = 'Test';
      component.value = 100;
      component.icon = 'star';
      component.iconColor = 'accent';
      fixture.detectChanges();

      const iconElement = compiled.query(By.css('mat-icon'));
      expect(iconElement.nativeElement.getAttribute('ng-reflect-color')).toBe('accent');
    });

    it('should apply warn icon color', () => {
      component.title = 'Test';
      component.value = 100;
      component.icon = 'warning';
      component.iconColor = 'warn';
      fixture.detectChanges();

      const iconElement = compiled.query(By.css('mat-icon'));
      expect(iconElement.nativeElement.getAttribute('ng-reflect-color')).toBe('warn');
    });
  });

  describe('edge cases', () => {
    it('should handle very long title with truncation', () => {
      component.title = 'This is a very long title that should be truncated or wrapped appropriately';
      component.value = 100;
      component.icon = 'info';
      fixture.detectChanges();

      const titleElement = compiled.query(By.css('.stat-title'));
      expect(titleElement.nativeElement.textContent).toContain('This is a very long title');
    });

    it('should handle empty string value', () => {
      component.title = 'Test';
      component.value = '';
      component.icon = 'info';
      fixture.detectChanges();

      const valueElement = compiled.query(By.css('.stat-value'));
      expect(valueElement.nativeElement.textContent.trim()).toBe('');
    });

    it('should handle zero as value', () => {
      component.title = 'Count';
      component.value = 0;
      component.icon = 'info';
      fixture.detectChanges();

      const valueElement = compiled.query(By.css('.stat-value'));
      expect(valueElement.nativeElement.textContent).toContain('0');
    });
  });
});
