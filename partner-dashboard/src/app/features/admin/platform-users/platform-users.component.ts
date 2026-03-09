import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { NotificationService } from '../../../core/services/notification.service';
import { UserManagementService, PlatformUser, UserInvitation } from '../../users/services/user-management.service';

@Component({
  selector: 'app-platform-users',
  standalone: true,
  imports: [CommonModule, FormsModule, CardModule, ButtonModule, InputTextModule, TagModule],
  templateUrl: './platform-users.component.html',
  styleUrls: ['./platform-users.component.scss']
})
export class PlatformUsersComponent implements OnInit {
  loading = true;
  inviteLoading = false;
  inviteEmail = '';
  platformUsers: PlatformUser[] = [];
  invitations: UserInvitation[] = [];

  constructor(
    private userManagement: UserManagementService,
    private notification: NotificationService,
  ) {}

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loading = true;
    this.userManagement.listPlatformUsers().subscribe({
      next: (users) => {
        this.platformUsers = users;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.notification.error(error.message || 'Failed to load platform users');
      }
    });

    this.userManagement.listPlatformInvitations().subscribe({
      next: (invitations) => {
        this.invitations = invitations;
      },
      error: () => this.notification.error('Failed to load platform invitations'),
    });
  }

  inviteUser(): void {
    if (!this.inviteEmail.trim()) {
      this.notification.warning('Enter an email to invite');
      return;
    }
    this.inviteLoading = true;
    this.userManagement.createPlatformInvitation(this.inviteEmail.trim().toLowerCase()).subscribe({
      next: () => {
        this.inviteLoading = false;
        this.inviteEmail = '';
        this.notification.success('Platform admin invitation created');
        this.loadAll();
      },
      error: (error) => {
        this.inviteLoading = false;
        this.notification.error(error.message || 'Failed to create platform invitation');
      }
    });
  }

  revokeInvitation(invitation: UserInvitation): void {
    this.userManagement.revokePlatformInvitation(invitation.invitation_id).subscribe({
      next: () => {
        this.notification.success('Platform invitation revoked');
        this.loadAll();
      },
      error: (error) => this.notification.error(error.message || 'Failed to revoke platform invitation'),
    });
  }
}
