import { Routes } from '@angular/router';
import { canActivateAuth } from './core/guards/auth.guard';
import { canActivateAdmin } from './core/guards/admin.guard';
import { canActivatePermission } from './core/guards/permission.guard';
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
        path: 'callback',
        loadComponent: () => import('./components/auth-callback/auth-callback.component').then(m => m.AuthCallbackComponent)
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
        canActivate: [canActivatePermission],
        data: { permission: 'analytics.read' },
        loadComponent: () => import('./features/dashboard/dashboard-overview/dashboard-overview.component').then(m => m.DashboardOverviewComponent)
      },
      {
        path: 'api-keys',
        canActivate: [canActivatePermission],
        data: { permission: 'api_keys.manage' },
        loadComponent: () => import('./features/api-keys/api-keys-list/api-keys-list.component').then(m => m.ApiKeysListComponent)
      },
      {
        path: 'sessions',
        children: [
          {
            path: '',
            canActivate: [canActivatePermission],
            data: { permission: 'sessions.read' },
            loadComponent: () => import('./features/sessions/sessions-list/sessions-list.component').then(m => m.SessionsListComponent)
          },
          {
            path: 'create',
            canActivate: [canActivatePermission],
            data: { permission: 'sessions.create' },
            loadComponent: () => import('./features/sessions/session-create/session-create.component').then(m => m.SessionCreateComponent)
          },
          {
            path: ':id',
            canActivate: [canActivatePermission],
            data: { permission: 'sessions.read' },
            loadComponent: () => import('./components/session-details/session-details.component').then(m => m.SessionDetailsComponent)
          }
        ]
      },
      {
        path: 'fraud-analysis',
        canActivate: [canActivatePermission],
        data: { permission: 'media-analysis.read' },
        loadComponent: () => import('./features/media-analysis/media-analysis-workbench/media-analysis-workbench.component').then(m => m.MediaAnalysisWorkbenchComponent)
      },
      {
        path: 'analytics',
        canActivate: [canActivatePermission],
        data: { permission: 'analytics.read' },
        loadComponent: () => import('./features/analytics/analytics-overview/analytics-overview.component').then(m => m.AnalyticsOverviewComponent)
      },
      {
        path: 'billing',
        canActivate: [canActivatePermission],
        data: { permission: 'billing.read' },
        loadComponent: () => import('./features/billing/subscription-overview/subscription-overview.component').then(m => m.SubscriptionOverviewComponent)
      },
      {
        path: 'webhooks',
        canActivate: [canActivatePermission],
        data: { permission: 'webhooks.manage' },
        loadComponent: () => import('./features/webhooks/webhook-list/webhook-list.component').then(m => m.WebhookListComponent)
      },
      {
        path: 'branding',
        canActivate: [canActivatePermission],
        data: { permission: 'branding.manage' },
        loadComponent: () => import('./features/branding/branding-editor/branding-editor.component').then(m => m.BrandingEditorComponent)
      },
      {
        path: 'encryption',
        canActivate: [canActivatePermission],
        data: { permission: 'org.members.manage' },
        loadComponent: () => import('./features/encryption/encryption-settings/encryption-settings.component').then(m => m.EncryptionSettingsComponent)
      },
      {
        path: 'users',
        canActivate: [canActivatePermission],
        data: { permission: 'org.members.manage' },
        loadComponent: () => import('./features/users/user-management/user-management.component').then(m => m.UserManagementComponent)
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
            path: 'users',
            loadComponent: () => import('./features/admin/platform-users/platform-users.component').then(m => m.PlatformUsersComponent)
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

