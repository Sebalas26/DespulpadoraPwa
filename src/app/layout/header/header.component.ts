import {
  Component,
  HostBinding,
  HostListener,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, filter, map } from 'rxjs/operators';
import { of } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { StateService } from '../../core/services/state.service';
import { VoiceOrdersService } from '../../core/services/voice-orders.service';

/**
 * Top application bar component displaying the active module breadcrumb, KDS shortcuts,
 * network connectivity indicator, company branding, and user avatar initials.
 */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="topbar" [class.header-hidden]="isHeaderHidden()">
      <div class="topbar-left no-mobile">
        @if (stateService.isSidebarCollapsed()) {
          <button
            type="button"
            class="sidebar-toggle-btn"
            title="Mostrar menú lateral"
            (click)="stateService.toggleSidebar()"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
              <polyline points="13 9 16 12 13 15"></polyline>
            </svg>
          </button>

          <div class="header-collapsed-brand">
            <img [src]="stateService.companyInfo().logoUrl || '/logo-dgl.png'" [alt]="stateService.companyInfo().companyName" class="header-logo-img" />
            <div class="header-brand-text">
              <span class="header-brand-name">{{ stateService.companyInfo().companyName }}</span>
              <span class="header-brand-sub">{{ stateService.companyInfo().tagline }}</span>
            </div>
          </div>
          <span class="header-brand-divider"></span>
        }

        <div class="dgl-breadcrumb">
          <span class="breadcrumb-current">{{ currentRouteTitle() }}</span>
        </div>
      </div>

      <div class="mobile-only-header only-mobile">
        <div class="mobile-brand">
          <img [src]="stateService.companyInfo().logoUrl || '/logo-dgl.png'" [alt]="stateService.companyInfo().companyName" style="width: 34px; height: 34px; object-fit: contain;" />
          <span class="mobile-brand-title">{{ stateService.companyInfo().companyName }}</span>
        </div>
      </div>

      <div class="topbar-actions">
        <button
          type="button"
          class="btn-kds-access"
          (click)="navigateToKds()"
          title="Abrir pantalla dedicada de alistamiento de pedidos (KDS en Inventario)"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>
          <span class="kds-access-label">Pantalla de Alistamiento</span>
          <span class="kds-access-badge">KDS</span>
        </button>

        <button
          type="button"
          class="btn-kds-access btn-kds-inventory"
          (click)="navigateToInventoryKds()"
          title="Abrir pantalla KDS de control y alimentación de inventario y stock en planta/inventario"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
          <span class="kds-access-label">KDS Inventario & Stock</span>
          <span class="kds-access-badge badge-inventory">PLANTA</span>
        </button>

        <button
          type="button"
          class="btn-kds-access btn-kds-portal"
          (click)="navigateToClientPortal()"
          title="Abrir portal de autopedido y catálogo digital para clientes"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
          <span class="kds-access-label">Portal Clientes</span>
          <span class="kds-access-badge badge-portal">PEDIDOS</span>
        </button>

        <div
          class="online-pill"
          [class.offline]="!stateService.isOnline()"
          [title]="stateService.isOnline() ? 'Sistema conectado a la red' : 'Sin conexión'"
        >
          <span class="online-dot" [style.background]="stateService.isOnline() ? '#1e5e3a' : '#dc2626'"></span>
          <span class="online-text">{{ stateService.isOnline() ? 'En línea' : 'Desconectado' }}</span>
        </div>

        <button
          type="button"
          class="topbar-icon-btn"
          title="Notificaciones operativas"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          @if (stateService.lowStockFruitsCount() > 0) {
            <span class="notification-dot"></span>
          }
        </button>

        <div class="mobile-user-avatar only-mobile" [title]="authService.user()?.roleName || ''">
          <span>{{ userInitials() }}</span>
        </div>

        <button
          type="button"
          class="btn btn-dgl-primary no-mobile"
          title="Crear un nuevo pedido para alistamiento"
          (click)="onNewOrderClick()"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>Nuevo pedido</span>
        </button>
      </div>
    </header>
  `,
  styles: [`
    :host {
      display: block;
      position: sticky;
      top: 0;
      z-index: 100;
      width: 100%;
      will-change: transform, opacity;
      transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1),
                  opacity 0.28s ease,
                  visibility 0.28s ease;
    }

    :host(.header-hidden) {
      transform: translateY(-100%);
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
    }

    .topbar {
      height: 64px;
      border-bottom: 1px solid var(--border-subtle);
      border-left: 1px solid var(--border-subtle);
      border-top-left-radius: 20px;
      border-bottom-left-radius: 20px;
      background: #ffffff !important;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      width: 100%;
      box-sizing: border-box;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      position: relative;
      z-index: 100;
      will-change: transform, opacity;
      transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1),
                  opacity 0.28s ease,
                  visibility 0.28s ease;
    }

    @media (max-width: 1024px) {
      .topbar {
        border-left: none;
        border-top-left-radius: 0;
        border-bottom-left-radius: 0;
      }
    }

    .topbar.header-hidden {
      transform: translateY(-100%);
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
    }

    .topbar-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .sidebar-toggle-btn {
      width: 30px;
      height: 30px;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      background: #f8faf8;
      color: #374151;
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

    .header-collapsed-brand {
      display: flex;
      align-items: center;
      gap: 9px;
      animation: fadeInBrand 0.2s ease;
    }

    @keyframes fadeInBrand {
      from { opacity: 0; transform: translateX(-6px); }
      to { opacity: 1; transform: translateX(0); }
    }

    .header-logo-img {
      width: 38px;
      height: 38px;
      object-fit: contain;
      flex-shrink: 0;
    }

    .header-brand-text {
      display: flex;
      flex-direction: column;
    }

    .header-brand-name {
      font-size: 0.94rem;
      font-weight: 900;
      color: #111827;
      letter-spacing: -0.02em;
      line-height: 1.15;
      white-space: nowrap;
    }

    .header-brand-sub {
      font-size: 0.7rem;
      color: #6b7280;
      font-weight: 500;
      margin-top: 1px;
      white-space: nowrap;
    }

    .header-brand-divider {
      width: 1px;
      height: 24px;
      background: #e5e7eb;
      flex-shrink: 0;
    }

    .dgl-breadcrumb {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.92rem;
    }

    .breadcrumb-current {
      color: #111827;
      font-weight: 800;
    }

    .mobile-only-header {
      display: none;
    }

    .mobile-brand {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .mobile-logo-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: #1e5e3a;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .mobile-brand-title {
      font-weight: 800;
      font-size: 1.15rem;
      color: #111827;
      letter-spacing: -0.02em;
    }

    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .btn-kds-access {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 5px 12px;
      background: #eaf5ee;
      border: 1.5px solid #bbf7d0;
      border-radius: 9999px;
      color: #1e5e3a;
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 1px 3px rgba(30, 94, 58, 0.1);

      &:hover {
        background: #1e5e3a;
        border-color: #1e5e3a;
        color: #ffffff;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(30, 94, 58, 0.28);

        .kds-access-badge {
          background: rgba(255, 255, 255, 0.25);
          color: #ffffff;
        }
      }

      &:active {
        transform: translateY(0);
      }

      .kds-access-badge {
        font-size: 0.65rem;
        font-weight: 900;
        background: #dcfce7;
        color: #166534;
        padding: 1px 6px;
        border-radius: 4px;
        letter-spacing: 0.03em;
        transition: all 0.2s ease;
      }

      &.btn-kds-inventory {
        background: #eff6ff;
        border-color: #93c5fd;
        color: #1d4ed8;
        box-shadow: 0 1px 3px rgba(37, 99, 235, 0.1);

        &:hover {
          background: #2563eb;
          border-color: #2563eb;
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.28);

          .badge-inventory {
            background: rgba(255, 255, 255, 0.25);
            color: #ffffff;
          }
        }

        .badge-inventory {
          background: #dbeafe;
          color: #1e40af;
        }
      }

      &.btn-kds-portal {
        background: #fffbeb;
        border-color: #fde68a;
        color: #b45309;
        box-shadow: 0 1px 3px rgba(217, 119, 6, 0.1);

        &:hover {
          background: #d97706;
          border-color: #d97706;
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(217, 119, 6, 0.28);

          .badge-portal {
            background: rgba(255, 255, 255, 0.25);
            color: #ffffff;
          }
        }

        .badge-portal {
          background: #fef3c7;
          color: #92400e;
        }
      }
    }

    @media (max-width: 900px) {
      .kds-access-label {
        display: none;
      }
    }

    .online-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: #f0f7f2;
      border: 1px solid #d1e7d8;
      border-radius: 9999px;
      font-size: 0.78rem;
      color: #1e5e3a;
      font-weight: 600;
      transition: all 0.2s ease;

      &.offline {
        background: #fef2f2;
        border-color: #fecaca;
        color: #dc2626;
        font-weight: 700;

        .online-dot {
          background: #dc2626;
        }
      }
    }

    .online-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #1e5e3a;
    }

    .topbar-icon-btn {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: transparent;
      border: 1px solid #e5e7eb;
      color: #4b5563;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      position: relative;
      transition: all 0.15s ease;

      &:hover {
        background: #f9fafb;
        color: #111827;
        border-color: #d1d5db;
      }
    }

    .notification-dot {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #ef4444;
      border: 1.5px solid #ffffff;
    }

    .mobile-user-avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: #fef3c7;
      color: #92400e;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      font-weight: 800;
      border: 1px solid #fde68a;
    }

    .topbar-wa-btn {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 6px 12px;
      border-radius: 9999px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      position: relative;
      transition: all 0.2s ease;

      &:hover {
        background: #dcfce7;
        border-color: #86efac;
        transform: translateY(-1px);
      }

      &.has-pending {
        background: #25d366;
        color: #ffffff;
        border-color: #1ebd5a;
        box-shadow: 0 2px 8px rgba(37, 211, 102, 0.35);
        animation: waPulse 2.5s infinite;

        .wa-btn-icon-wrapper svg {
          stroke: #ffffff;
        }

        .wa-badge-count {
          background: #ffffff;
          color: #166534;
        }
      }
    }

    @keyframes waPulse {
      0% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.5); }
      70% { box-shadow: 0 0 0 8px rgba(37, 211, 102, 0); }
      100% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0); }
    }

    .wa-btn-icon-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .wa-badge-count {
      background: #ef4444;
      color: #ffffff;
      font-size: 0.72rem;
      font-weight: 800;
      min-width: 18px;
      height: 18px;
      border-radius: 9999px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
    }

    .btn-dgl-primary {
      background: #1e5e3a !important;
      color: #ffffff !important;
      padding: 8px 18px !important;
      border-radius: 9999px !important;
      font-size: 0.84rem !important;
      font-weight: 600 !important;
      gap: 6px !important;
      box-shadow: 0 2px 6px rgba(30, 94, 58, 0.25) !important;
      text-decoration: none !important;
      display: inline-flex !important;
      align-items: center !important;
      border: none !important;
      transition: all 0.2s ease !important;

      &:hover {
        background: #164a2d !important;
        transform: translateY(-1px);
        box-shadow: 0 4px 10px rgba(30, 94, 58, 0.35) !important;
      }
    }

    @media (max-width: 768px) {
      .no-mobile {
        display: none !important;
      }
      .only-mobile {
        display: flex !important;
      }
      .topbar {
        padding: 0 10px !important;
        gap: 6px;
      }
      .mobile-only-header {
        min-width: 0;
        flex: 1;
      }
      .mobile-brand {
        gap: 6px;
        min-width: 0;
      }
      .mobile-brand img {
        width: 28px !important;
        height: 28px !important;
        flex-shrink: 0;
      }
      .mobile-brand-title {
        font-size: 0.9rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .topbar-actions {
        gap: 5px;
        flex-shrink: 0;
      }
      .online-pill {
        padding: 3px 7px;
        gap: 4px;
        font-size: 0.68rem;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .btn-kds-access {
        width: 30px;
        height: 30px;
        padding: 0;
        gap: 0;
        border-radius: 50%;
        justify-content: center;
        flex-shrink: 0;

        .kds-access-label,
        .kds-access-badge {
          display: none !important;
        }
      }
      .topbar-icon-btn,
      .mobile-user-avatar {
        width: 30px;
        height: 30px;
        font-size: 0.72rem;
        flex-shrink: 0;
      }
    }

    @media (min-width: 769px) {
      .only-mobile {
        display: none !important;
      }
    }
  `]
})
export class HeaderComponent implements OnInit, OnDestroy {
  readonly authService = inject(AuthService);
  readonly stateService = inject(StateService);
  readonly voiceOrdersService = inject(VoiceOrdersService);
  private readonly router = inject(Router);

  readonly isHeaderHidden = signal<boolean>(false);
  private lastScrollY = 0;
  private readonly scrollThreshold = 8;
  private cleanupScrollListeners?: () => void;

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
   * Binds the `header-hidden` CSS class on the host element when the header is auto-hidden on scroll.
   */
  @HostBinding('class.header-hidden')
  get hostHeaderHidden(): boolean {
    try {
      return this.isHeaderHidden();
    } catch {
      return false;
    }
  }

  /**
   * Initializes scroll event listeners and route change resets.
   */
  ngOnInit(): void {
    try {
      if (typeof window !== 'undefined') {
        const scrollHandler = (): void => this.handleScroll();
        window.addEventListener('scroll', scrollHandler, { passive: true });
        document.addEventListener('scroll', scrollHandler, { passive: true, capture: true });

        this.cleanupScrollListeners = (): void => {
          window.removeEventListener('scroll', scrollHandler);
          document.removeEventListener('scroll', scrollHandler, { capture: true });
        };
      }

      this.router.events
        .pipe(
          filter((e): e is NavigationEnd => e instanceof NavigationEnd),
          catchError(() => of())
        )
        .subscribe(() => {
          this.isHeaderHidden.set(false);
          this.lastScrollY = 0;
        });
    } catch {
      return;
    }
  }

  /**
   * Cleans up registered window and document scroll listeners.
   */
  ngOnDestroy(): void {
    try {
      if (this.cleanupScrollListeners) {
        this.cleanupScrollListeners();
      }
    } catch {
      return;
    }
  }

  /**
   * Handles window scroll events to toggle header visibility.
   */
  @HostListener('window:scroll')
  onWindowScroll(): void {
    try {
      this.handleScroll();
    } catch {
      return;
    }
  }

  /**
   * Evaluates vertical scroll delta to auto-hide or reveal the header.
   */
  private handleScroll(): void {
    try {
      if (typeof window === 'undefined') {
        return;
      }

      const currentScrollY =
        window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;

      if (currentScrollY <= 25) {
        this.isHeaderHidden.set(false);
        this.lastScrollY = currentScrollY;
        return;
      }

      const delta = currentScrollY - this.lastScrollY;

      if (Math.abs(delta) < this.scrollThreshold) {
        return;
      }

      if (delta > 0 && currentScrollY > 64) {
        this.isHeaderHidden.set(true);
      } else if (delta < 0) {
        this.isHeaderHidden.set(false);
      }

      this.lastScrollY = currentScrollY;
    } catch {
      return;
    }
  }

  private readonly navEnd$ = this.router.events.pipe(
    filter((e): e is NavigationEnd => e instanceof NavigationEnd),
    map(() => this.router.url)
  );

  private readonly urlSignal = toSignal(this.navEnd$, { initialValue: this.router.url });

  /**
   * Resolves the human-readable title for the active route.
   */
  readonly currentRouteTitle = computed<string>(() => {
    try {
      const url = this.urlSignal() || '';
      if (url.startsWith('/dashboard')) return 'Panel general';
      if (url.startsWith('/portal-admin')) return 'Portal Clientes · Administración';
      if (url.startsWith('/orders')) {
        if (url.includes('tab=facturacion')) return 'Facturación & POS';
        if (url.includes('tab=despachos')) return 'Despachos & Rutas';
        return 'Alistamiento de Pedidos';
      }
      if (url.startsWith('/settings')) {
        if (
          url.includes('tab=inventory') ||
          url.includes('tab=variants') ||
          url.includes('tab=fruits') ||
          url.includes('tab=cava')
        ) {
          return 'Inventario y Stock';
        }
        if (url.includes('tab=users') || url.includes('tab=usuarios') || url.includes('tab=roles')) {
          return 'Usuarios y roles';
        }
        return 'Configuración';
      }
      if (url.startsWith('/accounting')) return 'Clientes';
      if (url.startsWith('/shifts') || url.startsWith('/hr')) return 'Gestión de Personal';
      if (url.startsWith('/reports')) return 'Ventas';
      if (url.startsWith('/admin')) return 'Administración';
      return 'Panel general';
    } catch {
      return 'Panel general';
    }
  });

  /**
   * Focuses the first text search input on the page.
   */
  onSearchClick(): void {
    try {
      const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement | null;
      if (searchInput) {
        searchInput.focus();
      }
    } catch {
      return;
    }
  }

  /**
   * Navigates to the orders module and dispatches the new order modal event.
   */
  onNewOrderClick(): void {
    try {
      if (!this.router.url.startsWith('/orders')) {
        this.router
          .navigate(['/orders'], { queryParams: { tab: 'picking' } })
          .then(() => {
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('open-new-order-modal'));
            }, 60);
          })
          .catch(() => {});
      } else {
        window.dispatchEvent(new CustomEvent('open-new-order-modal'));
      }
    } catch {
      return;
    }
  }

  /**
   * Navigates to the dedicated order picking KDS view.
   */
  navigateToKds(): void {
    try {
      void this.router.navigate(['/kds']);
    } catch {
      return;
    }
  }

  /**
   * Navigates to the dedicated plant inventory KDS view.
   */
  navigateToInventoryKds(): void {
    try {
      void this.router.navigate(['/kds-inventory']);
    } catch {
      return;
    }
  }

  /**
   * Navigates to the self-service client portal view.
   */
  navigateToClientPortal(): void {
    try {
      void this.router.navigate(['/portal-clientes']);
    } catch {
      return;
    }
  }
}
