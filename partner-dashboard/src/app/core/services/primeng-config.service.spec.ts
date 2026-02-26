import { TestBed } from '@angular/core/testing';
import { PrimeNGConfig } from 'primeng/api';
import { PrimeNGConfigService } from './primeng-config.service';

describe('PrimeNGConfigService', () => {
  let service: PrimeNGConfigService;
  let primeNGConfig: PrimeNGConfig;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PrimeNGConfigService,
        PrimeNGConfig
      ]
    });
    service = TestBed.inject(PrimeNGConfigService);
    primeNGConfig = TestBed.inject(PrimeNGConfig);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initializeConfig', () => {
    it('should enable ripple effect by default', () => {
      service.initializeConfig();
      expect(primeNGConfig.ripple).toBe(true);
    });

    it('should configure z-index values for overlays', () => {
      service.initializeConfig();
      expect(primeNGConfig.zIndex).toEqual({
        modal: 1100,
        overlay: 1000,
        menu: 1000,
        tooltip: 1100,
        toast: 1200
      });
    });

    it('should configure default English translations', () => {
      service.initializeConfig();
      
      // Access translation directly from config
      expect(primeNGConfig.translation.accept).toBe('Yes');
      expect(primeNGConfig.translation.reject).toBe('No');
      expect(primeNGConfig.translation.cancel).toBe('Cancel');
      expect(primeNGConfig.translation.clear).toBe('Clear');
      expect(primeNGConfig.translation.apply).toBe('Apply');
    });

    it('should configure day names', () => {
      service.initializeConfig();
      
      expect(primeNGConfig.translation.dayNames).toEqual([
        'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
      ]);
      expect(primeNGConfig.translation.dayNamesShort).toEqual([
        'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'
      ]);
      expect(primeNGConfig.translation.dayNamesMin).toEqual([
        'Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'
      ]);
    });

    it('should configure month names', () => {
      service.initializeConfig();
      
      expect(primeNGConfig.translation.monthNames).toEqual([
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ]);
      expect(primeNGConfig.translation.monthNamesShort).toEqual([
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ]);
    });

    it('should configure filter operation translations', () => {
      service.initializeConfig();
      
      expect(primeNGConfig.translation.startsWith).toBe('Starts with');
      expect(primeNGConfig.translation.contains).toBe('Contains');
      expect(primeNGConfig.translation.notContains).toBe('Not contains');
      expect(primeNGConfig.translation.endsWith).toBe('Ends with');
      expect(primeNGConfig.translation.equals).toBe('Equals');
      expect(primeNGConfig.translation.notEquals).toBe('Not equals');
    });

    it('should configure empty message translations', () => {
      service.initializeConfig();
      
      expect(primeNGConfig.translation.emptyMessage).toBe('No results found');
      expect(primeNGConfig.translation.emptyFilterMessage).toBe('No results found');
    });
  });

  describe('setRipple', () => {
    it('should enable ripple effect when true', () => {
      service.setRipple(true);
      expect(primeNGConfig.ripple).toBe(true);
    });

    it('should disable ripple effect when false', () => {
      service.setRipple(false);
      expect(primeNGConfig.ripple).toBe(false);
    });
  });

  describe('getRipple', () => {
    it('should return current ripple state', () => {
      primeNGConfig.ripple = true;
      expect(service.getRipple()).toBe(true);

      primeNGConfig.ripple = false;
      expect(service.getRipple()).toBe(false);
    });
  });
});
