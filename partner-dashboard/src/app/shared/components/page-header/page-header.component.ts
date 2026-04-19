import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="vp-page-header page-header-shell">
      <div class="page-header-copy">
        <p *ngIf="eyebrow" class="page-header-eyebrow">{{ eyebrow }}</p>
        <h1 class="vp-page-title page-header-title">{{ title }}</h1>
        <p *ngIf="subtitle" class="page-header-subtitle">{{ subtitle }}</p>
      </div>

      <div class="page-header-actions" *ngIf="hasActions">
        <ng-content select="[pageHeaderActions]"></ng-content>
      </div>
    </header>
  `,
  styles: [`
    :host {
      display: block;
    }

    .page-header-shell {
      align-items: flex-start;
      gap: 1rem;
    }

    .page-header-copy {
      min-width: 0;
      flex: 1 1 auto;
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .page-header-eyebrow {
      margin: 0;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--vp-text-muted);
    }

    .page-header-title {
      margin: 0;
      line-height: 1.2;
    }

    .page-header-subtitle {
      margin: 0;
      max-width: 52rem;
      font-size: 0.95rem;
      color: var(--vp-text-secondary);
    }

    .page-header-actions {
      display: inline-flex;
      align-items: center;
      justify-content: flex-end;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    @media (max-width: 959px) {
      .page-header-actions {
        width: 100%;
        justify-content: flex-start;
      }
    }
  `]
})
export class PageHeaderComponent {
  @Input({ required: true }) title = '';
  @Input() subtitle?: string;
  @Input() eyebrow?: string;
  @Input() hasActions = true;
}
