import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Platform } from '@angular/cdk/platform';
import { DOCUMENT } from '@angular/common';
import { of } from 'rxjs';
import { MainLayoutComponent } from './main-layout.component';
import { AuthService } from '../../core/services/auth.service';

describe('MainLayoutComponent', () => {
  let component: MainLayoutComponent;
  let fixture: ComponentFixture<MainLayoutComponent>;
  let breakpointObserver: jasmine.SpyObj<BreakpointObserver>;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    const breakpointObserverSpy = jasmine.createSpyObj('BreakpointObserver', ['observe']);
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['isAdmin', 'getCurrentUser', 'logout'], {
      currentUser$: of({ email: 'test@example.com', role: 'Admin' })
    });
    
    // Create a mock Platform with _document
    const mockPlatform = {
      isBrowser: true,
      ANDROID: false,
      IOS: false,
      FIREFOX: false,
      BLINK: true,
      WEBKIT: false,
      TRIDENT: false,
      EDGE: false,
      SAFARI: false,
      _document: document
    };

    await TestBed.configureTestingModule({
      imports: [
        MainLayoutComponent,
        NoopAnimationsModule,
        RouterTestingModule
      ],
      providers: [
        { provide: BreakpointObserver, useValue: breakpointObserverSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Platform, useValue: mockPlatform },
        { provide: DOCUMENT, useValue: document }
      ]
    }).compileComponents();

    breakpointObserver = TestBed.inject(BreakpointObserver) as jasmine.SpyObj<BreakpointObserver>;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    authService.isAdmin.and.returnValue(false);
    authService.getCurrentUser.and.returnValue(null);
    authService.logout.and.returnValue(of(undefined));
    
    // Set up default breakpoint observer behavior before creating component
    breakpointObserver.observe.and.returnValue(of({ matches: false, breakpoints: {} }));
    
    fixture = TestBed.createComponent(MainLayoutComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    breakpointObserver.observe.and.returnValue(of({ matches: false, breakpoints: {} }));
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should detect handset breakpoint', (done) => {
    // Need to recreate component with handset breakpoint
    const handsetObserver = TestBed.inject(BreakpointObserver) as jasmine.SpyObj<BreakpointObserver>;
    handsetObserver.observe.and.returnValue(of({ matches: true, breakpoints: {} }));
    
    const handsetFixture = TestBed.createComponent(MainLayoutComponent);
    const handsetComponent = handsetFixture.componentInstance;
    handsetFixture.detectChanges();

    handsetComponent.isHandset$.subscribe(isHandset => {
      expect(isHandset).toBe(true);
      done();
    });
  });

  it('should detect desktop breakpoint', (done) => {
    breakpointObserver.observe.and.returnValue(of({ matches: false, breakpoints: {} }));
    fixture.detectChanges();

    component.isHandset$.subscribe(isHandset => {
      expect(isHandset).toBe(false);
      done();
    });
  });

  it('should set sidebar visible to true by default on handset', () => {
    // Need to recreate component with handset breakpoint
    const handsetObserver = TestBed.inject(BreakpointObserver) as jasmine.SpyObj<BreakpointObserver>;
    handsetObserver.observe.and.returnValue(of({ matches: true, breakpoints: {} }));
    
    const handsetFixture = TestBed.createComponent(MainLayoutComponent);
    const handsetComponent = handsetFixture.componentInstance;
    handsetFixture.detectChanges();
    
    // Sidebar starts visible even on handset (user can toggle it)
    expect(handsetComponent.sidebarVisible()).toBe(true);
  });

  it('should set sidebar visible to true on desktop', () => {
    breakpointObserver.observe.and.returnValue(of({ matches: false, breakpoints: {} }));
    fixture.detectChanges();
    expect(component.sidebarVisible()).toBe(true);
  });

  it('should toggle sidebar visibility', () => {
    breakpointObserver.observe.and.returnValue(of({ matches: false, breakpoints: {} }));
    fixture.detectChanges();
    
    const initialState = component.sidebarVisible();
    component.toggleSidebar();
    expect(component.sidebarVisible()).toBe(!initialState);
    
    component.toggleSidebar();
    expect(component.sidebarVisible()).toBe(initialState);
  });

  it('should render sidebar and toolbar', () => {
    breakpointObserver.observe.and.returnValue(of({ matches: false, breakpoints: {} }));
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('app-sidebar')).toBeTruthy();
    expect(compiled.querySelector('app-toolbar')).toBeTruthy();
  });

  it('should render router outlet', () => {
    breakpointObserver.observe.and.returnValue(of({ matches: false, breakpoints: {} }));
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });

  it('should render PrimeNG sidebar on mobile', () => {
    // Need to recreate component with handset breakpoint
    const handsetObserver = TestBed.inject(BreakpointObserver) as jasmine.SpyObj<BreakpointObserver>;
    handsetObserver.observe.and.returnValue(of({ matches: true, breakpoints: {} }));
    
    const handsetFixture = TestBed.createComponent(MainLayoutComponent);
    handsetFixture.detectChanges();

    const compiled = handsetFixture.nativeElement;
    expect(compiled.querySelector('p-sidebar')).toBeTruthy();
  });
});
