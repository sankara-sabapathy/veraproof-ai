import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Base class for reactive state management using RxJS BehaviorSubjects
 * Provides a simple pattern for managing component/feature state
 */
export abstract class StateService<T> {
  private state$: BehaviorSubject<T>;

  constructor(initialState: T) {
    this.state$ = new BehaviorSubject<T>(initialState);
  }

  /**
   * Get observable stream of state changes
   */
  select(): Observable<T> {
    return this.state$.asObservable();
  }

  /**
   * Get current state snapshot
   */
  snapshot(): T {
    return this.state$.value;
  }

  /**
   * Replace entire state
   */
  setState(state: T): void {
    this.state$.next(state);
  }

  /**
   * Partially update state (merge with existing)
   */
  patchState(partial: Partial<T>): void {
    this.state$.next({ ...this.state$.value, ...partial });
  }

  /**
   * Reset state to initial value
   */
  protected resetState(initialState: T): void {
    this.state$.next(initialState);
  }
}
