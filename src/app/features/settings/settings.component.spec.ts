import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { computed, signal } from '@angular/core';
import { of } from 'rxjs';
import { SettingsComponent } from './settings.component';
import { StateService } from '../../core/services/state.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { ApiService } from '../../core/services/api.service';
import { WhatsAppGatewayService } from '../../core/services/whatsapp-gateway.service';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_COMPANY_CONFIG,
  DEFAULT_GRAMMAGES,
  DEFAULT_SHIFT_SCHEDULES,
  FruitConfig
} from '../../core/data/initial-data';
import {
  CompanyConfig,
  InventoryCategoryConfig,
  InventoryGrammageConfig,
  InventoryMovementRecordDto,
  PaymentMethodDto,
  ProductVariantDto,
  ShiftScheduleConfig
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
  let saveFreshFruitItemSpy: jasmine.Spy;
  let deleteFreshFruitItemSpy: jasmine.Spy;
  let whatsAppGetStatusSpy: jasmine.Spy;
  let whatsAppSendMessageSpy: jasmine.Spy;
  let whatsAppReconnectSpy: jasmine.Spy;
  let whatsAppLogoutSpy: jasmine.Spy;

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
  const mockInventoryMovements = signal<InventoryMovementRecordDto[]>([]);

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
    saveFreshFruitItemSpy = jasmine.createSpy('saveFreshFruitItem');
    deleteFreshFruitItemSpy = jasmine.createSpy('deleteFreshFruitItem');

    const mockCategoriesConfig = signal<InventoryCategoryConfig[]>([...DEFAULT_CATEGORIES]);
    const mockGrammagesConfig = signal<InventoryGrammageConfig[]>([...DEFAULT_GRAMMAGES]);
    const mockShiftSchedulesConfig = signal<ShiftScheduleConfig[]>([...DEFAULT_SHIFT_SCHEDULES]);

    const stateServiceMock: Partial<StateService> = {
      companyInfo: mockCompany,
      fruits: mockFruits,
      productVariants: mockVariants,
      paymentMethods: mockPaymentMethods,
      activePaymentMethods: mockPaymentMethods,
      categoriesConfig: mockCategoriesConfig,
      grammagesConfig: mockGrammagesConfig,
      shiftSchedulesConfig: mockShiftSchedulesConfig,
      inventoryMovements: mockInventoryMovements,
      activeCategories: computed(() => mockCategoriesConfig().filter(c => c.isActive)),
      activeGrammages: computed(() => mockGrammagesConfig().filter(g => g.isActive)),
      activeShiftSchedules: computed(() => mockShiftSchedulesConfig().filter(s => s.isActive)),
      addCategory: (cat: InventoryCategoryConfig) => mockCategoriesConfig.update(c => [...c, cat]),
      deleteCategory: (id: string) => mockCategoriesConfig.update(c => c.filter(x => x.id !== id)),
      toggleCategory: (id: string) => mockCategoriesConfig.update(c => c.map(x => x.id === id ? { ...x, isActive: !x.isActive } : x)),
      addGrammage: (gram: InventoryGrammageConfig) => mockGrammagesConfig.update(g => [...g, gram]),
      deleteGrammage: (key: string) => mockGrammagesConfig.update(g => g.filter(x => x.key !== key)),
      toggleGrammage: (key: string) => mockGrammagesConfig.update(g => g.map(x => x.key === key ? { ...x, isActive: !x.isActive } : x)),
      addShiftSchedule: (schedule: ShiftScheduleConfig) => mockShiftSchedulesConfig.update(s => [...s, schedule]),
      updateShiftSchedule: (id: string, changes: Partial<ShiftScheduleConfig>) =>
        mockShiftSchedulesConfig.update(s => s.map(x => (x.id === id ? { ...x, ...changes } : x))),
      toggleShiftSchedule: (id: string) =>
        mockShiftSchedulesConfig.update(s => s.map(x => (x.id === id ? { ...x, isActive: !x.isActive } : x))),
      deleteShiftSchedule: (id: string) => mockShiftSchedulesConfig.update(s => s.filter(x => x.id !== id)),
      totalFreshStockKg: signal<number>(100) as unknown as StateService['totalFreshStockKg'],
      addProductVariant: addVariantSpy,
      updateProductVariant: jasmine.createSpy('updateProductVariant'),
      deleteProductVariant: deleteVariantSpy,
      saveFreshFruitItem: saveFreshFruitItemSpy,
      deleteFreshFruitItem: deleteFreshFruitItemSpy,
      createPaymentMethod: createPaymentMethodSpy,
      updatePaymentMethod: jasmine.createSpy('updatePaymentMethod'),
      deletePaymentMethod: deletePaymentMethodSpy,
      togglePaymentMethodStatus: jasmine.createSpy('togglePaymentMethodStatus'),
      syncCompanyInfoSilent: jasmine.createSpy('syncCompanyInfoSilent'),
      updateCompanyInfo: updateCompanyInfoSpy,
      clients: signal([]),
      orders: signal([]),
      ingestWhatsAppIncomingOrders: jasmine.createSpy('ingestWhatsAppIncomingOrders').and.returnValue(0)
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
        {
          provide: WhatsAppGatewayService,
          useValue: {
            getStatus: (whatsAppGetStatusSpy = jasmine.createSpy('getStatus').and.returnValue(
              of({
                status: 'QR_READY' as const,
                connected: false,
                qrDataUrl: 'data:image/png;base64,TESTQR',
                phoneNumber: null,
                name: null
              })
            )),
            sendMessage: (whatsAppSendMessageSpy = jasmine.createSpy('sendMessage').and.returnValue(
              of({ success: true, messageId: 'WA-100' })
            )),
            reconnect: (whatsAppReconnectSpy = jasmine.createSpy('reconnect').and.returnValue(
              of({ success: true })
            )),
            logout: (whatsAppLogoutSpy = jasmine.createSpy('logout').and.returnValue(
              of({ success: true })
            )),
            getBotConfig: jasmine.createSpy('getBotConfig').and.returnValue(
              of({
                ok: true,
                botEnabled: true,
                autoReplyEnabled: true,
                hasGeminiApiKey: false,
                geminiApiKeyMasked: '',
                backendApiUrl: 'https://apidevdespulpadora.parking-flow.com/api',
                fruitsCount: 2,
                clientsCount: 1,
                ordersHistoryCount: 3,
                incomingOrdersCount: 0,
                lastSyncedAt: '2026-11-02T15:00:00Z'
              })
            ),
            updateBotConfig: jasmine.createSpy('updateBotConfig').and.callFake((payload: { botEnabled?: boolean; autoReplyEnabled?: boolean; geminiApiKey?: string }) =>
              of({
                ok: true,
                botEnabled: payload.botEnabled ?? true,
                autoReplyEnabled: payload.autoReplyEnabled ?? true,
                hasGeminiApiKey: Boolean(payload.geminiApiKey),
                geminiApiKeyMasked: payload.geminiApiKey ? 'AIza••••1234' : '',
                backendApiUrl: 'https://apidevdespulpadora.parking-flow.com/api',
                fruitsCount: 2,
                clientsCount: 1,
                ordersHistoryCount: 3,
                incomingOrdersCount: 0,
                lastSyncedAt: '2026-11-02T15:00:00Z'
              })
            ),
            syncContext: jasmine.createSpy('syncContext').and.returnValue(
              of({
                ok: true,
                fruitsCount: 2,
                clientsCount: 0,
                ordersCount: 0,
                lastSyncedAt: '2026-11-02T15:05:00Z'
              })
            ),
            getIncomingOrders: jasmine.createSpy('getIncomingOrders').and.returnValue(
              of({ ok: true, orders: [] })
            ),
            simulateIncomingMessage: jasmine.createSpy('simulateIncomingMessage').and.returnValue(
              of({
                ok: true,
                handled: true,
                action: 'DRAFT_REPEAT_SINGLE',
                replyText: '¡Claro Luz! Tu último pedido registrado es: 10x Mora (500g)'
              })
            )
          }
        },
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

  it('should render modern segmented inventory sub-navigation buttons with SVG icons and badges and switch tabs', () => {
    component.activeTab.set('inventory');
    component.inventorySubTab.set('fruits');
    fixture.detectChanges();

    const compiled: HTMLElement = fixture.nativeElement as HTMLElement;
    const navButtons: NodeListOf<HTMLButtonElement> = compiled.querySelectorAll('.dgl-subnav-bar .dgl-subnav-btn');
    expect(navButtons.length).toBe(2);
    expect(navButtons[0].classList.contains('active')).toBeTrue();
    expect(navButtons[0].querySelector('svg')).not.toBeNull();
    expect(navButtons[0].querySelector('.dgl-subnav-badge')?.textContent).toContain('Kg');
    expect(navButtons[1].querySelector('svg')).not.toBeNull();
    expect(navButtons[1].querySelector('.dgl-subnav-badge')?.textContent).toContain('uds');

    navButtons[1].click();
    fixture.detectChanges();
    expect(component.inventorySubTab()).toBe('variants');
    expect(navButtons[1].classList.contains('active')).toBeTrue();
  });

  it('should initialize companyForm with official logoUrl and restore it on resetCompanyDefaults', () => {
    expect(component.companyForm().logoUrl).toBe('/logo-dgl.png');

    component.updateCompanyField('logoUrl', 'https://custom-logo.png');
    expect(component.companyForm().logoUrl).toBe('https://custom-logo.png');

    component.resetCompanyDefaults();
    component.onConfirmDialog();
    expect(component.companyForm().logoUrl).toBe('/logo-dgl.png');
  });

  it('should display units in ms-value and total value in ms-status-pill on operational stock cards and remove presentaciones encontradas and Configurar Columnas', () => {
    component.activeTab.set('inventory');
    component.inventorySubTab.set('variants');
    fixture.detectChanges();

    const compiled: HTMLElement = fixture.nativeElement as HTMLElement;
    const settingsBtn = compiled.querySelector('#btn-open-inventory-settings');
    expect(settingsBtn?.classList.contains('inventory-desktop-only-btn')).toBeTrue();

    expect(compiled.textContent).not.toContain('presentaciones encontradas');
    expect(compiled.textContent).not.toContain('Configurar Columnas');

    const stockCard = compiled.querySelector('.inv-stock-card');
    expect(stockCard).not.toBeNull();
    const msValue = stockCard?.querySelector('.ms-value')?.textContent?.trim() || '';
    const msStatusPill = stockCard?.querySelector('.ms-status-pill')?.textContent?.trim() || '';
    expect(msValue).toBe('40 uds');
    expect(msStatusPill).toContain('140.000');

    component.toggleMobileRow('variant-1');
    expect(component.isMobileRowExpanded('variant-1')).toBeTrue();
    component.toggleMobileRow('variant-1');
    expect(component.isMobileRowExpanded('variant-1')).toBeFalse();
  });

  it('should open fruit modal, create and edit fresh fruit in kilograms, and delete fruit after confirmation', () => {
    component.activeTab.set('inventory');
    component.inventorySubTab.set('fruits');
    fixture.detectChanges();

    component.openNewFruitModal();
    expect(component.showFruitModal()).toBeTrue();
    expect(component.isEditingFruit()).toBeFalse();

    component.fruitFormName.set('Guanábana');
    component.fruitFormWeightKg.set(85);
    component.fruitFormYieldPercent.set(80);
    component.fruitFormScientificName.set('Annona muricata');
    component.saveFruitForm();

    expect(saveFreshFruitItemSpy).toHaveBeenCalledWith({
      id: undefined,
      fruitId: undefined,
      name: 'Guanábana',
      freshStockKg: 85,
      yieldPercentage: 80,
      scientificName: 'Annona muricata'
    });
    expect(component.showFruitModal()).toBeFalse();

    const existingFruit = mockFruits()[0];
    component.openEditFruitModal(existingFruit);
    expect(component.showFruitModal()).toBeTrue();
    expect(component.isEditingFruit()).toBeTrue();
    expect(component.fruitFormName()).toBe('Mora');
    expect(component.fruitFormWeightKg()).toBe(100);

    component.fruitFormWeightKg.set(145);
    component.saveFruitForm();
    expect(saveFreshFruitItemSpy).toHaveBeenCalledWith({
      id: 'mora',
      fruitId: 1,
      name: 'Mora',
      freshStockKg: 145,
      yieldPercentage: 70,
      scientificName: 'Rubus glaucus'
    });

    component.deleteFreshFruit(existingFruit);
    expect(component.confirmDialogState().isOpen).toBeTrue();
    component.onConfirmDialog();
    expect(deleteFreshFruitItemSpy).toHaveBeenCalledWith('mora');
  });

  it('should render clean payment method mobile cards without ms-subtitle or ms-value, omit Restablecer Valores button, and display simplified Nuevo Método de Pago modal', () => {
    mockPaymentMethods.set([
      {
        paymentMethodId: 1,
        name: 'Efectivo',
        code: 'CASH',
        type: 'cash',
        description: '',
        isActive: true
      }
    ]);
    component.activeTab.set('parameters');
    component.parametersSubTab.set('paymentMethods');
    fixture.detectChanges();

    const compiled: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).not.toContain('Restablecer Valores');

    const pmSummaryHeaders: NodeListOf<HTMLElement> = compiled.querySelectorAll('.pm-card .mobile-summary-header');
    expect(pmSummaryHeaders.length).toBeGreaterThan(0);
    pmSummaryHeaders.forEach((header: HTMLElement) => {
      expect(header.querySelector('.ms-code-badge')).not.toBeNull();
      expect(header.querySelector('.ms-status-pill')).not.toBeNull();
      expect(header.querySelector('.ms-subtitle')).toBeNull();
      expect(header.querySelector('.ms-value')).toBeNull();
    });

    component.openCreatePaymentMethodModal();
    fixture.detectChanges();

    const modalTitle: HTMLElement | null = compiled.querySelector('.modal-overlay .modal-title');
    expect((modalTitle?.textContent || '').trim()).toBe('Nuevo Método de Pago');

    const modalBody: HTMLElement | null = compiled.querySelector('.modal-overlay .modal-body');
    expect(modalBody).not.toBeNull();
    expect(modalBody?.textContent).toContain('Nombre del Método de Pago *');
    expect(modalBody?.textContent).toContain('Habilitado para Pedidos');
    expect(modalBody?.textContent).not.toContain('Tipo de Medio');
    expect(modalBody?.textContent).not.toContain('Código Interno');
    expect(modalBody?.textContent).not.toContain('Descripción o Instrucciones');
    expect(modalBody?.querySelector('.switch-card .custom-switch .slider')).not.toBeNull();
  });

  it('should create, edit, toggle, and delete parametric shift schedules in Parámetros del Sistema', () => {
    component.activeTab.set('parameters');
    component.parametersSubTab.set('shifts');
    fixture.detectChanges();

    expect(component.shiftSchedulesConfig().length).toBe(3);

    component.openCreateShiftScheduleModal();
    expect(component.showShiftScheduleModal()).toBeTrue();
    component.updateShiftScheduleFormField('name', 'Turno Extendido');
    component.updateShiftScheduleFormField('startTime', '07:00 AM');
    component.updateShiftScheduleFormField('endTime', '05:00 PM');
    component.updateShiftScheduleFormField('code', 'EXTENDIDO');
    component.saveShiftSchedule();

    expect(component.showShiftScheduleModal()).toBeFalse();
    const added = component.shiftSchedulesConfig().find(s => s.code === 'EXTENDIDO');
    expect(added).toBeDefined();
    expect(added?.name).toBe('Turno Extendido');

    component.openEditShiftScheduleModal(added!);
    expect(component.isEditingShiftSchedule()).toBeTrue();
    component.updateShiftScheduleFormField('endTime', '06:00 PM');
    component.saveShiftSchedule();
    expect(component.shiftSchedulesConfig().find(s => s.code === 'EXTENDIDO')?.endTime).toBe('06:00 PM');

    component.toggleShiftSchedule('EXTENDIDO');
    expect(component.shiftSchedulesConfig().find(s => s.code === 'EXTENDIDO')?.isActive).toBeFalse();

    component.confirmDeleteShiftSchedule(added!);
    component.onConfirmDialog();
    expect(component.shiftSchedulesConfig().some(s => s.code === 'EXTENDIDO')).toBeFalse();
  });

  it('should render executive 4 KPI sparkline cards, Existencias por Presentación y Valorización tables, and Ajuste rápido controls for both pulps and fruits', () => {
    component.activeTab.set('inventory');
    component.inventorySubTab.set('variants');
    fixture.detectChanges();

    const compiled: HTMLElement = fixture.nativeElement as HTMLElement;
    const kpiCards: NodeListOf<HTMLElement> = compiled.querySelectorAll('.quick-kpis-grid .quick-kpi-card');
    expect(kpiCards.length).toBe(4);
    expect(compiled.textContent).toContain('Pulpa Congelada en Inventario');
    expect(compiled.textContent).toContain('Fruta Fresca en Bodega');
    expect(compiled.textContent).toContain('Valorización Comercial de Inventario');
    expect(compiled.textContent).toContain('Costo Estimado & Alertas');

    const pulpSummaryBanner = compiled.querySelector('.inv-summary-banner');
    expect(pulpSummaryBanner).not.toBeNull();
    expect(pulpSummaryBanner?.textContent).toContain('Existencias por Presentación y Valorización');
    expect(pulpSummaryBanner?.textContent).toContain('pulpas en catálogo');
    expect(pulpSummaryBanner?.querySelector('#btn-pulp-history-dropdown')).not.toBeNull();

    const stockRow = compiled.querySelector('.inv-stock-card');
    expect(stockRow).not.toBeNull();
    expect(stockRow?.querySelector('.inv-quick-label')?.textContent?.trim()).toBe('Ajuste rápido:');
    const pulpAdjustBtns = stockRow?.querySelectorAll('.inv-adjust-btn');
    expect(pulpAdjustBtns?.length).toBe(3);

    expect(component.inventoryTotalPulpKg()).toBeGreaterThan(0);
    expect(component.inventoryCommercialValue()).toBeGreaterThan(0);
    expect(component.inventoryEstimatedCost()).toBeGreaterThan(0);
    expect(component.formatNum(19.46)).toContain('19');

    component.inventorySubTab.set('fruits');
    fixture.detectChanges();

    const fruitSummaryBanner = compiled.querySelector('.inv-summary-banner');
    expect(fruitSummaryBanner).not.toBeNull();
    expect(fruitSummaryBanner?.textContent).toContain('Existencias por Presentación y Valorización');
    expect(fruitSummaryBanner?.textContent).toContain('frutas en catálogo');
    expect(fruitSummaryBanner?.querySelector('#btn-fruit-history-dropdown')).not.toBeNull();

    const fruitRow = compiled.querySelector('.inv-fruit-card');
    expect(fruitRow).not.toBeNull();
    expect(fruitRow?.querySelector('.inv-quick-label')?.textContent?.trim()).toBe('Ajuste rápido:');
    const fruitAdjustBtns = fruitRow?.querySelectorAll('.inv-adjust-btn');
    expect(fruitAdjustBtns?.length).toBe(4);

    const sampleFruit = mockFruits()[0];
    expect(component.getFruitCommercialValue(sampleFruit)).toBeGreaterThan(0);
    expect(component.getFruitTotalPulpKg(sampleFruit)).toBeGreaterThan(0);
    expect(typeof component.isFruitLowStock(sampleFruit)).toBe('boolean');
  });

  it('should open inventory history modal via dropdown, filter by dates, and paginate up to 15 pages', () => {
    const generatedMovements: InventoryMovementRecordDto[] = Array.from({ length: 25 }, (_, i) => ({
      id: `MOV-${i + 1}`,
      category: 'FRUIT',
      movementType: i % 2 === 0 ? 'IN' : 'OUT',
      itemId: '1',
      itemName: 'Mora',
      presentation: 'Fruta Fresca (Kg)',
      quantity: 10,
      previousStock: 100,
      newStock: i % 2 === 0 ? 110 : 90,
      unit: 'Kg',
      reason: 'Ajuste rápido',
      createdAt: i < 10 ? '2026-10-10T10:00:00.000Z' : '2026-10-25T14:30:00.000Z'
    }));
    mockInventoryMovements.set(generatedMovements);

    component.activeTab.set('inventory');
    component.inventorySubTab.set('fruits');
    fixture.detectChanges();

    component.toggleHistoryDropdown();
    expect(component.showHistoryDropdown()).toBeTrue();

    component.openInventoryHistoryModal('FRUIT', 'ALL');
    fixture.detectChanges();

    expect(component.showHistoryDropdown()).toBeFalse();
    expect(component.showInventoryHistoryModal()).toBeTrue();
    expect(component.historyTotalPages()).toBe(2);
    expect(component.paginatedInventoryHistory().length).toBe(15);

    component.setHistoryPage(2);
    expect(component.historyCurrentPage()).toBe(2);
    expect(component.paginatedInventoryHistory().length).toBe(10);

    component.historyStartDate.set('2026-10-20');
    component.historyEndDate.set('2026-10-30');
    component.historyCurrentPage.set(1);
    expect(component.filteredInventoryHistory().length).toBe(15);
    expect(component.historyTotalPages()).toBe(1);

    component.clearHistoryDateFilters();
    expect(component.historyStartDate()).toBe('');
    expect(component.historyEndDate()).toBe('');
    expect(component.filteredInventoryHistory().length).toBe(25);

    component.closeInventoryHistoryModal();
    expect(component.showInventoryHistoryModal()).toBeFalse();
  });

  it('should render clean grammage presentation cards without netos/Kg metadata and display single + icon in Nueva Presentación button', () => {
    component.activeTab.set('parameters');
    component.parametersSubTab.set('grammages');
    fixture.detectChanges();

    const compiled: HTMLElement = fixture.nativeElement as HTMLElement;
    const grammageCards: NodeListOf<HTMLElement> = compiled.querySelectorAll('.param-list-grid .param-card');
    expect(grammageCards.length).toBeGreaterThan(0);

    grammageCards.forEach((card: HTMLElement) => {
      expect(card.querySelector('.param-card-title')).not.toBeNull();
      expect(card.querySelector('.param-card-meta')).toBeNull();
      expect(card.querySelector('.ms-subtitle')).toBeNull();
      expect(card.textContent).not.toContain('netos');
    });

    const buttons: HTMLElement[] = Array.from(compiled.querySelectorAll('button.btn-primary'));
    const newPresentationBtn = buttons.find((btn: HTMLElement) => (btn.textContent || '').includes('Nueva Presentación'));
    expect(newPresentationBtn).toBeDefined();
    expect(newPresentationBtn?.querySelector('svg')).not.toBeNull();
    expect((newPresentationBtn?.querySelector('span')?.textContent || '').trim()).toBe('Nueva Presentación');
  });

  it('should render WhatsApp QR Gateway card in general tab, refresh QR status, reconnect, logout, and send test message', () => {
    component.activeTab.set('general');
    fixture.detectChanges();

    expect(whatsAppGetStatusSpy).toHaveBeenCalled();
    expect(component.whatsAppGatewayStatus().status).toBe('QR_READY');

    const compiled: HTMLElement = fixture.nativeElement as HTMLElement;
    const qrImg = compiled.querySelector('.whatsapp-qr-image') as HTMLImageElement | null;
    expect(qrImg).not.toBeNull();
    expect(qrImg?.src).toContain('data:image/png;base64,TESTQR');

    component.whatsAppTestPhone.set('3109998877');
    component.whatsAppTestMessage.set('Prueba automática');
    component.sendWhatsAppTestMessage();
    expect(whatsAppSendMessageSpy).toHaveBeenCalledWith('3109998877', 'Prueba automática');
    expect(notificationSpy.success).toHaveBeenCalled();

    component.reconnectWhatsAppGateway();
    expect(whatsAppReconnectSpy).toHaveBeenCalled();

    component.logoutWhatsAppGateway();
    expect(whatsAppLogoutSpy).toHaveBeenCalled();
  });

  it('should toggle WhatsApp auto-orders bot ON/OFF, save Gemini key, sync context, and simulate customer order', () => {
    component.activeTab.set('general');
    fixture.detectChanges();

    expect(component.whatsAppBotConfig().botEnabled).toBeTrue();

    const compiled: HTMLElement = fixture.nativeElement as HTMLElement;
    const toggleBtn = compiled.querySelector('.btn-toggle-whatsapp-auto-orders') as HTMLButtonElement | null;
    expect(toggleBtn).not.toBeNull();
    expect(toggleBtn?.textContent).toContain('Apagar Recepción Automática de Pedidos');

    component.toggleWhatsAppAutoOrdersBot();
    fixture.detectChanges();
    expect(component.whatsAppBotConfig().botEnabled).toBeFalse();
    expect(toggleBtn?.textContent).toContain('Encender Recepción Automática de Pedidos');

    component.toggleWhatsAppAutoOrdersBot();
    fixture.detectChanges();
    expect(component.whatsAppBotConfig().botEnabled).toBeTrue();

    component.toggleWhatsAppAutoReply();
    expect(component.whatsAppBotConfig().autoReplyEnabled).toBeFalse();

    component.whatsAppGeminiApiKeyInput.set('AIzaSyTestKey123456');
    component.saveWhatsAppGeminiApiKey();
    expect(component.whatsAppBotConfig().hasGeminiApiKey).toBeTrue();

    component.syncCatalogAndHistoryWithWhatsAppGateway(false);
    expect(notificationSpy.success).toHaveBeenCalled();

    component.whatsAppSimulatorPhone.set('3101234567');
    component.whatsAppSimulatorMessage.set('deme el pedido de qué días');
    component.simulateWhatsAppCustomerOrder(false);
    expect(component.whatsAppSimulatorLastReply()).toContain('10x Mora (500g)');
  });

  it('should automatically request QR generation via reconnect when gateway status is DISCONNECTED without qrDataUrl', () => {
    whatsAppGetStatusSpy.and.returnValue(
      of({
        status: 'DISCONNECTED',
        connected: false,
        qrDataUrl: null,
        phoneNumber: null,
        name: null
      })
    );
    whatsAppReconnectSpy.calls.reset();
    whatsAppReconnectSpy.and.returnValue(
      of({
        success: true,
        status: 'QR_READY',
        connected: false,
        qrDataUrl: 'data:image/png;base64,autoGeneratedQrCode',
        phoneNumber: null,
        name: null
      })
    );

    component.refreshWhatsAppGatewayStatus();

    expect(whatsAppReconnectSpy).toHaveBeenCalledTimes(1);
    expect(component.whatsAppGatewayStatus().status).toBe('QR_READY');
    expect(component.whatsAppGatewayStatus().qrDataUrl).toBe('data:image/png;base64,autoGeneratedQrCode');
  });

  it('should render horizontal table rows for both Stock Pulpas Hechas and Inventario Fruta Disponible', () => {
    component.activeTab.set('inventory');
    component.inventorySubTab.set('variants');
    fixture.detectChanges();

    const compiled: HTMLElement = fixture.nativeElement as HTMLElement;
    const variantRows: NodeListOf<HTMLTableRowElement> = compiled.querySelectorAll('tbody tr.inv-stock-row');
    expect(variantRows.length).toBeGreaterThan(0);
    const firstVariantCells: NodeListOf<HTMLTableCellElement> = variantRows[0].querySelectorAll(
      'td:not(.mobile-tr-summary-cell)'
    );
    expect(firstVariantCells.length).toBe(9);

    component.inventorySubTab.set('fruits');
    fixture.detectChanges();

    const fruitRows: NodeListOf<HTMLTableRowElement> = compiled.querySelectorAll('tbody tr.inv-fruit-row');
    expect(fruitRows.length).toBeGreaterThan(0);
    const firstFruitCells: NodeListOf<HTMLTableCellElement> = fruitRows[0].querySelectorAll(
      'td:not(.mobile-tr-summary-cell)'
    );
    expect(firstFruitCells.length).toBe(11);
  });

  it('should update QR immediately on reconnectWhatsAppGateway and report DISCONNECTED without fake QR if gateway is unreachable', () => {
    whatsAppReconnectSpy.and.returnValue(
      of({
        success: true,
        status: 'QR_READY',
        connected: false,
        qrDataUrl: 'data:image/png;base64,FreshQrCode',
        phoneNumber: null,
        name: null
      })
    );

    component.reconnectWhatsAppGateway();
    expect(component.whatsAppGatewayStatus().status).toBe('QR_READY');
    expect(component.whatsAppGatewayStatus().qrDataUrl).toBe('data:image/png;base64,FreshQrCode');
    expect(component.isLoadingWhatsAppStatus()).toBeFalse();

    whatsAppReconnectSpy.and.returnValue(
      of({
        success: false,
        status: 'DISCONNECTED',
        connected: false,
        qrDataUrl: null,
        error: 'GATEWAY_UNREACHABLE'
      })
    );

    component.reconnectWhatsAppGateway();
    expect(component.whatsAppGatewayStatus().status).toBe('DISCONNECTED');
    expect(component.whatsAppGatewayStatus().qrDataUrl).toBeNull();
    expect(component.whatsAppGatewayStatus().error).toBe('GATEWAY_UNREACHABLE');
    expect(notificationSpy.warning).toHaveBeenCalled();
  });
});
