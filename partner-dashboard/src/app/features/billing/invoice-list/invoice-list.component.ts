import { Component, OnInit, AfterViewInit, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { TooltipModule } from 'primeng/tooltip';
import { BillingService, Invoice } from '../services/billing.service';
import { BillingStateService } from '../services/billing-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { DataTableComponent, TableColumn } from '../../../shared/components/data-table/data-table.component';

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
  templateUrl: './invoice-list.component.html',
  styleUrls: ['./invoice-list.component.scss']
})
export class InvoiceListComponent implements OnInit, AfterViewInit {
  invoices$ = this.billingState.invoices$;
  loading$ = this.billingState.loading$;
  
  @ViewChild('dateTemplate') dateTemplate!: TemplateRef<any>;
  @ViewChild('amountTemplate') amountTemplate!: TemplateRef<any>;
  @ViewChild('statusTemplate') statusTemplate!: TemplateRef<any>;
  @ViewChild('actionsTemplate') actionsTemplate!: TemplateRef<any>;
  
  columns: TableColumn[] = [];

  constructor(
    private billingService: BillingService,
    private billingState: BillingStateService,
    private notification: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadInvoices();
  }

  ngAfterViewInit(): void {
    this.initializeColumns();
  }

  initializeColumns(): void {
    this.columns = [
      { key: 'invoice_number', label: 'Invoice Number', sortable: true },
      { key: 'date', label: 'Date', sortable: true, template: this.dateTemplate },
      { key: 'amount', label: 'Amount', sortable: true, template: this.amountTemplate },
      { key: 'status', label: 'Status', sortable: false, template: this.statusTemplate }
    ];
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

  getStatusColor(status: string): string {
    switch (status) {
      case 'paid': return 'success';
      case 'pending': return 'warning';
      case 'overdue': return 'danger';
      default: return 'info';
    }
  }

  getStatusSeverity(status: string): 'success' | 'warning' | 'danger' | 'info' {
    switch (status) {
      case 'paid': return 'success';
      case 'pending': return 'warning';
      case 'overdue': return 'danger';
      default: return 'info';
    }
  }
}
