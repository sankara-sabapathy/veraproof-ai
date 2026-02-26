import { TestBed } from '@angular/core/testing';
import { ConfirmationService } from 'primeng/api';
import { ConfirmationDialogService, ConfirmationDialogData } from './confirmation-dialog.component';

describe('ConfirmationDialogService', () => {
  let service: ConfirmationDialogService;
  let confirmationService: jasmine.SpyObj<ConfirmationService>;

  beforeEach(() => {
    const confirmationServiceSpy = jasmine.createSpyObj('ConfirmationService', ['confirm']);

    TestBed.configureTestingModule({
      providers: [
        ConfirmationDialogService,
        { provide: ConfirmationService, useValue: confirmationServiceSpy }
      ]
    });

    service = TestBed.inject(ConfirmationDialogService);
    confirmationService = TestBed.inject(ConfirmationService) as jasmine.SpyObj<ConfirmationService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('confirm method', () => {
    it('should call ConfirmationService.confirm with correct parameters', () => {
      const options: ConfirmationDialogData = {
        title: 'Delete Item',
        message: 'Are you sure you want to delete this item?',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        confirmColor: 'warn'
      };

      service.confirm(options).subscribe();

      expect(confirmationService.confirm).toHaveBeenCalledWith(
        jasmine.objectContaining({
          message: 'Are you sure you want to delete this item?',
          header: 'Delete Item',
          acceptLabel: 'Delete',
          rejectLabel: 'Cancel',
          acceptButtonStyleClass: 'p-button-danger'
        })
      );
    });

    it('should use default confirm text when not provided', () => {
      const options: ConfirmationDialogData = {
        title: 'Test',
        message: 'Test message'
      };

      service.confirm(options).subscribe();

      expect(confirmationService.confirm).toHaveBeenCalledWith(
        jasmine.objectContaining({
          acceptLabel: 'Confirm',
          rejectLabel: 'Cancel'
        })
      );
    });

    it('should emit true when user accepts', (done) => {
      const options: ConfirmationDialogData = {
        title: 'Test',
        message: 'Test message'
      };

      confirmationService.confirm.and.callFake((config: any) => {
        config.accept();
        return confirmationService;
      });

      service.confirm(options).subscribe(result => {
        expect(result).toBe(true);
        done();
      });
    });

    it('should emit false when user rejects', (done) => {
      const options: ConfirmationDialogData = {
        title: 'Test',
        message: 'Test message'
      };

      confirmationService.confirm.and.callFake((config: any) => {
        config.reject();
        return confirmationService;
      });

      service.confirm(options).subscribe(result => {
        expect(result).toBe(false);
        done();
      });
    });

    it('should map primary color to p-button-primary', () => {
      const options: ConfirmationDialogData = {
        title: 'Test',
        message: 'Test message',
        confirmColor: 'primary'
      };

      service.confirm(options).subscribe();

      expect(confirmationService.confirm).toHaveBeenCalledWith(
        jasmine.objectContaining({
          acceptButtonStyleClass: 'p-button-primary'
        })
      );
    });

    it('should map accent color to p-button-info', () => {
      const options: ConfirmationDialogData = {
        title: 'Test',
        message: 'Test message',
        confirmColor: 'accent'
      };

      service.confirm(options).subscribe();

      expect(confirmationService.confirm).toHaveBeenCalledWith(
        jasmine.objectContaining({
          acceptButtonStyleClass: 'p-button-info'
        })
      );
    });

    it('should map warn color to p-button-danger', () => {
      const options: ConfirmationDialogData = {
        title: 'Test',
        message: 'Test message',
        confirmColor: 'warn'
      };

      service.confirm(options).subscribe();

      expect(confirmationService.confirm).toHaveBeenCalledWith(
        jasmine.objectContaining({
          acceptButtonStyleClass: 'p-button-danger'
        })
      );
    });

    it('should default to p-button-danger when no color specified', () => {
      const options: ConfirmationDialogData = {
        title: 'Test',
        message: 'Test message'
      };

      service.confirm(options).subscribe();

      expect(confirmationService.confirm).toHaveBeenCalledWith(
        jasmine.objectContaining({
          acceptButtonStyleClass: 'p-button-danger'
        })
      );
    });

    it('should handle custom confirm and cancel text', () => {
      const options: ConfirmationDialogData = {
        title: 'Custom Dialog',
        message: 'Custom message',
        confirmText: 'Yes, Do It',
        cancelText: 'No, Cancel'
      };

      service.confirm(options).subscribe();

      expect(confirmationService.confirm).toHaveBeenCalledWith(
        jasmine.objectContaining({
          acceptLabel: 'Yes, Do It',
          rejectLabel: 'No, Cancel'
        })
      );
    });

    it('should complete the observable after accept', (done) => {
      const options: ConfirmationDialogData = {
        title: 'Test',
        message: 'Test message'
      };

      confirmationService.confirm.and.callFake((config: any) => {
        config.accept();
        return confirmationService;
      });

      service.confirm(options).subscribe({
        next: (result) => {
          expect(result).toBe(true);
        },
        complete: () => {
          done();
        }
      });
    });

    it('should complete the observable after reject', (done) => {
      const options: ConfirmationDialogData = {
        title: 'Test',
        message: 'Test message'
      };

      confirmationService.confirm.and.callFake((config: any) => {
        config.reject();
        return confirmationService;
      });

      service.confirm(options).subscribe({
        next: (result) => {
          expect(result).toBe(false);
        },
        complete: () => {
          done();
        }
      });
    });
  });

  describe('edge cases', () => {
    it('should handle very long message text', () => {
      const longMessage = 'a'.repeat(1000);
      const options: ConfirmationDialogData = {
        title: 'Test',
        message: longMessage
      };

      service.confirm(options).subscribe();

      expect(confirmationService.confirm).toHaveBeenCalledWith(
        jasmine.objectContaining({
          message: longMessage
        })
      );
    });

    it('should handle empty message', () => {
      const options: ConfirmationDialogData = {
        title: 'Test',
        message: ''
      };

      service.confirm(options).subscribe();

      expect(confirmationService.confirm).toHaveBeenCalledWith(
        jasmine.objectContaining({
          message: ''
        })
      );
    });

    it('should handle special characters in message', () => {
      const options: ConfirmationDialogData = {
        title: 'Test',
        message: '<script>alert("xss")</script>'
      };

      service.confirm(options).subscribe();

      expect(confirmationService.confirm).toHaveBeenCalledWith(
        jasmine.objectContaining({
          message: '<script>alert("xss")</script>'
        })
      );
    });
  });
});
