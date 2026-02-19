import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { BillingService, Invoice } from '../services/billing.service';
import { BillingStateService } from '../services/billing-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-invoice-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatTableModule,
    MatChipsModule,
    MatIconModule,
    LoadingSpinnerComponent
  ],
  templateUrl: './invoice-list.component.html',
  styleUrls: ['./invoice-list.component.scss']
})
export class InvoiceListComponent implements OnInit {
  invoices$ = this.billingState.invoices$;
  loading$ = this.billingState.loading$;
  displayedColumns = ['invoice_number', 'date', 'amount', 'status', 'actions'];

  constructor(
    private billingService: BillingService,
    private billingState: BillingStateService,
    private notification: NotificationService
  ) {}

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

  getStatusColor(status: string): string {
    switch (status) {
      case 'paid': return 'primary';
      case 'pending': return 'accent';
      case 'overdue': return 'warn';
      default: return '';
    }
  }
}
