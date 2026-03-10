import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

export type TenantEncryptionMode = 'managed' | 'tenant_managed';

export interface OrgEncryptionSettings {
  tenant_id: string;
  encryption_mode: TenantEncryptionMode;
  encryption_key_version: number;
}

export interface TenantRuntimeKeyStatus {
  loaded: boolean;
  expires_at: string | null;
  seconds_remaining: number;
}

@Injectable({
  providedIn: 'root'
})
export class EncryptionService {
  constructor(private api: ApiService) {}

  getOrgEncryptionSettings(orgId: string): Observable<OrgEncryptionSettings> {
    return this.api.get<OrgEncryptionSettings>(`/api/v1/orgs/${orgId}/encryption`);
  }

  updateOrgEncryptionSettings(
    orgId: string,
    payload: { encryption_mode: TenantEncryptionMode; rotate_key?: boolean }
  ): Observable<OrgEncryptionSettings> {
    return this.api.put<OrgEncryptionSettings>(`/api/v1/orgs/${orgId}/encryption`, payload);
  }

  getRuntimeKeyStatus(): Observable<TenantRuntimeKeyStatus> {
    return this.api.get<TenantRuntimeKeyStatus>('/api/v1/auth/runtime-key-status');
  }

  loadRuntimeKey(passphrase: string): Observable<TenantRuntimeKeyStatus> {
    return this.api.post<TenantRuntimeKeyStatus>('/api/v1/auth/runtime-key', { passphrase });
  }

  clearRuntimeKey(): Observable<{ status: string }> {
    return this.api.delete<{ status: string }>('/api/v1/auth/runtime-key');
  }
}
