import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
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

export interface PageEvent {
  pageIndex: number;
  pageSize: number;
  length: number;
}

export interface SortEvent {
  field: string;
  order: 'asc' | 'desc';
}

// Custom AG Grid theme using the v35 Theming API
const agGridCustomTheme = themeQuartz.withParams({
  accentColor: '#667eea',
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
    AgGridAngular
  ],
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.scss']
})
export class DataTableComponent<T> implements OnInit {
  @Input() columns: ColDef[] = [];
  @Input() data: T[] = [];
  @Input() totalItems: number = 0;
  @Input() pageSize: number = 20;
  @Input() loading: boolean = false;
  @Input() selectionMode?: 'single' | 'multiple';
  @Input() domLayout: 'normal' | 'autoHeight' | 'print' = 'autoHeight';

  @Output() rowClick = new EventEmitter<T>();
  @Output() pageChange = new EventEmitter<PageEvent>();
  @Output() searchChange = new EventEmitter<string>();
  @Output() sortChange = new EventEmitter<SortEvent>();
  @Output() rowSelect = new EventEmitter<T>();
  @Output() rowUnselect = new EventEmitter<T>();

  @Input() searchPlaceholder: string = 'Search across all columns...';

  searchTerm: string = '';
  private gridApi!: GridApi;

  /** v35 Theming API — passed via [theme] binding */
  public gridTheme = agGridCustomTheme;

  /** v35 rowSelection object syntax */
  public rowSelection: RowSelectionOptions = {
    mode: 'multiRow',
    headerCheckbox: false,
    enableClickSelection: false,
  };

  /** Pagination page size selector must include the default pageSize */
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

  ngOnInit(): void { }

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    this.gridApi.sizeColumnsToFit();
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

  onSelectionChanged(event: any): void {
    if (!this.gridApi) return;
    const selectedRows = this.gridApi.getSelectedRows();
    if (selectedRows && selectedRows.length > 0) {
      this.rowSelect.emit(selectedRows[selectedRows.length - 1]);
    } else {
      this.rowUnselect.emit({} as T);
    }
  }
}
