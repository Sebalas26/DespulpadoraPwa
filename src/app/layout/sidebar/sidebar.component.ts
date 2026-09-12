import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { StateService } from '../../core/services/state.service';
import { BranchDto } from '../../core/models/auth.models';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar">
      <!-- Brand Logo -->
      <div class="sidebar-header">
        <div class="logo-box">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            <path d="m9 12 2 2 4-4"></path>
          </svg>
        </div>
        <div>
          <div class="brand-title">Pulpas del Valle</div>
          <div class="brand-subtitle">Planta & ERP 4.0</div>
        </div>
      </div>

      <!-- Active Branch Selector -->
      @if (authService.branches().length > 1) {
        <div style="padding: 0 16px 14px 16px;">
          <label style="font-size: 0.72rem; text-transform: uppercase; color: var(--text-dim); font-weight: 700; margin-bottom: 6px; display: block;">
            Sede Operativa
          </label>
          <select
            class="form-control"
            style="padding: 6px 10px; font-size: 0.8rem;"
            [value]="authService.selectedBranch()?.branchId"
            (change)="onBranchChange($event)"
          >
            @for (branch of authService.branches(); track branch.branchId) {
              <option [value]="branch.branchId">{{ branch.name }} {{ branch.isMatrix ? '(Matriz)' : '' }}</option>
            }
          </select>
        </div>
      }

      <!-- Main Navigation Links -->
      <nav class="sidebar-nav">
        <div class="nav-section-title">Operaciones de Planta</div>

        <a routerLink="/dashboard" routerLinkActive="active" class="nav-item">
          <span class="nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
          </span>
          <span class="nav-text">Panel Central</span>
        </a>

        <a routerLink="/calculator" routerLinkActive="active" class="nav-item">
          <span class="nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="4" y="2" width="16" height="20" rx="2"></rect>
              <line x1="8" y1="6" x2="16" y2="6"></line>
              <line x1="16" y1="14" x2="16" y2="18"></line>
              <path d="M16 10h.01"></path>
              <path d="M12 10h.01"></path>
              <path d="M8 10h.01"></path>
              <path d="M12 14h.01"></path>
              <path d="M8 14h.01"></path>
              <path d="M12 18h.01"></path>
              <path d="M8 18h.01"></path>
            </svg>
          </span>
          <span class="nav-text">Calculadora & Lotes</span>
        </a>

        <a routerLink="/orders" routerLinkActive="active" class="nav-item">
          <span class="nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path>
              <path d="M3 6h18"></path>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
          </span>
          <span class="nav-text">Gestión de Pedidos</span>
          @if (stateService.pendingOrdersCount() > 0) {
            <span class="nav-badge">{{ stateService.pendingOrdersCount() }}</span>
          }
        </a>

        <a routerLink="/shifts" routerLinkActive="active" class="nav-item">
          <span class="nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </span>
          <span class="nav-text">Control de Turnos</span>
        </a>

        <div class="nav-section-title" style="margin-top: 14px;">Administración</div>

        <a routerLink="/hr" routerLinkActive="active" class="nav-item">
          <span class="nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </span>
          <span class="nav-text">Personal & Nómina</span>
        </a>

        <a routerLink="/accounting" routerLinkActive="active" class="nav-item">
          <span class="nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </span>
          <span class="nav-text">Gastos & Caja</span>
        </a>

        <a routerLink="/settings" routerLinkActive="active" class="nav-item">
          <span class="nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </span>
          <span class="nav-text">Catálogo de Frutas</span>
        </a>

        <!-- RBAC Admin Section (Protected) -->
        @if (authService.isAdmin()) {
          <div class="nav-section-title" style="margin-top: 14px; color: #8b5cf6;">Seguridad & RBAC</div>

          <a routerLink="/admin/users" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <line x1="19" y1="8" x2="19" y2="14"></line>
                <line x1="22" y1="11" x2="16" y2="11"></line>
              </svg>
            </span>
            <span class="nav-text">Usuarios del Sistema</span>
          </a>

          <a routerLink="/admin/roles" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </span>
            <span class="nav-text">Roles & Permisos</span>
          </a>
        }
      </nav>

      <!-- Sidebar User Footer -->
      <div class="sidebar-footer">
        <div class="user-card">
          <div class="user-avatar-badge">
            {{ (authService.currentUser()?.fullName || authService.currentUser()?.username || 'AD').substring(0, 2).toUpperCase() }}
          </div>
          <div class="user-details">
            <div class="user-name">
              {{ authService.currentUser()?.fullName || authService.currentUser()?.username }}
            </div>
            <div class="user-role">
              {{ authService.currentUser()?.roleName || 'Usuario' }}
            </div>
          </div>
          <button
            type="button"
            class="logout-btn"
            (click)="authService.logout()"
            title="Cerrar Sesión"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  `
})
export class SidebarComponent {
  readonly authService = inject(AuthService);
  readonly stateService = inject(StateService);

  onBranchChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const branchId = Number(select.value);
    const branch = this.authService.branches().find(b => b.branchId === branchId);
    if (branch) {
      this.authService.setBranch(branch);
      this.stateService.refreshAll();
    }
  }
}
