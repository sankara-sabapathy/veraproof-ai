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

  /**
   * Generic GET request
   */
  get<T>(endpoint: string, params?: any): Observable<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const httpParams = this.buildHttpParams(params);
    return this.http.get<T>(url, { params: httpParams }).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  /**
   * Generic POST request with optional configuration
   */
  post<T>(endpoint: string, body: any, options?: any): Observable<T> {
    const url = `${this.baseUrl}${endpoint}`;
    return this.http.post(url, body, options).pipe(
      catchError(this.handleError)
    ) as Observable<T>;
  }

  /**
   * Build HttpParams from object
   */
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

  /**
   * Generic PUT request
   */
  put<T>(endpoint: string, body: any): Observable<T> {
    const url = `${this.baseUrl}${endpoint}`;
    return this.http.put<T>(url, body).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Generic DELETE request
   */
  delete<T>(endpoint: string): Observable<T> {
    const url = `${this.baseUrl}${endpoint}`;
    return this.http.delete<T>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * File upload request
   */
  upload<T>(endpoint: string, file: File): Observable<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<T>(url, formData).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unexpected error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
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
