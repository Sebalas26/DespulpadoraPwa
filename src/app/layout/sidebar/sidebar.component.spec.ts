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
  });
});
