import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface APIKey {
  key_id: string;
  key_prefix: string;
  environment: 'sandbox' | 'production';
  created_at: string;
  last_used?: string;
}

@Component({
  selector: 'app-api-keys',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container">
      <h1>API Keys</h1>

      <div class="card">
        <div class="header-actions">
          <h2>Your API Keys</h2>
          <div class="button-group">
            <button class="btn btn-secondary" (click)="generateKey('sandbox')">
              Generate Sandbox Key
            </button>
            <button class="btn btn-primary" (click)="generateKey('production')">
              Generate Production Key
            </button>
          </div>
        </div>

        <div *ngIf="newKey" class="new-key-alert">
          <h3>⚠️ Save this key now!</h3>
          <p>This is the only time you'll see the full key:</p>
          <code class="key-display">{{ newKey }}</code>
          <button class="btn btn-secondary" (click)="copyKey()">Copy Key</button>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>Key Prefix</th>
              <th>Environment</th>
              <th>Created</th>
              <th>Last Used</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let key of keys">
              <td><code>{{ key.key_prefix }}...</code></td>
              <td>
                <span class="badge" [ngClass]="{
                  'badge-warning': key.environment === 'sandbox',
                  'badge-success': key.environment === 'production'
                }">
                  {{ key.environment }}
                </span>
              </td>
              <td>{{ key.created_at | date:'short' }}</td>
              <td>{{ key.last_used ? (key.last_used | date:'short') : 'Never' }}</td>
              <td>
                <button class="btn-link danger" (click)="revokeKey(key.key_id)">
                  Revoke
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <div *ngIf="keys.length === 0" class="empty-state">
          No API keys yet. Generate one to get started.
        </div>
      </div>

      <div class="card">
        <h2>API Documentation</h2>
        <p>Use your API key to create verification sessions:</p>
        <pre class="code-block">
curl -X POST http://localhost:8000/api/v1/sessions/create \\
  -H "X-API-Key: your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '&#123;
    "metadata": &#123;&#125;,
    "return_url": "https://yoursite.com/callback"
  &#125;'
        </pre>
      </div>
    </div>
  `,
  styles: [`
    .header-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .button-group {
      display: flex;
      gap: 0.5rem;
    }

    .new-key-alert {
      background: #fef3c7;
      border: 2px solid #f59e0b;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .new-key-alert h3 {
      color: #92400e;
      margin-bottom: 0.5rem;
    }

    .key-display {
      display: block;
      background: white;
      padding: 1rem;
      border-radius: 6px;
      margin: 1rem 0;
      font-family: monospace;
      word-break: break-all;
    }

    .btn-link.danger {
      color: var(--error-color);
    }

    .code-block {
      background: #1e293b;
      color: #e2e8f0;
      padding: 1.5rem;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 0.875rem;
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
      color: var(--text-secondary);
    }
  `]
})
export class ApiKeysComponent implements OnInit {
  private http = inject(HttpClient);

  keys: APIKey[] = [];
  newKey = '';
  apiUrl = environment.apiUrl;

  ngOnInit(): void {
    this.loadKeys();
  }

  loadKeys(): void {
    this.http.get<APIKey[]>(`${environment.apiUrl}/api/v1/api-keys/list`)
      .subscribe({
        next: (data) => {
          this.keys = data;
        },
        error: (err) => {
          console.error('Failed to load API keys:', err);
        }
      });
  }

  generateKey(env: 'sandbox' | 'production'): void {
    this.http.post<{ api_key: string }>(`${environment.apiUrl}/api/v1/api-keys/generate`, {
      environment: env
    }).subscribe({
      next: (response) => {
        this.newKey = response.api_key;
        this.loadKeys();
      },
      error: (err) => {
        console.error('Failed to generate key:', err);
      }
    });
  }

  revokeKey(keyId: string): void {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }

    this.http.delete(`${environment.apiUrl}/api/v1/api-keys/${keyId}`)
      .subscribe({
        next: () => {
          this.loadKeys();
        },
        error: (err) => {
          console.error('Failed to revoke key:', err);
        }
      });
  }

  copyKey(): void {
    navigator.clipboard.writeText(this.newKey);
    alert('API key copied to clipboard!');
  }
}
