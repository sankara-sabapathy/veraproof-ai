import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { getStatusPresentation, StatusPresentation } from '../../../utils/ui-presenters';

@Component({
  selector: 'app-status-renderer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="status-badge" [ngClass]="badgeClass" [attr.title]="presentation.detail || presentation.label">
      {{ presentation.label }}
    </span>
  `,
  styles: [`
    .status-badge {
      display: inline-flex;
      align-items: center;
      min-height: 1.75rem;
      padding: 0.25rem 0.625rem;
      border-radius: 999px;
      border: 1px solid transparent;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.01em;
      white-space: nowrap;
    }

    .status-tone-neutral {
      background: var(--vp-bg-alt);
      color: var(--vp-text-secondary);
      border-color: var(--vp-border);
    }

    .status-tone-info {
      background: var(--vp-info-bg);
      color: var(--vp-info);
      border-color: rgba(59, 130, 246, 0.18);
    }

    .status-tone-success {
      background: var(--vp-success-bg);
      color: var(--vp-success);
      border-color: rgba(16, 185, 129, 0.18);
    }

    .status-tone-warning {
      background: var(--vp-warning-bg);
      color: #9a6700;
      border-color: rgba(245, 158, 11, 0.2);
    }

    .status-tone-danger {
      background: var(--vp-error-bg);
      color: var(--vp-error);
      border-color: rgba(239, 68, 68, 0.16);
    }
  `]
})
export class StatusRendererComponent implements ICellRendererAngularComp {
  presentation: StatusPresentation = getStatusPresentation(null);
  badgeClass = 'status-tone-neutral';

  agInit(params: ICellRendererParams): void {
    this.updatePresentation(params.value);
  }

  refresh(params: ICellRendererParams): boolean {
    this.updatePresentation(params.value);
    return true;
  }

  private updatePresentation(value: string | null | undefined): void {
    this.presentation = getStatusPresentation(value);
    this.badgeClass = `status-tone-${this.presentation.tone}`;
  }
}
