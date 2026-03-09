import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SecurityService } from '../../core/services/security.service';
import { AuthProviders } from '../../core/models/interfaces';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss']
})
export class SignupComponent implements OnInit {
  signupForm!: FormGroup;
  loading = false;
  errorMessage = '';
  authProviders: AuthProviders = { google: false, local: false };

  private readonly passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private securityService: SecurityService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.signupForm = this.fb.group({
      email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128), Validators.pattern(this.passwordPattern)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });

    void this.authService.initializeAuth().subscribe({
      next: (session) => {
        if (session.authenticated) {
          void this.router.navigate(['/dashboard']);
        }
      }
    });

    void this.authService.getAuthProviders().subscribe({
      next: (providers) => {
        this.authProviders = providers;
      }
    });
  }

  get showLocalAuth(): boolean {
    return this.authProviders.local;
  }

  get showGoogleAuth(): boolean {
    return this.authProviders.google;
  }

  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');
    if (!password || !confirmPassword || confirmPassword.value === '') {
      return null;
    }
    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  get email() { return this.signupForm.get('email'); }
  get password() { return this.signupForm.get('password'); }
  get confirmPassword() { return this.signupForm.get('confirmPassword'); }

  getEmailError(): string {
    if (this.email?.hasError('required') && this.email?.touched) return 'Email is required';
    if (this.email?.hasError('email') && this.email?.touched) return 'Please enter a valid email address';
    if (this.email?.hasError('maxlength') && this.email?.touched) return 'Email must be less than 254 characters';
    return '';
  }

  getPasswordError(): string {
    if (this.password?.hasError('required') && this.password?.touched) return 'Password is required';
    if (this.password?.hasError('minlength') && this.password?.touched) return 'Password must be at least 8 characters';
    if (this.password?.hasError('maxlength') && this.password?.touched) return 'Password must be less than 128 characters';
    if (this.password?.hasError('pattern') && this.password?.touched) return 'Password must contain uppercase, lowercase, number, and special character';
    return '';
  }

  getConfirmPasswordError(): string {
    if (this.confirmPassword?.hasError('required') && this.confirmPassword?.touched) return 'Please confirm your password';
    if (this.signupForm.hasError('passwordMismatch') && this.confirmPassword?.touched) return 'Passwords do not match';
    return '';
  }

  startGoogleLogin(): void {
    if (!this.showGoogleAuth) {
      this.errorMessage = 'Google sign-in is not configured in this environment.';
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    this.authService.startGoogleLogin();
  }

  onSubmit(): void {
    if (!this.showLocalAuth) {
      this.startGoogleLogin();
      return;
    }
    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    const email = this.securityService.sanitizeInput(this.signupForm.value.email);
    const password = this.signupForm.value.password;
    this.authService.signup(email, password).subscribe({
      next: () => {
        this.loading = false;
        void this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.message || 'Failed to create account. Please try again.';
      }
    });
  }
}
