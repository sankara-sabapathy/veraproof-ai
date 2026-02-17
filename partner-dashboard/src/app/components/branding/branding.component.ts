import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface BrandingConfig {
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  button_color: string;
}

@Component({
  selector: 'app-branding',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container">
      <h1>Branding Configuration</h1>

      <div class="branding-grid">
        <div class="card">
          <h2>Logo</h2>
          <div class="logo-upload">
            <div *ngIf="config?.logo_url" class="logo-preview">
              <img [src]="config.logo_url" alt="Logo">
            </div>
            <input type="file" 
                   accept="image/png,image/jpeg,image/svg+xml" 
                   (change)="onLogoSelect($event)"
                   #fileInput>
            <button class="btn btn-primary" (click)="fileInput.click()">
              {{ config && config.logo_url ? 'Change Logo' : 'Upload Logo' }}
            </button>
            <p class="help-text">Max 2MB, PNG/JPG/SVG</p>
          </div>
        </div>

        <div class="card">
          <h2>Colors</h2>
          <div class="color-picker-group">
            <div class="color-picker">
              <label>Primary Color</label>
              <input type="color" 
                     [(ngModel)]="config.primary_color" 
                     class="color-input">
              <span>{{ config.primary_color }}</span>
            </div>

            <div class="color-picker">
              <label>Secondary Color</label>
              <input type="color" 
                     [(ngModel)]="config.secondary_color" 
                     class="color-input">
              <span>{{ config.secondary_color }}</span>
            </div>

            <div class="color-picker">
              <label>Button Color</label>
              <input type="color" 
                     [(ngModel)]="config.button_color" 
                     class="color-input">
              <span>{{ config.button_color }}</span>
            </div>
          </div>

          <button class="btn btn-primary" (click)="saveColors()" [disabled]="saving">
            {{ saving ? 'Saving...' : 'Save Colors' }}
          </button>
        </div>

        <div class="card preview-card">
          <h2>Preview</h2>
          <div class="preview" [style.background]="config.primary_color">
            <div class="preview-logo" *ngIf="config?.logo_url">
              <img [src]="config.logo_url" alt="Logo">
            </div>
            <h3 [style.color]="config.secondary_color">Verification Interface</h3>
            <button class="preview-button" [style.background]="config.button_color">
              Start Verification
            </button>
          </div>
        </div>
      </div>

      <div *ngIf="message" class="message" [ngClass]="messageType">
        {{ message }}
      </div>
    </div>
  `,
  styles: [`
    .branding-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
    }

    .preview-card {
      grid-column: 1 / -1;
    }

    .logo-upload {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .logo-preview {
      width: 200px;
      height: 100px;
      border: 2px dashed var(--border-color);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .logo-preview img {
      max-width: 100%;
      max-height: 100%;
    }

    input[type="file"] {
      display: none;
    }

    .help-text {
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .color-picker-group {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .color-picker {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .color-picker label {
      flex: 1;
      font-weight: 500;
    }

    .color-input {
      width: 60px;
      height: 40px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      cursor: pointer;
    }

    .preview {
      padding: 3rem;
      border-radius: 8px;
      text-align: center;
      color: white;
    }

    .preview-logo {
      margin-bottom: 2rem;
    }

    .preview-logo img {
      max-width: 150px;
      max-height: 60px;
    }

    .preview h3 {
      margin-bottom: 2rem;
    }

    .preview-button {
      padding: 1rem 2rem;
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
    }

    .message {
      margin-top: 1.5rem;
      padding: 1rem;
      border-radius: 6px;
    }

    .message.success {
      background: #d1fae5;
      color: #065f46;
    }

    .message.error {
      background: #fee2e2;
      color: #991b1b;
    }
  `]
})
export class BrandingComponent implements OnInit {
  private http = inject(HttpClient);

  config: BrandingConfig = {
    primary_color: '#2563eb',
    secondary_color: '#ffffff',
    button_color: '#10b981'
  };

  saving = false;
  message = '';
  messageType = '';

  ngOnInit(): void {
    this.loadBranding();
  }

  loadBranding(): void {
    this.http.get<BrandingConfig>(`${environment.apiUrl}/api/v1/branding`)
      .subscribe({
        next: (data) => {
          this.config = data;
        },
        error: (err) => {
          console.error('Failed to load branding:', err);
        }
      });
  }

  onLogoSelect(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      this.showMessage('Logo must be less than 2MB', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('logo', file);

    this.http.post<{ logo_url: string }>(`${environment.apiUrl}/api/v1/branding/logo`, formData)
      .subscribe({
        next: (response) => {
          this.config.logo_url = response.logo_url;
          this.showMessage('Logo uploaded successfully', 'success');
        },
        error: (err) => {
          this.showMessage('Failed to upload logo', 'error');
        }
      });
  }

  saveColors(): void {
    this.saving = true;
    this.http.put(`${environment.apiUrl}/api/v1/branding/colors`, {
      primary_color: this.config.primary_color,
      secondary_color: this.config.secondary_color,
      button_color: this.config.button_color
    }).subscribe({
      next: () => {
        this.showMessage('Colors saved successfully', 'success');
        this.saving = false;
      },
      error: (err) => {
        this.showMessage('Failed to save colors', 'error');
        this.saving = false;
      }
    });
  }

  showMessage(text: string, type: string): void {
    this.message = text;
    this.messageType = type;
    setTimeout(() => {
      this.message = '';
    }, 3000);
  }
}
