import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Webhook, WebhookLog } from './webhooks.service';

interface WebhooksState {
  webhooks: Webhook[];
  selectedWebhook: Webhook | null;
  logs: WebhookLog[];
  loading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class WebhooksStateService {
  private state$ = new BehaviorSubject<WebhooksState>({
    webhooks: [],
    selectedWebhook: null,
    logs: [],
    loading: false,
    error: null
  });

  webhooks$ = this.state$.pipe(map(state => state.webhooks));
  selectedWebhook$ = this.state$.pipe(map(state => state.selectedWebhook));
  logs$ = this.state$.pipe(map(state => state.logs));
  loading$ = this.state$.pipe(map(state => state.loading));
  error$ = this.state$.pipe(map(state => state.error));

  setLoading(loading: boolean): void {
    this.patchState({ loading });
  }

  setWebhooks(webhooks: Webhook[]): void {
    this.patchState({ webhooks, loading: false });
  }

  setSelectedWebhook(webhook: Webhook | null): void {
    this.patchState({ selectedWebhook: webhook });
  }

  setLogs(logs: WebhookLog[]): void {
    this.patchState({ logs, loading: false });
  }

  setError(error: string): void {
    this.patchState({ error, loading: false });
  }

  clearError(): void {
    this.patchState({ error: null });
  }

  private patchState(partial: Partial<WebhooksState>): void {
    this.state$.next({ ...this.state$.value, ...partial });
  }
}
