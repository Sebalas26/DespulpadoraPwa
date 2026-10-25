import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { DynamicModulePlaceholderComponent } from './dynamic-module-placeholder.component';
import { AuthService } from '../../core/services/auth.service';
import { NavigationModuleDto } from '../../core/models/auth.models';

/**
 * Unit tests for DynamicModulePlaceholderComponent verifying route matching and metadata rendering.
 */
describe('DynamicModulePlaceholderComponent', () => {
  let component: DynamicModulePlaceholderComponent;
  let fixture: ComponentFixture<DynamicModulePlaceholderComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let router: Router;

  const mockNavModule: NavigationModuleDto = {
    moduleId: 99,
    name: 'Control de Calidad',
    slug: 'quality_control',
    icon: 'shield',
    menuSection: 'OPERACIONES',
    frontendRoute: '/quality-control',
    displayOrder: 5,
    allowedActionSlugs: ['quality_control.view', 'quality_control.approve']
  };

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', [
      'findNavigationModuleByRoute',
      'isSystemDeveloper'
    ]);
    authServiceSpy.findNavigationModuleByRoute.and.returnValue(mockNavModule);
    authServiceSpy.isSystemDeveloper.and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [DynamicModulePlaceholderComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(DynamicModulePlaceholderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and resolve matchedModule from AuthService', () => {
    expect(component).toBeTruthy();
    expect(component.currentUrl()).toBe(router.url || '/');
    expect(component.matchedModule()).toEqual(mockNavModule);
  });

  it('should return null for matchedModule when route is not registered in navigationModules', () => {
    authServiceSpy.findNavigationModuleByRoute.and.returnValue(null);
    const secondFixture = TestBed.createComponent(DynamicModulePlaceholderComponent);
    const secondComp = secondFixture.componentInstance;
    secondFixture.detectChanges();

    expect(secondComp.matchedModule()).toBeNull();
  });
});
