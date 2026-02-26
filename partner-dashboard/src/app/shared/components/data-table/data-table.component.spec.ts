import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DataTableComponent, TableColumn, PageEvent, SortEvent } from './data-table.component';
import { DebugElement, TemplateRef } from '@angular/core';
import { By } from '@angular/platform-browser';

interface TestData {
  id: string;
  name: string;
  value: number;
}

describe('DataTableComponent', () => {
  let component: DataTableComponent<TestData>;
  let fixture: ComponentFixture<DataTableComponent<TestData>>;
  let compiled: DebugElement;

  const testColumns: TableColumn[] = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'value', label: 'Value', sortable: true }
  ];

  const testData: TestData[] = [
    { id: '1', name: 'Item 1', value: 100 },
    { id: '2', name: 'Item 2', value: 200 },
    { id: '3', name: 'Item 3', value: 300 }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        DataTableComponent,
        BrowserAnimationsModule,
        FormsModule,
        TableModule,
        InputTextModule
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DataTableComponent<TestData>);
    component = fixture.componentInstance;
    compiled = fixture.debugElement;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initialization', () => {
    it('should set displayedColumns from columns input', () => {
      component.columns = testColumns;
      component.ngOnInit();
      
      expect(component.displayedColumns).toEqual(['id', 'name', 'value']);
    });

    it('should handle empty columns array', () => {
      component.columns = [];
      component.ngOnInit();
      
      expect(component.displayedColumns).toEqual([]);
    });

    it('should initialize rows from pageSize', () => {
      component.pageSize = 50;
      component.ngOnInit();
      
      expect(component.rows).toBe(50);
    });
  });

  describe('data display', () => {
    beforeEach(() => {
      component.columns = testColumns;
      component.data = testData;
      component.totalItems = testData.length;
      fixture.detectChanges();
    });

    it('should render table with data', () => {
      const rows = compiled.queryAll(By.css('tr.clickable-row'));
      expect(rows.length).toBe(3);
    });

    it('should display column headers', () => {
      const headers = compiled.queryAll(By.css('th'));
      // Filter out selection and action columns
      const dataHeaders = headers.filter(h => 
        h.nativeElement.textContent.trim() !== '' && 
        !h.nativeElement.textContent.includes('Actions')
      );
      expect(dataHeaders.length).toBeGreaterThanOrEqual(3);
      expect(headers[0].nativeElement.textContent.trim()).toContain('ID');
      expect(headers[1].nativeElement.textContent.trim()).toContain('Name');
      expect(headers[2].nativeElement.textContent.trim()).toContain('Value');
    });

    it('should display cell data correctly', () => {
      const firstRow = compiled.queryAll(By.css('tr.clickable-row'))[0];
      const cells = firstRow.queryAll(By.css('td'));
      
      expect(cells[0].nativeElement.textContent.trim()).toBe('1');
      expect(cells[1].nativeElement.textContent.trim()).toBe('Item 1');
      expect(cells[2].nativeElement.textContent.trim()).toBe('100');
    });
  });

  describe('row interaction', () => {
    beforeEach(() => {
      component.columns = testColumns;
      component.data = testData;
      fixture.detectChanges();
    });

    it('should emit rowClick event when row is clicked', () => {
      spyOn(component.rowClick, 'emit');
      
      const firstRow = compiled.queryAll(By.css('tr.clickable-row'))[0];
      firstRow.nativeElement.click();
      
      expect(component.rowClick.emit).toHaveBeenCalledWith(testData[0]);
    });

    it('should apply clickable-row class to rows', () => {
      const rows = compiled.queryAll(By.css('tr.clickable-row'));
      rows.forEach(row => {
        expect(row.nativeElement.classList.contains('clickable-row')).toBe(true);
      });
    });
  });

  describe('search functionality', () => {
    beforeEach(() => {
      component.columns = testColumns;
      component.data = testData;
      fixture.detectChanges();
    });

    it('should emit searchChange event when search term changes', () => {
      spyOn(component.searchChange, 'emit');
      
      component.searchTerm = 'test search';
      component.onSearchChange();
      
      expect(component.searchChange.emit).toHaveBeenCalledWith('test search');
    });

    it('should update searchTerm when input changes', () => {
      const searchInput = compiled.query(By.css('input[pInputText]'));
      
      searchInput.nativeElement.value = 'new search';
      searchInput.nativeElement.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      
      expect(component.searchTerm).toBe('new search');
    });

    it('should emit empty string when search is cleared', () => {
      spyOn(component.searchChange, 'emit');
      
      component.searchTerm = '';
      component.onSearchChange();
      
      expect(component.searchChange.emit).toHaveBeenCalledWith('');
    });
  });

  describe('pagination', () => {
    beforeEach(() => {
      component.columns = testColumns;
      component.data = testData;
      component.totalItems = 100;
      component.pageSize = 25;
      fixture.detectChanges();
    });

    it('should emit pageChange event when page changes', () => {
      spyOn(component.pageChange, 'emit');
      
      const primeNgPageEvent = {
        first: 25,
        rows: 25,
        page: 1,
        pageCount: 4
      };
      
      component.onPageChange(primeNgPageEvent);
      
      const expectedPageEvent: PageEvent = {
        pageIndex: 1,
        pageSize: 25,
        length: 100
      };
      
      expect(component.pageChange.emit).toHaveBeenCalledWith(expectedPageEvent);
    });

    it('should update first and rows when page changes', () => {
      const primeNgPageEvent = {
        first: 50,
        rows: 50,
        page: 1,
        pageCount: 2
      };
      
      component.onPageChange(primeNgPageEvent);
      
      expect(component.first).toBe(50);
      expect(component.rows).toBe(50);
    });

    it('should display paginator', () => {
      const paginator = compiled.query(By.css('p-table'));
      expect(paginator).toBeTruthy();
      expect(paginator.componentInstance.paginator).toBe(true);
    });
  });

  describe('sorting', () => {
    beforeEach(() => {
      component.columns = testColumns;
      component.data = testData;
      fixture.detectChanges();
    });

    it('should emit sortChange event with ascending order', () => {
      spyOn(component.sortChange, 'emit');
      
      const primeNgSortEvent = {
        field: 'name',
        order: 1
      };
      
      component.onSortChange(primeNgSortEvent);
      
      const expectedSortEvent: SortEvent = {
        field: 'name',
        order: 'asc'
      };
      
      expect(component.sortChange.emit).toHaveBeenCalledWith(expectedSortEvent);
    });

    it('should emit sortChange event with descending order', () => {
      spyOn(component.sortChange, 'emit');
      
      const primeNgSortEvent = {
        field: 'value',
        order: -1
      };
      
      component.onSortChange(primeNgSortEvent);
      
      const expectedSortEvent: SortEvent = {
        field: 'value',
        order: 'desc'
      };
      
      expect(component.sortChange.emit).toHaveBeenCalledWith(expectedSortEvent);
    });
  });

  describe('selection mode', () => {
    it('should support single selection mode', () => {
      component.columns = testColumns;
      component.data = testData;
      component.selectionMode = 'single';
      fixture.detectChanges();
      
      const table = compiled.query(By.css('p-table'));
      expect(table.componentInstance.selectionMode).toBe('single');
    });

    it('should support multiple selection mode', () => {
      component.columns = testColumns;
      component.data = testData;
      component.selectionMode = 'multiple';
      fixture.detectChanges();
      
      const table = compiled.query(By.css('p-table'));
      expect(table.componentInstance.selectionMode).toBe('multiple');
    });

    it('should emit rowSelect event', () => {
      spyOn(component.rowSelect, 'emit');
      
      const selectEvent = { data: testData[0] };
      component.onRowSelect(selectEvent);
      
      expect(component.rowSelect.emit).toHaveBeenCalledWith(testData[0]);
    });

    it('should emit rowUnselect event', () => {
      spyOn(component.rowUnselect, 'emit');
      
      const unselectEvent = { data: testData[1] };
      component.onRowUnselect(unselectEvent);
      
      expect(component.rowUnselect.emit).toHaveBeenCalledWith(testData[1]);
    });
  });

  describe('advanced features', () => {
    it('should support resizable columns', () => {
      component.columns = testColumns;
      component.data = testData;
      component.resizableColumns = true;
      fixture.detectChanges();
      
      const table = compiled.query(By.css('p-table'));
      expect(table.componentInstance.resizableColumns).toBe(true);
    });

    it('should support reorderable columns', () => {
      component.columns = testColumns;
      component.data = testData;
      component.reorderableColumns = true;
      fixture.detectChanges();
      
      const table = compiled.query(By.css('p-table'));
      expect(table.componentInstance.reorderableColumns).toBe(true);
    });

    it('should display loading state', () => {
      component.columns = testColumns;
      component.data = testData;
      component.loading = true;
      fixture.detectChanges();
      
      const table = compiled.query(By.css('p-table'));
      expect(table.componentInstance.loading).toBe(true);
    });

    it('should return true for hasActions when actionsTemplate is provided', () => {
      component.actionsTemplate = {} as TemplateRef<any>;
      expect(component.hasActions).toBe(true);
    });

    it('should return false for hasActions when actionsTemplate is not provided', () => {
      component.actionsTemplate = undefined;
      expect(component.hasActions).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle zero rows', () => {
      component.columns = testColumns;
      component.data = [];
      component.totalItems = 0;
      fixture.detectChanges();
      
      const rows = compiled.queryAll(By.css('tr.clickable-row'));
      expect(rows.length).toBe(0);
    });

    it('should handle single row', () => {
      component.columns = testColumns;
      component.data = [testData[0]];
      component.totalItems = 1;
      fixture.detectChanges();
      
      const rows = compiled.queryAll(By.css('tr.clickable-row'));
      expect(rows.length).toBe(1);
    });

    it('should handle columns without sortable property', () => {
      const columnsWithoutSortable: TableColumn[] = [
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Name' }
      ];
      
      component.columns = columnsWithoutSortable;
      component.data = testData;
      fixture.detectChanges();
      
      expect(component.displayedColumns).toEqual(['id', 'name']);
    });

    it('should handle very long search terms', () => {
      spyOn(component.searchChange, 'emit');
      
      const longSearchTerm = 'a'.repeat(1000);
      component.searchTerm = longSearchTerm;
      component.onSearchChange();
      
      expect(component.searchChange.emit).toHaveBeenCalledWith(longSearchTerm);
    });

    it('should handle special characters in search', () => {
      spyOn(component.searchChange, 'emit');
      
      component.searchTerm = '<script>alert("xss")</script>';
      component.onSearchChange();
      
      expect(component.searchChange.emit).toHaveBeenCalledWith('<script>alert("xss")</script>');
    });
  });
});
