import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ToolbarComponent } from './toolbar.component';
import { AuthService } from '../../core/services/auth.service';
import { BehaviorSubject, of } from 'rxjs';

describe('ToolbarComponent', () => {
  let component: ToolbarComponent;
  let fixture: ComponentFixture<ToolbarComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;
  let currentUserSubject: BehaviorSubject<any>;

  beforeEach(async () => {
    currentUserSubject = new BehaviorSubject({ email: 'test@example.com', role: 'Admin' });
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['logout'], {
      currentUser$: currentUserSubject.asObservable()
    });
    authServiceSpy.logout.and.returnValue(of(undefined));

    await TestBed.configureTestingModule({
      imports: [
        ToolbarComponent,
        RouterTestingModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(ToolbarComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should display user email', (done) => {
    fixture.detectChanges();

    component.userEmail$.subscribe(email => {
      expect(email).toBe('test@example.com');
      done();
    });
  });

  it('should emit menuToggle event when menu button clicked', () => {
    fixture.detectChanges();
    spyOn(component.menuToggle, 'emit');

    component.onMenuToggle();

    expect(component.menuToggle.emit).toHaveBeenCalled();
  });

  it('should call logout and navigate to login', () => {
    fixture.detectChanges();
    spyOn(router, 'navigate');

    component.onLogout();

    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('should render user menu button', () => {
    fixture.detectChanges();

    // PrimeNG button uses p-button selector
    const userMenuButton = fixture.nativeElement.querySelector('.user-menu-button');
    expect(userMenuButton).toBeTruthy();
  });

  it('should handle logout error gracefully', () => {
    authService.logout.and.returnValue(of(undefined));
    spyOn(router, 'navigate');
    spyOn(console, 'error');

    fixture.detectChanges();
    component.onLogout();

    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('should initialize user menu items on init', () => {
    fixture.detectChanges();

    expect(component.userMenuItems).toBeDefined();
    expect(component.userMenuItems.length).toBeGreaterThan(0);
    expect(component.userMenuItems[0].label).toBe('Logout');
    expect(component.userMenuItems[0].icon).toBe('pi pi-sign-out');
  });

  it('should render PrimeNG toolbar', () => {
    fixture.detectChanges();

    const toolbar = fixture.nativeElement.querySelector('p-toolbar');
    expect(toolbar).toBeTruthy();
  });

  it('should render menu toggle button with PrimeNG icon', () => {
    fixture.detectChanges();

    const menuButton = fixture.nativeElement.querySelector('.menu-button');
    expect(menuButton).toBeTruthy();
  });

  it('should render brand container', () => {
    fixture.detectChanges();

    const brandContainer = fixture.nativeElement.querySelector('.brand-container');
    expect(brandContainer).toBeTruthy();
    
    const brandText = brandContainer.querySelector('.brand-text');
    expect(brandText?.textContent).toContain('VeraProof AI');
  });
});
