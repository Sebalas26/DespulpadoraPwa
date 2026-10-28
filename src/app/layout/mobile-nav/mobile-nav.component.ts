import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { StateService } from '../../core/services/state.service';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

/**
 * Mobile bottom navigation bar and drawer menu driven dynamically by `AuthService.groupedNavigationSections()`.
 */
@Component({
  selector: 'app-mobile-nav',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <nav class="dgl-mobile-nav">
      <a
        routerLink="/dashboard"
        class="dgl-mobile-nav-item"
        [class.active]="isMobileTabActive('home')"
        (click)="closeDrawer()"
      >
        <svg class="nav-icon-outline" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1v-9.5Z"></path>
        </svg>
        <svg class="nav-icon-solid" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.35 2.25a1 1 0 0 1 1.3 0l9 7.5a1 1 0 0 1 .35.76V20a2 2 0 0 1-2 2h-5.5a1 1 0 0 1-1-1v-5.5h-3V21a1 1 0 0 1-1 1H4a2 2 0 0 1-2-2v-9.49a1 1 0 0 1 .35-.76l9-7.5Z"></path>
        </svg>
        <span>Inicio</span>
      </a>

      @if (authService.hasModuleAccess('/orders')) {
        <a
          routerLink="/orders"
          [queryParams]="{ tab: 'picking' }"
          class="dgl-mobile-nav-item"
          [class.active]="isMobileTabActive('orders')"
          (click)="closeDrawer()"
        >
          <svg class="nav-icon-outline" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 3h14a1 1 0 0 1 1 1v17l-3-2-3 2-2-2-2 2-3-2-3 2V4a1 1 0 0 1 1-1Z"></path>
            <line x1="9" y1="9" x2="15" y2="9"></line>
            <line x1="9" y1="13" x2="15" y2="13"></line>
          </svg>
          <svg class="nav-icon-solid" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 2a2 2 0 0 0-2 2v17a1 1 0 0 0 1.55.83L7 20.2l2.45 1.63a1 1 0 0 0 1.26-.12L12 20.4l1.29 1.31a1 1 0 0 0 1.26.12L17 20.2l2.45 1.63A1 1 0 0 0 21 21V4a2 2 0 0 0-2-2H5Zm4 6h6a1 1 0 1 1 0 2H9a1 1 0 1 1 0-2Zm0 4h6a1 1 0 1 1 0 2H9a1 1 0 1 1 0-2Z"></path>
          </svg>
          <span>Pedidos</span>
          @if (stateService.pendingOrdersCount() > 0) {
            <span class="dgl-mobile-badge">{{ stateService.pendingOrdersCount() }}</span>
          }
        </a>

        <a
          routerLink="/orders"
          [queryParams]="{ tab: 'despachos' }"
          class="dgl-mobile-nav-item"
          [class.active]="isMobileTabActive('routes')"
          (click)="closeDrawer()"
        >
          <svg class="nav-icon-outline" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="6" cy="19" r="3"></circle>
            <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"></path>
            <circle cx="18" cy="5" r="3"></circle>
          </svg>
          <svg class="nav-icon-solid" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="6" cy="19" r="3" fill="currentColor"></circle>
            <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"></path>
            <circle cx="18" cy="5" r="3" fill="currentColor"></circle>
          </svg>
          <span>Rutas</span>
        </a>
      }

      @if (authService.hasModuleAccess('/settings')) {
        <a
          routerLink="/settings"
          [queryParams]="{ tab: 'inventory' }"
          class="dgl-mobile-nav-item"
          [class.active]="isMobileTabActive('inventory')"
          (click)="closeDrawer()"
        >
          <svg class="nav-icon-outline" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
          <svg class="nav-icon-solid" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" fill="rgba(17, 24, 39, 0.12)"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
          <span>Inventario</span>
        </a>
      }

      <button
        type="button"
        class="dgl-mobile-nav-item"
        [class.active]="showMoreDrawer()"
        (click)="openDrawer()"
      >
        <svg class="nav-icon-outline" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="6" cy="6" r="1.8"></circle>
          <circle cx="12" cy="6" r="1.8"></circle>
          <circle cx="18" cy="6" r="1.8"></circle>
          <circle cx="6" cy="12" r="1.8"></circle>
          <circle cx="12" cy="12" r="1.8"></circle>
          <circle cx="18" cy="12" r="1.8"></circle>
          <circle cx="6" cy="18" r="1.8"></circle>
          <circle cx="12" cy="18" r="1.8"></circle>
          <circle cx="18" cy="18" r="1.8"></circle>
        </svg>
        <svg class="nav-icon-solid" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="6" cy="6" r="2.2"></circle>
          <circle cx="12" cy="6" r="2.2"></circle>
          <circle cx="18" cy="6" r="2.2"></circle>
          <circle cx="6" cy="12" r="2.2"></circle>
          <circle cx="12" cy="12" r="2.2"></circle>
          <circle cx="18" cy="12" r="2.2"></circle>
          <circle cx="6" cy="18" r="2.2"></circle>
          <circle cx="12" cy="18" r="2.2"></circle>
          <circle cx="18" cy="18" r="2.2"></circle>
        </svg>
        <span>Más</span>
      </button>
    </nav>

    @if (showMoreDrawer()) {
      <div class="mobile-drawer-overlay" (click)="closeDrawer()">
        <div class="mobile-drawer-content" (click)="$event.stopPropagation()">
          <div class="mobile-drawer-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <img [src]="stateService.companyInfo().logoUrl || '/logo-dgl.png'" [alt]="stateService.companyInfo().companyName" style="width: 32px; height: 32px; object-fit: contain;" />
              <div>
                <div style="font-weight: 800; font-size: 1rem; color: #111827;">{{ stateService.companyInfo().companyName }}</div>
                <div style="font-size: 0.72rem; color: #6b7280;">{{ authService.user()?.fullName }} ({{ authService.user()?.roleName }})</div>
              </div>
            </div>
            <button class="modal-close" (click)="closeDrawer()">&times;</button>
          </div>

          <div class="mobile-drawer-body">
            <a routerLink="/portal-clientes" class="drawer-link-item" (click)="closeDrawer()">
              <span class="drawer-icon" style="background: rgba(30, 94, 58, 0.12); color: #1e5e3a;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="9" cy="21" r="1"></circle>
                  <circle cx="20" cy="21" r="1"></circle>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
              </span>
              <div>
                <div class="drawer-title">Portal Clientes</div>
                <div class="drawer-desc">Catálogo digital y autopedido</div>
              </div>
            </a>

            @if (authService.hasModuleAccess('/portal-admin')) {
              <a routerLink="/portal-admin" class="drawer-link-item" (click)="closeDrawer()">
                <span class="drawer-icon" style="background: rgba(30, 94, 58, 0.12); color: #1e5e3a;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                </span>
                <div>
                  <div class="drawer-title" style="color: #164a2d; font-weight: 800;">Admin. Portal Clientes</div>
                  <div class="drawer-desc">Editar fotos, precios y textos de las cards</div>
                </div>
              </a>
            }

            @for (section of authService.groupedNavigationSections(); track section.sectionName) {
              <div style="font-size: 0.68rem; font-weight: 800; color: #9ca3af; letter-spacing: 0.05em; padding: 8px 12px 4px 12px; text-transform: uppercase;">
                {{ section.sectionName }}
              </div>
              @for (mod of section.modules; track mod.moduleId) {
                <a
                  [routerLink]="getRoutePath(mod.frontendRoute)"
                  [queryParams]="getRouteQueryParams(mod.frontendRoute)"
                  class="drawer-link-item"
                  (click)="closeDrawer()"
                >
                  <span class="drawer-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="3" width="7" height="7" rx="1.5"></rect>
                      <rect x="14" y="3" width="7" height="7" rx="1.5"></rect>
                      <rect x="14" y="14" width="7" height="7" rx="1.5"></rect>
                      <rect x="3" y="14" width="7" height="7" rx="1.5"></rect>
                    </svg>
                  </span>
                  <div>
                    <div class="drawer-title">{{ mod.name }}</div>
                    <div class="drawer-desc">{{ mod.menuSection }} · {{ mod.frontendRoute }}</div>
                  </div>
                </a>
              }
            }

            <div class="mobile-drawer-footer">
              <button
                type="button"
                class="btn btn-outline drawer-logout-btn"
                (click)="onLogoutClick()"
              >
                Cerrar Sesión
              </button>
              <div class="drawer-version-text">
                V. {{ environment.version }}
              </div>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .dgl-mobile-nav {
      position: fixed;
      bottom: max(10px, calc(env(safe-area-inset-bottom, 0px) + 6px));
      left: 12px;
      right: 12px;
      max-width: 460px;
      margin: 0 auto;
      height: 68px;
      background: rgba(255, 255, 255, 0.98);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(226, 232, 240, 0.92);
      border-radius: 9999px;
      box-shadow:
        0 10px 30px rgba(15, 23, 42, 0.14),
        0 2px 8px rgba(15, 23, 42, 0.06);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 4px;
      z-index: 9500;
      padding: 6px;
      box-sizing: border-box;
    }

    @media (min-width: 1025px) {
      .dgl-mobile-nav {
        display: none !important;
      }
    }

    .dgl-mobile-nav-item {
      flex: 1 1 0%;
      min-width: 0;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      color: #6b7280;
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: -0.01em;
      white-space: nowrap;
      text-decoration: none;
      background: transparent;
      border: none;
      border-radius: 9999px;
      padding: 6px 4px;
      cursor: pointer;
      position: relative;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

      .nav-icon-solid {
        display: none;
      }

      .nav-icon-outline {
        display: block;
      }

      &:hover:not(.active) {
        color: #111827;
        background: rgba(241, 245, 249, 0.6);
      }

      &.active {
        background: #f1f5f9;
        color: #111827;
        font-weight: 800;

        .nav-icon-outline {
          display: none;
        }

        .nav-icon-solid {
          display: block;
          color: #111827;
        }
      }
    }

    .dgl-mobile-badge {
      position: absolute;
      top: 4px;
      right: calc(50% - 19px);
      min-width: 16px;
      height: 16px;
      border-radius: 9999px;
      background: #dc2626;
      color: #ffffff;
      border: 1.5px solid #ffffff;
      font-size: 0.58rem;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 3.5px;
    }

    .mobile-drawer-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.55);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      z-index: 99999;
      display: flex;
      align-items: flex-end;
      animation: fadeIn 0.2s ease;
    }

    .mobile-drawer-content {
      position: relative;
      z-index: 100000;
      width: 100%;
      background: #ffffff;
      border-radius: 20px 20px 0 0;
      padding: 16px 18px max(20px, env(safe-area-inset-bottom, 16px));
      max-height: 94dvh;
      overflow-y: auto;
      box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.18);
      animation: slideUp 0.25s ease;
    }

    .mobile-drawer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
      padding-bottom: 12px;
      border-bottom: 1px solid #eef2ef;
    }

    .drawer-link-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 12px;
      text-decoration: none;
      transition: background 0.15s ease;
      margin-bottom: 4px;

      &:hover {
        background: #f6f8f7;
      }
    }

    .drawer-icon {
      font-size: 1.25rem;
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: #f0f7f2;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .drawer-title {
      font-size: 0.87rem;
      font-weight: 700;
      color: #111827;
      line-height: 1.25;
    }

    .drawer-desc {
      font-size: 0.73rem;
      color: #6b7280;
      line-height: 1.25;
      margin-top: 2px;
    }

    .mobile-drawer-footer {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #eef2ef;
    }

    .drawer-logout-btn {
      width: 100%;
      justify-content: center;
      color: #dc2626 !important;
      border-color: #fecaca !important;
      padding: 10px 14px !important;
      font-size: 0.86rem !important;
    }

    .drawer-version-text {
      font-size: 0.68rem;
      font-weight: 600;
      color: #9ca3af;
      text-align: center;
      margin-top: 8px;
      letter-spacing: 0.04em;
    }

    @keyframes slideUp {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `]
})
export class MobileNavComponent {
  readonly stateService = inject(StateService);
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly showMoreDrawer = signal<boolean>(false);
  readonly currentUrl = signal<string>(this.router.url || '/dashboard');
  readonly environment = environment;

  /**
   * Subscribes to router navigation events to keep the active mobile tab synchronized.
   */
  constructor() {
    try {
      this.router.events
        .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
        .subscribe((event: NavigationEnd) => {
          this.currentUrl.set(event.urlAfterRedirects || event.url);
        });
    } catch {
      return;
    }
  }

  /**
   * Determines whether a specific mobile bottom navigation tab is currently active.
   */
  isMobileTabActive(tab: 'home' | 'orders' | 'routes' | 'inventory'): boolean {
    try {
      if (this.showMoreDrawer()) {
        return false;
      }
      const url: string = this.currentUrl() || this.router.url || '';
      const path: string = url.split('?')[0] || '/dashboard';

      if (tab === 'home') {
        return path === '/dashboard' || path === '/';
      }
      if (tab === 'orders') {
        return path === '/orders' && !url.includes('tab=despachos') && !url.includes('tab=facturacion');
      }
      if (tab === 'routes') {
        return path === '/orders' && url.includes('tab=despachos');
      }
      if (tab === 'inventory') {
        return (
          (path === '/settings' &&
            (url.includes('tab=inventory') ||
              url.includes('tab=variants') ||
              url.includes('tab=fruits') ||
              url.includes('tab=cava'))) ||
          path === '/kds-inventory'
        );
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Computes the two-letter avatar initials of the currently authenticated user.
   */
  readonly userInitials = computed<string>(() => {
    try {
      const name = (
        this.authService.user()?.fullName ||
        this.authService.user()?.username ||
        ''
      ).trim();
      if (!name) {
        return '';
      }
      const parts = name.split(/\s+/);
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    } catch {
      return '';
    }
  });

  /**
   * Opens the mobile navigation drawer.
   */
  openDrawer(): void {
    try {
      this.showMoreDrawer.set(true);
    } catch {
      return;
    }
  }

  /**
   * Closes the mobile navigation drawer.
   */
  closeDrawer(): void {
    try {
      this.showMoreDrawer.set(false);
    } catch {
      return;
    }
  }

  /**
   * Logs out the current user and closes the mobile navigation drawer.
   */
  onLogoutClick(): void {
    try {
      this.authService.logout();
      this.showMoreDrawer.set(false);
    } catch {
      return;
    }
  }

  /**
   * Extracts the clean router path from a `frontendRoute` string.
   */
  getRoutePath(frontendRoute: string): string {
    try {
      return (frontendRoute || '/dashboard').split('?')[0];
    } catch {
      return '/dashboard';
    }
  }

  /**
   * Parses query parameters embedded in a `frontendRoute` string if present.
   */
  getRouteQueryParams(frontendRoute: string): Record<string, string> | null {
    try {
      const parts = (frontendRoute || '').split('?');
      if (parts.length < 2 || !parts[1]) {
        return null;
      }
      const params: Record<string, string> = {};
      const searchParams = new URLSearchParams(parts[1]);
      searchParams.forEach((val, key) => {
        params[key] = val;
      });
      return params;
    } catch {
      return null;
    }
  }
}
