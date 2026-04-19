import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-content-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="content-state" [ngClass]="toneClass" [attr.aria-live]="tone === 'error' ? 'assertive' : 'polite'">
      <div class="content-state-icon" aria-hidden="true">
        <i class="pi" [ngClass]="icon"></i>
      </div>
      <div class="content-state-copy">
        <h2 class="content-state-title">{{ title }}</h2>
        <p class="content-state-description">{{ description }}</p>
      </div>
      <button *ngIf="actionLabel" type="button" class="content-state-action" (click)="action.emit()">
        {{ actionLabel }}
      </button>
    </section>
  `,
  styles: [`
    :host {
      display: block;
    }

    .content-state {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.875rem;
      padding: 2rem;
      border: 1px dashed var(--vp-border);
      border-radius: var(--vp-radius-lg);
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.98));
    }

    .content-state-icon {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--vp-bg-alt);
      color: var(--vp-text-secondary);
      font-size: 1rem;
    }

    .content-state-copy {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      max-width: 40rem;
    }

    .content-state-title {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      color: var(--vp-text);
    }

    .content-state-description {
      margin: 0;
      color: var(--vp-text-secondary);
      line-height: 1.6;
    }

    .content-state-action {
      border: 1px solid var(--vp-border);
      background: var(--vp-surface);
      color: var(--vp-text);
      border-radius: var(--vp-radius);
      padding: 0.625rem 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
    }

    .content-state-action:hover {
      border-color: rgba(102, 126, 234, 0.28);
      box-shadow: var(--vp-shadow-xs);
      background: #fbfdff;
    }

    .content-state-action:focus-visible {
      outline: none;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.14);
      border-color: var(--vp-primary);
    }

    .content-state-error {
      border-style: solid;
      border-color: rgba(239, 68, 68, 0.16);
      background: linear-gradient(180deg, rgba(254, 242, 242, 0.85), rgba(255, 255, 255, 0.98));
    }

    .content-state-error .content-state-icon {
      background: var(--vp-error-bg);
      color: var(--vp-error);
    }

    .content-state-neutral .content-state-icon {
      background: var(--vp-bg-alt);
      color: var(--vp-text-secondary);
    }
  `]
})
export class ContentStateComponent {
  @Input({ required: true }) title = '';
  @Input({ required: true }) description = '';
  @Input() icon = 'pi-inbox';
  @Input() actionLabel?: string;
  @Input() tone: 'neutral' | 'error' = 'neutral';

  @Output() action = new EventEmitter<void>();

  get toneClass(): string {
    return this.tone === 'error' ? 'content-state-error' : 'content-state-neutral';
  }
}
