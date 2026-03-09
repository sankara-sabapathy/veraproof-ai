import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../core/services/auth.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['login', 'startGoogleLogin', 'getAuthProviders', 'initializeAuth']);
    authServiceSpy.getAuthProviders.and.returnValue(of({ google: false, local: true }));
    authServiceSpy.initializeAuth.and.returnValue(of({ authenticated: false } as any));

    await TestBed.configureTestingModule({
      imports: [
        LoginComponent,
        ReactiveFormsModule,
        RouterTestingModule
      ],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: () => null
              }
            }
          }
        }
      ]
    }).compileComponents();

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Validation', () => {
    it('should initialize with empty form', () => {
      expect(component.loginForm.value).toEqual({
        email: '',
        password: '',
        rememberMe: false
      });
    });

    it('should mark form as invalid when empty', () => {
      expect(component.loginForm.valid).toBeFalsy();
    });

    it('should show email required error when email is empty and touched', () => {
      const emailControl = component.email;
      emailControl?.markAsTouched();
      fixture.detectChanges();
      expect(component.getEmailError()).toBe('Email is required');
    });

    it('should show invalid email error for malformed email', () => {
      const emailControl = component.email;
      emailControl?.setValue('invalid-email');
      emailControl?.markAsTouched();
      fixture.detectChanges();
      expect(component.getEmailError()).toBe('Please enter a valid email address');
    });
  });

  it('should call local login when form is valid', () => {
    authService.login.and.returnValue(of({ user: { user_id: 'u1', tenant_id: 't1', email: 'admin@veraproof.ai', role: 'Admin' } } as any));
    component.loginForm.setValue({ email: 'admin@veraproof.ai', password: 'Admin@123', rememberMe: false });

    component.onSubmit();

    expect(authService.login).toHaveBeenCalledWith('admin@veraproof.ai', 'Admin@123');
  });

  it('should start google login when local auth is unavailable', () => {
    component.authProviders = { google: true, local: false };

    component.onSubmit();

    expect(authService.startGoogleLogin).toHaveBeenCalled();
  });

  it('should surface login errors', () => {
    authService.login.and.returnValue(throwError(() => new Error('Invalid email or password')));
    component.loginForm.setValue({ email: 'admin@veraproof.ai', password: 'Admin@123', rememberMe: false });

    component.onSubmit();

    expect(component.errorMessage).toBe('Invalid email or password');
  });
});
