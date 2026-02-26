import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { LoadingSpinnerComponent } from './loading-spinner.component';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

describe('LoadingSpinnerComponent', () => {
  let component: LoadingSpinnerComponent;
  let fixture: ComponentFixture<LoadingSpinnerComponent>;
  let compiled: DebugElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ LoadingSpinnerComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoadingSpinnerComponent);
    component = fixture.componentInstance;
    compiled = fixture.debugElement;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('spinner rendering', () => {
    it('should render spinner with default diameter', () => {
      fixture.detectChanges();
      
      const spinner = compiled.query(By.css('p-progressSpinner'));
      expect(spinner).toBeTruthy();
      expect(component.diameter).toBe(50);
    });

    it('should render spinner with custom diameter', () => {
      component.diameter = 100;
      fixture.detectChanges();
      
      const spinner = compiled.query(By.css('p-progressSpinner'));
      expect(spinner).toBeTruthy();
      expect(component.diameter).toBe(100);
    });

    it('should render spinner with small diameter', () => {
      component.diameter = 20;
      fixture.detectChanges();
      
      expect(component.diameter).toBe(20);
    });

    it('should render spinner with large diameter', () => {
      component.diameter = 200;
      fixture.detectChanges();
      
      expect(component.diameter).toBe(200);
    });
  });

  describe('message display', () => {
    it('should display message when provided', () => {
      component.message = 'Loading data...';
      fixture.detectChanges();
      
      const messageElement = compiled.query(By.css('.loading-message'));
      expect(messageElement).toBeTruthy();
      expect(messageElement.nativeElement.textContent).toContain('Loading data...');
    });

    it('should not display message when not provided', () => {
      fixture.detectChanges();
      
      const messageElement = compiled.query(By.css('.loading-message'));
      expect(messageElement).toBeFalsy();
    });

    it('should hide message when undefined', () => {
      component.message = undefined;
      fixture.detectChanges();
      
      const messageElement = compiled.query(By.css('.loading-message'));
      expect(messageElement).toBeFalsy();
    });

    it('should display empty string message', () => {
      component.message = '';
      fixture.detectChanges();
      
      const messageElement = compiled.query(By.css('.loading-message'));
      expect(messageElement).toBeFalsy();
    });

    it('should display long message', () => {
      component.message = 'Please wait while we process your request. This may take a few moments...';
      fixture.detectChanges();
      
      const messageElement = compiled.query(By.css('.loading-message'));
      expect(messageElement).toBeTruthy();
      expect(messageElement.nativeElement.textContent).toContain('Please wait while we process your request');
    });

    it('should update message dynamically', () => {
      component.message = 'Loading...';
      fixture.detectChanges();
      
      let messageElement = compiled.query(By.css('.loading-message'));
      expect(messageElement.nativeElement.textContent).toContain('Loading...');
      
      component.message = 'Almost done...';
      fixture.detectChanges();
      
      messageElement = compiled.query(By.css('.loading-message'));
      expect(messageElement.nativeElement.textContent).toContain('Almost done...');
    });
  });

  describe('edge cases', () => {
    it('should handle zero diameter', () => {
      component.diameter = 0;
      fixture.detectChanges();
      
      expect(component.diameter).toBe(0);
    });

    it('should handle negative diameter', () => {
      component.diameter = -10;
      fixture.detectChanges();
      
      expect(component.diameter).toBe(-10);
    });

    it('should handle very long message', () => {
      component.message = 'a'.repeat(1000);
      fixture.detectChanges();
      
      const messageElement = compiled.query(By.css('.loading-message'));
      expect(messageElement).toBeTruthy();
      expect(messageElement.nativeElement.textContent.length).toBeGreaterThan(500);
    });

    it('should handle message with special characters', () => {
      component.message = '<script>alert("test")</script>';
      fixture.detectChanges();
      
      const messageElement = compiled.query(By.css('.loading-message'));
      expect(messageElement.nativeElement.textContent).toContain('<script>alert("test")</script>');
    });

    it('should handle message with HTML entities', () => {
      component.message = 'Loading &amp; processing...';
      fixture.detectChanges();
      
      const messageElement = compiled.query(By.css('.loading-message'));
      expect(messageElement).toBeTruthy();
    });
  });
});
