import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DataTableComponent, PageEvent, SortEvent } from './data-table.component';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';

interface TestData {
  id: string;
  name: string;
  value: number;
}

describe('DataTableComponent', () => {
  let component: DataTableComponent<TestData>;
  let fixture: ComponentFixture<DataTableComponent<TestData>>;
  let compiled: DebugElement;

  const testColumns: ColDef[] = [
    { field: 'id', headerName: 'ID' },
    { field: 'name', headerName: 'Name' },
    { field: 'value', headerName: 'Value' }
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
        AgGridAngular
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
    it('should set inputs correctly', () => {
      component.columns = testColumns;
      component.data = testData;
      component.pageSize = 50;
      fixture.detectChanges();

      expect(component.columns.length).toBe(3);
      expect(component.data.length).toBe(3);
      expect(component.pageSize).toBe(50);
    });
  });

  describe('search functionality', () => {
    it('should emit searchChange event when search term changes', () => {
      spyOn(component.searchChange, 'emit');

      component.searchTerm = 'test search';
      component.onSearchChange();

      expect(component.searchChange.emit).toHaveBeenCalledWith('test search');
    });

    it('should update text filter in gridApi if available', () => {
      component.searchTerm = 'abc';
      const mockApi = {
        setGridOption: jasmine.createSpy('setGridOption')
      } as unknown as GridApi;

      // Force grid API
      (component as any).gridApi = mockApi;

      component.onSearchChange();
      expect(mockApi.setGridOption).toHaveBeenCalledWith('quickFilterText', 'abc');
    });
  });

  describe('row interaction', () => {
    it('should emit rowClick event when row is clicked', () => {
      spyOn(component.rowClick, 'emit');

      // Simulate AG Grid row click event
      const event = { data: testData[0] };
      component.onRowClicked(event);

      expect(component.rowClick.emit).toHaveBeenCalledWith(testData[0]);
    });
  });

  describe('selection', () => {
    it('should emit rowSelect when a row is selected', () => {
      spyOn(component.rowSelect, 'emit');

      const mockApi = {
        getSelectedRows: () => [testData[1]]
      } as unknown as GridApi;

      (component as any).gridApi = mockApi;

      component.onSelectionChanged({});
      expect(component.rowSelect.emit).toHaveBeenCalledWith(testData[1]);
    });

    it('should emit rowUnselect when no rows are selected', () => {
      spyOn(component.rowUnselect, 'emit');

      const mockApi = {
        getSelectedRows: () => []
      } as unknown as GridApi;

      (component as any).gridApi = mockApi;

      component.onSelectionChanged({});
      expect(component.rowUnselect.emit).toHaveBeenCalledWith({} as TestData);
    });
  });

});
