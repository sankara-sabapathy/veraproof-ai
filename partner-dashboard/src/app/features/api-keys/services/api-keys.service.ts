import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { ApiKey, ApiKeyResponse, KeyUsageStats } from '../../../core/models/interfaces';

@Injectable({
  providedIn: 'root'
})
export class ApiKeysService {
  private apiService = inject(ApiService);

  /**
   * Generate a new API key for the specified environment
   * @param environment - 'sandbox' or 'production'
   * @returns Observable of ApiKeyResponse containing the new key and secret
   */
  generateKey(environment: 'sandbox' | 'production'): Observable<ApiKeyResponse> {
    return this.apiService.post<ApiKeyResponse>('/api/v1/api-keys', { environment });
  }

  /**
   * List all API keys for the current tenant
   * @returns Observable of array of ApiKey objects
   */
  listKeys(): Observable<ApiKey[]> {
    return this.apiService.get<ApiKey[]>('/api/v1/api-keys');
  }

  /**
   * Revoke an API key by ID
   * @param keyId - The ID of the key to revoke
   * @returns Observable that completes when the key is revoked
   */
  revokeKey(keyId: string): Observable<void> {
    return this.apiService.delete<void>(`/api/v1/api-keys/${keyId}`);
  }

  /**
   * Get usage statistics for a specific API key
   * @param keyId - The ID of the key to get usage for
   * @returns Observable of KeyUsageStats
   */
  getKeyUsage(keyId: string): Observable<KeyUsageStats> {
    return this.apiService.get<KeyUsageStats>(`/api/v1/api-keys/${keyId}/usage`);
  }
}
