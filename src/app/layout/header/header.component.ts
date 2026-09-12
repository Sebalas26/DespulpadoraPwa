import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { StateService } from '../../core/services/state.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="topbar">
      <!-- Left side: Branch info & active status -->
      <div style="display: flex; align-items: center; gap: 14px;">
        <div class="badge-pill badge-emerald">
          <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981;"></span>
          <span>{{ authService.selectedBranch()?.name || 'Sede Principal' }}</span>
        </div>

        @if (authService.isDemoMode()) {
          <div class="badge-pill badge-amber" title="Modo Mockup Autónomo: operando con persistencia local y sin requerir la API">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #f59e0b; box-shadow: 0 0 8px #f59e0b;"></span>
            <span style="font-weight: 700; font-size: 0.76rem;">🧪 Modo Demo Offline (Sin API)</span>
          </div>
        } @else {
          <div style="display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: var(--text-dim);" class="no-mobile">
            <span [style.background]="stateService.isOnline() ? '#10b981' : '#ef4444'" style="width: 8px; height: 8px; border-radius: 50%; display: inline-block;"></span>
            <span>{{ stateService.isOnline() ? 'En Línea (API Conectada)' : 'Sin Conexión' }}</span>
          </div>
        }
      </div>

      <!-- Right side: Actions, Refresh, Theme Toggle -->
      <div class="topbar-actions">
        <!-- Sync / Refresh Button -->
        <button
          class="btn-icon"
          (click)="stateService.refreshAll()"
          [disabled]="stateService.isLoading()"
          title="Sincronizar con Servidor"
        >
          <svg [class.spin-icon]="stateService.isLoading()" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
          </svg>
        </button>

        <!-- Theme Toggle -->
        <button
          class="btn-icon"
          (click)="stateService.toggleTheme()"
          title="Cambiar Tema (Oscuro / Claro)"
        >
          @if (stateService.activeTheme() === 'dark') {
            <!-- Sun Icon for switching to light -->
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
          } @else {
            <!-- Moon Icon for switching to dark -->
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          }
        </button>
      </div>
    </header>
  `
})
export class HeaderComponent {
  readonly authService = inject(AuthService);
  readonly stateService = inject(StateService);
}
