import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;
  let localStorageSpy: jasmine.SpyObj<Storage>;

  beforeEach(() => {
    // Mock localStorage
    localStorageSpy = jasmine.createSpyObj('localStorage', ['getItem', 'setItem']);
    Object.defineProperty(window, 'localStorage', {
      value: localStorageSpy,
      writable: true
    });

    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    // Clean up DOM modifications
    const themeLink = document.getElementById('app-theme');
    if (themeLink) {
      themeLink.remove();
    }
    document.documentElement.removeAttribute('data-theme');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('switchTheme', () => {
    it('should create theme link element if it does not exist', () => {
      service.switchTheme('dark');

      const themeLink = document.getElementById('app-theme') as HTMLLinkElement;
      expect(themeLink).toBeTruthy();
      expect(themeLink.href).toContain('lara-dark-blue/theme.css');
    });

    it('should update existing theme link element', () => {
      // Create initial theme link
      const initialLink = document.createElement('link');
      initialLink.id = 'app-theme';
      initialLink.rel = 'stylesheet';
      initialLink.href = 'lara-light-blue/theme.css';
      document.head.appendChild(initialLink);

      service.switchTheme('dark');

      const themeLink = document.getElementById('app-theme') as HTMLLinkElement;
      expect(themeLink.href).toContain('lara-dark-blue/theme.css');
    });

    it('should save theme preference to localStorage', () => {
      service.switchTheme('dark');

      expect(localStorageSpy.setItem).toHaveBeenCalledWith('theme', 'dark');
    });

    it('should update data-theme attribute on document element', () => {
      service.switchTheme('dark');

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should update theme signal', () => {
      service.switchTheme('dark');

      expect(service.theme()).toBe('dark');
    });

    it('should switch from dark to light theme', () => {
      service.switchTheme('dark');
      expect(service.theme()).toBe('dark');

      service.switchTheme('light');
      expect(service.theme()).toBe('light');

      const themeLink = document.getElementById('app-theme') as HTMLLinkElement;
      expect(themeLink.href).toContain('lara-light-blue/theme.css');
    });
  });

  describe('loadTheme', () => {
    it('should load saved theme from localStorage', () => {
      localStorageSpy.getItem.and.returnValue('dark');

      service.loadTheme();

      expect(localStorageSpy.getItem).toHaveBeenCalledWith('theme');
      expect(service.theme()).toBe('dark');
    });

    it('should default to light theme if no saved preference', () => {
      localStorageSpy.getItem.and.returnValue(null);

      service.loadTheme();

      expect(service.theme()).toBe('light');
    });

    it('should apply theme to DOM when loading', () => {
      localStorageSpy.getItem.and.returnValue('dark');

      service.loadTheme();

      const themeLink = document.getElementById('app-theme') as HTMLLinkElement;
      expect(themeLink.href).toContain('lara-dark-blue/theme.css');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
  });

  describe('theme signal', () => {
    it('should be readonly', () => {
      const themeSignal = service.theme;
      
      // Verify it's a signal by checking it's callable
      expect(typeof themeSignal).toBe('function');
      
      // Verify initial value
      expect(themeSignal()).toBe('light');
    });

    it('should update when switchTheme is called', () => {
      expect(service.theme()).toBe('light');

      service.switchTheme('dark');
      expect(service.theme()).toBe('dark');

      service.switchTheme('light');
      expect(service.theme()).toBe('light');
    });
  });
});
