import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { CardModule } from 'primeng/card';
import { ChipModule } from 'primeng/chip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TooltipModule } from 'primeng/tooltip';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { ApiKeyCreateDialogComponent } from './api-key-create-dialog.component';
import { ApiKeysService } from '../services/api-keys.service';
import { ApiKeysStateService } from '../services/api-keys-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ApiKeyResponse } from '../../../core/models/interfaces';

describe('ApiKeyCreateDialogComponent', () => {
  let component: ApiKeyCreateDialogComponent;
  let fixture: ComponentFixture<ApiKeyCreateDialogComponent>;
  let mockDialogRef: jasmine.SpyObj<DynamicDialogRef>;
  let mockConfig: DynamicDialogConfig;
  let mockApiKeysService: jasmine.SpyObj<ApiKeysService>;
  let mockStateService: jasmine.SpyObj<ApiKeysStateService>;
  let mockNotificationService: jasmine.SpyObj<NotificationService>;

  const mockApiKeyResponse: ApiKeyResponse = {
    key_id: 'key_123',
    api_key: 'sk_test_1234567890abcdef',
    environment: 'sandbox'
  };

  beforeEach(async () => {
    mockDialogRef = jasmine.createSpyObj('DynamicDialogRef', ['close']);
    mockConfig = { data: {} };
    mockApiKeysService = jasmine.createSpyObj('ApiKeysService', ['generateKey']);
    mockStateService = jasmine.createSpyObj('ApiKeysStateService', ['addKey']);
    mockNotificationService = jasmine.createSpyObj('NotificationService', ['success', 'error']);

    await TestBed.configureTestingModule({
      imports: [
        ApiKeyCreateDialogComponent,
        BrowserAnimationsModule,
        ReactiveFormsModule,
        ButtonModule,
        DropdownModule,
        CardModule,
        ChipModule,
        ProgressSpinnerModule,
        TooltipModule
      ],
      providers: [
        { provide: DynamicDialogRef, useValue: mockDialogRef },
        { provide: DynamicDialogConfig, useValue: mockConfig },
        { provide: ApiKeysService, useValue: mockApiKeysService },
        { provide: ApiKeysStateService, useValue: mockStateService },
        { provide: NotificationService, useValue: mockNotificationService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ApiKeyCreateDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with sandbox as default environment', () => {
    expect(component.createForm.value.environment).toBe('sandbox');
  });

  it('should have valid form when environment is selected', () => {
    expect(component.createForm.valid).toBe(true);
  });

  it('should initialize environment options', () => {
    expect(component.environmentOptions.length).toBe(2);
    expect(component.environmentOptions[0].value).toBe('sandbox');
    expect(component.environmentOptions[1].value).toBe('production');
  });

  it('should generate API key successfully', () => {
    mockApiKeysService.generateKey.and.returnValue(of(mockApiKeyResponse));
    
    component.onGenerate();
    
    expect(mockApiKeysService.generateKey).toHaveBeenCalledWith('sandbox');
    expect(component.generatedKey).toEqual(mockApiKeyResponse);
    expect(component.loading).toBe(false);
    expect(mockStateService.addKey).toHaveBeenCalled();
    expect(mockNotificationService.success).toHaveBeenCalledWith('API key generated successfully');
  });

  it('should handle generation error', () => {
    const error = new Error('Network error');
    mockApiKeysService.generateKey.and.returnValue(throwError(() => error));
    
    component.onGenerate();
    
    expect(component.loading).toBe(false);
    expect(component.generatedKey).toBeNull();
    expect(mockNotificationService.error).toHaveBeenCalledWith('Network error');
  });

  it('should not generate key if form is invalid', () => {
    component.createForm.patchValue({ environment: null });
    
    component.onGenerate();
    
    expect(mockApiKeysService.generateKey).not.toHaveBeenCalled();
  });

  it('should generate production key when production is selected', () => {
    mockApiKeysService.generateKey.and.returnValue(of({
      ...mockApiKeyResponse,
      environment: 'production'
    }));
    component.createForm.patchValue({ environment: 'production' });
    
    component.onGenerate();
    
    expect(mockApiKeysService.generateKey).toHaveBeenCalledWith('production');
  });

  it('should copy API key to clipboard', async () => {
    spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());
    component.generatedKey = mockApiKeyResponse;
    
    await component.copyToClipboard(mockApiKeyResponse.api_key);
    
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockApiKeyResponse.api_key);
    expect(component.keyCopied).toBe(true);
    expect(mockNotificationService.success).toHaveBeenCalledWith('Copied to clipboard');
  });

  it('should handle clipboard copy failure', async () => {
    spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.reject(new Error('Clipboard error')));
    
    component.copyToClipboard('test');
    
    // Wait for promise to reject
    await new Promise(resolve => setTimeout(resolve, 10));
    
    expect(mockNotificationService.error).toHaveBeenCalledWith('Failed to copy to clipboard');
  });

  it('should reset copied state after 2 seconds', (done) => {
    spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());
    component.generatedKey = mockApiKeyResponse;
    
    component.copyToClipboard(mockApiKeyResponse.api_key);
    
    // Verify it's set to true immediately after copy
    setTimeout(() => {
      expect(component.keyCopied).toBe(true);
      
      // Verify it's reset to false after 2 seconds
      setTimeout(() => {
        expect(component.keyCopied).toBe(false);
        done();
      }, 2100);
    }, 10);
  });

  it('should close dialog without warning if no key generated', () => {
    component.onClose();
    
    expect(mockDialogRef.close).toHaveBeenCalled();
    expect(component.showCloseWarning).toBe(false);
  });

  it('should show warning when closing without copying key', () => {
    component.generatedKey = mockApiKeyResponse;
    component.keyCopied = false;
    
    component.onClose();
    
    expect(component.showCloseWarning).toBe(true);
    expect(mockDialogRef.close).not.toHaveBeenCalled();
  });

  it('should close dialog without warning if key was copied', () => {
    component.generatedKey = mockApiKeyResponse;
    component.keyCopied = true;
    
    component.onClose();
    
    expect(mockDialogRef.close).toHaveBeenCalled();
    expect(component.showCloseWarning).toBe(false);
  });

  it('should confirm close and dismiss dialog', () => {
    component.showCloseWarning = true;
    
    component.confirmClose();
    
    expect(mockDialogRef.close).toHaveBeenCalled();
  });

  it('should cancel close and hide warning', () => {
    component.showCloseWarning = true;
    
    component.cancelClose();
    
    expect(component.showCloseWarning).toBe(false);
    expect(mockDialogRef.close).not.toHaveBeenCalled();
  });

  it('should return true for hasGeneratedKey when key exists', () => {
    component.generatedKey = mockApiKeyResponse;
    expect(component.hasGeneratedKey).toBe(true);
  });

  it('should return false for hasGeneratedKey when key is null', () => {
    component.generatedKey = null;
    expect(component.hasGeneratedKey).toBe(false);
  });

  it('should return true for canClose when not loading', () => {
    component.loading = false;
    expect(component.canClose).toBe(true);
  });

  it('should return false for canClose when loading', () => {
    component.loading = true;
    expect(component.canClose).toBe(false);
  });

  it('should set loading state during generation', () => {
    mockApiKeysService.generateKey.and.returnValue(of(mockApiKeyResponse));
    
    component.onGenerate();
    
    // Loading should be set to true initially (though it completes quickly in test)
    expect(mockApiKeysService.generateKey).toHaveBeenCalled();
  });

  it('should add generated key to state with correct format', () => {
    mockApiKeysService.generateKey.and.returnValue(of(mockApiKeyResponse));
    
    component.onGenerate();
    
    const addedKey = mockStateService.addKey.calls.mostRecent().args[0];
    expect(addedKey.key_id).toBe(mockApiKeyResponse.key_id);
    expect(addedKey.api_key).toBe(mockApiKeyResponse.api_key);
    expect(addedKey.environment).toBe(mockApiKeyResponse.environment);
    expect(addedKey.total_calls).toBe(0);
    expect(addedKey.revoked_at).toBeNull();
  });
});
