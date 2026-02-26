import { Injectable } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { Observable } from 'rxjs';

export interface ConfirmationDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'primary' | 'accent' | 'warn';
  requireConfirmation?: boolean;
}

/**
 * Service for displaying confirmation dialogs using PrimeNG ConfirmDialog.
 * Maintains backward compatibility with the original MatDialog-based interface.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmationDialogService {
  constructor(private confirmationService: ConfirmationService) {}
  
  /**
   * Opens a confirmation dialog and returns an Observable that emits true if confirmed, false if cancelled.
   * @param options Dialog configuration options
   * @returns Observable<boolean> that emits the user's choice
   */
  confirm(options: ConfirmationDialogData): Observable<boolean> {
    return new Observable(observer => {
      this.confirmationService.confirm({
        message: options.message,
        header: options.title,
        acceptLabel: options.confirmText || 'Confirm',
        rejectLabel: options.cancelText || 'Cancel',
        acceptButtonStyleClass: this.getAcceptButtonClass(options.confirmColor),
        rejectButtonStyleClass: 'p-button-text',
        accept: () => {
          observer.next(true);
          observer.complete();
        },
        reject: () => {
          observer.next(false);
          observer.complete();
        }
      });
    });
  }
  
  private getAcceptButtonClass(color?: 'primary' | 'accent' | 'warn'): string {
    switch (color) {
      case 'primary':
        return 'p-button-primary';
      case 'accent':
        return 'p-button-info';
      case 'warn':
      default:
        return 'p-button-danger';
    }
  }
}
