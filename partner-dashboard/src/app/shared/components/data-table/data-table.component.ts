import { Component, Input, Output, EventEmitter, OnInit, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  resizable?: boolean;
  reorderable?: boolean;
  template?: TemplateRef<any>;
}

export interface PageEvent {
  pageIndex: number;
  pageSize: number;
  length: number;
}

export interface SortEvent {
  field: string;
  order: 'asc' | 'desc';
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    InputTextModule
  ],
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.scss']
})
export class DataTableComponent<T> implements OnInit {
  @Input() columns: TableColumn[] = [];
  @Input() data: T[] = [];
  @Input() totalItems: number = 0;
  @Input() pageSize: number = 25;
  @Input() loading: boolean = false;
  @Input() selectionMode?: 'single' | 'multiple';
  @Input() resizableColumns: boolean = false;
  @Input() reorderableColumns: boolean = false;
  @Input() actionsTemplate?: TemplateRef<any> | null;
  @Input() expansionTemplate?: TemplateRef<any> | null;
  
  @Output() rowClick = new EventEmitter<T>();
  @Output() pageChange = new EventEmitter<PageEvent>();
  @Output() searchChange = new EventEmitter<string>();
  @Output() sortChange = new EventEmitter<SortEvent>();
  @Output() rowSelect = new EventEmitter<T>();
  @Output() rowUnselect = new EventEmitter<T>();
  
  searchTerm: string = '';
  displayedColumns: string[] = [];
  selectedRows: T[] = [];
  first: number = 0;
  rows: number = 25;
  
  ngOnInit(): void {
    this.displayedColumns = this.columns.map(c => c.key);
    this.rows = this.pageSize;
  }
  
  onRowClick(row: T): void {
    this.rowClick.emit(row);
  }
  
  onPageChange(event: any): void {
    // Transform PrimeNG page event to match original structure
    const pageEvent: PageEvent = {
      pageIndex: event.page,
      pageSize: event.rows,
      length: this.totalItems
    };
    this.first = event.first;
    this.rows = event.rows;
    this.pageChange.emit(pageEvent);
  }
  
  onSearchChange(): void {
    this.searchChange.emit(this.searchTerm);
  }
  
  onSortChange(event: any): void {
    // Transform PrimeNG sort event to match original structure
    const sortEvent: SortEvent = {
      field: event.field,
      order: event.order === 1 ? 'asc' : 'desc'
    };
    this.sortChange.emit(sortEvent);
  }
  
  onRowSelect(event: any): void {
    this.rowSelect.emit(event.data);
  }
  
  onRowUnselect(event: any): void {
    this.rowUnselect.emit(event.data);
  }
  
  get hasActions(): boolean {
    return !!this.actionsTemplate;
  }
}
