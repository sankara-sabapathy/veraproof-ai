import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface Subscription {
  tier: 'Sandbox' | 'Starter' | 'Pro' | 'Enterprise';
  monthly_quota: number;
  current_usage: number;
  billing_cycle_start: string;
  billing_cycle_end: string;
  price: number;
}

interface Invoice {
  invoice_id: string;
  amount: number;
  status: string;
  created_at: string;
  pdf_url?: string;
}

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container">
      <h1>Billing & Subscription</h1>

      <div class="billing-grid">
        <div class="card">
          <h2>Current Plan</h2>
          <div *ngIf="subscription" class="plan-details">
            <div class="plan-tier">{{ subscription.tier }}</div>
            <div class="plan-quota">
              {{ subscription.current_usage }} / {{ subscription.monthly_quota }} verifications
            </div>
            <div class="progress-bar-container">
              <div class="progress-bar" 
                   [style.width.%]="(subscription.current_usage / subscription.monthly_quota) * 100">
              </div>
            </div>
            <div class="plan-price">\${{ subscription.price }}/month</div>
            <div class="plan-cycle">
              Billing cycle: {{ subscription.billing_cycle_start | date:'short' }} - 
              {{ subscription.billing_cycle_end | date:'short' }}
            </div>
          </div>
        </div>

        <div class="card">
          <h2>Upgrade Plan</h2>
          <div class="plans-grid">
            <div class="plan-card" *ngFor="let plan of availablePlans">
              <h3>{{ plan.name }}</h3>
              <div class="plan-price-large">\${{ plan.price }}<span>/mo</span></div>
              <ul class="plan-features">
                <li>{{ plan.quota }} verifications/month</li>
                <li *ngFor="let feature of plan.features">{{ feature }}</li>
              </ul>
              <button class="btn btn-primary" 
                      (click)="upgradePlan(plan.name)"
                      [disabled]="subscription?.tier === plan.name">
                {{ subscription?.tier === plan.name ? 'Current Plan' : 'Upgrade' }}
              </button>
            </div>
          </div>
        </div>

        <div class="card full-width">
          <h2>Purchase Additional Credits</h2>
          <div class="credits-options">
            <button class="credit-btn" (click)="purchaseCredits(100)">
              <div class="credit-amount">100 Credits</div>
              <div class="credit-price">\$10</div>
            </button>
            <button class="credit-btn" (click)="purchaseCredits(500)">
              <div class="credit-amount">500 Credits</div>
              <div class="credit-price">\$45</div>
            </button>
            <button class="credit-btn" (click)="purchaseCredits(1000)">
              <div class="credit-amount">1000 Credits</div>
              <div class="credit-price">\$80</div>
            </button>
          </div>
        </div>

        <div class="card full-width">
          <h2>Invoices</h2>
          <table class="table">
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let invoice of invoices">
                <td>{{ invoice.invoice_id }}</td>
                <td>{{ invoice.created_at | date:'short' }}</td>
                <td>\${{ invoice.amount }}</td>
                <td>
                  <span class="badge" [ngClass]="{
                    'badge-success': invoice.status === 'paid',
                    'badge-warning': invoice.status === 'pending',
                    'badge-error': invoice.status === 'failed'
                  }">
                    {{ invoice.status }}
                  </span>
                </td>
                <td>
                  <button *ngIf="invoice.pdf_url" 
                          class="btn-link" 
                          (click)="downloadInvoice(invoice.pdf_url)">
                    Download
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .billing-grid {
      display: grid;
      gap: 1.5rem;
    }

    .full-width {
      grid-column: 1 / -1;
    }

    .plan-details {
      text-align: center;
    }

    .plan-tier {
      font-size: 2rem;
      font-weight: 700;
      color: var(--primary-color);
      margin-bottom: 1rem;
    }

    .plan-quota {
      font-size: 1.25rem;
      margin-bottom: 1rem;
    }

    .progress-bar-container {
      height: 12px;
      background: var(--border-color);
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 1rem;
    }

    .progress-bar {
      height: 100%;
      background: var(--primary-color);
      transition: width 0.3s;
    }

    .plan-price {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }

    .plan-cycle {
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    .plans-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }

    .plan-card {
      border: 2px solid var(--border-color);
      border-radius: 8px;
      padding: 1.5rem;
      text-align: center;
    }

    .plan-price-large {
      font-size: 2.5rem;
      font-weight: 700;
      color: var(--primary-color);
      margin: 1rem 0;
    }

    .plan-price-large span {
      font-size: 1rem;
      color: var(--text-secondary);
    }

    .plan-features {
      list-style: none;
      padding: 0;
      margin: 1.5rem 0;
      text-align: left;
    }

    .plan-features li {
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--border-color);
    }

    .credits-options {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    .credit-btn {
      border: 2px solid var(--border-color);
      border-radius: 8px;
      padding: 1.5rem 2rem;
      background: white;
      cursor: pointer;
      transition: all 0.2s;
    }

    .credit-btn:hover {
      border-color: var(--primary-color);
      transform: translateY(-2px);
    }

    .credit-amount {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }

    .credit-price {
      font-size: 1.5rem;
      color: var(--primary-color);
      font-weight: 700;
    }
  `]
})
export class BillingComponent implements OnInit {
  private http = inject(HttpClient);

  subscription: Subscription | null = null;
  invoices: Invoice[] = [];

  availablePlans = [
    {
      name: 'Starter',
      price: 49,
      quota: 1000,
      features: ['Basic analytics', 'Email support', '90-day retention']
    },
    {
      name: 'Pro',
      price: 199,
      quota: 5000,
      features: ['Advanced analytics', 'Priority support', 'Custom branding', 'Webhooks']
    },
    {
      name: 'Enterprise',
      price: 999,
      quota: 50000,
      features: ['Unlimited analytics', '24/7 support', 'Custom integration', 'SLA guarantee']
    }
  ];

  ngOnInit(): void {
    this.loadSubscription();
    this.loadInvoices();
  }

  loadSubscription(): void {
    this.http.get<Subscription>(`${environment.apiUrl}/api/v1/billing/subscription`)
      .subscribe({
        next: (data) => {
          this.subscription = data;
        },
        error: (err) => {
          console.error('Failed to load subscription:', err);
        }
      });
  }

  loadInvoices(): void {
    this.http.get<Invoice[]>(`${environment.apiUrl}/api/v1/billing/invoices`)
      .subscribe({
        next: (data) => {
          this.invoices = data;
        },
        error: (err) => {
          console.error('Failed to load invoices:', err);
        }
      });
  }

  upgradePlan(tier: string): void {
    this.http.post<{ checkout_url: string }>(`${environment.apiUrl}/api/v1/billing/upgrade`, {
      tier
    }).subscribe({
      next: (response) => {
        // Redirect to Razorpay checkout
        window.location.href = response.checkout_url;
      },
      error: (err) => {
        console.error('Failed to upgrade plan:', err);
      }
    });
  }

  purchaseCredits(amount: number): void {
    this.http.post<{ checkout_url: string }>(`${environment.apiUrl}/api/v1/billing/purchase-credits`, {
      credits: amount
    }).subscribe({
      next: (response) => {
        // Redirect to Razorpay checkout
        window.location.href = response.checkout_url;
      },
      error: (err) => {
        console.error('Failed to purchase credits:', err);
      }
    });
  }

  downloadInvoice(url: string): void {
    window.open(url, '_blank');
  }
}
