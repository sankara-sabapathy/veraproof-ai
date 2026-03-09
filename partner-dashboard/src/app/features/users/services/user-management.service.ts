import { Injectable } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { Observable } from 'rxjs';

export interface OrgRole {
  role_slug: string;
  description: string;
  is_platform_role: boolean;
  permissions: string[];
}

export interface OrgMember {
  membership_id: string;
  org_id: string;
  user_id: string;
  role_slug: string;
  status: string;
  created_at: string;
  updated_at: string;
  email: string;
  full_name?: string | null;
}

export interface UserInvitation {
  invitation_id: string;
  org_id?: string;
  tenant_id?: string;
  email: string;
  scope: 'organization' | 'platform';
  role_slug: string;
  status: string;
  created_at: string;
  updated_at: string;
  expires_at?: string | null;
  accepted_at?: string | null;
  revoked_at?: string | null;
}

export interface PlatformUser {
  user_id: string;
  email: string;
  full_name?: string | null;
  role_slug: string;
  status: string;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserManagementService {
  constructor(private api: ApiService) {}

  listOrgRoles(orgId: string): Observable<OrgRole[]> {
    return this.api.get<OrgRole[]>(`/api/v1/orgs/${orgId}/roles`);
  }

  listOrgMembers(orgId: string): Observable<OrgMember[]> {
    return this.api.get<OrgMember[]>(`/api/v1/orgs/${orgId}/members`);
  }

  updateOrgMember(orgId: string, userId: string, payload: { role_slug: string; status?: string }): Observable<OrgMember> {
    return this.api.put<OrgMember>(`/api/v1/orgs/${orgId}/members/${userId}`, payload);
  }

  listOrgInvitations(orgId: string): Observable<UserInvitation[]> {
    return this.api.get<UserInvitation[]>(`/api/v1/orgs/${orgId}/invitations`);
  }

  createOrgInvitation(orgId: string, payload: { email: string; role_slug: string }): Observable<UserInvitation> {
    return this.api.post<UserInvitation>(`/api/v1/orgs/${orgId}/invitations`, payload);
  }

  revokeOrgInvitation(orgId: string, invitationId: string): Observable<UserInvitation> {
    return this.api.delete<UserInvitation>(`/api/v1/orgs/${orgId}/invitations/${invitationId}`);
  }

  listPlatformUsers(): Observable<PlatformUser[]> {
    return this.api.get<PlatformUser[]>(`/api/v1/admin/platform-users`);
  }

  listPlatformInvitations(): Observable<UserInvitation[]> {
    return this.api.get<UserInvitation[]>(`/api/v1/admin/platform-invitations`);
  }

  createPlatformInvitation(email: string): Observable<UserInvitation> {
    return this.api.post<UserInvitation>(`/api/v1/admin/platform-invitations`, { email });
  }

  revokePlatformInvitation(invitationId: string): Observable<UserInvitation> {
    return this.api.delete<UserInvitation>(`/api/v1/admin/platform-invitations/${invitationId}`);
  }
}
