import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { BrandingConfig } from '../services/branding.service';

@Component({
  selector: 'app-branding-preview',
  standalone: true,
  imports: [CommonModule, CardModule],
  templateUrl: './branding-preview.component.html',
  styleUrls: ['./branding-preview.component.scss']
})
export class BrandingPreviewComponent {
  @Input() config: BrandingConfig | null = null;

  get previewStyles(): Record<string, string> {
    return {
      '--brand-primary': this.config?.primary_color || '#1d4ed8',
      '--brand-secondary': this.config?.secondary_color || '#0f172a',
      '--brand-button': this.config?.button_color || '#1d4ed8'
    };
  }
}
