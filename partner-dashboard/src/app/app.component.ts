import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { InactivityService } from './core/services/inactivity.service';
import { SecurityService } from './core/services/security.service';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet></router-outlet>'
})
export class AppComponent implements OnInit, OnDestroy {
  private inactivityService = inject(InactivityService);
  private securityService = inject(SecurityService);
  private authService = inject(AuthService);

  ngOnInit(): void {
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
