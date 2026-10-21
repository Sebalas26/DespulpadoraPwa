import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { StateService } from '../../core/services/state.service';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-mobile-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <!-- Fixed Mobile Bottom Navigation Bar (Figma style) -->
    <nav class="dgl-mobile-nav">
      <!-- 1. Panel -->
      <a routerLink="/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="dgl-mobile-nav-item">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7" rx="1.5"></rect>
          <rect x="14" y="3" width="7" height="7" rx="1.5"></rect>
          <rect x="14" y="14" width="7" height="7" rx="1.5"></rect>
          <rect x="3" y="14" width="7" height="7" rx="1.5"></rect>
        </svg>
        <span>Panel</span>
      </a>

      <!-- 2. Alistamiento -->
      <a routerLink="/orders" [queryParams]="{ tab: 'picking' }" routerLinkActive="active" class="dgl-mobile-nav-item">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
        <span>Picking</span>
        @if (stateService.pendingOrdersCount() > 0) {
          <span class="dgl-mobile-badge">{{ stateService.pendingOrdersCount() }}</span>
        }
      </a>

      <!-- 3. Inventario y Stock -->
      <a routerLink="/settings" [queryParams]="{ tab: 'inventory' }" routerLinkActive="active" class="dgl-mobile-nav-item">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
          <line x1="12" y1="22.08" x2="12" y2="12"></line>
        </svg>
        <span>Inventario</span>
      </a>

      <!-- 4. Más (Menu Drawer Trigger) -->
      <button type="button" class="dgl-mobile-nav-item" (click)="showMoreDrawer.set(true)">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
        <span>Más</span>
      </button>
    </nav>

    <!-- Mobile Drawer for "Más" options -->
    @if (showMoreDrawer()) {
      <div class="mobile-drawer-overlay" (click)="showMoreDrawer.set(false)">
        <div class="mobile-drawer-content" (click)="$event.stopPropagation()">
          <div class="mobile-drawer-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <img src="/logo-dgl.png" alt="DGL Despulpadora" style="width: 32px; height: 32px; object-fit: contain;" />
              <span style="font-weight: 800; font-size: 1rem; color: #111827;">DGL Despulpadora</span>
            </div>
            <button class="modal-close" (click)="showMoreDrawer.set(false)">&times;</button>
          </div>

          <div class="mobile-drawer-body">
            <a routerLink="/orders" [queryParams]="{ tab: 'picking' }" class="drawer-link-item" (click)="showMoreDrawer.set(false)">
              <span class="drawer-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                  <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
              </span>
              <div>
                <div class="drawer-title">Alistamiento</div>
                <div class="drawer-desc">Checklist de pulpa en cava</div>
              </div>
            </a>

            <a routerLink="/orders" [queryParams]="{ tab: 'facturacion' }" class="drawer-link-item" (click)="showMoreDrawer.set(false)">
              <span class="drawer-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="12" y1="18" x2="12" y2="12"></line>
                  <line x1="9" y1="15" x2="15" y2="15"></line>
                </svg>
              </span>
              <div>
                <div class="drawer-title">Facturación & POS</div>
                <div class="drawer-desc">Factura ejecutiva corporativa y cobro</div>
              </div>
            </a>

            <a routerLink="/orders" [queryParams]="{ tab: 'despachos' }" class="drawer-link-item" (click)="showMoreDrawer.set(false)">
              <span class="drawer-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="1" y="3" width="15" height="13"></rect>
                  <polygon points="16 8 20 8 23 11 23 16 16 16 8"></polygon>
                  <circle cx="5.5" cy="18.5" r="2.5"></circle>
                  <circle cx="18.5" cy="18.5" r="2.5"></circle>
                </svg>
              </span>
              <div>
                <div class="drawer-title">Despachos & Rutas</div>
                <div class="drawer-desc">Control de domiciliarios y entregas</div>
              </div>
            </a>

            <a routerLink="/settings" [queryParams]="{ tab: 'inventory' }" class="drawer-link-item" (click)="showMoreDrawer.set(false)">
              <span class="drawer-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                  <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
              </span>
              <div>
                <div class="drawer-title">Inventario y Stock</div>
                <div class="drawer-desc">Cantidad de fruta disponible y stock de pulpas hechas</div>
              </div>
            </a>

            <a routerLink="/accounting" class="drawer-link-item" (click)="showMoreDrawer.set(false)">
              <span class="drawer-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </span>
              <div>
                <div class="drawer-title">Clientes</div>
                <div class="drawer-desc">Creación y directorio de clientes</div>
              </div>
            </a>

            <a routerLink="/hr" class="drawer-link-item" (click)="showMoreDrawer.set(false)">
              <span class="drawer-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </span>
              <div>
                <div class="drawer-title">Gestión de Personal</div>
                <div class="drawer-desc">Usuarios, turnos, certificaciones y pagos de nómina</div>
              </div>
            </a>

            <a routerLink="/reports" class="drawer-link-item" (click)="showMoreDrawer.set(false)">
              <span class="drawer-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="20" x2="18" y2="10"></line>
                  <line x1="12" y1="20" x2="12" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
              </span>
              <div>
                <div class="drawer-title">Ventas</div>
                <div class="drawer-desc">Listado tipo Excel y exportación de todo lo vendido</div>
              </div>
            </a>

            <a routerLink="/settings" [queryParams]="{ tab: 'general' }" class="drawer-link-item" (click)="showMoreDrawer.set(false)">
              <span class="drawer-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
              </span>
              <div>
                <div class="drawer-title">Configuración General</div>
                <div class="drawer-desc">Empresa, logo, horarios y facturación</div>
              </div>
            </a>

            <a routerLink="/settings" [queryParams]="{ tab: 'users' }" class="drawer-link-item" (click)="showMoreDrawer.set(false)">
              <span class="drawer-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </span>
              <div>
                <div class="drawer-title">Usuarios y Roles</div>
                <div class="drawer-desc">Cuentas, permisos y seguridad RBAC</div>
              </div>
            </a>

            <div style="margin-top: 14px; padding-top: 14px; border-top: 1px solid #eef2ef;">
              <button
                type="button"
                class="btn btn-outline"
                style="width: 100%; justify-content: center; color: #dc2626; border-color: #fecaca;"
                (click)="authService.logout(); showMoreDrawer.set(false)"
              >
                Cerrar Sesión
              </button>
              <div style="font-size: 0.68rem; font-weight: 600; color: #9ca3af; text-align: center; margin-top: 10px; letter-spacing: 0.04em;">
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
      padding: 20px 18px max(30px, calc(env(safe-area-inset-bottom, 16px) + 24px));
      max-height: 82vh;
      overflow-y: auto;
      box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.18);
      animation: slideUp 0.25s ease;
    }

    .mobile-drawer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #eef2ef;
    }

    .drawer-link-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 11px 12px;
      border-radius: 12px;
      text-decoration: none;
      transition: background 0.15s ease;
      margin-bottom: 4px;

      &:hover {
        background: #f6f8f7;
      }
    }

    .drawer-icon {
      font-size: 1.3rem;
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: #f0f7f2;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .drawer-title {
      font-size: 0.88rem;
      font-weight: 700;
      color: #111827;
    }

    .drawer-desc {
      font-size: 0.74rem;
      color: #6b7280;
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
}
