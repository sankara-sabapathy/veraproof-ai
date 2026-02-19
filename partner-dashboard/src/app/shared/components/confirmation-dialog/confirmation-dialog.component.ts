import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface ConfirmationDialogData {
  title: string;
  message: string;
  confirmText?: string;
  confirmColor?: 'primary' | 'accent' | 'warn';
  requireConfirmation?: boolean;
}

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './confirmation-dialog.component.html',
  styleUrls: ['./confirmation-dialog.component.scss']
})
export class ConfirmationDialogComponent {
  confirmationText: string = '';
  
  constructor(
    public dialogRef: MatDialogRef<ConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmationDialogData
  ) {}
  
  onConfirm(): void {
    this.dialogRef.close(true);
  }
  
  onCancel(): void {
    this.dialogRef.close(false);
  }
  
  get isConfirmDisabled(): boolean {
    return this.data.requireConfirmation === true && this.confirmationText !== 'confirm';
  }
}
