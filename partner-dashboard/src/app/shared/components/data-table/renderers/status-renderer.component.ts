import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-status-renderer',
    standalone: true,
    imports: [CommonModule],
    template: `
    <span class="status-badge" [ngClass]="badgeClass">
      {{ value | uppercase }}
    </span>
  `,
    styles: [`
    .status-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .status-active, .status-completed, .status-production, .status-success {
      background-color: #d1fae5;
      color: #065f46;
    }
    .status-pending, .status-sandbox, .status-warning {
      background-color: #fef3c7;
      color: #92400e;
    }
    .status-failed, .status-error, .status-revoked {
      background-color: #fee2e2;
      color: #991b1b;
    }
  `]
})
export class StatusRendererComponent implements ICellRendererAngularComp {
    public value!: string;
    public badgeClass!: string;

    agInit(params: ICellRendererParams): void {
        this.value = params.value || '';
        const valObj = String(this.value).toLowerCase();
        this.badgeClass = `status-${valObj}`;
    }

    refresh(params: ICellRendererParams): boolean {
        this.value = params.value || '';
        const valObj = String(this.value).toLowerCase();
        this.badgeClass = `status-${valObj}`;
        return true;
    }
}
