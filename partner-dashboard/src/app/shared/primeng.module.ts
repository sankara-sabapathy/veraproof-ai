import { NgModule } from '@angular/core';

// PrimeNG Modules
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { CheckboxModule } from 'primeng/checkbox';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ToolbarModule } from 'primeng/toolbar';
import { SidebarModule } from 'primeng/sidebar';
import { MenuModule } from 'primeng/menu';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ProgressBarModule } from 'primeng/progressbar';
import { ChipModule } from 'primeng/chip';
import { DividerModule } from 'primeng/divider';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DynamicDialogModule } from 'primeng/dynamicdialog';
import { TooltipModule } from 'primeng/tooltip';

const PRIMENG_MODULES = [
  ButtonModule,
  CardModule,
  TableModule,
  DialogModule,
  InputTextModule,
  DropdownModule,
  CheckboxModule,
  RadioButtonModule,
  ToolbarModule,
  SidebarModule,
  MenuModule,
  ProgressSpinnerModule,
  ProgressBarModule,
  ChipModule,
  DividerModule,
  ConfirmDialogModule,
  DynamicDialogModule,
  TooltipModule
];

/**
 * Centralized PrimeNG module for importing and exporting all PrimeNG components
 * used throughout the application. This module should be imported by feature modules
 * and the shared module to access PrimeNG components.
 */
@NgModule({
  imports: PRIMENG_MODULES,
  exports: PRIMENG_MODULES
})
export class PrimeNGModule { }
