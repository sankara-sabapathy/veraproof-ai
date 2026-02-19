import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Platform } from '@angular/cdk/platform';
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
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['isAdmin', 'getCurrentUser']);
    
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
        { provide: Platform, useValue: mockPlatform }
      ]
    }).compileComponents();

    breakpointObserver = TestBed.inject(BreakpointObserver) as jasmine.SpyObj<BreakpointObserver>;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    authService.isAdmin.and.returnValue(false);
    authService.getCurrentUser.and.returnValue(null);
    
    fixture = TestBed.createComponent(MainLayoutComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    breakpointObserver.observe.and.returnValue(of({ matches: false, breakpoints: {} }));
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should detect handset breakpoint', (done) => {
    breakpointObserver.observe.and.returnValue(of({ matches: true, breakpoints: {} }));
    fixture.detectChanges();

    component.isHandset$.subscribe(isHandset => {
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
});
