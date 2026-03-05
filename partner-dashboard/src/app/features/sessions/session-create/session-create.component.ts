import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { SliderModule } from 'primeng/slider';
import { InputNumberModule } from 'primeng/inputnumber';
import { DropdownModule } from 'primeng/dropdown';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';
import { SessionsService } from '../services/sessions.service';
import { NotificationService } from '../../../core/services/notification.service';
import { CreateSessionResponse } from '../../../core/models/interfaces';
import { environment } from '../../../../environments/environment';

@Component({
    selector: 'app-session-create',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        ReactiveFormsModule,
        InputTextModule,
        ButtonModule,
        SliderModule,
        InputNumberModule,
        DropdownModule,
        DividerModule,
        TooltipModule
    ],
    templateUrl: './session-create.component.html',
    styleUrls: ['./session-create.component.scss']
})
export class SessionCreateComponent implements OnInit {
    private fb = inject(FormBuilder);
    private router = inject(Router);
    private sessionsService = inject(SessionsService);
    private notificationService = inject(NotificationService);

    createForm!: FormGroup;
    loading = false;
    createdSession: CreateSessionResponse | null = null;
    urlCopied = false;
    durationMismatchError: string | null = null;

    lensOptions = [
        { label: 'Front Camera (User)', value: 'user', icon: 'pi pi-user' },
        { label: 'Back Camera (Environment)', value: 'environment', icon: 'pi pi-image' }
    ];

    ngOnInit(): void {
        this.createForm = this.fb.group({
            return_url: [this.getDefaultReturnUrl(), Validators.required],
            user_id: [''],
            commands: this.fb.array([])
        });
    }

    get commands(): FormArray {
        return this.createForm.get('commands') as FormArray;
    }

    get sessionDuration(): number {
        return this.commands.length > 0 ? this.commandsTotalDuration : 15;
    }

    get commandsTotalDuration(): number {
        return this.commands.controls.reduce(
            (sum, ctrl) => sum + (ctrl.get('duration')?.value || 0), 0
        );
    }

    get durationProgress(): number {
        if (this.commands.length === 0) return 0;
        return Math.min((this.commandsTotalDuration / 60) * 100, 100);
    }

    getDefaultReturnUrl(): string {
        if (!environment.production) {
            return `http://${window.location.hostname}:${window.location.port}/sessions`;
        }
        return window.location.origin + '/sessions';
    }

    addCommand(): void {
        if (this.commands.length >= 5) return;

        const defaultDuration = 5;

        const commandForm = this.fb.group({
            text: ['', Validators.required],
            lens: ['user', Validators.required],
            duration: [defaultDuration, [Validators.required, Validators.min(1)]]
        });

        commandForm.valueChanges.subscribe(() => this.validateDurations());
        this.commands.push(commandForm);
        this.validateDurations();
    }

    removeCommand(index: number): void {
        this.commands.removeAt(index);
        this.validateDurations();
    }

    validateDurations(): boolean {
        this.durationMismatchError = null;
        if (this.commands.length === 0) return true;

        if (this.commandsTotalDuration < 15) {
            this.durationMismatchError =
                `Custom steps total ${this.commandsTotalDuration}s. The minimum required custom playbook duration is 15s.`;
            return false;
        }
        return true;
    }

    getLensIcon(lens: string): string {
        return lens === 'user' ? 'pi pi-user' : 'pi pi-image';
    }

    getLensLabel(lens: string): string {
        return lens === 'user' ? 'Front' : 'Back';
    }

    onCreate(): void {
        if (this.createForm.invalid || !this.validateDurations()) return;

        this.loading = true;
        const formValue = this.createForm.value;

        const request = {
            return_url: formValue.return_url,
            metadata: formValue.user_id ? { user_id: formValue.user_id } : {},
            session_duration: this.sessionDuration,
            verification_commands: formValue.commands.length > 0 ? formValue.commands : undefined
        };

        this.sessionsService.createSession(request).subscribe({
            next: (response) => {
                // Rewrite URL for local dev to use current hostname
                if (!environment.production) {
                    try {
                        const urlObj = new URL(response.session_url);
                        response.session_url = `https://${window.location.hostname}:8300${urlObj.pathname}${urlObj.search}`;
                    } catch (e) {
                        console.warn('Failed to rewrite session_url for local dev', e);
                    }
                }
                this.createdSession = response;
                this.loading = false;
                this.notificationService.success('Verification session created successfully!');
            },
            error: (error) => {
                this.loading = false;
                const errorMessage = error.error?.detail || error.message || 'Failed to create session';
                this.notificationService.error(errorMessage);
            }
        });
    }

    copyUrl(): void {
        if (this.createdSession) {
            navigator.clipboard.writeText(this.createdSession.session_url).then(() => {
                this.urlCopied = true;
                setTimeout(() => this.urlCopied = false, 2000);
                this.notificationService.success('URL copied to clipboard');
            }).catch(() => {
                this.notificationService.error('Failed to copy URL');
            });
        }
    }

    copySessionId(): void {
        if (this.createdSession) {
            navigator.clipboard.writeText(this.createdSession.session_id).then(() => {
                this.notificationService.success('Session ID copied to clipboard');
            });
        }
    }

    onCancel(): void {
        this.router.navigate(['/sessions']);
    }

    createAnother(): void {
        this.createdSession = null;
        this.createForm.reset({
            return_url: this.getDefaultReturnUrl()
        });
        while (this.commands.length > 0) {
            this.commands.removeAt(0);
        }
    }
}
