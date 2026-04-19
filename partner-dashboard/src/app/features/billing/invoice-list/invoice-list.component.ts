import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { TooltipModule } from 'primeng/tooltip';
import { BillingService, Invoice } from '../services/billing.service';
import { BillingStateService } from '../services/billing-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { ColDef, ValueFormatterParams } from 'ag-grid-community';
import { ActionRendererComponent } from '../../../shared/components/data-table/renderers/action-renderer.component';
import { StatusRendererComponent } from '../../../shared/components/data-table/renderers/status-renderer.component';

@Component({
  selector: 'app-invoice-list',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    ChipModule,
    TooltipModule,
    LoadingSpinnerComponent,
    DataTableComponent
  ],
  providers: [DatePipe],
  templateUrl: './invoice-list.component.html',
  styleUrls: ['./invoice-list.component.scss']
})
export class InvoiceListComponent implements OnInit {
  invoices$ = this.billingState.invoices$;
  loading$ = this.billingState.loading$;

  columns: ColDef[] = [];

  constructor(
    private billingService: BillingService,
    private billingState: BillingStateService,
    private notification: NotificationService,
    private datePipe: DatePipe
  ) {
    this.columns = [
      { field: 'invoice_number', headerName: 'Invoice Number' },
      {
        field: 'date',
        headerName: 'Date',
        valueFormatter: (params: ValueFormatterParams) => this.datePipe.transform(params.value, 'mediumDate') || ''
      },
      {
        field: 'amount',
        headerName: 'Amount',
        valueFormatter: (params: ValueFormatterParams) => {
          if (params.value === null || params.value === undefined) return '';
          return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(params.value);
        }
      },
      {
        field: 'status',
        headerName: 'Status',
        cellRenderer: StatusRendererComponent
      },
      {
        headerName: 'Actions',
        sortable: false,
        filter: false,
        width: 100,
        cellRenderer: ActionRendererComponent,
        cellRendererParams: {
          actions: [
            {
              icon: 'pi pi-download',
              tooltip: 'Download Invoice',
              actionCallback: (rowData: Invoice) => this.downloadInvoice(rowData)
            }
          ]
        }
      }
    ];
  }

  ngOnInit(): void {
    this.loadInvoices();
  }

  loadInvoices(): void {
    this.billingState.setLoading(true);
    this.billingService.getInvoices().subscribe({
      next: (invoices) => this.billingState.setInvoices(invoices),
      error: (error) => {
        this.billingState.setError(error.message);
        this.notification.error('Failed to load invoices');
      }
    });
  }

  downloadInvoice(invoice: Invoice): void {
    this.billingService.downloadInvoice(invoice.invoice_id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `invoice_${invoice.invoice_number}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.notification.success('Invoice downloaded');
      },
      error: () => {
        this.notification.error('Failed to download invoice');
      }
    });
  }
}
