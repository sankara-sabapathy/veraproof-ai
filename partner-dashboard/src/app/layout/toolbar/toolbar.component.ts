import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatSidenav } from '@angular/material/sidenav';
import { AuthService } from '../../core/services/auth.service';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

interface Breadcrumb {
  label: string;
  url: string;
}

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule
  ],
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss']
})
export class ToolbarComponent implements OnInit {
  @Input() drawer!: MatSidenav;
  
  userEmail$: Observable<string | null>;
  breadcrumbs$: Observable<Breadcrumb[]>;

  private routeLabels: { [key: string]: string } = {
    'dashboard': 'Dashboard',
    'api-keys': 'API Keys',
    'sessions': 'Sessions',
    'analytics': 'Analytics',
    'billing': 'Billing',
    'webhooks': 'Webhooks',
    'branding': 'Branding',
    'admin': 'Admin'
  };

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.userEmail$ = this.authService.currentUser$.pipe(
      map(user => user?.email || null)
    );

    this.breadcrumbs$ = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.createBreadcrumbs())
    );
  }

  ngOnInit(): void {}

  onLogout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/auth/login']);
      },
      error: (error) => {
        console.error('Logout error:', error);
        // Force navigation even on error
        this.router.navigate(['/auth/login']);
      }
    });
  }

  private createBreadcrumbs(): Breadcrumb[] {
    const url = this.router.url;
    const segments = url.split('/').filter(segment => segment && segment !== '');
    
    if (segments.length === 0) {
      return [{ label: 'Dashboard', url: '/dashboard' }];
    }

    const breadcrumbs: Breadcrumb[] = [];
    let currentUrl = '';

    segments.forEach((segment, index) => {
      // Skip query parameters
      const cleanSegment = segment.split('?')[0];
      currentUrl += `/${cleanSegment}`;
      
      const label = this.routeLabels[cleanSegment] || this.formatLabel(cleanSegment);
      breadcrumbs.push({ label, url: currentUrl });
    });

    return breadcrumbs;
  }

  private formatLabel(segment: string): string {
    // Convert kebab-case to Title Case
    return segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
