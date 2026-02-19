import { Component, Input, Output, EventEmitter, OnInit, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { PageEvent, MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  template?: TemplateRef<any>;
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.scss']
})
export class DataTableComponent<T> implements OnInit {
  @Input() columns: TableColumn[] = [];
  @Input() dataSource: MatTableDataSource<T> = new MatTableDataSource<T>();
  @Input() totalItems: number = 0;
  @Input() pageSize: number = 25;
  @Output() rowClick = new EventEmitter<T>();
  @Output() pageChange = new EventEmitter<PageEvent>();
  @Output() searchChange = new EventEmitter<string>();
  
  searchTerm: string = '';
  displayedColumns: string[] = [];
  
  ngOnInit(): void {
    this.displayedColumns = this.columns.map(c => c.key);
  }
  
  onRowClick(row: T): void {
    this.rowClick.emit(row);
  }
  
  onPageChange(event: PageEvent): void {
    this.pageChange.emit(event);
  }
  
  onSearchChange(): void {
    this.searchChange.emit(this.searchTerm);
  }
}
