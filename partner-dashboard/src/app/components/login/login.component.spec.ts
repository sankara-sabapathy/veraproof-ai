import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../core/services/auth.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['login']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [LoginComponent, ReactiveFormsModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
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

    describe('Email Validation', () => {
      it('should show "Email is required" error when email is empty and touched', () => {
        const emailControl = component.email;
        emailControl?.markAsTouched();
        fixture.detectChanges();
        expect(component.getEmailError()).toBe('Email is required');
      });

      it('should show "Please enter a valid email address" for invalid email format', () => {
        const emailControl = component.email;
        emailControl?.setValue('invalid-email');
        emailControl?.markAsTouched();
        fixture.detectChanges();
        expect(component.getEmailError()).toBe('Please enter a valid email address');
      });

      it('should accept valid email format', () => {
        const emailControl = component.email;
        emailControl?.setValue('test@example.com');
        emailControl?.markAsTouched();
        fixture.detectChanges();
        expect(emailControl?.valid).toBeTruthy();
      });
    });
  });
});