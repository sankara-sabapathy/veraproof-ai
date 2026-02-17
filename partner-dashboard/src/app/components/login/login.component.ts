import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <h1>VeraProof AI</h1>
        <p class="subtitle">Partner Dashboard</p>
        
        <div class="mode-tabs">
          <button 
            type="button"
            class="mode-tab"
            [class.active]="!isSignupMode"
            (click)="setMode(false)"
            [disabled]="loading">
            Login
          </button>
          <button 
            type="button"
            class="mode-tab"
            [class.active]="isSignupMode"
            (click)="setMode(true)"
            [disabled]="loading">
            Sign Up
          </button>
        </div>
        
        <form (ngSubmit)="onSubmit()" #loginForm="ngForm">
          <div class="form-group">
            <label class="form-label">Email</label>
            <input 
              type="email" 
              class="form-input" 
              [(ngModel)]="email" 
              name="email" 
              required
              email
              [disabled]="loading"
              placeholder="your@email.com">
          </div>
          
          <div class="form-group">
            <label class="form-label">Password</label>
            <input 
              type="password" 
              class="form-input" 
              [(ngModel)]="password" 
              name="password" 
              required
              minlength="6"
              [disabled]="loading"
              placeholder="Enter password (min 6 characters)">
          </div>
          
          <div *ngIf="isSignupMode" class="form-group">
            <label class="form-label">Confirm Password</label>
            <input 
              type="password" 
              class="form-input" 
              [(ngModel)]="confirmPassword" 
              name="confirmPassword" 
              required
              [disabled]="loading"
              placeholder="Confirm your password">
          </div>
          
          <div *ngIf="error" class="error-message">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            {{ error }}
          </div>
          
          <div *ngIf="success" class="success-message">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            {{ success }}
          </div>
          
          <button 
            type="submit" 
            class="btn btn-primary btn-block" 
            [disabled]="loading || !loginForm.valid || (isSignupMode && password !== confirmPassword)">
            <span *ngIf="loading" class="spinner"></span>
            {{ loading ? (isSignupMode ? 'Creating Account...' : 'Logging in...') : (isSignupMode ? 'Create Account' : 'Login') }}
          </button>
        </form>
        
        <div class="info-text">
          <p *ngIf="isSignupMode">
            Already have an account? <a (click)="setMode(false)">Login here</a>
          </p>
          <p *ngIf="!isSignupMode">
            Don't have an account? <a (click)="setMode(true)">Sign up here</a>
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 1rem;
    }
    
    .login-card {
      background: white;
      padding: 2.5rem;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      width: 100%;
      max-width: 450px;
    }
    
    h1 {
      text-align: center;
      color: #2563eb;
      margin-bottom: 0.5rem;
      font-size: 2rem;
      font-weight: 700;
    }
    
    .subtitle {
      text-align: center;
      color: #64748b;
      margin-bottom: 2rem;
      font-size: 1rem;
    }
    
    .mode-tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 2rem;
      background: #f1f5f9;
      padding: 0.25rem;
      border-radius: 8px;
    }
    
    .mode-tab {
      flex: 1;
      padding: 0.75rem;
      border: none;
      background: transparent;
      color: #64748b;
      font-weight: 500;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .mode-tab:hover:not(:disabled) {
      color: #2563eb;
    }
    
    .mode-tab.active {
      background: white;
      color: #2563eb;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    .mode-tab:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
    
    .form-group {
      margin-bottom: 1.25rem;
    }
    
    .form-label {
      display: block;
      margin-bottom: 0.5rem;
      color: #334155;
      font-weight: 500;
      font-size: 0.875rem;
    }
    
    .form-input {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      font-size: 1rem;
      transition: all 0.2s;
      box-sizing: border-box;
    }
    
    .form-input:focus {
      outline: none;
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }
    
    .form-input:disabled {
      background: #f1f5f9;
      cursor: not-allowed;
    }
    
    .btn-block {
      width: 100%;
      margin-top: 1.5rem;
      padding: 0.875rem;
      font-size: 1rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
    
    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .error-message {
      background: #fee2e2;
      color: #991b1b;
      padding: 0.875rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      border: 1px solid #fecaca;
    }
    
    .success-message {
      background: #d1fae5;
      color: #065f46;
      padding: 0.875rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      border: 1px solid #a7f3d0;
    }
    
    .info-text {
      text-align: center;
      margin-top: 1.5rem;
      color: #64748b;
      font-size: 0.875rem;
    }
    
    .info-text a {
      color: #2563eb;
      cursor: pointer;
      text-decoration: none;
      font-weight: 500;
    }
    
    .info-text a:hover {
      text-decoration: underline;
    }
    
    @media (max-width: 480px) {
      .login-card {
        padding: 2rem 1.5rem;
      }
      
      h1 {
        font-size: 1.75rem;
      }
    }
  `]
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  
  email = '';
  password = '';
  confirmPassword = '';
  loading = false;
  error = '';
  success = '';
  isSignupMode = false;

  onSubmit(): void {
    this.loading = true;
    this.error = '';
    this.success = '';

    // Validate passwords match for signup
    if (this.isSignupMode && this.password !== this.confirmPassword) {
      this.error = 'Passwords do not match';
      this.loading = false;
      return;
    }

    // Validate password length
    if (this.password.length < 6) {
      this.error = 'Password must be at least 6 characters';
      this.loading = false;
      return;
    }

    const authObservable = this.isSignupMode 
      ? this.authService.signup(this.email, this.password)
      : this.authService.login(this.email, this.password);

    authObservable.subscribe({
      next: () => {
        if (this.isSignupMode) {
          this.success = 'Account created successfully! Redirecting...';
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 1000);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        console.error('Auth error:', err);
        this.error = err.error?.detail || (this.isSignupMode ? 'Failed to create account' : 'Login failed');
        this.loading = false;
      }
    });
  }

  setMode(isSignup: boolean): void {
    this.isSignupMode = isSignup;
    this.error = '';
    this.success = '';
    this.confirmPassword = '';
  }
}
