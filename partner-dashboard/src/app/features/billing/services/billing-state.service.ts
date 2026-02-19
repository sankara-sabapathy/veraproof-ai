import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Subscription, SubscriptionPlan, Invoice } from './billing.service';

interface BillingState {
  subscription: Subscription | null;
  plans: SubscriptionPlan[];
  invoices: Invoice[];
  loading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class BillingStateService {
  private state$ = new BehaviorSubject<BillingState>({
    subscription: null,
    plans: [],
    invoices: [],
    loading: false,
    error: null
  });

  subscription$ = this.state$.pipe(map(state => state.subscription));
  plans$ = this.state$.pipe(map(state => state.plans));
  invoices$ = this.state$.pipe(map(state => state.invoices));
  loading$ = this.state$.pipe(map(state => state.loading));
  error$ = this.state$.pipe(map(state => state.error));

  setLoading(loading: boolean): void {
    this.patchState({ loading });
  }

  setSubscription(subscription: Subscription): void {
    this.patchState({ subscription, loading: false });
  }

  setPlans(plans: SubscriptionPlan[]): void {
    this.patchState({ plans, loading: false });
  }

  setInvoices(invoices: Invoice[]): void {
    this.patchState({ invoices, loading: false });
  }

  setError(error: string): void {
    this.patchState({ error, loading: false });
  }

  clearError(): void {
    this.patchState({ error: null });
  }

  private patchState(partial: Partial<BillingState>): void {
    this.state$.next({ ...this.state$.value, ...partial });
  }
}
