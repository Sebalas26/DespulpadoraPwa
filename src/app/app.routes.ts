import { Routes } from '@angular/router';
import { authGuard, adminGuard, guestGuard } from './core/guards/auth.guard';
import { LoginComponent } from './features/auth/login/login.component';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { CalculatorComponent } from './features/calculator/calculator.component';
import { OrdersComponent } from './features/orders/orders.component';
import { ShiftsComponent } from './features/shifts/shifts.component';
import { HrComponent } from './features/hr/hr.component';
import { AccountingComponent } from './features/accounting/accounting.component';
import { SettingsComponent } from './features/settings/settings.component';
import { ReportsComponent } from './features/reports/reports.component';
import { AdminUsersComponent } from './features/admin/users/users.component';
import { AdminRolesComponent } from './features/admin/roles/roles.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [guestGuard]
  },
  {
    path: 'kds',
    loadComponent: () => import('./features/orders/kds/kds.component').then(m => m.KdsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'kds-inventory',
    loadComponent: () => import('./features/inventory/kds/kds-inventory.component').then(m => m.KdsInventoryComponent),
    canActivate: [authGuard]
  },
  {
    path: 'portal-clientes',
    loadComponent: () => import('./features/client-portal/client-portal.component').then(m => m.ClientPortalComponent)
  },
  {
    path: 'portal-cliente',
    redirectTo: 'portal-clientes',
    pathMatch: 'full'
  },
  {
    path: 'pedidos-cliente',
    redirectTo: 'portal-clientes',
    pathMatch: 'full'
  },
  {
    path: 'catalogo',
    redirectTo: 'portal-clientes',
    pathMatch: 'full'
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      {
        path: 'portal-admin',
        loadComponent: () =>
          import('./features/client-portal/client-portal-admin.component').then(
            m => m.ClientPortalAdminComponent
          )
      },
      { path: 'calculator', component: CalculatorComponent },
      { path: 'orders', component: OrdersComponent },
      { path: 'shifts', component: ShiftsComponent },
      { path: 'hr', component: HrComponent },
      { path: 'accounting', component: AccountingComponent },
      { path: 'settings', component: SettingsComponent },
      { path: 'reports', component: ReportsComponent },
      { path: 'admin/users', component: AdminUsersComponent, canActivate: [adminGuard] },
      { path: 'admin/roles', component: AdminRolesComponent, canActivate: [adminGuard] }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
