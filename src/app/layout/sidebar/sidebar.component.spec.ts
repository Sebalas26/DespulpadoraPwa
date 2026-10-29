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

  it('should render dedicated quick navigation links for KDS picking, plant KDS, and client portal', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const navItems = Array.from(compiled.querySelectorAll('.sidebar-nav > a.dgl-nav-item')) as HTMLAnchorElement[];

    const kdsItem = navItems.find((el: HTMLAnchorElement) => el.getAttribute('href') === '/kds');
    const plantItem = navItems.find((el: HTMLAnchorElement) => el.getAttribute('href') === '/kds-inventory');
    const portalItem = navItems.find((el: HTMLAnchorElement) => el.getAttribute('href') === '/portal-clientes');

    expect(kdsItem).toBeTruthy();
    expect(kdsItem?.textContent).toContain('Pantalla de Alistamiento');
    expect(kdsItem?.textContent).toContain('KDS');

    expect(plantItem).toBeTruthy();
    expect(plantItem?.textContent).toContain('KDS Inventario & Stock');
    expect(plantItem?.textContent).toContain('PLANTA');

    expect(portalItem).toBeTruthy();
    expect(portalItem?.textContent).toContain('Portal Clientes');
    expect(portalItem?.textContent).toContain('PEDIDOS');
  });

  it('should render independent, top-level navigation items for operation modules without arrow prefixes', () => {
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
    const itemTexts = navItems.map(item => item.textContent || '');

    expect(itemTexts.some(t => t.includes('Inventario & Stock'))).toBeTrue();
    expect(itemTexts.some(t => t.includes('Facturación & POS'))).toBeTrue();
    expect(itemTexts.some(t => t.includes('Despachos & Rutas'))).toBeTrue();
    expect(itemTexts.some(t => t.includes('Pantalla KDS Planta'))).toBeFalse();

    // Verify none of the items contains the arrow prefix '↳'
    itemTexts.forEach(text => {
      expect(text.includes('↳')).toBeFalse();
    });
  });
});
