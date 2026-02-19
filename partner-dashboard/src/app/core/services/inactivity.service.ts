import { Injectable, NgZone, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, fromEvent, merge, timer } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';

/**
 * Service to track user inactivity and automatically logout after 30 minutes
 */
@Injectable({
  providedIn: 'root'
})
export class InactivityService {
  private ngZone = inject(NgZone);
  private router = inject(Router);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);

  private readonly INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
  private readonly WARNING_TIME = 28 * 60 * 1000; // 28 minutes - show warning 2 minutes before logout
  
  private inactivityTimer: any;
  private warningTimer: any;
  private destroy$ = new Subject<void>();
  private isWarningShown = false;

  /**
   * Start monitoring user activity
   */
  startMonitoring(): void {
    if (typeof window === 'undefined') {
      return; // Skip in SSR
    }

    this.ngZone.runOutsideAngular(() => {
      // Listen to user activity events
      const activityEvents = merge(
        fromEvent(document, 'mousedown'),
        fromEvent(document, 'mousemove'),
        fromEvent(document, 'keydown'),
        fromEvent(document, 'scroll'),
        fromEvent(document, 'touchstart'),
        fromEvent(document, 'click')
      );

      // Debounce activity events to avoid excessive timer resets
      activityEvents.pipe(
        debounceTime(1000),
        takeUntil(this.destroy$)
      ).subscribe(() => {
        this.resetTimer();
      });
    });

    // Start initial timer
    this.resetTimer();
  }

  /**
   * Stop monitoring user activity
   */
  stopMonitoring(): void {
    this.clearTimers();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Reset inactivity timer
   */
  private resetTimer(): void {
    this.clearTimers();
    this.isWarningShown = false;

    // Set warning timer (28 minutes)
    this.warningTimer = setTimeout(() => {
      this.ngZone.run(() => {
        this.showWarning();
      });
    }, this.WARNING_TIME);

    // Set logout timer (30 minutes)
    this.inactivityTimer = setTimeout(() => {
      this.ngZone.run(() => {
        this.logout();
      });
    }, this.INACTIVITY_TIMEOUT);
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }

    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
  }

  /**
   * Show warning notification before logout
   */
  private showWarning(): void {
    if (this.isWarningShown) {
      return;
    }

    this.isWarningShown = true;
    this.notificationService.warning(
      'You will be logged out in 2 minutes due to inactivity',
      10000 // Show for 10 seconds
    );
  }

  /**
   * Logout user due to inactivity
   */
  private logout(): void {
    this.stopMonitoring();
    this.authService.logout().subscribe(() => {
      this.notificationService.info('You have been logged out due to inactivity');
      this.router.navigate(['/auth/login'], {
        queryParams: { reason: 'inactivity' }
      });
    });
  }

  /**
   * Manually trigger logout (for testing)
   */
  forceLogout(): void {
    this.logout();
  }
}
