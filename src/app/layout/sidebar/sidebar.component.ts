import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { StateService } from '../../core/services/state.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar">
      <!-- 1. Brand Logo & Name -->
      <div class="sidebar-header">
        <img src="/logo-dgl.png" alt="DGL Despulpadora" class="dgl-logo-img" />
        <div class="dgl-brand-text">
          <span class="dgl-brand-name">DGL Despulpadora</span>
          <span class="dgl-brand-sub">Gestión de pulpas</span>
        </div>
      </div>

      <!-- 2. Navigation Section: GESTIÓN DIARIA -->
      <nav class="sidebar-nav">
        <div class="nav-section-title">GESTIÓN DIARIA</div>

        <!-- Panel general -->
        <a routerLink="/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="dgl-nav-item">
          <span class="dgl-nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7" rx="1.5"></rect>
              <rect x="14" y="3" width="7" height="7" rx="1.5"></rect>
              <rect x="14" y="14" width="7" height="7" rx="1.5"></rect>
              <rect x="3" y="14" width="7" height="7" rx="1.5"></rect>
            </svg>
          </span>
          <span class="dgl-nav-text">Panel general</span>
        </a>

        <!-- Alistamiento -->
        <a routerLink="/orders" [queryParams]="{ tab: 'picking' }" [class.active]="isOrderTabActive('picking')" class="dgl-nav-item">
          <span class="dgl-nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
          </span>
          <span class="dgl-nav-text">Alistamiento</span>
          @if (stateService.pendingOrdersCount() > 0) {
            <span class="dgl-nav-badge">{{ stateService.pendingOrdersCount() }}</span>
          }
        </a>

        <!-- Facturación & POS -->
        <a routerLink="/orders" [queryParams]="{ tab: 'facturacion' }" [class.active]="isOrderTabActive('facturacion')" class="dgl-nav-item">
          <span class="dgl-nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="12" y1="18" x2="12" y2="12"></line>
              <line x1="9" y1="15" x2="15" y2="15"></line>
            </svg>
          </span>
          <span class="dgl-nav-text">Facturación & POS</span>
        </a>

        <!-- Despachos & Rutas -->
        <a routerLink="/orders" [queryParams]="{ tab: 'despachos' }" [class.active]="isOrderTabActive('despachos')" class="dgl-nav-item">
          <span class="dgl-nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="1" y="3" width="15" height="13"></rect>
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
              <circle cx="5.5" cy="18.5" r="2.5"></circle>
              <circle cx="18.5" cy="18.5" r="2.5"></circle>
            </svg>
          </span>
          <span class="dgl-nav-text">Despachos & Rutas</span>
        </a>

        <!-- Producción -->
        <a routerLink="/calculator" routerLinkActive="active" [queryParams]="{ tab: 'formulation' }" class="dgl-nav-item">
          <span class="dgl-nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 2v14a4 4 0 0 0 8 0V2"></path>
              <line x1="6" y1="6" x2="14" y2="6"></line>
              <line x1="4" y1="2" x2="16" y2="2"></line>
            </svg>
          </span>
          <span class="dgl-nav-text">Producción</span>
        </a>

        <!-- Lotes -->
        <a routerLink="/calculator" routerLinkActive="active" [queryParams]="{ tab: 'loss-audit' }" class="dgl-nav-item">
          <span class="dgl-nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
              <polyline points="2 17 12 22 22 17"></polyline>
              <polyline points="2 12 12 17 22 12"></polyline>
            </svg>
          </span>
          <span class="dgl-nav-text">Lotes</span>
        </a>

        <!-- Inventario en cava -->
        <a routerLink="/settings" routerLinkActive="active" [queryParams]="{ tab: 'variants' }" class="dgl-nav-item">
          <span class="dgl-nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          </span>
          <span class="dgl-nav-text">Inventario en cava</span>
        </a>

        <!-- Ventas -->
        <a routerLink="/accounting" routerLinkActive="active" [queryParams]="{ view: 'sales' }" class="dgl-nav-item">
          <span class="dgl-nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </span>
          <span class="dgl-nav-text">Ventas</span>
        </a>

        <!-- Clientes -->
        <a routerLink="/reports" routerLinkActive="active" [queryParams]="{ tab: 'clients' }" class="dgl-nav-item">
          <span class="dgl-nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </span>
          <span class="dgl-nav-text">Clientes</span>
        </a>

        <!-- Reportes -->
        <a routerLink="/accounting" routerLinkActive="active" class="dgl-nav-item">
          <span class="dgl-nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
          </span>
          <span class="dgl-nav-text">Reportes</span>
        </a>

        <!-- Section: SISTEMA & CONFIGURACIÓN -->
        <div class="nav-section-title" style="margin-top: 14px;">SISTEMA & CONFIGURACIÓN</div>

        <!-- Configuración General -->
        <a routerLink="/settings" [queryParams]="{ tab: 'general' }" routerLinkActive="active" class="dgl-nav-item">
          <span class="dgl-nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </span>
          <span class="dgl-nav-text">Configuración</span>
        </a>

        <!-- Usuarios y roles -->
        <a routerLink="/settings" [queryParams]="{ tab: 'users' }" routerLinkActive="active" class="dgl-nav-item">
          <span class="dgl-nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </span>
          <span class="dgl-nav-text">Usuarios y roles</span>
        </a>

        <!-- 4. Promotional / Informational Box (Figma style) -->
        <div class="dgl-callout-card">
          <div class="callout-header">
            <span class="callout-icon">✨</span>
            <span class="callout-title">Todo en su punto.</span>
          </div>
          <p class="callout-text">De la fruta al despacho, tu planta en un solo lugar.</p>
        </div>
      </nav>

      <!-- 5. Sidebar Footer: User Profile (Figma style) -->
      <div class="sidebar-footer">

        <!-- User Profile Row -->
        <div class="user-row-box">
          <div class="user-avatar-circle">AD</div>
          <div class="user-text-box">
            <span class="user-display-name">Administrador</span>
            <span class="user-display-role">Gestión de planta</span>
          </div>
          <button
            type="button"
            class="user-logout-btn"
            title="Cerrar sesión"
            (click)="authService.logout()"
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
  `,
  styles: [`
    .sidebar {
      width: 240px;
      min-width: 240px;
      max-width: 240px;
      background: #ffffff;
      border-right: 1px solid #eef2ef;
      height: 100vh;
      display: flex;
      flex-direction: column;
      position: sticky;
      top: 0;
      z-index: 40;
      box-sizing: border-box;
    }

    .sidebar-header {
      padding: 18px 16px 14px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .dgl-logo-img {
      width: 44px;
      height: 44px;
      object-fit: contain;
      flex-shrink: 0;
    }

    .dgl-brand-text {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .dgl-brand-name {
      font-size: 1.02rem;
      font-weight: 900;
      color: #111827;
      letter-spacing: -0.02em;
      line-height: 1.15;
      white-space: nowrap;
    }

    .dgl-brand-sub {
      font-size: 0.74rem;
      color: #6b7280;
      font-weight: 500;
      margin-top: 1px;
    }

    .sidebar-plant-selector {
      padding: 0 18px 14px 18px;
    }

    .plant-label {
      font-size: 0.68rem;
      font-weight: 700;
      color: #9ca3af;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
    }

    .plant-select-box {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        border-color: #1e5e3a;
      }
    }

    .plant-name {
      font-size: 0.84rem;
      font-weight: 600;
      color: #111827;
    }

    .sidebar-nav {
      flex: 1;
      padding: 0 12px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow-y: auto;
    }

    .nav-section-title {
      font-size: 0.68rem;
      font-weight: 700;
      color: #9ca3af;
      letter-spacing: 0.05em;
      padding: 6px 10px 6px 10px;
    }

    .dgl-nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 9px 12px;
      border-radius: 10px;
      color: #4b5563;
      font-size: 0.88rem;
      font-weight: 500;
      text-decoration: none;
      transition: all 0.15s ease;
      background: transparent;

      &:hover {
        background: #f3f6f4;
        color: #111827;
      }

      &.active {
        background: #eaf5ee;
        color: #1e5e3a;
        font-weight: 700;

        .dgl-nav-icon {
          color: #1e5e3a;
        }
      }
    }

    .dgl-nav-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      color: #6b7280;
      flex-shrink: 0;
    }

    .dgl-nav-text {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .dgl-nav-badge {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 1px 7px;
      border-radius: 9999px;
      background: #ef4444;
      color: #ffffff;
    }

    .dgl-callout-card {
      background: #f0f7f2;
      border: 1px solid #dcf0e2;
      border-radius: 12px;
      padding: 12px 14px;
      margin: 14px 2px;
    }

    .callout-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
    }

    .callout-icon {
      font-size: 0.9rem;
    }

    .callout-title {
      font-size: 0.82rem;
      font-weight: 700;
      color: #111827;
    }

    .callout-text {
      font-size: 0.74rem;
      color: #4b5563;
      margin: 0;
      line-height: 1.35;
    }

    .sidebar-footer {
      padding: 12px 12px 16px 12px;
      border-top: 1px solid #eef2ef;
    }

    .user-row-box {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 8px;
      border-radius: 10px;
      background: #fafbf9;
      border: 1px solid #eef2ef;
    }

    .user-avatar-circle {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #fef3c7;
      color: #92400e;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.78rem;
      font-weight: 800;
      border: 1px solid #fde68a;
      flex-shrink: 0;
    }

    .user-text-box {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .user-display-name {
      font-size: 0.82rem;
      font-weight: 700;
      color: #111827;
      line-height: 1.2;
    }

    .user-display-role {
      font-size: 0.7rem;
      color: #6b7280;
    }

    .user-logout-btn {
      background: transparent;
      border: none;
      color: #9ca3af;
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: all 0.15s ease;

      &:hover {
        color: #ef4444;
        background: #fee2e2;
      }
    }

    @media (max-width: 1024px) {
      .sidebar {
        display: none;
      }
    }
  `]
})
export class SidebarComponent {
  readonly authService = inject(AuthService);
  readonly stateService = inject(StateService);
  private readonly router = inject(Router);

  private readonly navEnd$ = this.router.events.pipe(
    filter(e => e instanceof NavigationEnd),
    map(() => this.router.url)
  );

  private readonly urlSignal = toSignal(this.navEnd$, { initialValue: this.router.url });

  isOrderTabActive(tab: 'picking' | 'facturacion' | 'despachos'): boolean {
    const url = this.urlSignal();
    if (!url.startsWith('/orders')) return false;
    if (tab === 'facturacion') return url.includes('tab=facturacion');
    if (tab === 'despachos') return url.includes('tab=despachos');
    return !url.includes('tab=facturacion') && !url.includes('tab=despachos');
  }
}
