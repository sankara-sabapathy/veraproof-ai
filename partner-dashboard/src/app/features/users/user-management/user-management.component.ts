import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ContentStateComponent } from '../../../shared/components/content-state/content-state.component';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { UserManagementService, OrgMember, OrgRole, UserInvitation } from '../services/user-management.service';

interface RoleOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, CardModule, ButtonModule, InputTextModule, DropdownModule, TagModule, PageHeaderComponent, ContentStateComponent],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss']
})
export class UserManagementComponent implements OnInit {
  orgId = '';
  loading = true;
  inviteLoading = false;
  inviteEmail = '';
  inviteRole = 'org_viewer';
  roles: OrgRole[] = [];
  roleOptions: RoleOption[] = [];
  members: OrgMember[] = [];
  invitations: UserInvitation[] = [];

  constructor(
    private authService: AuthService,
    private userManagement: UserManagementService,
    private notification: NotificationService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (!user?.tenant_id || !this.authService.hasPermission('org.members.manage')) {
      void this.router.navigate(['/dashboard']);
      return;
    }
    this.orgId = user.tenant_id;
    this.loadAll();
  }

  get pageSubtitle(): string {
    return 'Manage tenant membership, roles, and invitation lifecycle using the same org-scoped access model as the rest of the dashboard.';
  }

  get activeMembersCount(): number {
    return this.members.filter((member) => member.status === 'active').length;
  }

  get adminCount(): number {
    return this.members.filter((member) => member.role_slug === 'org_admin').length;
  }

  get pendingInvitationCount(): number {
    return this.invitations.filter((invitation) => invitation.status === 'pending').length;
  }

  loadAll(): void {
    this.loading = true;
    this.userManagement.listOrgRoles(this.orgId).subscribe({
      next: (roles) => {
        this.roles = roles.filter((role) => !role.is_platform_role);
        this.roleOptions = this.roles.map((role) => ({
          label: role.description || role.role_slug,
          value: role.role_slug,
        }));

        if (!this.roleOptions.some((role) => role.value === this.inviteRole)) {
          this.inviteRole = this.roleOptions[0]?.value || 'org_viewer';
        }
      },
      error: () => this.notification.error('Failed to load organization roles'),
    });

    this.userManagement.listOrgMembers(this.orgId).subscribe({
      next: (members) => {
        this.members = members;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.notification.error(error.message || 'Failed to load organization members');
      }
    });

    this.userManagement.listOrgInvitations(this.orgId).subscribe({
      next: (invitations) => {
        this.invitations = invitations;
      },
      error: () => this.notification.error('Failed to load organization invitations'),
    });
  }

  inviteUser(): void {
    if (!this.inviteEmail.trim()) {
      this.notification.warning('Enter an email to invite');
      return;
    }
    this.inviteLoading = true;
    this.userManagement.createOrgInvitation(this.orgId, {
      email: this.inviteEmail.trim().toLowerCase(),
      role_slug: this.inviteRole,
    }).subscribe({
      next: () => {
        this.inviteLoading = false;
        this.inviteEmail = '';
        this.inviteRole = this.roleOptions[0]?.value || 'org_viewer';
        this.notification.success('Invitation created');
        this.loadAll();
      },
      error: (error) => {
        this.inviteLoading = false;
        this.notification.error(error.message || 'Failed to create invitation');
      }
    });
  }

  changeRole(member: OrgMember, roleSlug: string): void {
    this.userManagement.updateOrgMember(this.orgId, member.user_id, {
      role_slug: roleSlug,
      status: member.status,
    }).subscribe({
      next: () => {
        this.notification.success('Member updated');
        this.loadAll();
      },
      error: (error) => this.notification.error(error.message || 'Failed to update member'),
    });
  }

  toggleMemberStatus(member: OrgMember): void {
    const nextStatus = member.status === 'active' ? 'inactive' : 'active';
    this.userManagement.updateOrgMember(this.orgId, member.user_id, {
      role_slug: member.role_slug,
      status: nextStatus,
    }).subscribe({
      next: () => {
        this.notification.success(`Member ${nextStatus === 'active' ? 'activated' : 'deactivated'}`);
        this.loadAll();
      },
      error: (error) => this.notification.error(error.message || 'Failed to update member status'),
    });
  }

  revokeInvitation(invitation: UserInvitation): void {
    this.userManagement.revokeOrgInvitation(this.orgId, invitation.invitation_id).subscribe({
      next: () => {
        this.notification.success('Invitation revoked');
        this.loadAll();
      },
      error: (error) => this.notification.error(error.message || 'Failed to revoke invitation'),
    });
  }

  roleLabel(roleSlug: string): string {
    return this.roles.find((role) => role.role_slug === roleSlug)?.description || roleSlug;
  }

  roleSeverity(roleSlug: string): 'info' | 'success' | 'secondary' {
    if (roleSlug === 'org_admin') {
      return 'info';
    }
    if (roleSlug === 'org_analyst') {
      return 'success';
    }
    return 'secondary';
  }

  memberStatusLabel(status: string): string {
    if (status === 'active') {
      return 'Active';
    }
    if (status === 'inactive') {
      return 'Inactive';
    }
    return status;
  }

  memberStatusSeverity(status: string): 'success' | 'warning' | 'secondary' {
    if (status === 'active') {
      return 'success';
    }
    if (status === 'inactive') {
      return 'warning';
    }
    return 'secondary';
  }

  invitationStatusLabel(status: string): string {
    if (status === 'pending') {
      return 'Pending';
    }
    if (status === 'revoked') {
      return 'Revoked';
    }
    if (status === 'accepted') {
      return 'Accepted';
    }
    return status;
  }

  invitationStatusSeverity(status: string): 'warning' | 'secondary' | 'success' {
    if (status === 'pending') {
      return 'warning';
    }
    if (status === 'accepted') {
      return 'success';
    }
    return 'secondary';
  }
}
