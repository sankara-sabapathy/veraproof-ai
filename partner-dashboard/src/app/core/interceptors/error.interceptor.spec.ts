import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { errorInterceptor } from './error.interceptor';

describe('errorInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting()
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Network Error Retry', () => {
    it('should retry network errors 3 times with exponential backoff', fakeAsync(() => {
      let attemptCount = 0;

      httpClient.get('/api/v1/sessions').subscribe({
        next: () => fail('Should not succeed'),
        error: (error) => {
          expect(attemptCount).toBe(4); // Initial + 3 retries
          expect(error.status).toBe(0);
        }
      });

      // Initial request
      tick();
      const req1 = httpMock.expectOne('/api/v1/sessions');
      attemptCount++;
      req1.error(new ProgressEvent('error'), { status: 0 });

      // Retry 1 after 1s
      tick(1000);
      const req2 = httpMock.expectOne('/api/v1/sessions');
      attemptCount++;
      req2.error(new ProgressEvent('error'), { status: 0 });

      // Retry 2 after 2s
      tick(2000);
      const req3 = httpMock.expectOne('/api/v1/sessions');
      attemptCount++;
      req3.error(new ProgressEvent('error'), { status: 0 });

      // Retry 3 after 4s
      tick(4000);
      const req4 = httpMock.expectOne('/api/v1/sessions');
      attemptCount++;
      req4.error(new ProgressEvent('error'), { status: 0 });

      tick();
    }));

    it('should succeed on retry after network error', fakeAsync(() => {
      let attemptCount = 0;

      httpClient.get('/api/v1/sessions').subscribe({
        next: (response) => {
          expect(response).toEqual({ data: 'success' });
          expect(attemptCount).toBe(2); // Initial + 1 retry
        },
        error: () => fail('Should not error')
      });

      // Initial request fails
      tick();
      const req1 = httpMock.expectOne('/api/v1/sessions');
      attemptCount++;
      req1.error(new ProgressEvent('error'), { status: 0 });

      // Retry succeeds after 1s
      tick(1000);
      const req2 = httpMock.expectOne('/api/v1/sessions');
      attemptCount++;
      req2.flush({ data: 'success' });

      tick();
    }));
  });

  describe('5xx Error Retry', () => {
    it('should retry 500 errors 2 times with exponential backoff', fakeAsync(() => {
      let attemptCount = 0;

      httpClient.get('/api/v1/sessions').subscribe({
        next: () => fail('Should not succeed'),
        error: (error) => {
          expect(attemptCount).toBe(3); // Initial + 2 retries
          expect(error.status).toBe(500);
        }
      });

      // Initial request
      tick();
      const req1 = httpMock.expectOne('/api/v1/sessions');
      attemptCount++;
      req1.flush({ error: 'Server Error' }, { status: 500, statusText: 'Internal Server Error' });

      // Retry 1 after 2s
      tick(2000);
      const req2 = httpMock.expectOne('/api/v1/sessions');
      attemptCount++;
      req2.flush({ error: 'Server Error' }, { status: 500, statusText: 'Internal Server Error' });

      // Retry 2 after 4s
      tick(4000);
      const req3 = httpMock.expectOne('/api/v1/sessions');
      attemptCount++;
      req3.flush({ error: 'Server Error' }, { status: 500, statusText: 'Internal Server Error' });

      tick();
    }));

    it('should succeed on retry after 503 error', fakeAsync(() => {
      let attemptCount = 0;

      httpClient.get('/api/v1/sessions').subscribe({
        next: (response) => {
          expect(response).toEqual({ data: 'success' });
          expect(attemptCount).toBe(2); // Initial + 1 retry
        },
        error: () => fail('Should not error')
      });

      // Initial request fails with 503
      tick();
      const req1 = httpMock.expectOne('/api/v1/sessions');
      attemptCount++;
      req1.flush({ error: 'Service Unavailable' }, { status: 503, statusText: 'Service Unavailable' });

      // Retry succeeds after 2s
      tick(2000);
      const req2 = httpMock.expectOne('/api/v1/sessions');
      attemptCount++;
      req2.flush({ data: 'success' });

      tick();
    }));

    it('should retry 502 Bad Gateway errors', fakeAsync(() => {
      let attemptCount = 0;

      httpClient.get('/api/v1/sessions').subscribe({
        next: (response) => {
          expect(response).toEqual({ data: 'success' });
          expect(attemptCount).toBe(2);
        },
        error: () => fail('Should not error')
      });

      // Initial request fails with 502
      tick();
      const req1 = httpMock.expectOne('/api/v1/sessions');
      attemptCount++;
      req1.flush({ error: 'Bad Gateway' }, { status: 502, statusText: 'Bad Gateway' });

      // Retry succeeds after 2s
      tick(2000);
      const req2 = httpMock.expectOne('/api/v1/sessions');
      attemptCount++;
      req2.flush({ data: 'success' });

      tick();
    }));
  });

  describe('4xx Error Handling', () => {
    it('should NOT retry 400 Bad Request errors', (done) => {
      let attemptCount = 0;

      httpClient.get('/api/v1/sessions').subscribe({
        next: () => fail('Should not succeed'),
        error: (error) => {
          expect(attemptCount).toBe(1); // No retries
          expect(error.status).toBe(400);
          done();
        }
      });

      const req = httpMock.expectOne('/api/v1/sessions');
      attemptCount++;
      req.flush({ error: 'Bad Request' }, { status: 400, statusText: 'Bad Request' });
    });

    it('should NOT retry 401 Unauthorized errors', (done) => {
      let attemptCount = 0;

      httpClient.get('/api/v1/sessions').subscribe({
        next: () => fail('Should not succeed'),
        error: (error) => {
          expect(attemptCount).toBe(1); // No retries
          expect(error.status).toBe(401);
          done();
        }
      });

      const req = httpMock.expectOne('/api/v1/sessions');
      attemptCount++;
      req.flush({ error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    });

    it('should NOT retry 403 Forbidden errors', (done) => {
      let attemptCount = 0;

      httpClient.get('/api/v1/admin').subscribe({
        next: () => fail('Should not succeed'),
        error: (error) => {
          expect(attemptCount).toBe(1); // No retries
          expect(error.status).toBe(403);
          done();
        }
      });

      const req = httpMock.expectOne('/api/v1/admin');
      attemptCount++;
      req.flush({ error: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    });

    it('should NOT retry 404 Not Found errors', (done) => {
      let attemptCount = 0;

      httpClient.get('/api/v1/notfound').subscribe({
        next: () => fail('Should not succeed'),
        error: (error) => {
          expect(attemptCount).toBe(1); // No retries
          expect(error.status).toBe(404);
          done();
        }
      });

      const req = httpMock.expectOne('/api/v1/notfound');
      attemptCount++;
      req.flush({ error: 'Not Found' }, { status: 404, statusText: 'Not Found' });
    });

    it('should NOT retry 422 Unprocessable Entity errors', (done) => {
      let attemptCount = 0;

      httpClient.post('/api/v1/sessions', {}).subscribe({
        next: () => fail('Should not succeed'),
        error: (error) => {
          expect(attemptCount).toBe(1); // No retries
          expect(error.status).toBe(422);
          done();
        }
      });

      const req = httpMock.expectOne('/api/v1/sessions');
      attemptCount++;
      req.flush({ error: 'Validation Error' }, { status: 422, statusText: 'Unprocessable Entity' });
    });

    it('should NOT retry 429 Rate Limit errors', (done) => {
      let attemptCount = 0;

      httpClient.get('/api/v1/sessions').subscribe({
        next: () => fail('Should not succeed'),
        error: (error) => {
          expect(attemptCount).toBe(1); // No retries
          expect(error.status).toBe(429);
          done();
        }
      });

      const req = httpMock.expectOne('/api/v1/sessions');
      attemptCount++;
      req.flush({ error: 'Too Many Requests' }, { status: 429, statusText: 'Too Many Requests' });
    });
  });

  describe('Error Message Handling', () => {
    it('should handle network errors with appropriate message', fakeAsync(() => {
      spyOn(console, 'error');

      httpClient.get('/api/v1/sessions').subscribe({
        next: () => fail('Should not succeed'),
        error: () => {
          expect(console.error).toHaveBeenCalledWith('HTTP Error:', jasmine.objectContaining({
            status: 0,
            message: 'Unable to connect to server. Please check your connection.'
          }));
        }
      });

      // Fail all retry attempts
      tick();
      const req1 = httpMock.expectOne('/api/v1/sessions');
      req1.error(new ProgressEvent('error'), { status: 0 });

      tick(1000);
      const req2 = httpMock.expectOne('/api/v1/sessions');
      req2.error(new ProgressEvent('error'), { status: 0 });

      tick(2000);
      const req3 = httpMock.expectOne('/api/v1/sessions');
      req3.error(new ProgressEvent('error'), { status: 0 });

      tick(4000);
      const req4 = httpMock.expectOne('/api/v1/sessions');
      req4.error(new ProgressEvent('error'), { status: 0 });

      tick();
    }));

    it('should handle 400 errors with detail message', (done) => {
      spyOn(console, 'error');

      httpClient.get('/api/v1/sessions').subscribe({
        next: () => fail('Should not succeed'),
        error: () => {
          expect(console.error).toHaveBeenCalledWith('HTTP Error:', jasmine.objectContaining({
            status: 400,
            message: 'Invalid session ID format'
          }));
          done();
        }
      });

      const req = httpMock.expectOne('/api/v1/sessions');
      req.flush(
        { detail: 'Invalid session ID format' },
        { status: 400, statusText: 'Bad Request' }
      );
    });

    it('should handle 403 errors with permission message', (done) => {
      spyOn(console, 'error');

      httpClient.get('/api/v1/admin').subscribe({
        next: () => fail('Should not succeed'),
        error: () => {
          expect(console.error).toHaveBeenCalledWith('HTTP Error:', jasmine.objectContaining({
            status: 403,
            message: 'You do not have permission to perform this action'
          }));
          done();
        }
      });

      const req = httpMock.expectOne('/api/v1/admin');
      req.flush({ error: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    });

    it('should handle 404 errors with not found message', (done) => {
      spyOn(console, 'error');

      httpClient.get('/api/v1/sessions/invalid').subscribe({
        next: () => fail('Should not succeed'),
        error: () => {
          expect(console.error).toHaveBeenCalledWith('HTTP Error:', jasmine.objectContaining({
            status: 404,
            message: 'The requested resource was not found'
          }));
          done();
        }
      });

      const req = httpMock.expectOne('/api/v1/sessions/invalid');
      req.flush({ error: 'Not Found' }, { status: 404, statusText: 'Not Found' });
    });

    it('should handle 429 rate limit errors with custom message', (done) => {
      spyOn(console, 'error');

      httpClient.get('/api/v1/sessions').subscribe({
        next: () => fail('Should not succeed'),
        error: () => {
          expect(console.error).toHaveBeenCalledWith('HTTP Error:', jasmine.objectContaining({
            status: 429,
            message: 'Rate limit exceeded. Try again in 60 seconds.'
          }));
          done();
        }
      });

      const req = httpMock.expectOne('/api/v1/sessions');
      req.flush(
        { detail: 'Rate limit exceeded. Try again in 60 seconds.' },
        { status: 429, statusText: 'Too Many Requests' }
      );
    });

    it('should handle 500 errors with server error message', fakeAsync(() => {
      spyOn(console, 'error');

      httpClient.get('/api/v1/sessions').subscribe({
        next: () => fail('Should not succeed'),
        error: () => {
          expect(console.error).toHaveBeenCalledWith('HTTP Error:', jasmine.objectContaining({
            status: 500,
            message: 'Server error. Please try again later.'
          }));
        }
      });

      // Fail all retry attempts
      tick();
      const req1 = httpMock.expectOne('/api/v1/sessions');
      req1.flush({ error: 'Internal Server Error' }, { status: 500, statusText: 'Internal Server Error' });

      tick(2000);
      const req2 = httpMock.expectOne('/api/v1/sessions');
      req2.flush({ error: 'Internal Server Error' }, { status: 500, statusText: 'Internal Server Error' });

      tick(4000);
      const req3 = httpMock.expectOne('/api/v1/sessions');
      req3.flush({ error: 'Internal Server Error' }, { status: 500, statusText: 'Internal Server Error' });

      tick();
    }));
  });

  describe('Successful Requests', () => {
    it('should pass through successful requests without retry', () => {
      httpClient.get('/api/v1/sessions').subscribe({
        next: (response) => {
          expect(response).toEqual({ data: 'success' });
        },
        error: () => fail('Should not error')
      });

      const req = httpMock.expectOne('/api/v1/sessions');
      req.flush({ data: 'success' });
    });

    it('should handle POST requests successfully', () => {
      const postData = { return_url: 'https://example.com' };

      httpClient.post('/api/v1/sessions', postData).subscribe({
        next: (response) => {
          expect(response).toEqual({ session_id: '123' });
        },
        error: () => fail('Should not error')
      });

      const req = httpMock.expectOne('/api/v1/sessions');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(postData);
      req.flush({ session_id: '123' });
    });
  });
});
