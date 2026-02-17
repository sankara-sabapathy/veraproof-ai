import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'analytics',
    loadComponent: () => import('./components/analytics/analytics.component').then(m => m.AnalyticsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'sessions/:id',
    loadComponent: () => import('./components/session-details/session-details.component').then(m => m.SessionDetailsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'branding',
    loadComponent: () => import('./components/branding/branding.component').then(m => m.BrandingComponent),
    canActivate: [authGuard]
  },
  {
    path: 'api-keys',
    loadComponent: () => import('./components/api-keys/api-keys.component').then(m => m.ApiKeysComponent),
    canActivate: [authGuard]
  },
  {
    path: 'billing',
    loadComponent: () => import('./components/billing/billing.component').then(m => m.BillingComponent),
    canActivate: [authGuard]
  },
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  }
];
