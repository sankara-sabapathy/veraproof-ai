import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

export interface Subscription {
  tenant_id: string;
  subscription_tier: 'Sandbox' | 'Starter' | 'Professional' | 'Enterprise';
  monthly_quota: number;
  current_usage: number;
  remaining_quota: number;
  usage_percentage: number;
  billing_cycle_start: string;
  billing_cycle_end: string;
  next_renewal_date: string;
  estimated_cost: number;
}

export interface SubscriptionPlan {
  plan_id: string;
  name: string;
  tier: string;
  monthly_quota: number;
  price_per_month: number;
  price_per_verification: number;
  features: string[];
  recommended?: boolean;
}

export interface UpgradeResponse {
  order_id: string;
  plan: string;
  effective_date: string;
  new_quota: number;
}

export interface PurchaseResponse {
  order_id: string;
  credits_purchased: number;
  total_cost: number;
  new_quota: number;
}

export interface Invoice {
  invoice_id: string;
  invoice_number: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  download_url: string;
}

@Injectable({
  providedIn: 'root'
})
export class BillingService {
  private readonly baseUrl = '/api/v1/billing';

  constructor(private api: ApiService) {}

  getSubscription(): Observable<Subscription> {
    return this.api.get<Subscription>(`${this.baseUrl}/subscription`);
  }

  getPlans(): Observable<SubscriptionPlan[]> {
    return this.api.get<SubscriptionPlan[]>(`${this.baseUrl}/plans`);
  }

  upgradeSubscription(planId: string): Observable<UpgradeResponse> {
    return this.api.post<UpgradeResponse>(`${this.baseUrl}/upgrade`, { plan_id: planId });
  }

  purchaseCredits(amount: number): Observable<PurchaseResponse> {
    return this.api.post<PurchaseResponse>(`${this.baseUrl}/credits`, { amount });
  }

  getInvoices(): Observable<Invoice[]> {
    return this.api.get<Invoice[]>(`${this.baseUrl}/invoices`);
  }

  downloadInvoice(invoiceId: string): Observable<Blob> {
    return this.api.get<Blob>(`${this.baseUrl}/invoices/${invoiceId}/download`);
  }
}
