import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DatePipe } from '@angular/common';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { ApiKeysListComponent } from './api-keys-list.component';
import { ApiKeysService } from '../services/api-keys.service';
import { ApiKeysStateService } from '../services/api-keys-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmationDialogService } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { ApiKey } from '../../../core/models/interfaces';
import { ConfirmationService } from 'primeng/api';

describe('ApiKeysListComponent', () => {
  let component: ApiKeysListComponent;
  let fixture: ComponentFixture<ApiKeysListComponent>;
  let mockApiKeysService: jasmine.SpyObj<ApiKeysService>;
  let mockStateService: jasmine.SpyObj<ApiKeysStateService>;
  let mockNotificationService: jasmine.SpyObj<NotificationService>;
  let mockConfirmationDialog: jasmine.SpyObj<ConfirmationDialogService>;
  let clipboardSpy: jasmine.Spy;

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
        FormsModule
      ],
      providers: [
        DialogService,
        DatePipe,
        { provide: ApiKeysService, useValue: mockApiKeysService },
        { provide: ApiKeysStateService, useValue: mockStateService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: ConfirmationDialogService, useValue: mockConfirmationDialog },
        ConfirmationService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ApiKeysListComponent);
    component = fixture.componentInstance;

    // Set up clipboard spy after component creation
    if (!(navigator as any).clipboard) {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: () => Promise.resolve() },
        configurable: true
      });
    }

    if (!(navigator.clipboard.writeText as any).and) {
      clipboardSpy = spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());
    } else {
      clipboardSpy = navigator.clipboard.writeText as jasmine.Spy;
      clipboardSpy.and.returnValue(Promise.resolve());
    }
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
  });

  it('should initialize AG Grid columns', () => {
    expect(component.columns.length).toBe(6);
    expect((component.columns[0] as any).field).toBe('environment');
    expect((component.columns[1] as any).field).toBe('api_key');
    expect((component.columns[2] as any).field).toBe('created_at');
    expect((component.columns[3] as any).field).toBe('usage_count');
    expect((component.columns[4] as any).field).toBe('last_used_at');
    expect((component.columns[5] as any).headerName).toBe('Actions');
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
    expect(formatted).toContain('1/15/24');
  });

  it('should return "Never" for null date', () => {
    const formatted = component.formatDate(null);
    expect(formatted).toBe('Never');
  });

  it('should identify revoked keys', () => {
    expect(component.isRevoked(mockApiKeys[0])).toBe(false);
    expect(component.isRevoked(mockApiKeys[2])).toBe(true);
  });

  it('should capitalize strings', () => {
    expect(component.capitalize('sandbox')).toBe('Sandbox');
    expect(component.capitalize('production')).toBe('Production');
    expect(component.capitalize('')).toBe('');
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
    clipboardSpy.and.returnValue(Promise.resolve());

    await component.copyToClipboard('test_key');

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test_key');
    expect(mockNotificationService.success).toHaveBeenCalledWith('Copied to clipboard');
  });

  it('should handle clipboard copy failure', async () => {
    clipboardSpy.and.returnValue(Promise.reject(new Error('Clipboard error')));

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
