import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { StateService } from '../../core/services/state.service';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

/**
 * Mobile bottom navigation bar and drawer menu driven dynamically by `AuthService.groupedNavigationSections()`.
 */
@Component({
  selector: 'app-mobile-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="dgl-mobile-nav">
      <a routerLink="/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="dgl-mobile-nav-item">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7" rx="1.5"></rect>
          <rect x="14" y="3" width="7" height="7" rx="1.5"></rect>
          <rect x="14" y="14" width="7" height="7" rx="1.5"></rect>
          <rect x="3" y="14" width="7" height="7" rx="1.5"></rect>
        </svg>
        <span>Panel</span>
      </a>

      @if (authService.hasModuleAccess('/orders')) {
        <a routerLink="/orders" [queryParams]="{ tab: 'picking' }" routerLinkActive="active" class="dgl-mobile-nav-item">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </svg>
          <span>Alistamiento</span>
          @if (stateService.pendingOrdersCount() > 0) {
            <span class="dgl-mobile-badge">{{ stateService.pendingOrdersCount() }}</span>
          }
        </a>
      }

      @if (authService.hasModuleAccess('/settings')) {
        <a routerLink="/settings" [queryParams]="{ tab: 'inventory' }" routerLinkActive="active" class="dgl-mobile-nav-item">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
          <span>Inventario</span>
        </a>
      }

      <button type="button" class="dgl-mobile-nav-item" (click)="openDrawer()">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
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
      bottom: 0;
      left: 0;
      right: 0;
      height: 62px;
      background: #ffffff;
      border-top: 1px solid #eef2ef;
      box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.04);
      display: flex;
      justify-content: space-around;
      align-items: center;
      z-index: 9500;
      padding: 0 10px;
    }

    @media (min-width: 1025px) {
      .dgl-mobile-nav {
        display: none !important;
      }
    }

    .dgl-mobile-nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      color: #6b7280;
      font-size: 0.68rem;
      font-weight: 500;
      text-decoration: none;
      background: transparent;
      border: none;
      padding: 6px 12px;
      cursor: pointer;
      position: relative;
      transition: all 0.15s ease;

      &:hover {
        color: #1e5e3a;
      }

      &.active {
        color: #1e5e3a;
        font-weight: 700;

        svg {
          stroke: #1e5e3a;
          stroke-width: 2.3;
        }
      }
    }

    .dgl-mobile-badge {
      position: absolute;
      top: 3px;
      right: 12px;
      min-width: 15px;
      height: 15px;
      border-radius: 9999px;
      background: #dc2626;
      color: #ffffff;
      font-size: 0.58rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 3px;
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
  readonly showMoreDrawer = signal<boolean>(false);
  readonly environment = environment;

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
