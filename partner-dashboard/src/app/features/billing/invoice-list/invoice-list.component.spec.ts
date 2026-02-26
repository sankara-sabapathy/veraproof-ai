import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { InvoiceListComponent } from './invoice-list.component';
import { BillingService, Invoice } from '../services/billing.service';
import { BillingStateService } from '../services/billing-state.service';
import { NotificationService } from '../../../core/services/notification.service';

describe('InvoiceListComponent', () => {
  let component: InvoiceListComponent;
  let fixture: ComponentFixture<InvoiceListComponent>;
  let mockBillingService: jasmine.SpyObj<BillingService>;
  let mockStateService: jasmine.SpyObj<BillingStateService>;
  let mockNotificationService: jasmine.SpyObj<NotificationService>;

  const mockInvoices: Invoice[] = [
    {
      invoice_id: '1',
      invoice_number: 'INV-2024-001',
      date: '2024-01-15T00:00:00Z',
      amount: 99.99,
      status: 'paid',
      download_url: 'https://example.com/invoice1.pdf'
    },
    {
      invoice_id: '2',
      invoice_number: 'INV-2024-002',
      date: '2024-02-15T00:00:00Z',
      amount: 149.99,
      status: 'pending',
      download_url: 'https://example.com/invoice2.pdf'
    },
    {
      invoice_id: '3',
      invoice_number: 'INV-2024-003',
      date: '2024-03-15T00:00:00Z',
      amount: 199.99,
      status: 'overdue',
      download_url: 'https://example.com/invoice3.pdf'
    }
  ];

  beforeEach(async () => {
    mockBillingService = jasmine.createSpyObj('BillingService', ['getInvoices', 'downloadInvoice']);
    mockStateService = jasmine.createSpyObj('BillingStateService', [
      'setLoading',
      'setInvoices',
      'setError'
    ], {
      invoices$: of(mockInvoices),
      loading$: of(false)
    });
    mockNotificationService = jasmine.createSpyObj('NotificationService', [
      'success',
      'error'
    ]);

    await TestBed.configureTestingModule({
      imports: [
        InvoiceListComponent,
        BrowserAnimationsModule
      ],
      providers: [
        { provide: BillingService, useValue: mockBillingService },
        { provide: BillingStateService, useValue: mockStateService },
        { provide: NotificationService, useValue: mockNotificationService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InvoiceListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load invoices on init', () => {
    mockBillingService.getInvoices.and.returnValue(of(mockInvoices));
    
    component.ngOnInit();
    
    expect(mockStateService.setLoading).toHaveBeenCalledWith(true);
    expect(mockBillingService.getInvoices).toHaveBeenCalled();
  });

  it('should set invoices in state on successful load', () => {
    mockBillingService.getInvoices.and.returnValue(of(mockInvoices));
    
    component.loadInvoices();
    
    expect(mockStateService.setInvoices).toHaveBeenCalledWith(mockInvoices);
  });

  it('should handle error when loading invoices fails', () => {
    const error = new Error('Network error');
    mockBillingService.getInvoices.and.returnValue(throwError(() => error));
    
    component.loadInvoices();
    
    expect(mockStateService.setError).toHaveBeenCalledWith('Network error');
    expect(mockNotificationService.error).toHaveBeenCalledWith('Failed to load invoices');
  });

  it('should initialize columns after view init', () => {
    mockBillingService.getInvoices.and.returnValue(of(mockInvoices));
    
    // Manually trigger the lifecycle hooks
    component.ngOnInit();
    component.ngAfterViewInit();
    
    expect(component.columns.length).toBe(4);
    expect(component.columns[0].key).toBe('invoice_number');
    expect(component.columns[1].key).toBe('date');
    expect(component.columns[2].key).toBe('amount');
    expect(component.columns[3].key).toBe('status');
  });

  it('should download invoice successfully', () => {
    const mockBlob = new Blob(['test'], { type: 'application/pdf' });
    mockBillingService.downloadInvoice.and.returnValue(of(mockBlob));
    
    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:test-url');
    spyOn(window.URL, 'revokeObjectURL');
    
    const invoice = mockInvoices[0];
    component.downloadInvoice(invoice);
    
    expect(mockBillingService.downloadInvoice).toHaveBeenCalledWith(invoice.invoice_id);
    expect(mockNotificationService.success).toHaveBeenCalledWith('Invoice downloaded');
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-url');
  });

  it('should handle error when downloading invoice fails', () => {
    mockBillingService.downloadInvoice.and.returnValue(throwError(() => new Error('Download failed')));
    
    const invoice = mockInvoices[0];
    component.downloadInvoice(invoice);
    
    expect(mockNotificationService.error).toHaveBeenCalledWith('Failed to download invoice');
  });

  it('should return correct status color for paid status', () => {
    expect(component.getStatusColor('paid')).toBe('success');
  });

  it('should return correct status color for pending status', () => {
    expect(component.getStatusColor('pending')).toBe('warning');
  });

  it('should return correct status color for overdue status', () => {
    expect(component.getStatusColor('overdue')).toBe('danger');
  });

  it('should return info color for unknown status', () => {
    expect(component.getStatusColor('unknown')).toBe('info');
  });

  it('should return correct status severity for paid status', () => {
    expect(component.getStatusSeverity('paid')).toBe('success');
  });

  it('should return correct status severity for pending status', () => {
    expect(component.getStatusSeverity('pending')).toBe('warning');
  });

  it('should return correct status severity for overdue status', () => {
    expect(component.getStatusSeverity('overdue')).toBe('danger');
  });

  it('should return info severity for unknown status', () => {
    expect(component.getStatusSeverity('unknown')).toBe('info');
  });
});
