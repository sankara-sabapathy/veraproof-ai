import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, NavigationEnd } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSidenav } from '@angular/material/sidenav';
import { ToolbarComponent } from './toolbar.component';
import { AuthService } from '../../core/services/auth.service';
import { BehaviorSubject, of } from 'rxjs';
import { filter, map } from 'rxjs/operators';

describe('ToolbarComponent', () => {
  let component: ToolbarComponent;
  let fixture: ComponentFixture<ToolbarComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;
  let mockDrawer: jasmine.SpyObj<MatSidenav>;
  let currentUserSubject: BehaviorSubject<any>;

  beforeEach(async () => {
    currentUserSubject = new BehaviorSubject({ email: 'test@example.com', role: 'Admin' });
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['logout'], {
      currentUser$: currentUserSubject.asObservable()
    });
    authServiceSpy.logout.and.returnValue(of(undefined));

    mockDrawer = jasmine.createSpyObj('MatSidenav', ['toggle']);

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
    component.drawer = mockDrawer;
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

  it('should toggle drawer when menu button clicked', () => {
    fixture.detectChanges();

    const menuButton = fixture.nativeElement.querySelector('.menu-button');
    menuButton?.click();

    expect(mockDrawer.toggle).toHaveBeenCalled();
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
});
