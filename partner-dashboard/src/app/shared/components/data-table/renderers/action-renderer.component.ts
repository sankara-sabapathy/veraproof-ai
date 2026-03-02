import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { TooltipModule } from 'primeng/tooltip';
import { MenuItem } from 'primeng/api';

@Component({
    selector: 'app-action-renderer',
    standalone: true,
    imports: [CommonModule, ButtonModule, MenuModule, TooltipModule],
    template: `
    <div style="display: flex; gap: 0.5rem; align-items: center; justify-content: center; height: 100%;">
       <ng-container *ngFor="let action of actions">
          <ng-container *ngIf="action.isMenu; else standardButton">
             <p-button 
               icon="pi pi-ellipsis-v" 
               [text]="true"
               [rounded]="true"
               size="small"
               (onClick)="menu.toggle($event)"
               [disabled]="action.disabled">
             </p-button>
             <p-menu #menu [model]="action.menuItems" [popup]="true" appendTo="body"></p-menu>
          </ng-container>
          <ng-template #standardButton>
            <p-button 
                [icon]="action.icon" 
                [text]="true" 
                [rounded]="true"
                size="small"
                [pTooltip]="action.tooltip"
                tooltipPosition="top"
                (onClick)="onClick(action, $event)"
                [disabled]="action.disabled">
            </p-button>
          </ng-template>
       </ng-container>
    </div>
  `
})
export class ActionRendererComponent implements ICellRendererAngularComp {
    public params!: ICellRendererParams;
    public actions: any[] = [];

    agInit(params: ICellRendererParams): void {
        this.params = params;

        if (params.colDef && params.colDef.cellRendererParams && params.colDef.cellRendererParams.actions) {
            // if it's a dynamic function that resolves the row data into action array (to check if disabled for instance)
            if (typeof params.colDef.cellRendererParams.actions === 'function') {
                this.actions = params.colDef.cellRendererParams.actions(params.data);
            } else {
                this.actions = params.colDef.cellRendererParams.actions;
            }
        }
    }

    refresh(params: ICellRendererParams): boolean {
        return false;
    }

    onClick(action: any, event: Event) {
        if (action.actionCallback) {
            action.actionCallback(this.params.data, event);
        }
    }
}
