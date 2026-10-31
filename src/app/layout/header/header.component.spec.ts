import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NavigationEnd, Router, provideRouter } from '@angular/router';
import { HeaderComponent } from './header.component';
import { StateService } from '../../core/services/state.service';
import { AuthService } from '../../core/services/auth.service';

/**
 * Unit test suite for `HeaderComponent`.
 */
describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let stateService: StateService;
  let authService: AuthService;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    stateService = TestBed.inject(StateService);
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should display dynamic companyName from stateService.companyInfo() and userInitials from authService.user()', () => {
    stateService.syncCompanyInfoSilent({ companyName: 'Dynamic Pulp Co', tagline: 'Pure Fruit' });
    authService.user.set({
      id: 1,
      username: 'jperez',
      email: 'jperez@example.com',
      fullName: 'Juan Perez',
      roleId: 2,
      roleName: 'Supervisor',
      isSystemDeveloper: false
    });
    stateService.isSidebarCollapsed.set(true);

    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(component.userInitials()).toBe('JP');
    expect(compiled.querySelector('.header-brand-name')?.textContent).toBe('Dynamic Pulp Co');
    expect(compiled.querySelector('.mobile-brand-title')?.textContent).toBe('Dynamic Pulp Co');
    expect(compiled.querySelector('.mobile-user-avatar')?.textContent?.trim()).toBe('JP');
  });

  it('should navigate to KDS, inventory KDS, and client portal routes', () => {
    const navSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));

    component.navigateToKds();
    expect(navSpy).toHaveBeenCalledWith(['/kds']);

    component.navigateToInventoryKds();
    expect(navSpy).toHaveBeenCalledWith(['/kds-inventory']);

    component.navigateToClientPortal();
    expect(navSpy).toHaveBeenCalledWith(['/portal-clientes']);
  });

  it('should toggle sidebar and render sidebar-toggle-btn only when sidebar is collapsed', () => {
    stateService.isSidebarCollapsed.set(false);
    fixture.detectChanges();
    let compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.sidebar-toggle-btn')).toBeNull();

    stateService.isSidebarCollapsed.set(true);
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
    const toggleBtn = compiled.querySelector('.sidebar-toggle-btn') as HTMLButtonElement | null;
    expect(toggleBtn).toBeTruthy();

    const toggleSpy = spyOn(stateService, 'toggleSidebar');
    toggleBtn?.click();
    expect(toggleSpy).toHaveBeenCalled();
  });

  it('should navigate to orders picking subtab on onNewOrderClick when not on orders route', () => {
    const navSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.onNewOrderClick();
    expect(navSpy).toHaveBeenCalledWith(['/orders'], { queryParams: { tab: 'picking' } });
  });

  it('should dispatch open-new-order-modal event on onNewOrderClick when already on orders route', () => {
    spyOnProperty(router, 'url', 'get').and.returnValue('/orders');
    let eventFired = false;
    const handler = () => {
      eventFired = true;
    };
    window.addEventListener('open-new-order-modal', handler);

    component.onNewOrderClick();
    window.removeEventListener('open-new-order-modal', handler);

    expect(eventFired).toBeTrue();
  });

  it('should render network status pill reflecting online and offline states', () => {
    stateService.isOnline.set(true);
    fixture.detectChanges();
    let compiled = fixture.nativeElement as HTMLElement;
    let pill = compiled.querySelector('.online-pill');
    expect(pill?.textContent).toContain('En línea');
    expect(pill?.classList.contains('offline')).toBeFalse();

    stateService.isOnline.set(false);
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
    pill = compiled.querySelector('.online-pill');
    expect(pill?.textContent).toContain('Desconectado');
    expect(pill?.classList.contains('offline')).toBeTrue();
  });

  it('should render the topbar module title in desktop aligned with topbar actions', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const titleEl = compiled.querySelector('.topbar-module-title');
    expect(titleEl).toBeTruthy();
    expect(titleEl?.textContent?.trim()).toBe(component.currentRouteTitle());
  });

  it('should compute appropriate module titles across main application routes', () => {
    component.currentUrl.set('/settings?tab=general');
    expect(component.currentRouteTitle()).toBe('Configuración de la Planta & Sistema');

    component.currentUrl.set('/settings?tab=variants');
    expect(component.currentRouteTitle()).toBe('Inventario y Stock de Pulpas');

    component.currentUrl.set('/orders?tab=despachos');
    expect(component.currentRouteTitle()).toBe('Despachos & Rutas');

    component.currentUrl.set('/accounting');
    expect(component.currentRouteTitle()).toBe('Clientes');

    component.currentUrl.set('/dashboard');
    expect(component.currentRouteTitle()).toBe('Dashboard general');
  });

  it('should display user info tooltip when clicking mobile yellow avatar and auto-hide after 5 seconds', fakeAsync(() => {
    authService.user.set({
      id: 2,
      username: 'adminGen',
      email: 'admin@dgl.com',
      fullName: 'Administrador General',
      roleId: 2,
      roleName: 'Administrador Operativo',
      isSystemDeveloper: false
    });
    fixture.detectChanges();

    const compiled: HTMLElement = fixture.nativeElement as HTMLElement;
    const avatarEl: HTMLElement | null = compiled.querySelector('.mobile-user-avatar');
    expect(avatarEl).not.toBeNull();
    expect(component.isUserTooltipVisible()).toBeFalse();
    expect(compiled.querySelector('.mobile-user-tooltip')).toBeNull();

    avatarEl?.click();
    fixture.detectChanges();

    expect(component.isUserTooltipVisible()).toBeTrue();
    const tooltipEl: HTMLElement | null = compiled.querySelector('.mobile-user-tooltip');
    expect(tooltipEl).not.toBeNull();
    expect(tooltipEl?.textContent).toContain('Administrador General');
    expect(tooltipEl?.textContent).toContain('Administrador Operativo');
    expect(tooltipEl?.textContent).toContain('admin@dgl.com');

    tick(3000);
    fixture.detectChanges();
    expect(component.isUserTooltipVisible()).toBeTrue();

    tick(2000);
    fixture.detectChanges();
    expect(component.isUserTooltipVisible()).toBeFalse();
    expect(compiled.querySelector('.mobile-user-tooltip')).toBeNull();
  }));
});
