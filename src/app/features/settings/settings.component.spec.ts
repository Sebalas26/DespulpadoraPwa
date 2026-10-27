import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { SettingsComponent } from './settings.component';
import { StateService } from '../../core/services/state.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { ApiService } from '../../core/services/api.service';
import { DEFAULT_COMPANY_CONFIG, FruitConfig } from '../../core/data/initial-data';
import {
  CompanyConfig,
  PaymentMethodDto,
  ProductVariantDto
} from '../../core/models/business.models';

/**
 * Unit tests for SettingsComponent verifying zeroed variant defaults, company settings, and payment methods CRUD.
 */
describe('SettingsComponent', () => {
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;
  let notificationSpy: jasmine.SpyObj<NotificationService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let addVariantSpy: jasmine.Spy;
  let createPaymentMethodSpy: jasmine.Spy;
  let deletePaymentMethodSpy: jasmine.Spy;
  let deleteVariantSpy: jasmine.Spy;
  let updateCompanyInfoSpy: jasmine.Spy;

  const mockCompany = signal<CompanyConfig>({
    ...DEFAULT_COMPANY_CONFIG,
    companyName: 'DGL',
    legalName: 'DGL S.A.S.',
    nit: '900.000.000-0',
    invoiceNextNumber: 0
  });

  const mockFruits = signal<FruitConfig[]>([
    {
      id: 'mora',
      fruitId: 1,
      name: 'Mora',
      scientificName: 'Rubus glaucus',
      emoji: '',
      color: '#16a34a',
      bgColor: '#f0fdf4',
      yieldRate: 0.7,
      waterAdditionDefault: 0.08,
      freshStockKg: 100,
      category: 'PULPAS',
      prices: { g140: 2000, g250: 3500, g500: 6500, g1000: 12000 },
      stock: { g140: 10, g250: 10, g500: 10, g1000: 10 },
      minStock: { g140: 5, g250: 5, g500: 5, g1000: 5 }
    }
  ]);

  const mockVariants = signal<ProductVariantDto[]>([
    {
      variantId: 1,
      fruitId: 1,
      fruitName: 'Mora',
      category: 'PULPAS',
      sku: 'PUL-MOR-250G',
      name: 'Mora 250g',
      grammage: 250,
      unitCost: 1500,
      basePrice: 3500,
      minStockAlert: 10,
      currentStock: 40,
      isActive: true
    }
  ]);

  const mockPaymentMethods = signal<PaymentMethodDto[]>([]);

  beforeEach(async () => {
    notificationSpy = jasmine.createSpyObj<NotificationService>('NotificationService', [
      'success',
      'error',
      'warning',
      'info'
    ]);
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    addVariantSpy = jasmine.createSpy('addProductVariant');
    createPaymentMethodSpy = jasmine.createSpy('createPaymentMethod');
    updateCompanyInfoSpy = jasmine.createSpy('updateCompanyInfo');

    deletePaymentMethodSpy = jasmine.createSpy('deletePaymentMethod');
    deleteVariantSpy = jasmine.createSpy('deleteProductVariant');

    const stateServiceMock: Partial<StateService> = {
      companyInfo: mockCompany,
      fruits: mockFruits,
      productVariants: mockVariants,
      paymentMethods: mockPaymentMethods,
      activePaymentMethods: mockPaymentMethods,
      totalFreshStockKg: signal<number>(100) as unknown as StateService['totalFreshStockKg'],
      addProductVariant: addVariantSpy,
      updateProductVariant: jasmine.createSpy('updateProductVariant'),
      deleteProductVariant: deleteVariantSpy,
      createPaymentMethod: createPaymentMethodSpy,
      updatePaymentMethod: jasmine.createSpy('updatePaymentMethod'),
      deletePaymentMethod: deletePaymentMethodSpy,
      togglePaymentMethodStatus: jasmine.createSpy('togglePaymentMethodStatus'),
      syncCompanyInfoSilent: jasmine.createSpy('syncCompanyInfoSilent'),
      updateCompanyInfo: updateCompanyInfoSpy
    };

    const authServiceMock: Partial<AuthService> = {
      hasPermission: () => true,
      isSystemDeveloper: signal<boolean>(false) as unknown as AuthService['isSystemDeveloper']
    };

    const apiServiceMock: Partial<ApiService> = {
      getUsers: () => of([]),
      getRoles: () => of([]),
      getSystemModules: () => of([])
    };

    await TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [
        { provide: StateService, useValue: stateServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: NotificationService, useValue: notificationSpy },
        { provide: ApiService, useValue: apiServiceMock },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: { queryParams: of({ tab: 'general' }) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize new variant numeric signals to 0 without hardcoded defaults', () => {
    expect(component).toBeTruthy();
    expect(component.newVariantGrammage()).toBe(0);
    expect(component.newVariantUnitCost()).toBe(0);
    expect(component.newVariantBasePrice()).toBe(0);
    expect(component.newVariantCurrentStock()).toBe(0);
    expect(component.newVariantMinStock()).toBe(0);
  });

  it('should reset new variant numeric signals to 0 when openNewVariantModal is called', () => {
    component.newVariantGrammage.set(500);
    component.newVariantBasePrice.set(8000);

    component.openNewVariantModal();

    expect(component.showNewVariantModal()).toBeTrue();
    expect(component.newVariantGrammage()).toBe(0);
    expect(component.newVariantUnitCost()).toBe(0);
    expect(component.newVariantBasePrice()).toBe(0);
    expect(component.newVariantCurrentStock()).toBe(0);
    expect(component.newVariantMinStock()).toBe(0);
  });

  it('should format preview invoice number as 00000 when invoiceNextNumber is 0', () => {
    expect(component.formatPreviewInvoiceNumber()).toBe('00000');
  });

  it('should handle payment method active toggle and save new payment method', () => {
    component.openCreatePaymentMethodModal();
    component.updatePaymentFormField('name', 'Transferencia Nequi');
    component.updatePaymentFormField('code', 'NEQUI');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = false;
    component.onPaymentMethodActiveToggle({ target: checkbox } as unknown as Event);
    expect(component.paymentMethodForm().isActive).toBeFalse();

    component.savePaymentMethod();
    expect(createPaymentMethodSpy).toHaveBeenCalledWith({
      name: 'Transferencia Nequi',
      code: 'NEQUI',
      type: 'transfer',
      description: ''
    });
  });

  it('should create a new product variant and filter/sort variants', () => {
    component.openNewVariantModal();
    component.newVariantName.set('Mora 500g');
    component.newVariantGrammage.set(500);
    component.newVariantUnitCost.set(2500);
    component.newVariantBasePrice.set(6500);
    component.newVariantCurrentStock.set(20);
    component.newVariantMinStock.set(5);

    component.createVariant();

    expect(addVariantSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        name: 'Mora 500g',
        grammage: 500,
        unitCost: 2500,
        basePrice: 6500,
        currentStock: 20,
        minStockAlert: 5
      })
    );

    component.setSort('basePrice');
    expect(component.sortField()).toBe('basePrice');
    expect(component.filteredVariants().length).toBe(1);
  });

  it('should navigate between mobile configuration hub and modules', () => {
    component.openMobileConfigModule('parameters', 'paymentMethods');
    expect(component.activeTab()).toBe('parameters');
    expect(component.parametersSubTab()).toBe('paymentMethods');
    expect(component.mobileConfigModuleSelected()).toBeTrue();

    component.backToMobileConfigHub();
    expect(component.mobileConfigModuleSelected()).toBeFalse();
  });

  it('should open confirmation dialog and execute action on confirm', () => {
    let executed = false;
    component.openConfirmDialog({
      title: 'Test Title',
      message: 'Test Message',
      confirmButtonText: 'Confirmar',
      isDanger: true,
      action: () => {
        executed = true;
      }
    });

    expect(component.confirmDialogState().isOpen).toBeTrue();
    expect(component.confirmDialogState().title).toBe('Test Title');
    expect(component.confirmDialogState().message).toBe('Test Message');

    component.onConfirmDialog();
    expect(executed).toBeTrue();
    expect(component.confirmDialogState().isOpen).toBeFalse();
  });

  it('should prompt confirmation dialog when deleting a payment method', () => {
    component.deletePaymentMethod(1);
    expect(component.confirmDialogState().isOpen).toBeTrue();
    expect(component.confirmDialogState().title).toBe('¿Eliminar Forma de Pago?');

    component.onConfirmDialog();
    expect(deletePaymentMethodSpy).toHaveBeenCalledWith(1);
  });

  it('should open new grammage modal with empty fields and add custom grammage with auto unit suffix', () => {
    component.openNewGrammageModal();
    expect(component.showNewGrammageModal()).toBeTrue();
    expect(component.newGrammageAmount()).toBeNull();
    expect(component.newGrammageUnit()).toBe('g');
    expect(component.newGrammageCustomLabel()).toBe('');

    component.newGrammageAmount.set(400);
    component.newGrammageUnit.set('g');
    component.addCustomGrammage();

    const addedGram = component.grammagesConfig().find(g => g.key === 'g400');
    expect(addedGram).toBeDefined();
    expect(addedGram?.value).toBe(400);
    expect(addedGram?.label).toBe('400g');
    expect(component.showNewGrammageModal()).toBeFalse();
  });

  it('should add custom grammage when unit is kg and compute net grams and label', () => {
    component.openNewGrammageModal();
    component.newGrammageAmount.set(2);
    component.newGrammageUnit.set('kg');
    component.addCustomGrammage();

    const addedKg = component.grammagesConfig().find(g => g.key === 'g2000');
    expect(addedKg).toBeDefined();
    expect(addedKg?.value).toBe(2000);
    expect(addedKg?.label).toBe('2 Kg (2000g)');
  });

  it('should open new category modal with empty fields and save new category', () => {
    component.openNewCategoryModal();
    expect(component.showNewCategoryModal()).toBeTrue();
    expect(component.newCategoryName()).toBe('');
    expect(component.newCategoryCode()).toBe('');

    component.newCategoryName.set('Línea Gourmet');
    component.newCategoryCode.set('GOURMET');
    component.addCustomCategory();

    const addedCat = component.categoriesConfig().find(c => c.id === 'GOURMET');
    expect(addedCat).toBeDefined();
    expect(addedCat?.name).toBe('Línea Gourmet');
    expect(component.showNewCategoryModal()).toBeFalse();
  });

  it('should prompt confirmation dialog and delete grammage and category', () => {
    const testGram = { key: 'g140', value: 140, label: '140g', isActive: true };
    component.confirmDeleteGrammage(testGram);
    expect(component.confirmDialogState().isOpen).toBeTrue();
    expect(component.confirmDialogState().title).toBe('¿Eliminar Presentación / Kilo?');

    component.onConfirmDialog();
    expect(component.grammagesConfig().some(g => g.key === 'g140')).toBeFalse();

    const testCat = { id: 'PULPAS', name: 'Pulpas Puras', icon: '', badgeClass: 'badge-warning', isActive: true };
    component.confirmDeleteCategory(testCat);
    expect(component.confirmDialogState().isOpen).toBeTrue();
    expect(component.confirmDialogState().title).toBe('¿Eliminar Categoría de Producto?');

    component.onConfirmDialog();
    expect(component.categoriesConfig().some(c => c.id === 'PULPAS')).toBeFalse();
  });
});
