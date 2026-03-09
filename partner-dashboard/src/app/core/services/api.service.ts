import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  get<T>(endpoint: string, params?: any): Observable<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const httpParams = this.buildHttpParams(params);
    return this.http.get<T>(url, { params: httpParams, withCredentials: true }).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  post<T>(endpoint: string, body: any, options?: any): Observable<T> {
    const url = `${this.baseUrl}${endpoint}`;
    return this.http.post(url, body, { withCredentials: true, ...(options || {}) }).pipe(
      catchError(this.handleError)
    ) as Observable<T>;
  }

  private buildHttpParams(params?: any): HttpParams {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }
    return httpParams;
  }

  put<T>(endpoint: string, body: any): Observable<T> {
    const url = `${this.baseUrl}${endpoint}`;
    return this.http.put<T>(url, body, { withCredentials: true }).pipe(
      catchError(this.handleError)
    );
  }

  delete<T>(endpoint: string): Observable<T> {
    const url = `${this.baseUrl}${endpoint}`;
    return this.http.delete<T>(url, { withCredentials: true }).pipe(
      catchError(this.handleError)
    );
  }

  upload<T>(endpoint: string, file: File): Observable<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<T>(url, formData, { withCredentials: true }).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unexpected error occurred';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      if (error.status === 0) {
        errorMessage = 'Unable to connect to server. Please check your connection.';
      } else if (error.status === 400) {
        errorMessage = error.error?.detail || 'Invalid request';
      } else if (error.status === 403) {
        errorMessage = 'You do not have permission to perform this action';
      } else if (error.status === 404) {
        errorMessage = 'Resource not found';
      } else if (error.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error.error?.detail) {
        errorMessage = error.error.detail;
      }
    }

    console.error('API Error:', {
      status: error.status,
      message: errorMessage,
      url: error.url,
      timestamp: new Date().toISOString()
    });
    return throwError(() => new Error(errorMessage));
  }
}
