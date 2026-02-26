import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { SubscriptionOverviewComponent } from './subscription-overview.component';
import { BillingService, Subscription } from '../services/billing.service';
import { BillingStateService } from '../services/billing-state.service';
import { NotificationService } from '../../../core/services/notification.service';

describe('SubscriptionOverviewComponent', () => {
  let component: SubscriptionOverviewComponent;
  let fixture: ComponentFixture<SubscriptionOverviewComponent>;
  let mockBillingService: jasmine.SpyObj<BillingService>;
  let mockStateService: jasmine.SpyObj<BillingStateService>;
  let mockNotificationService: jasmine.SpyObj<NotificationService>;

  const mockSubscription: Subscription = {
    tenant_id: 'tenant-123',
    subscription_tier: 'Professional',
    monthly_quota: 10000,
    current_usage: 7500,
    remaining_quota: 2500,
    usage_percentage: 75,
    billing_cycle_start: '2024-01-01T00:00:00Z',
    billing_cycle_end: '2024-01-31T23:59:59Z',
    next_renewal_date: '2024-02-01T00:00:00Z',
    estimated_cost: 299
  };

  beforeEach(async () => {
    mockBillingService = jasmine.createSpyObj('BillingService', ['getSubscription']);
    mockStateService = jasmine.createSpyObj('BillingStateService', [
      'setLoading',
      'setSubscription',
      'setError'
    ], {
      subscription$: of(mockSubscription),
      loading$: of(false)
    });
    mockNotificationService = jasmine.createSpyObj('NotificationService', [
      'error'
    ]);

    await TestBed.configureTestingModule({
      imports: [
        SubscriptionOverviewComponent,
        BrowserAnimationsModule
      ],
      providers: [
        { provide: BillingService, useValue: mockBillingService },
        { provide: BillingStateService, useValue: mockStateService },
        { provide: NotificationService, useValue: mockNotificationService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { params: {} },
            params: of({})
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SubscriptionOverviewComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load subscription on init', () => {
    mockBillingService.getSubscription.and.returnValue(of(mockSubscription));
    
    component.ngOnInit();
    
    expect(mockStateService.setLoading).toHaveBeenCalledWith(true);
    expect(mockBillingService.getSubscription).toHaveBeenCalled();
  });

  it('should set subscription in state on successful load', () => {
    mockBillingService.getSubscription.and.returnValue(of(mockSubscription));
    
    component.loadSubscription();
    
    expect(mockStateService.setSubscription).toHaveBeenCalledWith(mockSubscription);
  });

  it('should handle error when loading subscription fails', () => {
    const error = new Error('Network error');
    mockBillingService.getSubscription.and.returnValue(throwError(() => error));
    
    component.loadSubscription();
    
    expect(mockStateService.setError).toHaveBeenCalledWith('Network error');
    expect(mockNotificationService.error).toHaveBeenCalledWith('Failed to load subscription details');
  });

  it('should return success color for usage below 80%', () => {
    expect(component.getUsageColor(50)).toBe('success');
    expect(component.getUsageColor(79)).toBe('success');
  });

  it('should return warning color for usage between 80% and 99%', () => {
    expect(component.getUsageColor(80)).toBe('warning');
    expect(component.getUsageColor(85)).toBe('warning');
    expect(component.getUsageColor(99)).toBe('warning');
  });

  it('should return danger color for usage at or above 100%', () => {
    expect(component.getUsageColor(100)).toBe('danger');
    expect(component.getUsageColor(105)).toBe('danger');
  });
});
