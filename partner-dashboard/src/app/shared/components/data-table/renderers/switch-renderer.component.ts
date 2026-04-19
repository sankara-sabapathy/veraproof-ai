import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputSwitchModule } from 'primeng/inputswitch';

@Component({
    selector: 'app-switch-renderer',
    standalone: true,
    imports: [CommonModule, FormsModule, InputSwitchModule],
    template: `
    <div style="display: flex; align-items: center; height: 100%;">
      <p-inputSwitch 
        [(ngModel)]="checked"
        (onChange)="onToggle($event)">
      </p-inputSwitch>
    </div>
  `
})
export class SwitchRendererComponent implements ICellRendererAngularComp {
    public params!: ICellRendererParams;
    public checked: boolean = false;
    private toggleCallback!: (data: any, checked: boolean) => void;

    agInit(params: ICellRendererParams): void {
        this.params = params;
        this.checked = params.value;

        if (params.colDef?.cellRendererParams) {
            this.toggleCallback = params.colDef.cellRendererParams.toggleCallback;
        }
    }

    refresh(params: ICellRendererParams): boolean {
        this.params = params;
        this.checked = params.value;
        return true;
    }

    onToggle(event: any) {
        // We update checked state immediately visually. 
        // The parent controls actual model sync via callback.
        if (this.toggleCallback) {
            this.toggleCallback(this.params.data, this.checked);
        }
    }
}
