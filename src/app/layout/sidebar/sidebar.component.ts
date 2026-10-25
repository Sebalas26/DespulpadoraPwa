import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { StateService } from '../../core/services/state.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar" [class.collapsed]="stateService.isSidebarCollapsed()">
      <!-- 1. Brand Logo & Name -->
      <div class="sidebar-header">
        <img src="/logo-dgl.png" alt="DGL Despulpadora" class="dgl-logo-img" />
        <div class="dgl-brand-text">
          <span class="dgl-brand-name">DGL Despulpadora</span>
          <span class="dgl-brand-sub">Gestión de pulpas</span>
        </div>
        <button
          type="button"
          class="sidebar-collapse-btn"
          title="Ocultar menú lateral"
          (click)="stateService.toggleSidebar()"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="9" y1="3" x2="9" y2="21"></line>
            <polyline points="15 15 12 12 15 9"></polyline>
          </svg>
        </button>
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

        <!-- Portal Clientes (Catálogo Público & Pedidos) -->
        <a routerLink="/portal-clientes" routerLinkActive="active" class="dgl-nav-item" title="Ver catálogo digital de clientes y autopedido">
          <span class="dgl-nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
          </span>
          <span class="dgl-nav-text">Portal Clientes</span>
          <span class="dgl-nav-badge" style="background: #1e5e3a; color: white; font-weight: 800;">CATÁLOGO</span>
        </a>

        <!-- Admin Catálogo (Fotos, Textos y Precios) -->
        <a routerLink="/portal-admin" routerLinkActive="active" class="dgl-nav-item" title="Administrar fotos, precios y textos de las cards del Portal Clientes">
          <span class="dgl-nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
          </span>
          <span class="dgl-nav-text">Admin Catálogo</span>
          <span class="dgl-nav-badge" style="background: #0284c7; color: white; font-weight: 700;">CMS</span>
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

        <!-- Inventario y Stock (Unifica Fruta Disponible + Pulpas Hechas) -->
        <a
          routerLink="/settings"
          [queryParams]="{ tab: 'inventory' }"
          [class.active]="isSettingsTabActive('inventory')"
          class="dgl-nav-item"
        >
          <span class="dgl-nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          </span>
          <span class="dgl-nav-text">Inventario y Stock</span>
        </a>

        <!-- Reportes Gerenciales -->
        <a routerLink="/reports" routerLinkActive="active" class="dgl-nav-item" title="Centro de Reportes Gerenciales">
          <span class="dgl-nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
          </span>
          <span class="dgl-nav-text">Reportes</span>
        </a>

        <!-- Clientes -->
        <a routerLink="/accounting" routerLinkActive="active" class="dgl-nav-item">
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

        <!-- Gestión de Personal -->
        <a
          routerLink="/hr"
          routerLinkActive="active"
          class="dgl-nav-item"
          title="Gestión de Personal"
        >
          <span class="dgl-nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </span>
          <span class="dgl-nav-text">Gestión de Personal</span>
        </a>

        <!-- Section: SISTEMA & CONFIGURACIÓN -->
        <div class="nav-section-title" style="margin-top: 14px;">SISTEMA & CONFIGURACIÓN</div>

        <!-- Configuración General -->
        <a
          routerLink="/settings"
          [queryParams]="{ tab: 'general' }"
          [class.active]="isSettingsTabActive('general')"
          class="dgl-nav-item"
        >
          <span class="dgl-nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </span>
          <span class="dgl-nav-text">Configuración</span>
        </a>

        <!-- 4. Promotional / Informational Box (Figma style) -->
        <div class="dgl-callout-card">
          <div class="callout-header">
            <span class="callout-icon" style="display: inline-flex; align-items: center; justify-content: center; color: #1e5e3a;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l2.4 7.4h7.6l-6.1 4.5 2.3 7.1-6.2-4.6-6.2 4.6 2.3-7.1-6.1-4.5h7.6z"/>
              </svg>
            </span>
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

        <div class="sidebar-version-badge">
          V. {{ environment.version }}
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
      overflow: hidden;
      transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1),
                  min-width 0.25s cubic-bezier(0.4, 0, 0.2, 1),
                  max-width 0.25s cubic-bezier(0.4, 0, 0.2, 1),
                  opacity 0.2s ease,
                  border-color 0.2s ease;

      &.collapsed {
        width: 0;
        min-width: 0;
        max-width: 0;
        border-right-width: 0;
        opacity: 0;
        pointer-events: none;
      }
    }

    .sidebar-header {
      padding: 16px 12px 14px 14px;
      display: flex;
      align-items: center;
      gap: 8px;
      justify-content: space-between;
    }

    .dgl-logo-img {
      width: 40px;
      height: 40px;
      object-fit: contain;
      flex-shrink: 0;
    }

    .dgl-brand-text {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .dgl-brand-name {
      font-size: 0.96rem;
      font-weight: 900;
      color: #111827;
      letter-spacing: -0.02em;
      line-height: 1.15;
      white-space: nowrap;
    }

    .dgl-brand-sub {
      font-size: 0.72rem;
      color: #6b7280;
      font-weight: 500;
      margin-top: 1px;
      white-space: nowrap;
    }

    .sidebar-collapse-btn {
      width: 28px;
      height: 28px;
      border-radius: 7px;
      border: 1px solid #e5e7eb;
      background: #f8faf8;
      color: #4b5563;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
      transition: all 0.18s ease;

      &:hover {
        background: #eaf5ee;
        border-color: #1e5e3a;
        color: #1e5e3a;
      }
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
      padding: 8px 10px;
      border-radius: 12px;
      background: #fefce8;
      border: 1px solid #fde047;
      box-shadow: 0 2px 8px rgba(234, 179, 8, 0.12);
      transition: all 0.2s ease;

      &:hover {
        background: #fef9c3;
        border-color: #facc15;
        box-shadow: 0 4px 12px rgba(234, 179, 8, 0.18);
      }
    }

    .sidebar-version-badge {
      font-size: 0.68rem;
      font-weight: 600;
      color: #9ca3af;
      text-align: center;
      margin-top: 8px;
      letter-spacing: 0.05em;
      user-select: none;
    }

    .user-avatar-circle {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #ffffff;
      color: #854d0e;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.78rem;
      font-weight: 800;
      border: 1.5px solid #facc15;
      box-shadow: 0 1px 4px rgba(202, 138, 4, 0.15);
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
      font-weight: 750;
      color: #451a03;
      line-height: 1.2;
    }

    .user-display-role {
      font-size: 0.7rem;
      color: #854d0e;
      font-weight: 600;
    }

    .user-logout-btn {
      background: transparent;
      border: none;
      color: #a16207;
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
  readonly environment = environment;
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

  isSettingsTabActive(tab: 'inventory' | 'general' | 'users'): boolean {
    const url = this.urlSignal();
    if (!url.startsWith('/settings')) return false;
    if (tab === 'inventory') {
      return (
        url.includes('tab=inventory') ||
        url.includes('tab=variants') ||
        url.includes('tab=fruits') ||
        url.includes('tab=cava')
      );
    }
    if (tab === 'users') {
      return url.includes('tab=users') || url.includes('tab=usuarios') || url.includes('tab=roles');
    }
    return (
      url.includes('tab=general') ||
      url.includes('tab=empresa') ||
      (!url.includes('tab=inventory') &&
        !url.includes('tab=variants') &&
        !url.includes('tab=fruits') &&
        !url.includes('tab=cava') &&
        !url.includes('tab=users') &&
        !url.includes('tab=usuarios') &&
        !url.includes('tab=roles'))
    );
  }

}
