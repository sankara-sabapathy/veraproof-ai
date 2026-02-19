import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, retry, mergeMap } from 'rxjs/operators';

/**
 * HTTP Interceptor for centralized error handling and retry logic
 * 
 * Retry Strategy:
 * - Network errors (status 0): 3 retries with exponential backoff (1s, 2s, 4s)
 * - 5xx errors: 2 retries with exponential backoff (2s, 4s)
 * - 4xx errors: No retry (client errors)
 */
export const errorInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  return next(req).pipe(
    retry({
      count: 3,
      delay: (error: HttpErrorResponse, retryCount: number) => {
        // Don't retry 4xx errors (client errors)
        if (error.status >= 400 && error.status < 500) {
          throw error;
        }

        // Network errors (status 0): retry 3 times with 1s, 2s, 4s backoff
        if (error.status === 0) {
          const delay = Math.pow(2, retryCount - 1) * 1000; // 1s, 2s, 4s
          console.log(`Network error, retrying in ${delay}ms (attempt ${retryCount}/3)`);
          return timer(delay);
        }

        // 5xx errors: retry 2 times with 2s, 4s backoff
        if (error.status >= 500) {
          if (retryCount > 2) {
            throw error; // Max 2 retries for 5xx
          }
          const delay = Math.pow(2, retryCount) * 1000; // 2s, 4s
          console.log(`Server error (${error.status}), retrying in ${delay}ms (attempt ${retryCount}/2)`);
          return timer(delay);
        }

        // Don't retry other errors
        throw error;
      }
    }),
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        handleError(error);
      }
      return throwError(() => error);
    })
  );
};

/**
 * Handle HTTP errors and log user-friendly messages
 * Note: User notifications will be handled by NotificationService (task 1.9)
 */
function handleError(error: HttpErrorResponse): void {
  let errorMessage = 'An unexpected error occurred';

  if (error.error instanceof ErrorEvent) {
    // Client-side error
    errorMessage = `Error: ${error.error.message}`;
  } else {
    // Server-side error
    errorMessage = getServerErrorMessage(error);
  }

  // Log error for debugging
  console.error('HTTP Error:', {
    status: error.status,
    message: errorMessage,
    url: error.url,
    error: error.error
  });

  // TODO: Display user notification via NotificationService (task 1.9)
  // this.notificationService.error(errorMessage);
}

/**
 * Get user-friendly error message based on HTTP status code
 */
function getServerErrorMessage(error: HttpErrorResponse): string {
  if (error.status === 0) {
    return 'Unable to connect to server. Please check your connection.';
  }

  if (error.status === 400) {
    return error.error?.detail || 'Invalid request';
  }

  if (error.status === 401) {
    return 'Authentication required. Please log in.';
  }

  if (error.status === 403) {
    return 'You do not have permission to perform this action';
  }

  if (error.status === 404) {
    return 'The requested resource was not found';
  }

  if (error.status === 429) {
    return error.error?.detail || 'Rate limit exceeded. Please try again later.';
  }

  if (error.status >= 500) {
    return 'Server error. Please try again later.';
  }

  return error.error?.detail || `Error: ${error.status}`;
}
