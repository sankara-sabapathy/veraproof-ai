import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { skip, takeUntil } from 'rxjs/operators';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { ProgressBarModule } from 'primeng/progressbar';
import { DividerModule } from 'primeng/divider';
import { BillingService, Subscription } from '../services/billing.service';
import { BillingStateService } from '../services/billing-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { TenantEnvironmentService } from '../../../core/services/tenant-environment.service';
import { TenantEnvironmentSummary } from '../../../core/models/interfaces';
import { ConfirmationDialogService } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ContentStateComponent } from '../../../shared/components/content-state/content-state.component';
import { getUsagePresentation } from '../../../shared/utils/ui-presenters';

@Component({
  selector: 'app-subscription-overview',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    CardModule,
    ButtonModule,
    ChipModule,
    ProgressBarModule,
    DividerModule,
    LoadingSpinnerComponent,
    PageHeaderComponent,
    ContentStateComponent
  ],
  templateUrl: './subscription-overview.component.html',
  styleUrls: ['./subscription-overview.component.scss']
})
export class SubscriptionOverviewComponent implements OnInit, OnDestroy {
  subscription: Subscription | null = null;
  loading = false;
  errorMessage: string | null = null;
  activeEnvironment: TenantEnvironmentSummary | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private billingService: BillingService,
    private billingState: BillingStateService,
    private notification: NotificationService,
    private tenantEnvironmentService: TenantEnvironmentService,
    private confirmationDialog: ConfirmationDialogService
  ) { }

  ngOnInit(): void {
    this.billingState.subscription$
      .pipe(takeUntil(this.destroy$))
      .subscribe(subscription => this.subscription = subscription);

    this.billingState.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => this.loading = loading);

    this.billingState.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => this.errorMessage = error);

    this.tenantEnvironmentService.activeEnvironment$
      .pipe(takeUntil(this.destroy$))
      .subscribe(environment => this.activeEnvironment = environment);

    this.tenantEnvironmentService.activeEnvironment$
      .pipe(skip(1), takeUntil(this.destroy$))
      .subscribe(() => this.loadSubscription());

    this.loadSubscription();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get pageSubtitle(): string {
    return `Review plan usage, quota, and billing cycle details for ${this.usage.environmentLabel.toLowerCase()}.`;
  }

  get usage() {
    return getUsagePresentation(this.subscription, this.activeEnvironment);
  }

  get billingCycleStart(): string | null {
    return this.usage.cycleStart || this.subscription?.billing_cycle_start || null;
  }

  get billingCycleEnd(): string | null {
    return this.usage.cycleEnd || this.subscription?.billing_cycle_end || null;
  }

  getUsageColor(percentage: number): 'success' | 'warning' | 'danger' {
    if (percentage >= 100) {
      return 'danger';
    }
    if (percentage >= 80) {
      return 'warning';
    }
    return 'success';
  }

  loadSubscription(): void {
    this.billingState.setLoading(true);
    this.billingState.clearError();

    this.billingService.getSubscription().subscribe({
      next: (subscription) => this.billingState.setSubscription(subscription),
      error: (error) => {
        this.billingState.setError(error.message || 'Failed to load subscription details');
        this.notification.error('Failed to load subscription details');
      }
    });
  }

  buyCredits(amount: number): void {
    this.confirmationDialog.confirm({
      title: 'Purchase Credits',
      message: `Are you sure you want to purchase a block of ${amount} verifications? This will increase your monthly quota seamlessly.`,
      confirmText: 'Purchase',
      cancelText: 'Cancel',
      confirmColor: 'primary'
    }).subscribe(confirmed => {
      if (!confirmed) {
        return;
      }

      this.billingState.setLoading(true);
      this.billingService.purchaseCredits(amount).subscribe({
        next: () => {
          this.notification.success(`Successfully added ${amount} credits to your quota.`);
          this.loadSubscription();
        },
        error: (error) => {
          this.billingState.setError(error.message || 'Failed to purchase credits');
          this.notification.error('Failed to purchase credits.');
          this.loadSubscription();
        }
      });
    });
  }
}

