import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TableModule } from 'primeng/table';
import { ChipModule } from 'primeng/chip';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MenuModule } from 'primeng/menu';
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { ApiKeysListComponent } from './api-keys-list.component';
import { ApiKeysService } from '../services/api-keys.service';
import { ApiKeysStateService } from '../services/api-keys-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmationDialogService } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { ApiKey } from '../../../core/models/interfaces';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

describe('ApiKeysListComponent', () => {
  let component: ApiKeysListComponent;
  let fixture: ComponentFixture<ApiKeysListComponent>;
  let mockApiKeysService: jasmine.SpyObj<ApiKeysService>;
  let mockStateService: jasmine.SpyObj<ApiKeysStateService>;
  let mockNotificationService: jasmine.SpyObj<NotificationService>;
  let mockConfirmationDialog: jasmine.SpyObj<ConfirmationDialogService>;

  const mockApiKeys: ApiKey[] = [
    {
      key_id: '1',
      api_key: 'sk_test_1234567890abcdef',
      environment: 'sandbox',
      created_at: '2024-01-01T00:00:00Z',
      last_used_at: '2024-01-15T10:30:00Z',
      total_calls: 150,
      revoked_at: null
    },
    {
      key_id: '2',
      api_key: 'sk_prod_abcdef1234567890',
      environment: 'production',
      created_at: '2024-01-05T00:00:00Z',
      last_used_at: null,
      total_calls: 0,
      revoked_at: null
    },
    {
      key_id: '3',
      api_key: 'sk_test_revoked123456',
      environment: 'sandbox',
      created_at: '2023-12-01T00:00:00Z',
      last_used_at: '2023-12-31T23:59:59Z',
      total_calls: 500,
      revoked_at: '2024-01-10T00:00:00Z'
    }
  ];

  beforeEach(async () => {
    mockApiKeysService = jasmine.createSpyObj('ApiKeysService', ['listKeys', 'revokeKey']);
    mockStateService = jasmine.createSpyObj('ApiKeysStateService', [
      'loadKeys',
      'setLoading',
      'updateKey',
      'setError'
    ], {
      keys$: of(mockApiKeys),
      loading$: of(false)
    });
    mockNotificationService = jasmine.createSpyObj('NotificationService', [
      'success',
      'error',
      'warning'
    ]);
    mockConfirmationDialog = jasmine.createSpyObj('ConfirmationDialogService', ['confirm']);

    await TestBed.configureTestingModule({
      imports: [
        ApiKeysListComponent,
        BrowserAnimationsModule,
        TableModule,
        ChipModule,
        ButtonModule,
        InputTextModule,
        MenuModule,
        CardModule,
        TooltipModule,
        FormsModule,
        LoadingSpinnerComponent
      ],
      providers: [
        DialogService,
        { provide: ApiKeysService, useValue: mockApiKeysService },
        { provide: ApiKeysStateService, useValue: mockStateService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: ConfirmationDialogService, useValue: mockConfirmationDialog }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ApiKeysListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load API keys on init', () => {
    fixture.detectChanges();
    expect(mockStateService.loadKeys).toHaveBeenCalled();
  });

  it('should populate apiKeys array with keys from state', () => {
    fixture.detectChanges();
    expect(component.apiKeys).toEqual(mockApiKeys);
    expect(component.filteredKeys).toEqual(mockApiKeys);
  });

  it('should filter keys based on search term', () => {
    fixture.detectChanges();
    component.onSearch('sandbox');
    expect(component.filteredKeys.length).toBe(2);
    expect(component.filteredKeys.every(k => k.environment === 'sandbox')).toBe(true);
  });

  it('should filter keys by api_key', () => {
    fixture.detectChanges();
    component.onSearch('prod');
    expect(component.filteredKeys.length).toBe(1);
    expect(component.filteredKeys[0].environment).toBe('production');
  });

  it('should show all keys when search term is empty', () => {
    fixture.detectChanges();
    component.onSearch('sandbox');
    expect(component.filteredKeys.length).toBe(2);
    component.onSearch('');
    expect(component.filteredKeys.length).toBe(3);
  });

  it('should mask API key showing only last 4 characters', () => {
    const maskedKey = component.getMaskedKey('sk_test_1234567890abcdef');
    expect(maskedKey).toBe('••••••••••••cdef');
  });

  it('should return full key if length is 4 or less', () => {
    const shortKey = component.getMaskedKey('test');
    expect(shortKey).toBe('test');
  });

  it('should format date correctly', () => {
    const formatted = component.formatDate('2024-01-15T10:30:00Z');
    expect(formatted).toContain('1/15/2024');
  });

  it('should return "Never" for null date', () => {
    const formatted = component.formatDate(null);
    expect(formatted).toBe('Never');
  });

  it('should identify revoked keys', () => {
    expect(component.isRevoked(mockApiKeys[0])).toBe(false);
    expect(component.isRevoked(mockApiKeys[2])).toBe(true);
  });

  it('should show warning when trying to revoke already revoked key', () => {
    const revokedKey = mockApiKeys[2];
    component.onRevokeKey(revokedKey);
    expect(mockNotificationService.warning).toHaveBeenCalledWith('This key is already revoked');
    expect(mockConfirmationDialog.confirm).not.toHaveBeenCalled();
  });

  it('should open confirmation dialog when revoking active key', () => {
    const activeKey = mockApiKeys[0];
    mockConfirmationDialog.confirm.and.returnValue(of(false));

    component.onRevokeKey(activeKey);

    expect(mockConfirmationDialog.confirm).toHaveBeenCalled();
    const dialogData = mockConfirmationDialog.confirm.calls.mostRecent().args[0];
    expect(dialogData.title).toBe('Revoke API Key');
    expect(dialogData.requireConfirmation).toBe(true);
  });

  it('should revoke key when confirmation dialog is confirmed', () => {
    const activeKey = mockApiKeys[0];
    mockConfirmationDialog.confirm.and.returnValue(of(true));
    mockApiKeysService.revokeKey.and.returnValue(of(void 0));

    component.onRevokeKey(activeKey);

    expect(mockApiKeysService.revokeKey).toHaveBeenCalledWith(activeKey.key_id);
    expect(mockStateService.updateKey).toHaveBeenCalled();
    expect(mockNotificationService.success).toHaveBeenCalledWith('API key revoked successfully');
  });

  it('should handle revoke key error', () => {
    const activeKey = mockApiKeys[0];
    mockConfirmationDialog.confirm.and.returnValue(of(true));
    mockApiKeysService.revokeKey.and.returnValue(throwError(() => new Error('Network error')));

    component.onRevokeKey(activeKey);

    expect(mockStateService.setError).toHaveBeenCalled();
    expect(mockNotificationService.error).toHaveBeenCalledWith('Failed to revoke API key');
  });

  it('should copy key to clipboard successfully', async () => {
    spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());
    
    await component.copyToClipboard('test_key');
    
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test_key');
    expect(mockNotificationService.success).toHaveBeenCalledWith('Copied to clipboard');
  });

  it('should handle clipboard copy failure', async () => {
    spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.reject(new Error('Clipboard error')));
    
    await component.copyToClipboard('test_key');
    
    // Wait for promise to reject
    await new Promise(resolve => setTimeout(resolve, 10));
    
    expect(mockNotificationService.error).toHaveBeenCalledWith('Failed to copy to clipboard');
  });

  it('should generate menu items for a key', () => {
    const activeKey = mockApiKeys[0];
    const menuItems = component.getMenuItems(activeKey);
    
    expect(menuItems.length).toBe(1);
    expect(menuItems[0].label).toBe('Revoke Key');
    expect(menuItems[0].icon).toBe('pi pi-ban');
    expect(menuItems[0].styleClass).toBe('menu-item-danger');
  });

  it('should open create dialog when onCreateKey is called', () => {
    fixture.detectChanges();
    
    const dialogRefSpy = jasmine.createSpyObj<DynamicDialogRef>('DynamicDialogRef', ['close']);
    dialogRefSpy.onClose = of(undefined);
    
    // Spy on the component's private dialogService
    spyOn(component['dialogService'], 'open').and.returnValue(dialogRefSpy);

    component.onCreateKey();

    expect(component['dialogService'].open).toHaveBeenCalled();
    const callArgs = (component['dialogService'].open as jasmine.Spy).calls.mostRecent().args;
    expect(callArgs[1]?.header).toBe('Generate API Key');
    expect(callArgs[1]?.width).toBe('600px');
  });

  it('should unsubscribe on destroy', () => {
    fixture.detectChanges();
    spyOn(component['destroy$'], 'next');
    spyOn(component['destroy$'], 'complete');
    
    component.ngOnDestroy();
    
    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });
});
