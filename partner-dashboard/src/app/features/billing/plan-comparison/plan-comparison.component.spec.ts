import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { PlanComparisonComponent } from './plan-comparison.component';
import { BillingService, SubscriptionPlan, Subscription } from '../services/billing.service';
import { BillingStateService } from '../services/billing-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmationDialogService } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';

describe('PlanComparisonComponent', () => {
  let component: PlanComparisonComponent;
  let fixture: ComponentFixture<PlanComparisonComponent>;
  let mockBillingService: jasmine.SpyObj<BillingService>;
  let mockStateService: jasmine.SpyObj<BillingStateService>;
  let mockNotificationService: jasmine.SpyObj<NotificationService>;
  let mockConfirmationDialog: jasmine.SpyObj<ConfirmationDialogService>;

  const mockPlans: SubscriptionPlan[] = [
    {
      plan_id: 'sandbox',
      name: 'Sandbox',
      tier: 'Sandbox',
      monthly_quota: 100,
      price_per_month: 0,
      price_per_verification: 0,
      features: ['100 verifications/month', 'Test environment', 'Basic support']
    },
    {
      plan_id: 'starter',
      name: 'Starter',
      tier: 'Starter',
      monthly_quota: 1000,
      price_per_month: 49,
      price_per_verification: 0.049,
      features: ['1,000 verifications/month', 'Production environment', 'Email support'],
      recommended: true
    },
    {
      plan_id: 'professional',
      name: 'Professional',
      tier: 'Professional',
      monthly_quota: 10000,
      price_per_month: 299,
      price_per_verification: 0.0299,
      features: ['10,000 verifications/month', 'Production environment', 'Priority support', 'Custom branding']
    }
  ];

  const mockSubscription: Subscription = {
    tenant_id: 'tenant-123',
    subscription_tier: 'Sandbox',
    monthly_quota: 100,
    current_usage: 50,
    remaining_quota: 50,
    usage_percentage: 50,
    billing_cycle_start: '2024-01-01T00:00:00Z',
    billing_cycle_end: '2024-01-31T23:59:59Z',
    next_renewal_date: '2024-02-01T00:00:00Z',
    estimated_cost: 0
  };

  beforeEach(async () => {
    mockBillingService = jasmine.createSpyObj('BillingService', [
      'getPlans',
      'upgradeSubscription',
      'getSubscription'
    ]);
    mockStateService = jasmine.createSpyObj('BillingStateService', [
      'setLoading',
      'setPlans',
      'setSubscription',
      'setError'
    ], {
      plans$: of(mockPlans),
      subscription$: of(mockSubscription),
      loading$: of(false)
    });
    mockNotificationService = jasmine.createSpyObj('NotificationService', [
      'success',
      'error'
    ]);
    mockConfirmationDialog = jasmine.createSpyObj('ConfirmationDialogService', ['confirm']);

    await TestBed.configureTestingModule({
      imports: [
        PlanComparisonComponent,
        BrowserAnimationsModule
      ],
      providers: [
        { provide: BillingService, useValue: mockBillingService },
        { provide: BillingStateService, useValue: mockStateService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: ConfirmationDialogService, useValue: mockConfirmationDialog }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PlanComparisonComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load plans on init', () => {
    mockBillingService.getPlans.and.returnValue(of(mockPlans));
    
    fixture.detectChanges();
    
    expect(mockStateService.setLoading).toHaveBeenCalledWith(true);
    expect(mockBillingService.getPlans).toHaveBeenCalled();
  });

  it('should set plans in state on successful load', () => {
    mockBillingService.getPlans.and.returnValue(of(mockPlans));
    
    component.loadPlans();
    
    expect(mockStateService.setPlans).toHaveBeenCalledWith(mockPlans);
  });

  it('should handle error when loading plans fails', () => {
    const error = new Error('Network error');
    mockBillingService.getPlans.and.returnValue(throwError(() => error));
    
    component.loadPlans();
    
    expect(mockStateService.setError).toHaveBeenCalledWith('Network error');
    expect(mockNotificationService.error).toHaveBeenCalledWith('Failed to load subscription plans');
  });

  it('should open confirmation dialog when upgrading plan', () => {
    const plan = mockPlans[1];
    mockConfirmationDialog.confirm.and.returnValue(of(false));
    
    component.upgradePlan(plan);
    
    expect(mockConfirmationDialog.confirm).toHaveBeenCalled();
    const dialogData = mockConfirmationDialog.confirm.calls.mostRecent().args[0];
    expect(dialogData.title).toBe('Upgrade Subscription');
    expect(dialogData.message).toContain(plan.name);
    expect(dialogData.message).toContain(plan.monthly_quota.toString());
    expect(dialogData.confirmText).toBe('Upgrade');
    expect(dialogData.cancelText).toBe('Cancel');
  });

  it('should not upgrade plan when confirmation is cancelled', () => {
    const plan = mockPlans[1];
    mockConfirmationDialog.confirm.and.returnValue(of(false));
    
    component.upgradePlan(plan);
    
    expect(mockBillingService.upgradeSubscription).not.toHaveBeenCalled();
  });

  it('should upgrade plan when confirmation is accepted', () => {
    const plan = mockPlans[1];
    const upgradeResponse = {
      order_id: 'order-123',
      plan: plan.name,
      effective_date: '2024-02-01T00:00:00Z',
      new_quota: plan.monthly_quota
    };
    
    mockConfirmationDialog.confirm.and.returnValue(of(true));
    mockBillingService.upgradeSubscription.and.returnValue(of(upgradeResponse));
    mockBillingService.getPlans.and.returnValue(of(mockPlans));
    mockBillingService.getSubscription.and.returnValue(of(mockSubscription));
    
    component.upgradePlan(plan);
    
    expect(mockStateService.setLoading).toHaveBeenCalledWith(true);
    expect(mockBillingService.upgradeSubscription).toHaveBeenCalledWith(plan.plan_id);
    expect(mockNotificationService.success).toHaveBeenCalledWith(`Successfully upgraded to ${plan.name}`);
  });

  it('should reload plans and subscription after successful upgrade', () => {
    const plan = mockPlans[1];
    const upgradeResponse = {
      order_id: 'order-123',
      plan: plan.name,
      effective_date: '2024-02-01T00:00:00Z',
      new_quota: plan.monthly_quota
    };
    
    mockConfirmationDialog.confirm.and.returnValue(of(true));
    mockBillingService.upgradeSubscription.and.returnValue(of(upgradeResponse));
    mockBillingService.getPlans.and.returnValue(of(mockPlans));
    mockBillingService.getSubscription.and.returnValue(of(mockSubscription));
    
    component.upgradePlan(plan);
    
    expect(mockBillingService.getPlans).toHaveBeenCalled();
    expect(mockBillingService.getSubscription).toHaveBeenCalled();
    expect(mockStateService.setSubscription).toHaveBeenCalledWith(mockSubscription);
  });

  it('should handle error when upgrade fails', () => {
    const plan = mockPlans[1];
    const error = new Error('Upgrade failed');
    
    mockConfirmationDialog.confirm.and.returnValue(of(true));
    mockBillingService.upgradeSubscription.and.returnValue(throwError(() => error));
    
    component.upgradePlan(plan);
    
    expect(mockStateService.setError).toHaveBeenCalledWith('Upgrade failed');
    expect(mockNotificationService.error).toHaveBeenCalledWith('Failed to upgrade subscription');
  });
});
