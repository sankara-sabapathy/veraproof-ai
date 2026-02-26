import { Component, EventEmitter, OnInit, Output, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { MenuModule } from 'primeng/menu';
import { DividerModule } from 'primeng/divider';
import { MenuItem } from 'primeng/api';
import { AuthService } from '../../core/services/auth.service';
import { Observable, Subscription } from 'rxjs';
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
    RouterModule,
    MenuModule,
    DividerModule
  ],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Output() navItemClick = new EventEmitter<void>();
  
  isAdmin$: Observable<boolean>;
  menuItems: MenuItem[] = [];
  private routerSubscription?: Subscription;
  
  private navigationItems: NavItem[] = [
    {
      label: 'Dashboard',
      icon: 'pi pi-home',
      route: '/dashboard'
    },
    {
      label: 'API Keys',
      icon: 'pi pi-key',
      route: '/api-keys'
    },
    {
      label: 'Sessions',
      icon: 'pi pi-shield',
      route: '/sessions'
    },
    {
      label: 'Analytics',
      icon: 'pi pi-chart-line',
      route: '/analytics'
    },
    {
      label: 'Billing',
      icon: 'pi pi-file',
      route: '/billing'
    },
    {
      label: 'Webhooks',
      icon: 'pi pi-link',
      route: '/webhooks'
    },
    {
      label: 'Branding',
      icon: 'pi pi-palette',
      route: '/branding'
    },
    {
      label: 'Admin',
      icon: 'pi pi-users',
      route: '/admin',
      adminOnly: true
    }
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.isAdmin$ = new Observable<boolean>(observer => {
      observer.next(this.authService.isAdmin());
    });
  }

  ngOnInit(): void {
    this.buildMenuItems();
    
    // Update active state when route changes
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateActiveState();
      });
  }

  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
  }

  private buildMenuItems(): void {
    this.menuItems = this.navigationItems
      .filter(item => this.shouldShowItem(item))
      .map(item => ({
        label: item.label,
        icon: item.icon,
        command: () => {
          this.router.navigate([item.route]);
          this.onNavItemClicked();
        },
        styleClass: this.isActiveRoute(item.route) ? 'active-menu-item' : ''
      }));
  }

  private shouldShowItem(item: NavItem): boolean {
    if (item.adminOnly) {
      return this.authService.isAdmin();
    }
    return true;
  }

  private isActiveRoute(route: string): boolean {
    if (route === '/dashboard') {
      return this.router.url === route;
    }
    return this.router.url.startsWith(route);
  }

  onNavItemClicked(): void {
    this.navItemClick.emit();
  }

  // Rebuild menu items when route changes to update active state
  updateActiveState(): void {
    this.buildMenuItems();
  }
}
