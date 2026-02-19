import { Component, DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CopyToClipboardDirective } from './copy-to-clipboard.directive';

@Component({
  standalone: true,
  imports: [CopyToClipboardDirective],
  template: `
    <button [appCopyToClipboard]="textToCopy">Copy</button>
  `
})
class TestComponent {
  textToCopy = 'Test text to copy';
}

describe('CopyToClipboardDirective', () => {
  let component: TestComponent;
  let fixture: ComponentFixture<TestComponent>;
  let buttonElement: DebugElement;
  let directive: CopyToClipboardDirective;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ CopyToClipboardDirective, TestComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;
    buttonElement = fixture.debugElement.query(By.css('button'));
    directive = buttonElement.injector.get(CopyToClipboardDirective);
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(directive).toBeTruthy();
  });

  describe('clipboard API support', () => {
    it('should copy text using navigator.clipboard when available', async () => {
      const mockClipboard = {
        writeText: jasmine.createSpy('writeText').and.returnValue(Promise.resolve())
      };
      
      Object.defineProperty(navigator, 'clipboard', {
        value: mockClipboard,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(window, 'isSecureContext', {
        value: true,
        writable: true,
        configurable: true
      });

      component.textToCopy = 'API Key: abc123';
      fixture.detectChanges();

      buttonElement.nativeElement.click();
      await fixture.whenStable();

      expect(mockClipboard.writeText).toHaveBeenCalledWith('API Key: abc123');
    });

    it('should prevent default event behavior', () => {
      const event = new MouseEvent('click');
      spyOn(event, 'preventDefault');
      
      buttonElement.nativeElement.dispatchEvent(event);
      
      expect(event.preventDefault).toHaveBeenCalled();
    });
  });

  describe('fallback copy mechanism', () => {
    beforeEach(() => {
      // Simulate environment without clipboard API
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        writable: true,
        configurable: true
      });
    });

    it('should use fallback when clipboard API is not available', () => {
      spyOn(document, 'execCommand').and.returnValue(true);
      
      component.textToCopy = 'Fallback text';
      fixture.detectChanges();

      buttonElement.nativeElement.click();

      expect(document.execCommand).toHaveBeenCalledWith('copy');
    });

    it('should create and remove textarea element in fallback', () => {
      spyOn(document.body, 'appendChild').and.callThrough();
      spyOn(document.body, 'removeChild').and.callThrough();
      spyOn(document, 'execCommand').and.returnValue(true);

      component.textToCopy = 'Test';
      fixture.detectChanges();

      buttonElement.nativeElement.click();

      expect(document.body.appendChild).toHaveBeenCalled();
      expect(document.body.removeChild).toHaveBeenCalled();
    });

    it('should handle execCommand failure gracefully', () => {
      spyOn(document, 'execCommand').and.returnValue(false);
      spyOn(console, 'error');

      component.textToCopy = 'Test';
      fixture.detectChanges();

      expect(() => buttonElement.nativeElement.click()).not.toThrow();
    });
  });

  describe('text content handling', () => {
    it('should copy simple text', async () => {
      const mockClipboard = {
        writeText: jasmine.createSpy('writeText').and.returnValue(Promise.resolve())
      };
      
      Object.defineProperty(navigator, 'clipboard', {
        value: mockClipboard,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(window, 'isSecureContext', {
        value: true,
        writable: true,
        configurable: true
      });

      component.textToCopy = 'Simple text';
      fixture.detectChanges();

      buttonElement.nativeElement.click();
      await fixture.whenStable();

      expect(mockClipboard.writeText).toHaveBeenCalledWith('Simple text');
    });

    it('should copy empty string', async () => {
      const mockClipboard = {
        writeText: jasmine.createSpy('writeText').and.returnValue(Promise.resolve())
      };
      
      Object.defineProperty(navigator, 'clipboard', {
        value: mockClipboard,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(window, 'isSecureContext', {
        value: true,
        writable: true,
        configurable: true
      });

      component.textToCopy = '';
      fixture.detectChanges();

      buttonElement.nativeElement.click();
      await fixture.whenStable();

      expect(mockClipboard.writeText).toHaveBeenCalledWith('');
    });

    it('should copy text with special characters', async () => {
      const mockClipboard = {
        writeText: jasmine.createSpy('writeText').and.returnValue(Promise.resolve())
      };
      
      Object.defineProperty(navigator, 'clipboard', {
        value: mockClipboard,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(window, 'isSecureContext', {
        value: true,
        writable: true,
        configurable: true
      });

      component.textToCopy = 'Text with !@#$%^&*() special chars';
      fixture.detectChanges();

      buttonElement.nativeElement.click();
      await fixture.whenStable();

      expect(mockClipboard.writeText).toHaveBeenCalledWith('Text with !@#$%^&*() special chars');
    });

    it('should copy multiline text', async () => {
      const mockClipboard = {
        writeText: jasmine.createSpy('writeText').and.returnValue(Promise.resolve())
      };
      
      Object.defineProperty(navigator, 'clipboard', {
        value: mockClipboard,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(window, 'isSecureContext', {
        value: true,
        writable: true,
        configurable: true
      });

      component.textToCopy = 'Line 1\nLine 2\nLine 3';
      fixture.detectChanges();

      buttonElement.nativeElement.click();
      await fixture.whenStable();

      expect(mockClipboard.writeText).toHaveBeenCalledWith('Line 1\nLine 2\nLine 3');
    });

    it('should copy very long text', async () => {
      const mockClipboard = {
        writeText: jasmine.createSpy('writeText').and.returnValue(Promise.resolve())
      };
      
      Object.defineProperty(navigator, 'clipboard', {
        value: mockClipboard,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(window, 'isSecureContext', {
        value: true,
        writable: true,
        configurable: true
      });

      const longText = 'a'.repeat(10000);
      component.textToCopy = longText;
      fixture.detectChanges();

      buttonElement.nativeElement.click();
      await fixture.whenStable();

      expect(mockClipboard.writeText).toHaveBeenCalledWith(longText);
    });
  });

  describe('error handling', () => {
    it('should handle clipboard API rejection', async () => {
      const mockClipboard = {
        writeText: jasmine.createSpy('writeText').and.returnValue(Promise.reject(new Error('Permission denied')))
      };
      
      Object.defineProperty(navigator, 'clipboard', {
        value: mockClipboard,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(window, 'isSecureContext', {
        value: true,
        writable: true,
        configurable: true
      });

      spyOn(console, 'error');
      spyOn(document, 'execCommand').and.returnValue(true);

      component.textToCopy = 'Test';
      fixture.detectChanges();

      buttonElement.nativeElement.click();
      await fixture.whenStable();

      expect(console.error).toHaveBeenCalled();
    });

    it('should not throw error when copy fails', () => {
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        writable: true,
        configurable: true
      });
      
      spyOn(document, 'execCommand').and.throwError('Copy failed');
      spyOn(console, 'error');

      component.textToCopy = 'Test';
      fixture.detectChanges();

      expect(() => buttonElement.nativeElement.click()).not.toThrow();
    });
  });

  describe('dynamic text updates', () => {
    it('should copy updated text value', async () => {
      const mockClipboard = {
        writeText: jasmine.createSpy('writeText').and.returnValue(Promise.resolve())
      };
      
      Object.defineProperty(navigator, 'clipboard', {
        value: mockClipboard,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(window, 'isSecureContext', {
        value: true,
        writable: true,
        configurable: true
      });

      component.textToCopy = 'Initial text';
      fixture.detectChanges();

      buttonElement.nativeElement.click();
      await fixture.whenStable();

      expect(mockClipboard.writeText).toHaveBeenCalledWith('Initial text');

      mockClipboard.writeText.calls.reset();

      component.textToCopy = 'Updated text';
      fixture.detectChanges();

      buttonElement.nativeElement.click();
      await fixture.whenStable();

      expect(mockClipboard.writeText).toHaveBeenCalledWith('Updated text');
    });
  });
});
