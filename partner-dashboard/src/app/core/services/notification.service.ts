import { Injectable, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private snackBar = inject(MatSnackBar);

  private readonly defaultDuration = 3000;
  private readonly defaultHorizontalPosition: 'start' | 'center' | 'end' | 'left' | 'right' = 'end';
  private readonly defaultVerticalPosition: 'top' | 'bottom' = 'bottom';

  /**
   * Display success notification
   */
  success(message: string, duration: number = this.defaultDuration): void {
    const config: MatSnackBarConfig = {
      duration,
      horizontalPosition: this.defaultHorizontalPosition,
      verticalPosition: this.defaultVerticalPosition,
      panelClass: ['snackbar-success']
    };

    this.snackBar.open(message, 'Close', config);
  }

  /**
   * Display error notification
   */
  error(message: string, duration: number = this.defaultDuration): void {
    const config: MatSnackBarConfig = {
      duration,
      horizontalPosition: this.defaultHorizontalPosition,
      verticalPosition: this.defaultVerticalPosition,
      panelClass: ['snackbar-error']
    };

    this.snackBar.open(message, 'Close', config);
  }

  /**
   * Display info notification
   */
  info(message: string, duration: number = this.defaultDuration): void {
    const config: MatSnackBarConfig = {
      duration,
      horizontalPosition: this.defaultHorizontalPosition,
      verticalPosition: this.defaultVerticalPosition,
      panelClass: ['snackbar-info']
    };

    this.snackBar.open(message, 'Close', config);
  }

  /**
   * Display warning notification
   */
  warning(message: string, duration: number = this.defaultDuration): void {
    const config: MatSnackBarConfig = {
      duration,
      horizontalPosition: this.defaultHorizontalPosition,
      verticalPosition: this.defaultVerticalPosition,
      panelClass: ['snackbar-warning']
    };

    this.snackBar.open(message, 'Close', config);
  }
}
