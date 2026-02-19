import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ConfirmationDialogComponent, ConfirmationDialogData } from './confirmation-dialog.component';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

describe('ConfirmationDialogComponent', () => {
  let component: ConfirmationDialogComponent;
  let fixture: ComponentFixture<ConfirmationDialogComponent>;
  let compiled: DebugElement;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<ConfirmationDialogComponent>>;

  const createComponent = (data: ConfirmationDialogData) => {
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    
    TestBed.configureTestingModule({
      declarations: [ ConfirmationDialogComponent ],
      imports: [
        BrowserAnimationsModule,
        FormsModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule
      ],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data }
      ]
    });

    fixture = TestBed.createComponent(ConfirmationDialogComponent);
    component = fixture.componentInstance;
    compiled = fixture.debugElement;
    fixture.detectChanges();
  };

  it('should create', () => {
    createComponent({
      title: 'Test',
      message: 'Test message'
    });
    expect(component).toBeTruthy();
  });

  describe('dialog display', () => {
    it('should display correct title and message', () => {
      createComponent({
        title: 'Delete Item',
        message: 'Are you sure you want to delete this item?'
      });

      const title = compiled.query(By.css('h2[mat-dialog-title]'));
      const message = compiled.query(By.css('mat-dialog-content p'));
      
      expect(title.nativeElement.textContent).toContain('Delete Item');
      expect(message.nativeElement.textContent).toContain('Are you sure you want to delete this item?');
    });

    it('should display custom confirm button text', () => {
      createComponent({
        title: 'Test',
        message: 'Test message',
        confirmText: 'Delete Now'
      });

      const confirmButton = compiled.queryAll(By.css('button[mat-raised-button]'))[0];
      expect(confirmButton.nativeElement.textContent.trim()).toBe('Delete Now');
    });

    it('should display default confirm button text', () => {
      createComponent({
        title: 'Test',
        message: 'Test message'
      });

      const confirmButton = compiled.queryAll(By.css('button[mat-raised-button]'))[0];
      expect(confirmButton.nativeElement.textContent.trim()).toBe('Confirm');
    });

    it('should apply warn color to confirm button by default', () => {
      createComponent({
        title: 'Test',
        message: 'Test message'
      });

      const confirmButton = compiled.queryAll(By.css('button[mat-raised-button]'))[0];
      expect(confirmButton.nativeElement.getAttribute('ng-reflect-color')).toBe('warn');
    });

    it('should apply custom color to confirm button', () => {
      createComponent({
        title: 'Test',
        message: 'Test message',
        confirmColor: 'primary'
      });

      const confirmButton = compiled.queryAll(By.css('button[mat-raised-button]'))[0];
      expect(confirmButton.nativeElement.getAttribute('ng-reflect-color')).toBe('primary');
    });
  });

  describe('confirmation text requirement', () => {
    it('should show confirmation input when requireConfirmation is true', () => {
      createComponent({
        title: 'Delete',
        message: 'This action cannot be undone',
        requireConfirmation: true
      });

      const confirmationField = compiled.query(By.css('.confirmation-field'));
      expect(confirmationField).toBeTruthy();
    });

    it('should not show confirmation input when requireConfirmation is false', () => {
      createComponent({
        title: 'Delete',
        message: 'This action cannot be undone',
        requireConfirmation: false
      });

      const confirmationField = compiled.query(By.css('.confirmation-field'));
      expect(confirmationField).toBeFalsy();
    });

    it('should disable confirm button until "confirm" is typed', () => {
      createComponent({
        title: 'Delete',
        message: 'This action cannot be undone',
        requireConfirmation: true
      });

      const confirmButton = compiled.queryAll(By.css('button[mat-raised-button]'))[0];
      expect(confirmButton.nativeElement.disabled).toBe(true);

      component.confirmationText = 'confirm';
      fixture.detectChanges();

      expect(confirmButton.nativeElement.disabled).toBe(false);
    });

    it('should keep confirm button disabled with incorrect text', () => {
      createComponent({
        title: 'Delete',
        message: 'This action cannot be undone',
        requireConfirmation: true
      });

      component.confirmationText = 'wrong';
      fixture.detectChanges();

      const confirmButton = compiled.queryAll(By.css('button[mat-raised-button]'))[0];
      expect(confirmButton.nativeElement.disabled).toBe(true);
    });

    it('should enable confirm button when requireConfirmation is false', () => {
      createComponent({
        title: 'Delete',
        message: 'This action cannot be undone',
        requireConfirmation: false
      });

      const confirmButton = compiled.queryAll(By.css('button[mat-raised-button]'))[0];
      expect(confirmButton.nativeElement.disabled).toBe(false);
    });
  });

  describe('button actions', () => {
    it('should close dialog with true when confirm is clicked', () => {
      createComponent({
        title: 'Test',
        message: 'Test message'
      });

      component.onConfirm();
      expect(mockDialogRef.close).toHaveBeenCalledWith(true);
    });

    it('should close dialog with false when cancel is clicked', () => {
      createComponent({
        title: 'Test',
        message: 'Test message'
      });

      component.onCancel();
      expect(mockDialogRef.close).toHaveBeenCalledWith(false);
    });

    it('should call onCancel when cancel button is clicked', () => {
      createComponent({
        title: 'Test',
        message: 'Test message'
      });

      spyOn(component, 'onCancel');
      const cancelButton = compiled.query(By.css('button[mat-button]'));
      cancelButton.nativeElement.click();

      expect(component.onCancel).toHaveBeenCalled();
    });

    it('should call onConfirm when confirm button is clicked', () => {
      createComponent({
        title: 'Test',
        message: 'Test message'
      });

      spyOn(component, 'onConfirm');
      const confirmButton = compiled.queryAll(By.css('button[mat-raised-button]'))[0];
      confirmButton.nativeElement.click();

      expect(component.onConfirm).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle very long message text', () => {
      const longMessage = 'a'.repeat(1000);
      createComponent({
        title: 'Test',
        message: longMessage
      });

      const message = compiled.query(By.css('mat-dialog-content p'));
      expect(message.nativeElement.textContent).toContain(longMessage);
    });

    it('should handle empty message', () => {
      createComponent({
        title: 'Test',
        message: ''
      });

      const message = compiled.query(By.css('mat-dialog-content p'));
      expect(message.nativeElement.textContent.trim()).toBe('');
    });

    it('should handle special characters in confirmation text', () => {
      createComponent({
        title: 'Test',
        message: 'Test',
        requireConfirmation: true
      });

      component.confirmationText = '<script>alert("xss")</script>';
      fixture.detectChanges();

      const confirmButton = compiled.queryAll(By.css('button[mat-raised-button]'))[0];
      expect(confirmButton.nativeElement.disabled).toBe(true);
    });
  });
});
