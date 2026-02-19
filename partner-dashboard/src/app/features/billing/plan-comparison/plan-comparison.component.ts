import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { BillingService, SubscriptionPlan } from '../services/billing.service';
import { BillingStateService } from '../services/billing-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmationDialogComponent } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-plan-comparison',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatCardModule,
    MatButtonModule,
    MatChipsModule,
    MatDividerModule,
    MatListModule,
    MatIconModule,
    LoadingSpinnerComponent
  ],
  templateUrl: './plan-comparison.component.html',
  styleUrls: ['./plan-comparison.component.scss']
})
export class PlanComparisonComponent implements OnInit {
  plans$ = this.billingState.plans$;
  subscription$ = this.billingState.subscription$;
  loading$ = this.billingState.loading$;

  constructor(
    private billingService: BillingService,
    private billingState: BillingStateService,
    private notification: NotificationService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadPlans();
  }

  loadPlans(): void {
    this.billingState.setLoading(true);
    this.billingService.getPlans().subscribe({
      next: (plans) => this.billingState.setPlans(plans),
      error: (error) => {
        this.billingState.setError(error.message);
        this.notification.error('Failed to load subscription plans');
      }
    });
  }

  upgradePlan(plan: SubscriptionPlan): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Upgrade Subscription',
        message: `Are you sure you want to upgrade to ${plan.name}? Your new quota will be ${plan.monthly_quota} verifications per month at $${plan.price_per_month}/month.`,
        confirmText: 'Upgrade',
        confirmColor: 'primary'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.billingState.setLoading(true);
        this.billingService.upgradeSubscription(plan.plan_id).subscribe({
          next: (response) => {
            this.notification.success(`Successfully upgraded to ${plan.name}`);
            this.loadPlans();
            this.billingService.getSubscription().subscribe(sub => 
              this.billingState.setSubscription(sub)
            );
          },
          error: (error) => {
            this.billingState.setError(error.message);
            this.notification.error('Failed to upgrade subscription');
          }
        });
      }
    });
  }
}
