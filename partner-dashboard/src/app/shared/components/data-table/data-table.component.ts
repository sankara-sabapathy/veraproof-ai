import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { AgGridAngular } from 'ag-grid-angular';
import {
  ColDef,
  GridApi,
  GridReadyEvent,
  RowSelectionOptions,
  themeQuartz
} from 'ag-grid-community';
import { ContentStateComponent } from '../content-state/content-state.component';

export interface PageEvent {
  pageIndex: number;
  pageSize: number;
  length: number;
}

export interface SortEvent {
  field: string;
  order: 'asc' | 'desc';
}

const agGridCustomTheme = themeQuartz.withParams({
  accentColor: '#2563eb',
  backgroundColor: '#ffffff',
  foregroundColor: '#1e293b',
  headerBackgroundColor: '#f8fafc',
  headerFontWeight: 600,
  headerTextColor: '#475569',
  oddRowBackgroundColor: '#fafbfc',
  borderColor: '#e2e8f0',
  borderRadius: 8,
  fontSize: 14,
  headerFontSize: 13,
  rowBorder: { color: '#f1f5f9', style: 'solid', width: 1 },
  columnBorder: false,
  spacing: 8,
  rowHeight: 48,
  headerHeight: 44,
  wrapperBorderRadius: 8,
  cellHorizontalPadding: 16,
});

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    AgGridAngular,
    ContentStateComponent
  ],
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.scss']
})
export class DataTableComponent<T> implements OnInit {
  @Input() columns: ColDef[] = [];
  @Input() data: T[] = [];
  @Input() totalItems = 0;
  @Input() pageSize = 20;
  @Input() loading = false;
  @Input() selectionMode?: 'single' | 'multiple';
  @Input() domLayout: 'normal' | 'autoHeight' | 'print' = 'autoHeight';
  @Input() searchPlaceholder = 'Search across all columns...';
  @Input() emptyTitle = 'Nothing to review yet';
  @Input() emptyDescription = 'This table will populate once data is available.';
  @Input() emptyActionLabel?: string;
  @Input() emptyIcon = 'pi-inbox';
  @Input() errorTitle = 'Unable to load this table';
  @Input() errorMessage?: string | null;
  @Input() errorActionLabel = 'Retry';
  @Input() errorIcon = 'pi-exclamation-circle';

  @Output() rowClick = new EventEmitter<T>();
  @Output() pageChange = new EventEmitter<PageEvent>();
  @Output() searchChange = new EventEmitter<string>();
  @Output() sortChange = new EventEmitter<SortEvent>();
  @Output() rowSelect = new EventEmitter<T>();
  @Output() rowUnselect = new EventEmitter<T>();
  @Output() emptyAction = new EventEmitter<void>();
  @Output() errorAction = new EventEmitter<void>();

  searchTerm = '';
  private gridApi?: GridApi;

  public gridTheme = agGridCustomTheme;

  public rowSelection: RowSelectionOptions = {
    mode: 'multiRow',
    headerCheckbox: false,
    enableClickSelection: false,
  };

  public paginationPageSizeSelector = [10, 20, 50, 100];

  public defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    flex: 1,
    minWidth: 100,
    cellStyle: {
      display: 'flex',
      alignItems: 'center',
    },
  };

  public autoSizeStrategy = {
    type: 'fitGridWidth' as const,
  };

  ngOnInit(): void {}

  get hasError(): boolean {
    return Boolean(this.errorMessage && this.errorMessage.trim().length > 0);
  }

  get isEmpty(): boolean {
    return !this.loading && !this.hasError && this.data.length === 0;
  }

  get showToolbar(): boolean {
    return !this.loading && !this.hasError && this.data.length > 0;
  }

  get showGrid(): boolean {
    return this.loading || (!this.hasError && this.data.length > 0);
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    this.gridApi.sizeColumnsToFit();
    if (this.searchTerm) {
      this.gridApi.setGridOption('quickFilterText', this.searchTerm);
    }
  }

  onSearchChange(): void {
    if (this.gridApi) {
      this.gridApi.setGridOption('quickFilterText', this.searchTerm);
    }
    this.searchChange.emit(this.searchTerm);
  }

  onRowClicked(event: any): void {
    if (event.data) {
      this.rowClick.emit(event.data);
    }
  }

  onSelectionChanged(_event?: unknown): void {
    if (!this.gridApi) {
      return;
    }

    const selectedRows = this.gridApi.getSelectedRows();
    if (selectedRows && selectedRows.length > 0) {
      this.rowSelect.emit(selectedRows[selectedRows.length - 1]);
      return;
    }

    this.rowUnselect.emit({} as T);
  }
}

