import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { SidebarComponent } from './sidebar.component';
import { AuthService } from '../../core/services/auth.service';
import { StateService } from '../../core/services/state.service';

/**
 * Unit test suite for `SidebarComponent`.
 */
describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;
  let authService: AuthService;
  let stateService: StateService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    stateService = TestBed.inject(StateService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should render dynamic companyName and authenticated user initials without hardcoded business strings', () => {
    stateService.syncCompanyInfoSilent({ companyName: 'Test Enterprise', tagline: 'Plant Ops' });
    authService.user.set({
      id: 10,
      username: 'mcastillo',
      email: 'mcastillo@example.com',
      fullName: 'Maria Castillo',
      roleId: 3,
      roleName: 'Coordinator',
      isSystemDeveloper: false
    });

    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(component.displayUserName()).toBe('Maria Castillo');
    expect(component.displayRoleName()).toBe('Coordinator');
    expect(component.userInitials()).toBe('MC');
    expect(compiled.querySelector('.dgl-brand-name')?.textContent).toBe('Test Enterprise');
    expect(compiled.querySelector('.user-avatar-circle')?.textContent?.trim()).toBe('MC');
  });

  it('should parse route paths and query parameters from frontendRoute', () => {
    expect(component.getRoutePath('/orders?tab=picking')).toBe('/orders');
    expect(component.getRouteQueryParams('/orders?tab=picking')).toEqual({ tab: 'picking' });
    expect(component.getRouteQueryParams('/dashboard')).toBeNull();
  });

  it('should correctly evaluate active inventory module and sub-tab helpers', () => {
    const inventoryMod = {
      moduleId: 2,
      name: 'Inventario de Pulpas y Frutas',
      slug: 'inventory',
      menuSection: 'Operación',
      frontendRoute: '/settings?tab=inventory',
      icon: 'package',
      displayOrder: 2,
      allowedActionSlugs: ['inventory.view']
    };

    expect(component.isModuleActive(inventoryMod)).toBeFalse();
    expect(component.isInventoryTabActive('variants')).toBeFalse();
    expect(component.isInventoryTabActive('fruits')).toBeFalse();
    expect(component.isInventoryTabActive('kds')).toBeFalse();
    expect(component.isInventoryTabActive('inventory')).toBeFalse();
    expect(component.isOrderTabActive('facturacion')).toBeFalse();
    expect(component.isOrderTabActive('despachos')).toBeFalse();
    expect(component.isSettingsTabActive('inventory')).toBeFalse();
  });

  it('should hide the 4 quick navigation links by default, open them when clicking the trigger, and hide them when clicking the hide button or another module', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(component.isQuickAccessOpen()).toBeFalse();
    expect(compiled.querySelector('.dgl-quick-access-panel')).toBeNull();

    const triggerBtn = compiled.querySelector('.dgl-quick-access-trigger') as HTMLButtonElement;
    expect(triggerBtn).toBeTruthy();
    triggerBtn.click();
    fixture.detectChanges();

    expect(component.isQuickAccessOpen()).toBeTrue();
    const quickLinks = Array.from(compiled.querySelectorAll('.dgl-quick-access-panel a.dgl-nav-item')) as HTMLAnchorElement[];
    const kdsItem = quickLinks.find((el: HTMLAnchorElement) => el.getAttribute('href') === '/kds');
    const plantItem = quickLinks.find((el: HTMLAnchorElement) => el.getAttribute('href') === '/kds-inventory');
    const portalItem = quickLinks.find((el: HTMLAnchorElement) => el.getAttribute('href') === '/portal-clientes');

    expect(kdsItem).toBeTruthy();
    expect(kdsItem?.textContent).toContain('Pantalla de Alistamiento');
    expect(kdsItem?.textContent).toContain('KDS');

    expect(plantItem).toBeTruthy();
    expect(plantItem?.textContent).toContain('KDS Inventario & Stock');
    expect(plantItem?.textContent).toContain('PLANTA');

    expect(portalItem).toBeTruthy();
    expect(portalItem?.textContent).toContain('Portal Clientes');
    expect(portalItem?.textContent).toContain('PEDIDOS');

    const hideBtn = compiled.querySelector('.dgl-quick-access-hide-btn') as HTMLButtonElement;
    expect(hideBtn).toBeTruthy();
    hideBtn.click();
    fixture.detectChanges();

    expect(component.isQuickAccessOpen()).toBeFalse();
    expect(compiled.querySelector('.dgl-quick-access-panel')).toBeNull();

    component.openQuickAccess();
    expect(component.isQuickAccessOpen()).toBeTrue();
    component.closeQuickAccess();
    expect(component.isQuickAccessOpen()).toBeFalse();
  });

  it('should render independent, top-level navigation items for operation modules including Pedidos between Inventario & Stock and Facturación & POS', () => {
    authService.navigationModules.set([
      {
        moduleId: 2,
        name: 'Inventario de Pulpas y Frutas',
        slug: 'inventory',
        menuSection: 'Operación',
        frontendRoute: '/settings?tab=inventory',
        icon: 'package',
        displayOrder: 1,
        allowedActionSlugs: ['inventory.view']
      },
      {
        moduleId: 3,
        name: 'Pedidos y Despachos',
        slug: 'orders',
        menuSection: 'Operación',
        frontendRoute: '/orders',
        icon: 'truck',
        displayOrder: 2,
        allowedActionSlugs: ['orders.view']
      }
    ]);

    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const navItems = Array.from(compiled.querySelectorAll('.sidebar-nav a.dgl-nav-item')) as HTMLAnchorElement[];
    const itemTexts = navItems.map((item: HTMLAnchorElement) => (item.textContent || '').trim());

    const invIdx = itemTexts.findIndex((t: string) => t.includes('Inventario & Stock'));
    const pedidosIdx = itemTexts.findIndex((t: string) => t === 'Pedidos');
    const factIdx = itemTexts.findIndex((t: string) => t.includes('Facturación & POS'));
    const despIdx = itemTexts.findIndex((t: string) => t.includes('Despachos & Rutas'));

    expect(invIdx).toBeGreaterThanOrEqual(0);
    expect(pedidosIdx).toBe(invIdx + 1);
    expect(factIdx).toBe(pedidosIdx + 1);
    expect(despIdx).toBe(factIdx + 1);
    expect(itemTexts.some((t: string) => t.includes('Pantalla KDS Planta'))).toBeFalse();

    itemTexts.forEach((text: string) => {
      expect(text.includes('↳')).toBeFalse();
    });
  });
});
