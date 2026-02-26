import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { ChipModule } from 'primeng/chip';
import { TooltipModule } from 'primeng/tooltip';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { SessionService } from '../services/session.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { SessionCreateDialogComponent } from '../session-create-dialog/session-create-dialog.component';

interface Session {
  session_id: string;
  created_at: string;
  expires_at: string;
  state: string;
  final_trust_score?: number;
  tier_1_score?: number;
  return_url?: string;
}

@Component({
  selector: 'app-sessions-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CardModule,
    ButtonModule,
    TableModule,
    ChipModule,
    TooltipModule,
    LoadingSpinnerComponent
  ],
  providers: [DialogService],
  templateUrl: './sessions-list.component.html',
  styleUrls: ['./sessions-list.component.scss']
})
export class SessionsListComponent implements OnInit {
  sessions: Session[] = [];
  loading = false;
  
  // Pagination
  pageSize = 10;
  first = 0;
  totalSessions = 0;

  private dialogRef: DynamicDialogRef | undefined;

  constructor(
    private sessionService: SessionService,
    private notification: NotificationService,
    private router: Router,
    private dialogService: DialogService
  ) {}

  ngOnInit(): void {
    this.loadSessions();
  }

  loadSessions(): void {
    this.loading = true;
    const offset = this.first;
    this.sessionService.getSessions(this.pageSize, offset).subscribe({
      next: (response) => {
        this.sessions = response.sessions;
        this.totalSessions = response.total;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.notification.error('Failed to load sessions');
        console.error('Error loading sessions:', error);
      }
    });
  }

  onPageChange(event: any): void {
    this.first = event.first;
    this.pageSize = event.rows;
    this.loadSessions();
  }

  createSession(): void {
    this.dialogRef = this.dialogService.open(SessionCreateDialogComponent, {
      header: 'Create Test Session',
      width: '600px',
      modal: true,
      dismissableMask: false
    });

    this.dialogRef.onClose.subscribe(result => {
      if (result) {
        this.loadSessions();
      }
    });
  }

  viewSession(sessionId: string): void {
    this.router.navigate(['/sessions', sessionId]);
  }

  getTrustScoreColor(score: number): string {
    if (score >= 80) return '#4caf50';
    if (score >= 50) return '#ff9800';
    return '#f44336';
  }
}
