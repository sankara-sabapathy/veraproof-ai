import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSortModule } from '@angular/material/sort';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { ApiKeysListComponent } from './api-keys-list.component';
import { ApiKeysService } from '../services/api-keys.service';
import { ApiKeysStateService } from '../services/api-keys-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ApiKey } from '../../../core/models/interfaces';

describe('ApiKeysListComponent', () => {
  let component: ApiKeysListComponent;
  let fixture: ComponentFixture<ApiKeysListComponent>;
  let mockApiKeysService: jasmine.SpyObj<ApiKeysService>;
  let mockStateService: jasmine.SpyObj<ApiKeysStateService>;
  let mockNotificationService: jasmine.SpyObj<NotificationService>;
  let mockDialog: jasmine.SpyObj<MatDialog>;

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
    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      declarations: [ApiKeysListComponent],
      imports: [
        BrowserAnimationsModule,
        MatDialogModule,
        MatTableModule,
        MatChipsModule,
        MatIconModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatMenuModule,
        MatProgressSpinnerModule,
        MatCardModule,
        MatTooltipModule,
        MatSortModule,
        FormsModule
      ],
      providers: [
        { provide: ApiKeysService, useValue: mockApiKeysService },
        { provide: ApiKeysStateService, useValue: mockStateService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: MatDialog, useValue: mockDialog }
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

  it('should populate data source with keys from state', () => {
    fixture.detectChanges();
    expect(component.dataSource.data).toEqual(mockApiKeys);
  });

  it('should filter keys based on search term', () => {
    fixture.detectChanges();
    component.onSearch('sandbox');
    expect(component.dataSource.filter).toBe('sandbox');
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
    expect(mockDialog.open).not.toHaveBeenCalled();
  });

  it('should open confirmation dialog when revoking active key', () => {
    const activeKey = mockApiKeys[0];
    const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
    dialogRefSpy.afterClosed.and.returnValue(of(false));
    mockDialog.open.and.returnValue(dialogRefSpy);

    component.onRevokeKey(activeKey);

    expect(mockDialog.open).toHaveBeenCalled();
    const dialogConfig = mockDialog.open.calls.mostRecent().args[1];
    expect((dialogConfig?.data as any).title).toBe('Revoke API Key');
    expect((dialogConfig?.data as any).requireConfirmation).toBe(true);
  });

  it('should revoke key when confirmation dialog is confirmed', () => {
    const activeKey = mockApiKeys[0];
    const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
    dialogRefSpy.afterClosed.and.returnValue(of(true));
    mockDialog.open.and.returnValue(dialogRefSpy);
    mockApiKeysService.revokeKey.and.returnValue(of(void 0));

    component.onRevokeKey(activeKey);

    expect(mockApiKeysService.revokeKey).toHaveBeenCalledWith(activeKey.key_id);
    expect(mockStateService.updateKey).toHaveBeenCalled();
    expect(mockNotificationService.success).toHaveBeenCalledWith('API key revoked successfully');
  });

  it('should handle revoke key error', () => {
    const activeKey = mockApiKeys[0];
    const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
    dialogRefSpy.afterClosed.and.returnValue(of(true));
    mockDialog.open.and.returnValue(dialogRefSpy);
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

  it('should setup columns with correct templates', () => {
    fixture.detectChanges();
    expect(component.columns.length).toBe(6);
    expect(component.columns[0].key).toBe('environment');
    expect(component.columns[1].key).toBe('api_key');
    expect(component.columns[5].key).toBe('actions');
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
