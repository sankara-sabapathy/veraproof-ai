import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InactivityService } from './core/services/inactivity.service';
import { SecurityService } from './core/services/security.service';
import { AuthService } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';
import { PrimeNGConfigService } from './core/services/primeng-config.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ConfirmDialogModule],
  template: `
    <router-outlet></router-outlet>
    <p-confirmDialog></p-confirmDialog>
  `
})
export class AppComponent implements OnInit, OnDestroy {
  private inactivityService = inject(InactivityService);
  private securityService = inject(SecurityService);
  private authService = inject(AuthService);
  private themeService = inject(ThemeService);
  private primeNGConfigService = inject(PrimeNGConfigService);

  ngOnInit(): void {
    // Initialize PrimeNG configuration
    this.primeNGConfigService.initializeConfig();
    
    // Load saved theme preference
    this.themeService.loadTheme();
    
    // Enforce HTTPS in production
    this.securityService.enforceHttps();

    // Start inactivity monitoring if user is authenticated
    this.authService.isAuthenticated$.subscribe(isAuthenticated => {
      if (isAuthenticated) {
        this.inactivityService.startMonitoring();
      } else {
        this.inactivityService.stopMonitoring();
      }
    });
  }

  ngOnDestroy(): void {
    this.inactivityService.stopMonitoring();
  }
}
