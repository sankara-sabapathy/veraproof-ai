import { Component, EventEmitter, Input, OnInit, Output, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  permission?: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Input() isMobile = false;
  @Output() navItemClick = new EventEmitter<void>();
  @Output() dismiss = new EventEmitter<void>();

  visibleNavItems: NavItem[] = [];
  adminNavItems: NavItem[] = [];
  showAdminSection = false;
  private routerSubscription?: Subscription;

  private navigationItems: NavItem[] = [
    { label: 'Dashboard', icon: 'pi pi-home', route: '/dashboard', permission: 'analytics.read' },
    { label: 'API Keys', icon: 'pi pi-key', route: '/api-keys', permission: 'api_keys.manage' },
    { label: 'Sessions', icon: 'pi pi-shield', route: '/sessions', permission: 'sessions.read' },
    { label: 'Fraud Analysis', icon: 'pi pi-search', route: '/fraud-analysis', permission: 'media-analysis.read' },
    { label: 'Analytics', icon: 'pi pi-chart-line', route: '/analytics', permission: 'analytics.read' },
    { label: 'Billing', icon: 'pi pi-file', route: '/billing', permission: 'billing.read' },
    { label: 'Webhooks', icon: 'pi pi-link', route: '/webhooks', permission: 'webhooks.manage' },
    { label: 'Branding', icon: 'pi pi-palette', route: '/branding', permission: 'branding.manage' },
    { label: 'Encryption', icon: 'pi pi-lock', route: '/encryption', permission: 'org.members.manage' },
    { label: 'Users', icon: 'pi pi-users', route: '/users', permission: 'org.members.manage' }
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.buildNavItems();
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
      });
  }

  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
  }

  private buildNavItems(): void {
    this.visibleNavItems = this.navigationItems.filter(item => !item.permission || this.authService.hasPermission(item.permission));
    this.showAdminSection = this.authService.isAdmin();
    this.adminNavItems = this.showAdminSection
      ? [
          { label: 'Platform Stats', icon: 'pi pi-chart-bar', route: '/admin/platform-stats' },
          { label: 'Tenants', icon: 'pi pi-building', route: '/admin/tenants' },
          { label: 'Platform Users', icon: 'pi pi-user-plus', route: '/admin/users' },
        ]
      : [];
  }

  isActiveRoute(route: string): boolean {
    if (route === '/dashboard') {
      return this.router.url === route || this.router.url === '/';
    }
    return this.router.url.startsWith(route);
  }

  onNavItemClicked(): void {
    this.navItemClick.emit();
  }

  onDismiss(): void {
    this.dismiss.emit();
  }
}
