import { Component, EventEmitter, OnInit, Output, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  adminOnly?: boolean;
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
  @Output() navItemClick = new EventEmitter<void>();

  visibleNavItems: NavItem[] = [];
  showAdminSection = false;
  private routerSubscription?: Subscription;

  private navigationItems: NavItem[] = [
    { label: 'Dashboard', icon: 'pi pi-home', route: '/dashboard' },
    { label: 'API Keys', icon: 'pi pi-key', route: '/api-keys' },
    { label: 'Sessions', icon: 'pi pi-shield', route: '/sessions' },
    { label: 'Analytics', icon: 'pi pi-chart-line', route: '/analytics' },
    { label: 'Billing', icon: 'pi pi-file', route: '/billing' },
    { label: 'Webhooks', icon: 'pi pi-link', route: '/webhooks' },
    { label: 'Branding', icon: 'pi pi-palette', route: '/branding' }
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
        // Active state is handled via isActiveRoute() in template
      });
  }

  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
  }

  private buildNavItems(): void {
    this.visibleNavItems = this.navigationItems.filter(item => !item.adminOnly);
    this.showAdminSection = this.authService.isAdmin();
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
}
