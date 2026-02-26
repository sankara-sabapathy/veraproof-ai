import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ColorPickerModule } from 'primeng/colorpicker';
import { FileUploadModule } from 'primeng/fileupload';
import { BrandingService, BrandingConfig, ColorConfig } from '../services/branding.service';
import { BrandingStateService } from '../services/branding-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmationDialogService } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { BrandingPreviewComponent } from '../branding-preview/branding-preview.component';

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_FILE_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml'];

@Component({
  selector: 'app-branding-editor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    ColorPickerModule,
    FileUploadModule,
    BrandingPreviewComponent
  ],
  templateUrl: './branding-editor.component.html',
  styleUrls: ['./branding-editor.component.scss']
})
export class BrandingEditorComponent implements OnInit {
  form: FormGroup;
  config$ = this.brandingState.config$;
  loading$ = this.brandingState.loading$;
  logoFile: File | null = null;
  logoPreview: string | null = null;
  contrastWarnings: { [key: string]: string } = {};

  constructor(
    private fb: FormBuilder,
    private brandingService: BrandingService,
    private brandingState: BrandingStateService,
    private notification: NotificationService,
    private confirmationDialog: ConfirmationDialogService
  ) {
    this.form = this.fb.group({
      primary_color: ['#3f51b5', [Validators.required, Validators.pattern(HEX_COLOR_PATTERN)]],
      secondary_color: ['#ff4081', [Validators.required, Validators.pattern(HEX_COLOR_PATTERN)]],
      button_color: ['#3f51b5', [Validators.required, Validators.pattern(HEX_COLOR_PATTERN)]]
    });
  }

  ngOnInit(): void {
    this.loadBranding();
    this.form.valueChanges.subscribe(() => {
      this.checkContrast();
      this.updateLivePreview();
    });
  }

  private updateLivePreview(): void {
    const currentConfig = this.brandingState['state$'].value.config;
    if (currentConfig && this.form.valid) {
      const previewConfig: BrandingConfig = {
        ...currentConfig,
        primary_color: this.form.get('primary_color')?.value,
        secondary_color: this.form.get('secondary_color')?.value,
        button_color: this.form.get('button_color')?.value
      };
      this.brandingState.setConfig(previewConfig);
    }
  }

  loadBranding(): void {
    this.brandingState.setLoading(true);
    this.brandingService.getBranding().subscribe({
      next: (config) => {
        this.brandingState.setConfig(config);
        this.form.patchValue({
          primary_color: config.primary_color,
          secondary_color: config.secondary_color,
          button_color: config.button_color
        });
        this.logoPreview = config.logo_url;
      },
      error: (error) => {
        this.brandingState.setError(error.message);
        this.notification.error('Failed to load branding configuration');
      }
    });
  }

  onFileSelected(event: any): void {
    const file = event.files?.[0] || event.currentFiles?.[0];
    if (!file) return;

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      this.notification.error('Only PNG, JPG, and SVG files are allowed');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      this.notification.error('File size must be less than 2MB');
      return;
    }

    this.logoFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.logoPreview = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  uploadLogo(): void {
    if (!this.logoFile) return;

    this.brandingState.setLoading(true);
    this.brandingService.uploadLogo(this.logoFile).subscribe({
      next: (response) => {
        this.notification.success('Logo uploaded successfully');
        this.logoPreview = response.logo_url;
        this.logoFile = null;
        this.loadBranding();
      },
      error: () => {
        this.brandingState.setLoading(false);
        this.notification.error('Failed to upload logo');
      }
    });
  }

  saveColors(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const colors: ColorConfig = this.form.value;
    this.brandingState.setLoading(true);
    this.brandingService.updateColors(colors).subscribe({
      next: () => {
        this.notification.success('Colors updated successfully');
        this.loadBranding();
      },
      error: () => {
        this.brandingState.setLoading(false);
        this.notification.error('Failed to update colors');
      }
    });
  }

  resetBranding(): void {
    this.confirmationDialog.confirm({
      title: 'Reset Branding',
      message: 'Are you sure you want to reset all branding to defaults? This will remove your logo and reset all colors.',
      confirmText: 'Reset',
      cancelText: 'Cancel',
      confirmColor: 'warn'
    }).subscribe(confirmed => {
      if (confirmed) {
        this.brandingState.setLoading(true);
        this.brandingService.resetBranding().subscribe({
          next: () => {
            this.notification.success('Branding reset to defaults');
            this.logoPreview = null;
            this.logoFile = null;
            this.loadBranding();
          },
          error: () => {
            this.brandingState.setLoading(false);
            this.notification.error('Failed to reset branding');
          }
        });
      }
    });
  }

  checkContrast(): void {
    this.contrastWarnings = {};
    const white = '#FFFFFF';

    const primaryRatio = this.brandingService.calculateContrastRatio(
      this.form.get('primary_color')?.value,
      white
    );
    const buttonRatio = this.brandingService.calculateContrastRatio(
      this.form.get('button_color')?.value,
      white
    );

    if (primaryRatio < 3) {
      this.contrastWarnings['primary_color'] = 'Contrast ratio too low. Please choose a darker/lighter color';
    } else if (primaryRatio < 4.5) {
      this.contrastWarnings['primary_color'] = 'Low contrast. This color may not meet accessibility standards (WCAG AA)';
    }

    if (buttonRatio < 3) {
      this.contrastWarnings['button_color'] = 'Contrast ratio too low. Please choose a darker/lighter color';
    } else if (buttonRatio < 4.5) {
      this.contrastWarnings['button_color'] = 'Low contrast. This color may not meet accessibility standards (WCAG AA)';
    }
  }

  getErrorMessage(field: string): string {
    const control = this.form.get(field);
    if (control?.hasError('required')) {
      return 'This field is required';
    }
    if (control?.hasError('pattern')) {
      return 'Please enter a valid hex color (e.g., #FF5733)';
    }
    return '';
  }
}
