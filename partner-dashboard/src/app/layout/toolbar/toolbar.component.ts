import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { DividerModule } from 'primeng/divider';
import { MenuItem } from 'primeng/api';
import { Observable, combineLatest } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { TenantEnvironmentService } from '../../core/services/tenant-environment.service';
import { TenantEnvironmentSummary } from '../../core/models/interfaces';

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
    ButtonModule,
    MenuModule,
    DividerModule
  ],
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss']
})
export class ToolbarComponent implements OnInit {
  @Input() showMenuButton: boolean | null = false;
  @Input() menuOpen = false;
  @Output() menuToggle = new EventEmitter<void>();

  userEmail$: Observable<string | null>;
  userRoleLabel$: Observable<string>;
  breadcrumbs$: Observable<Breadcrumb[]>;
  brandRoute$: Observable<string>;
  activeEnvironment$: Observable<TenantEnvironmentSummary | null>;
  availableEnvironments$: Observable<TenantEnvironmentSummary[]>;
  showEnvironmentSwitcher$: Observable<boolean>;
  userMenuItems: MenuItem[] = [];
  switchingEnvironment = false;

  private routeLabels: { [key: string]: string } = {
    'dashboard': 'Dashboard',
    'api-keys': 'API Keys',
    'sessions': 'Sessions',
    'analytics': 'Analytics',
    'billing': 'Billing',
    'webhooks': 'Webhooks',
    'branding': 'Branding',
    'fraud-analysis': 'Fraud Analysis',
    'users': 'Users',
    'encryption': 'Encryption',
    'admin': 'Admin',
    'platform-stats': 'Platform Stats',
    'tenants': 'Tenants'
  };

  constructor(
    private authService: AuthService,
    private tenantEnvironmentService: TenantEnvironmentService,
    private router: Router
  ) {
    this.userEmail$ = this.authService.currentUser$.pipe(
      map(user => user?.email || null)
    );

    this.userRoleLabel$ = this.authService.currentUser$.pipe(
      map(user => {
        if (user?.permissions?.includes('platform.metadata.read') || user?.roles?.includes('platform_admin')) {
          return 'Platform Admin';
        }
        return 'Tenant User';
      })
    );

    this.brandRoute$ = this.authService.currentUser$.pipe(
      map(user => (user?.permissions?.includes('platform.metadata.read') || user?.roles?.includes('platform_admin')) ? '/admin/platform-stats' : '/dashboard')
    );

    this.activeEnvironment$ = this.tenantEnvironmentService.activeEnvironment$;
    this.availableEnvironments$ = this.tenantEnvironmentService.availableEnvironments$;
    this.showEnvironmentSwitcher$ = combineLatest([
      this.authService.currentUser$,
      this.tenantEnvironmentService.availableEnvironments$
    ]).pipe(
      map(([user, environments]) => {
        const isPlatformAdmin = Boolean(user?.permissions?.includes('platform.metadata.read') || user?.roles?.includes('platform_admin'));
        return !isPlatformAdmin && environments.length > 1;
      })
    );

    this.breadcrumbs$ = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.createBreadcrumbs())
    );
  }

  ngOnInit(): void {
    this.userMenuItems = [
      {
        label: 'Logout',
        icon: 'pi pi-sign-out',
        command: () => this.onLogout()
      }
    ];
  }

  onMenuToggle(): void {
    this.menuToggle.emit();
  }

  onSelectEnvironment(environment: TenantEnvironmentSummary): void {
    if (this.switchingEnvironment || this.tenantEnvironmentService.getActiveEnvironmentSlug() === environment.slug) {
      return;
    }

    this.switchingEnvironment = true;
    this.tenantEnvironmentService.selectEnvironment(environment.slug).subscribe({
      next: () => {
        this.switchingEnvironment = false;
      },
      error: () => {
        this.switchingEnvironment = false;
      }
    });
  }

  isEnvironmentActive(active: TenantEnvironmentSummary | null, candidate: TenantEnvironmentSummary): boolean {
    return active?.slug === candidate.slug;
  }

  onLogout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/auth/login']);
      },
      error: (error) => {
        console.error('Logout error:', error);
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

    segments.forEach((segment) => {
      const cleanSegment = segment.split('?')[0];
      currentUrl += `/${cleanSegment}`;

      const label = this.routeLabels[cleanSegment] || this.formatLabel(cleanSegment);
      breadcrumbs.push({ label, url: currentUrl });
    });

    return breadcrumbs;
  }

  private formatLabel(segment: string): string {
    return segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

