import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';
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
import { SystemCatalogComponent } from './features/admin/system-catalog/system-catalog.component';
import { BackupsComponent } from './features/admin/backups/backups.component';
import { DynamicModulePlaceholderComponent } from './features/dynamic-module-placeholder/dynamic-module-placeholder.component';

/**
 * Application routing configuration with Server-Driven RBAC guards and intelligent fallback
 * (`DynamicModulePlaceholderComponent`) for newly registered database modules.
 */
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
      { path: 'dashboard', component: DashboardComponent, canActivate: [permissionGuard] },
      {
        path: 'portal-admin',
        loadComponent: () =>
          import('./features/client-portal/client-portal-admin.component').then(
            m => m.ClientPortalAdminComponent
          ),
        canActivate: [permissionGuard]
      },
      { path: 'calculator', component: CalculatorComponent, canActivate: [permissionGuard] },
      { path: 'orders', component: OrdersComponent, canActivate: [permissionGuard] },
      { path: 'shifts', component: ShiftsComponent, canActivate: [permissionGuard] },
      { path: 'hr', component: HrComponent, canActivate: [permissionGuard] },
      { path: 'accounting', component: AccountingComponent, canActivate: [permissionGuard] },
      { path: 'settings', component: SettingsComponent, canActivate: [permissionGuard] },
      { path: 'reports', component: ReportsComponent, canActivate: [permissionGuard] },
      { path: 'admin/users', component: AdminUsersComponent, canActivate: [permissionGuard] },
      { path: 'admin/roles', component: AdminRolesComponent, canActivate: [permissionGuard] },
      {
        path: 'admin/catalog',
        component: SystemCatalogComponent,
        canActivate: [permissionGuard],
        data: { requiresSystemDeveloper: true }
      },
      {
        path: 'admin/backups',
        component: BackupsComponent,
        canActivate: [permissionGuard],
        data: { requiresSystemDeveloper: true }
      },
      {
        path: '**',
        component: DynamicModulePlaceholderComponent,
        canActivate: [permissionGuard]
      }
    ]
  }
];
