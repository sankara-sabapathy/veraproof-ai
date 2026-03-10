import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="auth-callback-shell">
      <div class="auth-callback-card">
        <h1>Signing you in</h1>
        <p>Finalizing your VeraProof dashboard session.</p>
      </div>
    </div>
  `,
  styles: [`
    .auth-callback-shell { min-height: 100vh; display: grid; place-items: center; background: linear-gradient(180deg, #f5f7fb 0%, #e6ebf4 100%); }
    .auth-callback-card { width: min(420px, 92vw); padding: 2rem; border-radius: 20px; background: white; box-shadow: 0 20px 60px rgba(15, 23, 42, 0.12); text-align: center; }
    h1 { margin: 0 0 0.75rem; font-size: 1.5rem; }
    p { margin: 0; color: #475569; }
  `]
})
export class AuthCallbackComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  private getPostLoginRoute(): string[] {
    return this.authService.isAdmin() ? ['/admin/platform-stats'] : ['/dashboard'];
  }

  ngOnInit(): void {
    this.authService.completeAuthCallback().subscribe({
      next: (session) => {
        if (session.authenticated) {
          void this.router.navigate(this.getPostLoginRoute());
          return;
        }
        void this.router.navigate(['/auth/login'], { queryParams: { error: 'auth_failed' } });
      },
      error: () => {
        void this.router.navigate(['/auth/login'], { queryParams: { error: 'auth_failed' } });
      }
    });
  }
}
