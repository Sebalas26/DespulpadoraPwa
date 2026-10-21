import { Component, computed, HostBinding, HostListener, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { StateService } from '../../core/services/state.service';
import { VoiceOrdersService } from '../../core/services/voice-orders.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="topbar" [class.header-hidden]="isHeaderHidden()">
      <!-- Desktop Left: (Sidebar Toggle + Brand when collapsed) + Dynamic Module Title -->
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
            <img src="/logo-dgl.png" alt="DGL Despulpadora" class="header-logo-img" />
            <div class="header-brand-text">
              <span class="header-brand-name">DGL Despulpadora</span>
              <span class="header-brand-sub">Gestión de pulpas</span>
            </div>
          </div>
          <span class="header-brand-divider"></span>
        }

        <div class="dgl-breadcrumb">
          <span class="breadcrumb-current">{{ currentRouteTitle() }}</span>
        </div>
      </div>

      <!-- Mobile Top Bar: DGL Logo + Notification + Avatar -->
      <div class="mobile-only-header only-mobile">
        <div class="mobile-brand">
          <img src="/logo-dgl.png" alt="DGL Despulpadora" style="width: 34px; height: 34px; object-fit: contain;" />
          <span class="mobile-brand-title">DGL Despulpadora</span>
        </div>
      </div>

      <!-- Right side: Status, Search, Notifications, + Nuevo pedido button -->
      <div class="topbar-actions">
        <!-- Pantalla de Alistamiento de Pedidos (KDS) -->
        <button
          type="button"
          class="btn-kds-access"
          (click)="navigateToKds()"
          title="Abrir pantalla dedicada de alistamiento de pedidos (KDS en Cava)"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>
          <span class="kds-access-label">Pantalla de Alistamiento</span>
          <span class="kds-access-badge">KDS</span>
        </button>

        <!-- Status Indicator • En línea (Figma style) -->
        <div class="online-pill" [title]="stateService.isOnline() ? 'Sistema conectado a la red' : 'Sin conexión'">
          <span class="online-dot" [style.background]="stateService.isOnline() ? '#1e5e3a' : '#dc2626'"></span>
          <span class="online-text">{{ stateService.isOnline() ? 'En línea' : 'Desconectado' }}</span>
        </div>

        <!-- Notification Bell -->
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

        <!-- Mobile Avatar Badge (Matches Figma Mobile Header) -->
        <div class="mobile-user-avatar only-mobile" title="Administrador">
          <span>AD</span>
        </div>

        <!-- Primary CTA: + Nuevo pedido (Desktop Figma button) -->
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
      background: #f0fdf4;
      border: 1.5px solid #86efac;
      border-radius: 9999px;
      color: #15803d;
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 1px 3px rgba(22, 163, 74, 0.1);

      &:hover {
        background: #16a34a;
        border-color: #16a34a;
        color: #ffffff;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(22, 163, 74, 0.28);

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
      border-radius: 9999px;
      font-size: 0.78rem;
      color: #1e5e3a;
      font-weight: 600;
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
        padding: 0 16px;
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

  // Auto-hide on scroll down, reappear on scroll up
  readonly isHeaderHidden = signal<boolean>(false);
  private lastScrollY = 0;
  private readonly scrollThreshold = 8;
  private cleanupScrollListeners?: () => void;

  @HostBinding('class.header-hidden')
  get hostHeaderHidden() {
    return this.isHeaderHidden();
  }

  ngOnInit() {
    if (typeof window !== 'undefined') {
      const scrollHandler = () => this.handleScroll();
      window.addEventListener('scroll', scrollHandler, { passive: true });
      document.addEventListener('scroll', scrollHandler, { passive: true, capture: true });

      this.cleanupScrollListeners = () => {
        window.removeEventListener('scroll', scrollHandler);
        document.removeEventListener('scroll', scrollHandler, { capture: true });
      };
    }

    // Reset visibility when navigating to another view
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      this.isHeaderHidden.set(false);
      this.lastScrollY = 0;
    });
  }

  ngOnDestroy() {
    if (this.cleanupScrollListeners) {
      this.cleanupScrollListeners();
    }
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    this.handleScroll();
  }

  private handleScroll() {
    if (typeof window === 'undefined') return;

    const currentScrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;

    // At top of page, always show header
    if (currentScrollY <= 25) {
      this.isHeaderHidden.set(false);
      this.lastScrollY = currentScrollY;
      return;
    }

    const delta = currentScrollY - this.lastScrollY;

    // Ignore tiny movements below threshold
    if (Math.abs(delta) < this.scrollThreshold) {
      return;
    }

    // Scrolling down past the header height -> hide smoothly
    if (delta > 0 && currentScrollY > 64) {
      this.isHeaderHidden.set(true);
    }
    // Scrolling up -> show smoothly
    else if (delta < 0) {
      this.isHeaderHidden.set(false);
    }

    this.lastScrollY = currentScrollY;
  }

  private readonly navEnd$ = this.router.events.pipe(
    filter(e => e instanceof NavigationEnd),
    map(() => this.router.url)
  );

  private readonly urlSignal = toSignal(this.navEnd$, { initialValue: this.router.url });

  readonly currentRouteTitle = computed(() => {
    const url = this.urlSignal();
    if (url.startsWith('/dashboard')) return 'Panel general';
    if (url.startsWith('/orders')) {
      if (url.includes('tab=facturacion')) return 'Facturación & POS';
      if (url.includes('tab=despachos')) return 'Despachos & Rutas';
      return 'Alistamiento de Pedidos';
    }
    if (url.startsWith('/calculator')) return 'Inventario y Stock';
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
  });

  onSearchClick() {
    const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
    }
  }

  onNewOrderClick() {
    if (!this.router.url.startsWith('/orders')) {
      this.router.navigate(['/orders'], { queryParams: { tab: 'picking' } }).then(() => {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('open-new-order-modal'));
        }, 60);
      });
    } else {
      window.dispatchEvent(new CustomEvent('open-new-order-modal'));
    }
  }

  navigateToKds() {
    this.router.navigate(['/kds']);
  }
}
