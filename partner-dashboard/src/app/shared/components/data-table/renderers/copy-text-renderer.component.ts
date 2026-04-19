import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

@Component({
    selector: 'app-copy-text-renderer',
    standalone: true,
    imports: [CommonModule, ButtonModule, TooltipModule],
    template: `
    <div style="display: flex; align-items: center; gap: 8px;">
      <code style="font-family: 'Courier New', monospace; font-size: 13px; background-color: var(--surface-100); padding: 4px 8px; border-radius: 4px; color: var(--text-color);">
        {{ maskedValue }}
      </code>
      <p-button 
        icon="pi pi-copy" 
        [text]="true"
        [rounded]="true"
        size="small"
        (onClick)="copyToClipboard()"
        pTooltip="Copy to clipboard"
        tooltipPosition="top"
        [disabled]="disabled">
      </p-button>
    </div>
  `
})
export class CopyTextRendererComponent implements ICellRendererAngularComp {
    public value!: string;
    public maskedValue!: string;
    public disabled: boolean = false;
    private copyCallback!: (val: string) => void;

    agInit(params: ICellRendererParams): void {
        this.value = params.value;

        if (params.colDef?.cellRendererParams) {
            this.copyCallback = params.colDef.cellRendererParams.copyCallback;
            this.maskedValue = params.colDef.cellRendererParams.mask ? params.colDef.cellRendererParams.mask(this.value) : this.value;
            if (typeof params.colDef.cellRendererParams.disabled === 'function') {
                this.disabled = params.colDef.cellRendererParams.disabled(params.data);
            } else {
                this.disabled = params.colDef.cellRendererParams.disabled || false;
            }
        } else {
            this.maskedValue = this.value;
        }
    }

    refresh(params: ICellRendererParams): boolean {
        return false;
    }

    copyToClipboard() {
        if (this.copyCallback) {
            this.copyCallback(this.value);
        }
    }
}
