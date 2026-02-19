import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { 
  AnalyticsStats, 
  UsageTrendData, 
  OutcomeDistribution 
} from '../../../core/models/interfaces';
import { AnalyticsService } from './analytics.service';

interface AnalyticsState {
  stats: AnalyticsStats | null;
  usageTrend: UsageTrendData[];
  outcomeDistribution: OutcomeDistribution | null;
  selectedPeriod: 'daily' | 'weekly' | 'monthly';
  loading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsStateService {
  private analyticsService = inject(AnalyticsService);
  
  private initialState: AnalyticsState = {
    stats: null,
    usageTrend: [],
    outcomeDistribution: null,
    selectedPeriod: 'daily',
    loading: false,
    error: null
  };

  private state$ = new BehaviorSubject<AnalyticsState>(this.initialState);

  // Selectors
  stats$ = this.state$.pipe(map(state => state.stats));
  usageTrend$ = this.state$.pipe(map(state => state.usageTrend));
  outcomeDistribution$ = this.state$.pipe(map(state => state.outcomeDistribution));
  selectedPeriod$ = this.state$.pipe(map(state => state.selectedPeriod));
  loading$ = this.state$.pipe(map(state => state.loading));
  error$ = this.state$.pipe(map(state => state.error));

  /**
   * Get the current state snapshot
   */
  snapshot(): AnalyticsState {
    return this.state$.value;
  }

  /**
   * Get the full state as an observable
   */
  select(): Observable<AnalyticsState> {
    return this.state$.asObservable();
  }

  /**
   * Update the state with partial changes
   */
  private patchState(partial: Partial<AnalyticsState>): void {
    this.state$.next({ ...this.state$.value, ...partial });
  }

  /**
   * Set loading state
   */
  setLoading(loading: boolean): void {
    this.patchState({ loading });
  }

  /**
   * Set analytics stats
   */
  setStats(stats: AnalyticsStats): void {
    this.patchState({ stats, loading: false, error: null });
  }

  /**
   * Set usage trend data
   */
  setUsageTrend(usageTrend: UsageTrendData[]): void {
    this.patchState({ usageTrend, loading: false, error: null });
  }

  /**
   * Set outcome distribution
   */
  setOutcomeDistribution(outcomeDistribution: OutcomeDistribution): void {
    this.patchState({ outcomeDistribution, loading: false, error: null });
  }

  /**
   * Set selected period
   */
  setSelectedPeriod(period: 'daily' | 'weekly' | 'monthly'): void {
    this.patchState({ selectedPeriod: period });
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
   * Load analytics stats from the backend
   */
  loadStats(): void {
    this.setLoading(true);
    this.analyticsService.getStats().subscribe({
      next: (stats) => this.setStats(stats),
      error: (error) => this.setError(error.message || 'Failed to load analytics stats')
    });
  }

  /**
   * Load usage trend data for the selected period
   */
  loadUsageTrend(period?: 'daily' | 'weekly' | 'monthly'): void {
    const selectedPeriod = period || this.snapshot().selectedPeriod;
    if (period) {
      this.setSelectedPeriod(period);
    }
    
    this.setLoading(true);
    this.analyticsService.getUsageTrend(selectedPeriod).subscribe({
      next: (usageTrend) => this.setUsageTrend(usageTrend),
      error: (error) => this.setError(error.message || 'Failed to load usage trend')
    });
  }

  /**
   * Load outcome distribution from the backend
   */
  loadOutcomeDistribution(): void {
    this.setLoading(true);
    this.analyticsService.getOutcomeDistribution().subscribe({
      next: (outcomeDistribution) => this.setOutcomeDistribution(outcomeDistribution),
      error: (error) => this.setError(error.message || 'Failed to load outcome distribution')
    });
  }

  /**
   * Load all analytics data
   */
  loadAll(): void {
    this.loadStats();
    this.loadUsageTrend();
    this.loadOutcomeDistribution();
  }

  /**
   * Reset state to initial values
   */
  reset(): void {
    this.state$.next(this.initialState);
  }
}
