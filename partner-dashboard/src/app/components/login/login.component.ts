import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';
import { SecurityService } from '../../core/services/security.service';

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

  // Password pattern: at least one uppercase, one lowercase, one number, one special character
  private readonly passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private securityService: SecurityService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [
        Validators.required,
        Validators.email,
        Validators.maxLength(254)
      ]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(128),
        Validators.pattern(this.passwordPattern)
      ]],
      rememberMe: [false]
    });
  }

  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }

  get rememberMe() {
    return this.loginForm.get('rememberMe');
  }

  getEmailError(): string {
    if (this.email?.hasError('required') && this.email?.touched) {
      return 'Email is required';
    }
    if (this.email?.hasError('email') && this.email?.touched) {
      return 'Please enter a valid email address';
    }
    if (this.email?.hasError('maxlength') && this.email?.touched) {
      return 'Email must be less than 254 characters';
    }
    return '';
  }

  getPasswordError(): string {
    if (this.password?.hasError('required') && this.password?.touched) {
      return 'Password is required';
    }
    if (this.password?.hasError('minlength') && this.password?.touched) {
      return 'Password must be at least 8 characters';
    }
    if (this.password?.hasError('maxlength') && this.password?.touched) {
      return 'Password must be less than 128 characters';
    }
    if (this.password?.hasError('pattern') && this.password?.touched) {
      return 'Password must contain uppercase, lowercase, number, and special character';
    }
    return '';
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    // Sanitize inputs using SecurityService
    const email = this.securityService.sanitizeInput(this.loginForm.value.email);
    const password = this.loginForm.value.password; // Don't sanitize password as it may contain special chars
    const rememberMe = this.loginForm.value.rememberMe;

    this.authService.login(email, password).subscribe({
      next: () => {
        // Store remember me preference if needed
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
        }
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.detail || 'Invalid email or password';
        console.error('Login error:', err);
      }
    });
  }
}
