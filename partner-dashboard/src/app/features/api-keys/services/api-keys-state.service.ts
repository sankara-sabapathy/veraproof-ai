import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiKey } from '../../../core/models/interfaces';
import { ApiKeysService } from './api-keys.service';

interface ApiKeysState {
  keys: ApiKey[];
  selectedKey: ApiKey | null;
  loading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class ApiKeysStateService {
  private apiKeysService = inject(ApiKeysService);
  
  private initialState: ApiKeysState = {
    keys: [],
    selectedKey: null,
    loading: false,
    error: null
  };

  private state$ = new BehaviorSubject<ApiKeysState>(this.initialState);

  // Selectors
  keys$ = this.state$.pipe(map(state => state.keys));
  selectedKey$ = this.state$.pipe(map(state => state.selectedKey));
  loading$ = this.state$.pipe(map(state => state.loading));
  error$ = this.state$.pipe(map(state => state.error));

  /**
   * Get the current state snapshot
   */
  snapshot(): ApiKeysState {
    return this.state$.value;
  }

  /**
   * Get the full state as an observable
   */
  select(): Observable<ApiKeysState> {
    return this.state$.asObservable();
  }

  /**
   * Update the state with partial changes
   */
  private patchState(partial: Partial<ApiKeysState>): void {
    this.state$.next({ ...this.state$.value, ...partial });
  }

  /**
   * Set loading state
   */
  setLoading(loading: boolean): void {
    this.patchState({ loading });
  }

  /**
   * Set API keys list
   */
  setKeys(keys: ApiKey[]): void {
    this.patchState({ keys, loading: false, error: null });
  }

  /**
   * Set selected API key
   */
  setSelectedKey(key: ApiKey | null): void {
    this.patchState({ selectedKey: key });
  }

  /**
   * Set error state
   */
  setError(error: string): void {
    this.patchState({ error, loading: false });
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.patchState({ error: null });
  }

  /**
   * Load all API keys from the backend
   */
  loadKeys(): void {
    this.setLoading(true);
    this.apiKeysService.listKeys().subscribe({
      next: (keys) => this.setKeys(keys),
      error: (error) => this.setError(error.message || 'Failed to load API keys')
    });
  }

  /**
   * Add a newly generated key to the state
   */
  addKey(key: ApiKey): void {
    const currentKeys = this.snapshot().keys;
    this.setKeys([...currentKeys, key]);
  }

  /**
   * Remove a key from the state (after revocation)
   */
  removeKey(keyId: string): void {
    const currentKeys = this.snapshot().keys;
    const updatedKeys = currentKeys.filter(k => k.key_id !== keyId);
    this.setKeys(updatedKeys);
  }

  /**
   * Update a key in the state
   */
  updateKey(updatedKey: ApiKey): void {
    const currentKeys = this.snapshot().keys;
    const updatedKeys = currentKeys.map(k => 
      k.key_id === updatedKey.key_id ? updatedKey : k
    );
    this.setKeys(updatedKeys);
  }

  /**
   * Reset state to initial values
   */
  reset(): void {
    this.state$.next(this.initialState);
  }
}
