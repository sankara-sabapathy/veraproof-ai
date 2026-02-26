import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { BrandingConfig } from '../services/branding.service';

@Component({
  selector: 'app-branding-preview',
  standalone: true,
  imports: [
    CommonModule,
    CardModule
  ],
  templateUrl: './branding-preview.component.html',
  styleUrls: ['./branding-preview.component.scss']
})
export class BrandingPreviewComponent implements OnChanges {
  @Input() config: BrandingConfig | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config'] && this.config) {
      this.applyStyles();
    }
  }

  private applyStyles(): void {
    if (!this.config) return;

    const preview = document.querySelector('.verification-preview') as HTMLElement;
    if (preview) {
      preview.style.setProperty('--primary-color', this.config.primary_color);
      preview.style.setProperty('--secondary-color', this.config.secondary_color);
      preview.style.setProperty('--button-color', this.config.button_color);
    }
  }
}
