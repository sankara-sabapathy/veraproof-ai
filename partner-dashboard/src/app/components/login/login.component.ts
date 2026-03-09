import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';
import { SecurityService } from '../../core/services/security.service';
import { AuthProviders } from '../../core/models/interfaces';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatIconModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  loading = false;
  errorMessage = '';
  authProviders: AuthProviders = { google: false, local: false };

  private readonly passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private securityService: SecurityService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128), Validators.pattern(this.passwordPattern)]],
      rememberMe: [false]
    });

    void this.authService.initializeAuth().subscribe({
      next: (session) => {
        if (session.authenticated) {
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/dashboard';
          void this.router.navigateByUrl(returnUrl);
        }
      }
    });

    void this.authService.getAuthProviders().subscribe({
      next: (providers) => {
        this.authProviders = providers;
      }
    });

    this.setErrorFromQuery();
  }

  get showLocalAuth(): boolean {
    return this.authProviders.local;
  }

  get showGoogleAuth(): boolean {
    return this.authProviders.google;
  }

  get email() { return this.loginForm.get('email'); }
  get password() { return this.loginForm.get('password'); }

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
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    const email = this.securityService.sanitizeInput(this.loginForm.value.email);
    const password = this.loginForm.value.password;
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/dashboard';

    this.authService.login(email, password).subscribe({
      next: () => {
        this.loading = false;
        void this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.message || 'Invalid email or password';
      }
    });
  }

  private setErrorFromQuery(): void {
    const error = this.route.snapshot.queryParamMap.get('error');
    if (!error) {
      return;
    }

    const messages: Record<string, string> = {
      auth_failed: 'Sign-in could not be completed. Please try again.',
      google_auth_failed: 'Google sign-in failed. Verify the Google OAuth client settings and try again.',
      state_mismatch: 'Your sign-in session expired or was interrupted. Please try again.',
      missing_code: 'Google did not return an authorization code. Please try again.',
      provider_unavailable: 'Google sign-in is not available in this environment.',
    };

    this.errorMessage = messages[error] || 'Sign-in could not be completed. Please try again.';
  }
}
