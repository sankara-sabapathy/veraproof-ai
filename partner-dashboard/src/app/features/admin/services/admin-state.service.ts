import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { TenantSummary, TenantDetail, PlatformStats, SystemHealth } from './admin.service';

interface AdminState {
  tenants: TenantSummary[];
  selectedTenant: TenantDetail | null;
  platformStats: PlatformStats | null;
  systemHealth: SystemHealth | null;
  loading: boolean;
  error: string | null;
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AdminStateService {
  private state$ = new BehaviorSubject<AdminState>({
    tenants: [],
    selectedTenant: null,
    platformStats: null,
    systemHealth: null,
    loading: false,
    error: null,
    pagination: { total: 0, limit: 25, offset: 0 }
  });

  tenants$ = this.state$.pipe(map(state => state.tenants));
  selectedTenant$ = this.state$.pipe(map(state => state.selectedTenant));
  platformStats$ = this.state$.pipe(map(state => state.platformStats));
  systemHealth$ = this.state$.pipe(map(state => state.systemHealth));
  loading$ = this.state$.pipe(map(state => state.loading));
  error$ = this.state$.pipe(map(state => state.error));
  pagination$ = this.state$.pipe(map(state => state.pagination));

  setLoading(loading: boolean): void {
    this.patchState({ loading });
  }

  setTenants(tenants: TenantSummary[], total: number): void {
    this.patchState({ 
      tenants, 
      pagination: { ...this.state$.value.pagination, total },
      loading: false 
    });
  }

  setSelectedTenant(tenant: TenantDetail | null): void {
    this.patchState({ selectedTenant: tenant, loading: false });
  }

  setPlatformStats(stats: PlatformStats): void {
    this.patchState({ platformStats: stats, loading: false });
  }

  setSystemHealth(health: SystemHealth): void {
    this.patchState({ systemHealth: health, loading: false });
  }

  setError(error: string): void {
    this.patchState({ error, loading: false });
  }

  updatePagination(pagination: Partial<{ total: number; limit: number; offset: number }>): void {
    this.patchState({ 
      pagination: { ...this.state$.value.pagination, ...pagination }
    });
  }

  private patchState(partial: Partial<AdminState>): void {
    this.state$.next({ ...this.state$.value, ...partial });
  }
}
