import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatSidenav } from '@angular/material/sidenav';
import { AuthService } from '../../core/services/auth.service';
import { Observable } from 'rxjs';

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
    MatListModule,
    MatIconModule,
    MatDividerModule
  ],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {
  @Input() drawer!: MatSidenav;
  
  isAdmin$: Observable<boolean>;
  
  navigationItems: NavItem[] = [
    {
      label: 'Dashboard',
      icon: 'dashboard',
      route: '/dashboard'
    },
    {
      label: 'API Keys',
      icon: 'vpn_key',
      route: '/api-keys'
    },
    {
      label: 'Sessions',
      icon: 'verified_user',
      route: '/sessions'
    },
    {
      label: 'Analytics',
      icon: 'analytics',
      route: '/analytics'
    },
    {
      label: 'Billing',
      icon: 'payment',
      route: '/billing'
    },
    {
      label: 'Webhooks',
      icon: 'webhook',
      route: '/webhooks'
    },
    {
      label: 'Branding',
      icon: 'palette',
      route: '/branding'
    },
    {
      label: 'Admin',
      icon: 'admin_panel_settings',
      route: '/admin',
      adminOnly: true
    }
  ];

  constructor(private authService: AuthService) {
    this.isAdmin$ = new Observable<boolean>(observer => {
      observer.next(this.authService.isAdmin());
    });
  }

  ngOnInit(): void {}

  shouldShowItem(item: NavItem): boolean {
    if (item.adminOnly) {
      return this.authService.isAdmin();
    }
    return true;
  }

  onNavItemClick(): void {
    // Close drawer on mobile after navigation
    if (this.drawer && this.drawer.mode === 'over') {
      this.drawer.close();
    }
  }
}
