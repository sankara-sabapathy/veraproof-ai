import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BrandingConfig } from './branding.service';

interface BrandingState {
  config: BrandingConfig | null;
  loading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class BrandingStateService {
  private state$ = new BehaviorSubject<BrandingState>({
    config: null,
    loading: false,
    error: null
  });

  config$ = this.state$.pipe(map(state => state.config));
  loading$ = this.state$.pipe(map(state => state.loading));
  error$ = this.state$.pipe(map(state => state.error));

  setLoading(loading: boolean): void {
    this.patchState({ loading });
  }

  setConfig(config: BrandingConfig): void {
    this.patchState({ config, loading: false });
  }

  setError(error: string): void {
    this.patchState({ error, loading: false });
  }

  clearError(): void {
    this.patchState({ error: null });
  }

  private patchState(partial: Partial<BrandingState>): void {
    this.state$.next({ ...this.state$.value, ...partial });
  }
}
