import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthSessionState, TenantEnvironmentSlug, TenantEnvironmentSummary } from '../models/interfaces';

@Injectable({
  providedIn: 'root'
})
export class TenantEnvironmentService {
  private http = inject(HttpClient);

  private activeEnvironmentSubject = new BehaviorSubject<TenantEnvironmentSummary | null>(null);
  readonly activeEnvironment$ = this.activeEnvironmentSubject.asObservable();

  private availableEnvironmentsSubject = new BehaviorSubject<TenantEnvironmentSummary[]>([]);
  readonly availableEnvironments$ = this.availableEnvironmentsSubject.asObservable();

  hydrateFromSession(session: AuthSessionState): void {
    const environments = session.available_environments ?? [];
    const activeEnvironment = session.active_environment ?? null;
    this.availableEnvironmentsSubject.next(environments);
    this.activeEnvironmentSubject.next(activeEnvironment);
  }

  clear(): void {
    this.availableEnvironmentsSubject.next([]);
    this.activeEnvironmentSubject.next(null);
  }

  listEnvironments(forceFromServer = false): Observable<TenantEnvironmentSummary[]> {
    if (!forceFromServer && this.availableEnvironmentsSubject.value.length > 0) {
      return of(this.availableEnvironmentsSubject.value);
    }

    return this.http.get<TenantEnvironmentSummary[]>(`${environment.apiUrl}/api/v1/environments`, { withCredentials: true }).pipe(
      tap((environments) => {
        this.availableEnvironmentsSubject.next(environments);

        const currentActive = this.activeEnvironmentSubject.value;
        if (currentActive) {
          const refreshedActive = environments.find((env) => env.slug === currentActive.slug) ?? currentActive;
          this.activeEnvironmentSubject.next(refreshedActive);
          return;
        }

        if (environments.length > 0) {
          const nextActive = environments.find((env) => env.is_default) ?? environments[0];
          this.activeEnvironmentSubject.next(nextActive);
        }
      })
    );
  }

  selectEnvironment(environmentSlug: TenantEnvironmentSlug): Observable<TenantEnvironmentSummary> {
    return this.http.post<TenantEnvironmentSummary>(
      `${environment.apiUrl}/api/v1/environments/select`,
      { environment: environmentSlug },
      { withCredentials: true }
    ).pipe(
      tap((selectedEnvironment) => {
        this.activeEnvironmentSubject.next(selectedEnvironment);

        const available = this.availableEnvironmentsSubject.value;
        if (available.length === 0) {
          this.availableEnvironmentsSubject.next([selectedEnvironment]);
          return;
        }

        const hasMatch = available.some((env) => env.slug === selectedEnvironment.slug);
        this.availableEnvironmentsSubject.next(
          hasMatch
            ? available.map((env) => env.slug === selectedEnvironment.slug ? selectedEnvironment : env)
            : [...available, selectedEnvironment]
        );
      })
    );
  }

  getActiveEnvironment(): TenantEnvironmentSummary | null {
    return this.activeEnvironmentSubject.value;
  }

  getActiveEnvironmentSlug(): TenantEnvironmentSlug | null {
    return this.activeEnvironmentSubject.value?.slug ?? null;
  }

  getAvailableEnvironments(): TenantEnvironmentSummary[] {
    return this.availableEnvironmentsSubject.value;
  }

  hasMultipleEnvironments(): boolean {
    return this.availableEnvironmentsSubject.value.length > 1;
  }
}
