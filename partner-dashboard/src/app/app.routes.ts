import { Routes } from '@angular/router';
import { canActivateAuth } from './core/guards/auth.guard';
import { canActivateAdmin } from './core/guards/admin.guard';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent)
      },
      {
        path: 'signup',
        loadComponent: () => import('./components/signup/signup.component').then(m => m.SignupComponent)
      },
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [canActivateAuth],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard-overview/dashboard-overview.component').then(m => m.DashboardOverviewComponent)
      },
      {
        path: 'api-keys',
        loadComponent: () => import('./features/api-keys/api-keys-list/api-keys-list.component').then(m => m.ApiKeysListComponent)
      },
      {
        path: 'sessions',
        children: [
          {
            path: '',
            loadComponent: () => import('./components/session-details/session-details.component').then(m => m.SessionDetailsComponent)
          },
          {
            path: ':id',
            loadComponent: () => import('./components/session-details/session-details.component').then(m => m.SessionDetailsComponent)
          }
        ]
      },
      {
        path: 'analytics',
        loadComponent: () => import('./features/analytics/analytics-overview/analytics-overview.component').then(m => m.AnalyticsOverviewComponent)
      },
      {
        path: 'billing',
        loadComponent: () => import('./features/billing/subscription-overview/subscription-overview.component').then(m => m.SubscriptionOverviewComponent)
      },
      {
        path: 'webhooks',
        loadComponent: () => import('./features/webhooks/webhook-list/webhook-list.component').then(m => m.WebhookListComponent)
      },
      {
        path: 'branding',
        loadComponent: () => import('./features/branding/branding-editor/branding-editor.component').then(m => m.BrandingEditorComponent)
      },
      {
        path: 'admin',
        canActivate: [canActivateAdmin],
        children: [
          {
            path: '',
            redirectTo: 'tenants',
            pathMatch: 'full'
          },
          {
            path: 'tenants',
            loadComponent: () => import('./features/admin/tenant-list/tenant-list.component').then(m => m.TenantListComponent)
          },
          {
            path: 'tenants/:id',
            loadComponent: () => import('./features/admin/tenant-detail/tenant-detail.component').then(m => m.TenantDetailComponent)
          },
          {
            path: 'platform-stats',
            loadComponent: () => import('./features/admin/platform-stats/platform-stats.component').then(m => m.PlatformStatsComponent)
          }
        ]
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
