import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { ProgressBarModule } from 'primeng/progressbar';
import { DividerModule } from 'primeng/divider';
import { BillingService } from '../services/billing.service';
import { BillingStateService } from '../services/billing-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

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
    LoadingSpinnerComponent
  ],
  templateUrl: './subscription-overview.component.html',
  styleUrls: ['./subscription-overview.component.scss']
})
export class SubscriptionOverviewComponent implements OnInit {
  subscription$ = this.billingState.subscription$;
  loading$ = this.billingState.loading$;

  constructor(
    private billingService: BillingService,
    private billingState: BillingStateService,
    private notification: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadSubscription();
  }

  loadSubscription(): void {
    this.billingState.setLoading(true);
    this.billingService.getSubscription().subscribe({
      next: (subscription) => this.billingState.setSubscription(subscription),
      error: (error) => {
        this.billingState.setError(error.message);
        this.notification.error('Failed to load subscription details');
      }
    });
  }

  getUsageColor(percentage: number): string {
    if (percentage >= 100) return 'danger';
    if (percentage >= 80) return 'warning';
    return 'success';
  }
}
