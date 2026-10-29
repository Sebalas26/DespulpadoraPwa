import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MobileNavComponent } from './mobile-nav.component';
import { StateService } from '../../core/services/state.service';
import { AuthService } from '../../core/services/auth.service';

/**
 * Unit test suite for `MobileNavComponent`.
 */
describe('MobileNavComponent', () => {
  let component: MobileNavComponent;
  let fixture: ComponentFixture<MobileNavComponent>;
  let stateService: StateService;
  let authService: AuthService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [MobileNavComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    fixture = TestBed.createComponent(MobileNavComponent);
    component = fixture.componentInstance;
    stateService = TestBed.inject(StateService);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should open and close the mobile drawer and display dynamic companyName', () => {
    stateService.syncCompanyInfoSilent({ companyName: 'Mobile Plant Co' });
    authService.user.set({
      id: 1,
      username: 'carlos',
      email: 'carlos@example.com',
      fullName: 'Carlos Ruiz',
      roleId: 1,
      roleName: 'Operator',
      isSystemDeveloper: false
    });

    expect(component.showMoreDrawer()).toBeFalse();
    component.openDrawer();
    fixture.detectChanges();

    expect(component.showMoreDrawer()).toBeTrue();
    expect(component.userInitials()).toBe('CR');
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.mobile-drawer-header')?.textContent).toContain('Mobile Plant Co');

    component.closeDrawer();
    expect(component.showMoreDrawer()).toBeFalse();
  });

  it('should invoke authService.logout and close drawer on onLogoutClick', () => {
    const logoutSpy = spyOn(authService, 'logout');
    component.openDrawer();
    component.onLogoutClick();

    expect(logoutSpy).toHaveBeenCalledTimes(1);
    expect(component.showMoreDrawer()).toBeFalse();
  });

  it('should parse route paths and query parameters correctly', () => {
    expect(component.getRoutePath('/settings?tab=inventory')).toBe('/settings');
    expect(component.getRouteQueryParams('/settings?tab=inventory')).toEqual({ tab: 'inventory' });
    expect(component.getRouteQueryParams('/dashboard')).toBeNull();
  });

  it('should render the 5 Uber-style mobile navigation options: Inicio, Pedidos, Rutas, Inventario, and Más', () => {
    spyOn(authService, 'hasModuleAccess').and.returnValue(true);
    fixture.detectChanges();

    const compiled: HTMLElement = fixture.nativeElement as HTMLElement;
    const items: NodeListOf<HTMLElement> = compiled.querySelectorAll('.dgl-mobile-nav .dgl-mobile-nav-item');
    expect(items.length).toBe(5);
    const labels: string[] = Array.from(items).map((el: HTMLElement) =>
      (el.querySelector('span')?.textContent || '').trim()
    );
    expect(labels).toEqual(['Inicio', 'Pedidos', 'Rutas', 'Inventario', 'Más']);
  });

  it('should accurately evaluate isMobileTabActive for home, orders, routes, and inventory without overlap', () => {
    component.currentUrl.set('/dashboard');
    expect(component.isMobileTabActive('home')).toBeTrue();
    expect(component.isMobileTabActive('orders')).toBeFalse();
    expect(component.isMobileTabActive('routes')).toBeFalse();
    expect(component.isMobileTabActive('inventory')).toBeFalse();

    component.currentUrl.set('/orders?tab=picking');
    expect(component.isMobileTabActive('home')).toBeFalse();
    expect(component.isMobileTabActive('orders')).toBeTrue();
    expect(component.isMobileTabActive('routes')).toBeFalse();

    component.currentUrl.set('/orders?tab=despachos');
    expect(component.isMobileTabActive('orders')).toBeFalse();
    expect(component.isMobileTabActive('routes')).toBeTrue();

    component.currentUrl.set('/settings?tab=inventory');
    expect(component.isMobileTabActive('inventory')).toBeTrue();

    component.currentUrl.set('/settings?tab=general');
    expect(component.isMobileTabActive('inventory')).toBeFalse();

    component.openDrawer();
    expect(component.isMobileTabActive('home')).toBeFalse();
  });

  it('should manage isNavHidden state on window scroll events and idle timeout', (done) => {
    expect(component.isNavHidden()).toBeFalse();

    Object.defineProperty(window, 'scrollY', { value: 120, writable: true, configurable: true });
    component.onWindowScroll();
    expect(component.isNavHidden()).toBeTrue();

    Object.defineProperty(window, 'scrollY', { value: 60, writable: true, configurable: true });
    component.onWindowScroll();
    expect(component.isNavHidden()).toBeFalse();

    Object.defineProperty(window, 'scrollY', { value: 200, writable: true, configurable: true });
    component.onWindowScroll();
    expect(component.isNavHidden()).toBeTrue();

    setTimeout(() => {
      expect(component.isNavHidden()).toBeFalse();
      done();
    }, 750);
  });

  it('should reset scroll idle timeout on ngOnDestroy', () => {
    Object.defineProperty(window, 'scrollY', { value: 100, writable: true, configurable: true });
    component.onWindowScroll();
    expect(() => component.ngOnDestroy()).not.toThrow();
  });

  it('should render only module names (.drawer-title) without subtexts (.drawer-desc) and show Cerrar Sesión button when mobile drawer is open', () => {
    spyOn(authService, 'hasModuleAccess').and.returnValue(true);
    spyOn(authService, 'groupedNavigationSections').and.returnValue([
      {
        sectionName: 'Operación',
        modules: [
          {
            moduleId: 1,
            name: 'Dashboard Operativo',
            slug: 'dashboard',
            menuSection: 'Operación',
            frontendRoute: '/dashboard',
            icon: 'grid',
            displayOrder: 1,
            allowedActionSlugs: ['dashboard.view']
          }
        ]
      }
    ]);

    component.openDrawer();
    fixture.detectChanges();

    const compiled: HTMLElement = fixture.nativeElement as HTMLElement;
    const titles: NodeListOf<HTMLElement> = compiled.querySelectorAll('.mobile-drawer-body .drawer-title');
    const subtexts: NodeListOf<HTMLElement> = compiled.querySelectorAll('.mobile-drawer-body .drawer-desc');
    const logoutBtn: HTMLElement | null = compiled.querySelector('.drawer-logout-btn');

    expect(titles.length).toBeGreaterThanOrEqual(3);
    const titleTexts: string[] = Array.from(titles).map((el: HTMLElement) => (el.textContent || '').trim());
    expect(titleTexts).toContain('Portal Clientes');
    expect(titleTexts).toContain('Admin. Portal Clientes');
    expect(titleTexts).toContain('Dashboard Operativo');
    expect(subtexts.length).toBe(0);
    expect(logoutBtn).not.toBeNull();
    expect((logoutBtn?.textContent || '').trim()).toBe('Cerrar Sesión');
  });
});
