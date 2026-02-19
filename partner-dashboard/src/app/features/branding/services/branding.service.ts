import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

export interface BrandingConfig {
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  button_color: string;
}

export interface ColorConfig {
  primary_color: string;
  secondary_color: string;
  button_color: string;
}

@Injectable({
  providedIn: 'root'
})
export class BrandingService {
  private readonly baseUrl = '/api/v1/branding';

  constructor(private api: ApiService) {}

  getBranding(): Observable<BrandingConfig> {
    return this.api.get<BrandingConfig>(this.baseUrl);
  }

  uploadLogo(file: File): Observable<{ logo_url: string }> {
    return this.api.upload<{ logo_url: string }>(`${this.baseUrl}/logo`, file);
  }

  updateColors(colors: ColorConfig): Observable<void> {
    return this.api.put<void>(`${this.baseUrl}/colors`, colors);
  }

  resetBranding(): Observable<void> {
    return this.api.post<void>(`${this.baseUrl}/reset`, {});
  }

  calculateContrastRatio(color1: string, color2: string): number {
    const l1 = this.getRelativeLuminance(color1);
    const l2 = this.getRelativeLuminance(color2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  private getRelativeLuminance(hex: string): number {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return 0;

    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
      const normalized = val / 255;
      return normalized <= 0.03928
        ? normalized / 12.92
        : Math.pow((normalized + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }
}
