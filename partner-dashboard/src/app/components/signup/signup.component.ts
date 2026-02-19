import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';
import { SecurityService } from '../../core/services/security.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule
  ],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss']
})
export class SignupComponent implements OnInit {
  signupForm!: FormGroup;
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
    this.signupForm = this.fb.group({
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
      confirmPassword: ['', [
        Validators.required
      ]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  // Custom validator to check if passwords match
  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    if (confirmPassword.value === '') {
      return null;
    }

    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  get email() {
    return this.signupForm.get('email');
  }

  get password() {
    return this.signupForm.get('password');
  }

  get confirmPassword() {
    return this.signupForm.get('confirmPassword');
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

  getConfirmPasswordError(): string {
    if (this.confirmPassword?.hasError('required') && this.confirmPassword?.touched) {
      return 'Please confirm your password';
    }
    if (this.signupForm.hasError('passwordMismatch') && this.confirmPassword?.touched) {
      return 'Passwords do not match';
    }
    return '';
  }

  onSubmit(): void {
    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    // Sanitize inputs using SecurityService
    const email = this.securityService.sanitizeInput(this.signupForm.value.email);
    const password = this.signupForm.value.password; // Don't sanitize password as it may contain special chars

    this.authService.signup(email, password).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.detail || 'Failed to create account. Please try again.';
        console.error('Signup error:', err);
      }
    });
  }
}
