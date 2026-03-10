import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ContentStateComponent } from '../../../shared/components/content-state/content-state.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import {
  EncryptionService,
  OrgEncryptionSettings,
  TenantEncryptionMode,
  TenantRuntimeKeyStatus,
} from '../services/encryption.service';

@Component({
  selector: 'app-encryption-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    PageHeaderComponent,
    ContentStateComponent,
    LoadingSpinnerComponent,
  ],
  templateUrl: './encryption-settings.component.html',
  styleUrls: ['./encryption-settings.component.scss']
})
export class EncryptionSettingsComponent implements OnInit, OnDestroy {
  orgId = '';
  loading = true;
  savingMode = false;
  runtimeKeyBusy = false;
  runtimePassphrase = '';
  selectedMode: TenantEncryptionMode = 'managed';
  settings: OrgEncryptionSettings | null = null;
  runtimeKeyStatus: TenantRuntimeKeyStatus = {
    loaded: false,
    expires_at: null,
    seconds_remaining: 0,
  };

  private countdownHandle: ReturnType<typeof setInterval> | null = null;

  constructor(
    private authService: AuthService,
    private encryptionService: EncryptionService,
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
    this.loadPage();
    this.startCountdown();
  }

  ngOnDestroy(): void {
    if (this.countdownHandle) {
      clearInterval(this.countdownHandle);
      this.countdownHandle = null;
    }
  }

  get pageSubtitle(): string {
    return 'Choose between VeraProof-managed evidence encryption and tenant-managed zero-access mode. Zero-access mode requires the tenant passphrase to be explicitly loaded into short-lived runtime memory.';
  }

  get hasUnsavedModeChange(): boolean {
    return this.selectedMode !== (this.settings?.encryption_mode ?? 'managed');
  }

  get isTenantManagedActive(): boolean {
    return this.settings?.encryption_mode === 'tenant_managed';
  }

  get requiresPassphraseForModeChange(): boolean {
    return this.selectedMode === 'tenant_managed' && this.settings?.encryption_mode !== 'tenant_managed';
  }

  get canSaveMode(): boolean {
    if (!this.hasUnsavedModeChange) {
      return false;
    }

    if (this.requiresPassphraseForModeChange) {
      return Boolean(this.runtimePassphrase.trim());
    }

    return true;
  }


  get runtimeStatusLabel(): string {
    return this.runtimeKeyStatus.loaded ? 'Runtime key loaded' : 'Runtime key not loaded';
  }
  get modeSummary(): string {
    if (this.selectedMode === 'tenant_managed') {
      return 'Artifacts are wrapped with a tenant-supplied runtime passphrase. VeraProof cannot decrypt tenant-managed artifacts unless that passphrase is explicitly loaded into short-lived backend memory.';
    }
    return 'Artifacts are wrapped with VeraProof-managed application key material. Rotation of VeraProof-managed wrapping keys is platform-controlled, not tenant-controlled.';
  }

  get formattedSecondsRemaining(): string {
    const totalSeconds = Math.max(this.runtimeKeyStatus.seconds_remaining || 0, 0);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  }

  selectMode(mode: TenantEncryptionMode): void {
    this.selectedMode = mode;
  }

  loadPage(): void {
    this.loading = true;
    forkJoin({
      settings: this.encryptionService.getOrgEncryptionSettings(this.orgId),
      runtimeKeyStatus: this.encryptionService.getRuntimeKeyStatus(),
    }).subscribe({
      next: ({ settings, runtimeKeyStatus }) => {
        this.settings = settings;
        this.selectedMode = settings.encryption_mode;
        this.runtimeKeyStatus = runtimeKeyStatus;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.notification.error(error.message || 'Failed to load encryption settings');
      }
    });
  }

  saveMode(): void {
    if (!this.orgId || !this.hasUnsavedModeChange) {
      return;
    }

    const passphrase = this.runtimePassphrase.trim();
    if (this.requiresPassphraseForModeChange && !passphrase) {
      this.notification.warning('Enter the tenant-managed passphrase before enabling zero-access mode');
      return;
    }

    this.savingMode = true;
    this.encryptionService.updateOrgEncryptionSettings(this.orgId, {
      encryption_mode: this.selectedMode,
      rotate_key: false,
    }).subscribe({
      next: (settings) => {
        if (settings.encryption_mode === 'tenant_managed' && this.requiresPassphraseForModeChange) {
          this.encryptionService.loadRuntimeKey(passphrase).subscribe({
            next: (runtimeKeyStatus) => {
              this.settings = settings;
              this.selectedMode = settings.encryption_mode;
              this.runtimeKeyStatus = runtimeKeyStatus;
              this.runtimePassphrase = '';
              this.savingMode = false;
              this.notification.success('Tenant-managed zero-access mode enabled and runtime key loaded');
            },
            error: (error) => {
              this.settings = settings;
              this.selectedMode = settings.encryption_mode;
              this.savingMode = false;
              this.notification.error(error.message || 'Zero-access mode was enabled, but the runtime key could not be loaded');
              this.refreshRuntimeKeyStatus();
            }
          });
          return;
        }

        this.settings = settings;
        this.selectedMode = settings.encryption_mode;
        this.savingMode = false;
        this.notification.success('VeraProof-managed encryption enabled');
        this.refreshRuntimeKeyStatus();
      },
      error: (error) => {
        this.savingMode = false;
        this.notification.error(error.message || 'Failed to update encryption mode');
      }
    });
  }

  loadRuntimeKey(): void {
    if (!this.runtimePassphrase.trim()) {
      this.notification.warning('Enter the tenant-managed runtime passphrase');
      return;
    }

    this.runtimeKeyBusy = true;
    this.encryptionService.loadRuntimeKey(this.runtimePassphrase.trim()).subscribe({
      next: (status) => {
        this.runtimeKeyStatus = status;
        this.runtimePassphrase = '';
        this.runtimeKeyBusy = false;
        this.notification.success('Runtime key loaded into secure memory');
      },
      error: (error) => {
        this.runtimeKeyBusy = false;
        this.notification.error(error.message || 'Failed to load runtime key');
      }
    });
  }

  clearRuntimeKey(): void {
    this.runtimeKeyBusy = true;
    this.encryptionService.clearRuntimeKey().subscribe({
      next: () => {
        this.runtimeKeyStatus = { loaded: false, expires_at: null, seconds_remaining: 0 };
        this.runtimeKeyBusy = false;
        this.notification.success('Runtime key cleared from memory');
      },
      error: (error) => {
        this.runtimeKeyBusy = false;
        this.notification.error(error.message || 'Failed to clear runtime key');
      }
    });
  }

  refreshRuntimeKeyStatus(): void {
    this.encryptionService.getRuntimeKeyStatus().subscribe({
      next: (status) => {
        this.runtimeKeyStatus = status;
      },
      error: (error) => {
        this.notification.error(error.message || 'Failed to refresh runtime key status');
      }
    });
  }

  private startCountdown(): void {
    this.countdownHandle = setInterval(() => {
      if (!this.runtimeKeyStatus.loaded) {
        return;
      }

      const nextSeconds = Math.max((this.runtimeKeyStatus.seconds_remaining || 0) - 1, 0);
      this.runtimeKeyStatus = {
        ...this.runtimeKeyStatus,
        loaded: nextSeconds > 0,
        seconds_remaining: nextSeconds,
        expires_at: nextSeconds > 0 ? this.runtimeKeyStatus.expires_at : null,
      };
    }, 1000);
  }
}

