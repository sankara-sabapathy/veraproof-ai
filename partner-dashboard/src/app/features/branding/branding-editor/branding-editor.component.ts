import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ColorPickerModule } from 'primeng/colorpicker';
import { FileUploadModule } from 'primeng/fileupload';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ContentStateComponent } from '../../../shared/components/content-state/content-state.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { BrandingService, BrandingConfig, ColorConfig } from '../services/branding.service';
import { BrandingStateService } from '../services/branding-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmationDialogService } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { BrandingPreviewComponent } from '../branding-preview/branding-preview.component';

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml'];

interface BrandPreset {
  name: string;
  summary: string;
  primary_color: string;
  secondary_color: string;
  button_color: string;
}

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
    PageHeaderComponent,
    ContentStateComponent,
    LoadingSpinnerComponent,
    BrandingPreviewComponent
  ],
  templateUrl: './branding-editor.component.html',
  styleUrls: ['./branding-editor.component.scss']
})
export class BrandingEditorComponent implements OnInit, OnDestroy {
  readonly presets: BrandPreset[] = [
    {
      name: 'Trust Blue',
      summary: 'Balanced and conservative for most B2B products.',
      primary_color: '#1d4ed8',
      secondary_color: '#0f172a',
      button_color: '#1d4ed8'
    },
    {
      name: 'Slate Signal',
      summary: 'Neutral UI with a restrained enterprise accent.',
      primary_color: '#334155',
      secondary_color: '#0f766e',
      button_color: '#0f766e'
    },
    {
      name: 'Warm Ledger',
      summary: 'Softer emphasis without drifting into consumer styling.',
      primary_color: '#9a3412',
      secondary_color: '#475569',
      button_color: '#b45309'
    }
  ];

  form: FormGroup;
  currentConfig: BrandingConfig | null = null;
  loading = false;
  errorMessage: string | null = null;
  logoFile: File | null = null;
  logoPreview: string | null = null;
  contrastWarnings: { [key: string]: string } = {};
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private brandingService: BrandingService,
    private brandingState: BrandingStateService,
    private notification: NotificationService,
    private confirmationDialog: ConfirmationDialogService
  ) {
    this.form = this.fb.group({
      primary_color: ['#1d4ed8', [Validators.required, Validators.pattern(HEX_COLOR_PATTERN)]],
      secondary_color: ['#0f172a', [Validators.required, Validators.pattern(HEX_COLOR_PATTERN)]],
      button_color: ['#1d4ed8', [Validators.required, Validators.pattern(HEX_COLOR_PATTERN)]]
    });
  }

  ngOnInit(): void {
    this.brandingState.config$
      .pipe(takeUntil(this.destroy$))
      .subscribe((config) => {
        this.currentConfig = config;
      });

    this.brandingState.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe((loading) => {
        this.loading = loading;
      });

    this.brandingState.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe((error) => {
        this.errorMessage = error;
      });

    this.form.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.checkContrast();
      });

    this.loadBranding();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get pageSubtitle(): string {
    return 'Control logo treatment, product color roles, and verification surface preview without introducing one-off styling drift.';
  }

  get previewConfig(): BrandingConfig {
    return {
      logo_url: this.logoPreview ?? this.currentConfig?.logo_url ?? null,
      primary_color: this.form.get('primary_color')?.value || this.currentConfig?.primary_color || '#1d4ed8',
      secondary_color: this.form.get('secondary_color')?.value || this.currentConfig?.secondary_color || '#0f172a',
      button_color: this.form.get('button_color')?.value || this.currentConfig?.button_color || '#1d4ed8'
    };
  }

  get primaryContrastRatio(): number {
    return this.brandingService.calculateContrastRatio(this.previewConfig.primary_color, '#FFFFFF');
  }

  get buttonContrastRatio(): number {
    return this.brandingService.calculateContrastRatio(this.previewConfig.button_color, '#FFFFFF');
  }

  get hasUnsavedChanges(): boolean {
    if (!this.currentConfig) {
      return false;
    }

    return this.currentConfig.primary_color !== this.previewConfig.primary_color ||
      this.currentConfig.secondary_color !== this.previewConfig.secondary_color ||
      this.currentConfig.button_color !== this.previewConfig.button_color ||
      this.logoFile !== null;
  }

  loadBranding(): void {
    this.brandingState.setLoading(true);
    this.brandingState.clearError();

    this.brandingService.getBranding().subscribe({
      next: (config) => {
        this.brandingState.setConfig(config);
        this.form.patchValue({
          primary_color: config.primary_color,
          secondary_color: config.secondary_color,
          button_color: config.button_color
        }, { emitEvent: false });
        this.logoPreview = config.logo_url;
        this.logoFile = null;
        this.checkContrast();
      },
      error: (error) => {
        this.brandingState.setError(error.message || 'Failed to load branding configuration');
        this.notification.error('Failed to load branding configuration');
      }
    });
  }

  applyPreset(preset: BrandPreset): void {
    this.form.patchValue({
      primary_color: preset.primary_color,
      secondary_color: preset.secondary_color,
      button_color: preset.button_color
    });
  }

  onFileSelected(event: any): void {
    const file = event.files?.[0] || event.currentFiles?.[0];
    if (!file) {
      return;
    }

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
    reader.onload = (eventLoad) => {
      this.logoPreview = eventLoad.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  uploadLogo(): void {
    if (!this.logoFile) {
      return;
    }

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

    const colors: ColorConfig = this.form.getRawValue();
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
    }).subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }

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
    });
  }

  checkContrast(): void {
    this.contrastWarnings = {};

    const primaryRatio = this.primaryContrastRatio;
    const buttonRatio = this.buttonContrastRatio;

    if (primaryRatio < 3) {
      this.contrastWarnings['primary_color'] = 'Contrast is too low for readable white text.';
    } else if (primaryRatio < 4.5) {
      this.contrastWarnings['primary_color'] = 'Contrast is below the preferred WCAG AA target for body text.';
    }

    if (buttonRatio < 3) {
      this.contrastWarnings['button_color'] = 'Contrast is too low for readable white button labels.';
    } else if (buttonRatio < 4.5) {
      this.contrastWarnings['button_color'] = 'Button contrast is below the preferred WCAG AA target.';
    }
  }

  contrastLabel(ratio: number): string {
    if (ratio >= 4.5) {
      return 'AA ready';
    }
    if (ratio >= 3) {
      return 'Needs review';
    }
    return 'Fails contrast';
  }

  getErrorMessage(field: string): string {
    const control = this.form.get(field);
    if (control?.hasError('required')) {
      return 'This field is required';
    }
    if (control?.hasError('pattern')) {
      return 'Please enter a valid hex color such as #1D4ED8';
    }
    return '';
  }
}
