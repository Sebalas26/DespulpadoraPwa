import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { ClientPortalComponent } from './client-portal.component';
import { StateService } from '../../core/services/state.service';
import { DEFAULT_COMPANY_CONFIG, DEFAULT_PORTAL_CMS_CONFIG } from '../../core/data/initial-data';
import { NotificationService } from '../../core/services/notification.service';
import { ClientDto, CompanyConfig, FruitConfig, InventoryGrammageConfig, OrderDto, PaymentMethodDto, PortalCmsConfig, ProductVariantDto } from '../../core/models/business.models';

/**
 * Unit tests for ClientPortalComponent verifying empty client defaults, dynamic WhatsApp link, and real pricing.
 */
describe('ClientPortalComponent', () => {
  let component: ClientPortalComponent;
  let fixture: ComponentFixture<ClientPortalComponent>;
  let createOrderSpy: jasmine.Spy;

  const mockFruits = signal<FruitConfig[]>([
    {
      id: 'fresa',
      fruitId: 5,
      name: 'Fresa',
      scientificName: 'Fragaria x ananassa',
      emoji: '',
      color: '#ef4444',
      bgColor: '#fef2f2',
      yieldRate: 0.75,
      waterAdditionDefault: 0.05,
      freshStockKg: 60,
      category: 'PULPAS',
      prices: { g140: 2300, g250: 4000, g500: 7200, g1000: 13500 },
      stock: { g140: 10, g250: 10, g500: 10, g1000: 10 },
      minStock: { g140: 5, g250: 5, g500: 5, g1000: 5 }
    }
  ]);

  const mockProductVariants = signal<ProductVariantDto[]>([
    {
      variantId: 1,
      fruitId: 5,
      fruitName: 'Fresa',
      category: 'PULPAS',
      name: 'Fresa 1000g',
      sku: 'FRE-1000',
      grammage: 1000,
      basePrice: 13800,
      unitCost: 8000,
      currentStock: 10,
      minStockAlert: 5,
      isActive: true
    }
  ]);

  const mockClients = signal<ClientDto[]>([]);
  const mockPaymentMethods = signal<PaymentMethodDto[]>([]);

  const mockCompanyInfo = signal<CompanyConfig>({
    ...DEFAULT_COMPANY_CONFIG,
    companyName: 'Despulpadora Oficial',
    whatsapp: '+57 320 999 8877'
  });

  beforeEach(async () => {
    mockClients.set([]);
    mockPaymentMethods.set([]);

    createOrderSpy = jasmine.createSpy('createOrder').and.callFake((dto: Partial<OrderDto>) => ({
      orderId: 501,
      orderNumber: 'ORD-501',
      clientName: dto.clientName || '',
      status: 'PENDING',
      isPaid: false,
      totalAmount: 138000,
      createdAt: new Date().toISOString(),
      orderDate: new Date().toISOString().substring(0, 10),
      items: dto.items || []
    }));

    const stateServiceMock: Partial<StateService> = {
      fruits: mockFruits,
      productVariants: mockProductVariants,
      clients: mockClients,
      paymentMethods: mockPaymentMethods,
      activePaymentMethods: mockPaymentMethods,
      companyInfo: mockCompanyInfo,
      portalCmsConfig: signal<PortalCmsConfig>(DEFAULT_PORTAL_CMS_CONFIG) as unknown as StateService['portalCmsConfig'],
      activeGrammages: signal<InventoryGrammageConfig[]>([
        { key: 'g140', value: 140, label: '140g', isActive: true },
        { key: 'g250', value: 250, label: '250g', isActive: true },
        { key: 'g500', value: 500, label: '500g', isActive: true },
        { key: 'g1000', value: 1000, label: '1000g', isActive: true }
      ]) as unknown as StateService['activeGrammages'],
      createOrder: createOrderSpy
    };

    const notificationMock: Partial<NotificationService> = {
      success: jasmine.createSpy('success'),
      warning: jasmine.createSpy('warning'),
      error: jasmine.createSpy('error'),
      info: jasmine.createSpy('info')
    };

    await TestBed.configureTestingModule({
      imports: [ClientPortalComponent],
      providers: [
        provideRouter([]),
        { provide: StateService, useValue: stateServiceMock },
        { provide: NotificationService, useValue: notificationMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ClientPortalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create with null selectedClientId and empty client form signals when no clients exist', () => {
    expect(component).toBeTruthy();
    expect(component.selectedClientId()).toBeNull();
    expect(component.clientName()).toBe('');
    expect(component.clientPhone()).toBe('');
    expect(component.clientAddress()).toBe('');
    expect(component.deliveryNotes()).toBe('');
    expect(component.selectedPaymentMethod()).toBe('');
  });

  it('should build WhatsApp link from StateService companyInfo.whatsapp without hardcoded number', () => {
    const link = component.getCompanyWhatsAppLink();
    expect(link).toContain('https://wa.me/573209998877');
    expect(link).not.toContain('573154567890');
  });

  it('should resolve real prices from productVariants or fruit.prices and return 0 when unconfigured', () => {
    const fresa = mockFruits()[0];
    expect(component.getPrice(fresa, 1000)).toBe(13800);
    expect(component.getPrice(fresa, 500)).toBe(7200);

    const zeroFruit: FruitConfig = {
      ...fresa,
      id: 'unpriced',
      fruitId: 99,
      name: 'SinPrecio',
      prices: { g140: 0, g250: 0, g500: 0, g1000: 0 }
    };
    expect(component.getPrice(zeroFruit, 1000)).toBe(0);
    expect(component.getPrice(zeroFruit, 140)).toBe(0);
  });

  it('should add items to cart and submit client order when client details are completed', () => {
    const fresa = mockFruits()[0];
    component.updateItemQuantity(fresa, 1000, 10);

    expect(component.totalCartItems()).toBe(10);
    expect(component.totalCartAmount()).toBe(138000);

    component.clientName.set('Cafe del Parque');
    component.clientPhone.set('3147778899');
    component.clientAddress.set('Calle 93 # 12-40');

    component.submitClientOrder();
    expect(createOrderSpy).toHaveBeenCalled();
    expect(component.submittedOrder()?.orderNumber).toBe('ORD-501');
    expect(component.showSuccessModal()).toBeTrue();
  });

  it('should render success modal with WhatsApp button and new order button when order is submitted', () => {
    component.showSuccessModal.set(true);
    component.submittedOrder.set({
      orderId: 501,
      orderNumber: 'ORD-501',
      clientId: 1,
      clientName: 'Cafe del Parque',
      clientPhone: '3147778899',
      clientAddress: 'Calle 93 # 12-40',
      branchId: 1,
      status: 'PENDING',
      totalAmount: 138000,
      isPaid: false,
      isBilled: false,
      isPriority: false,
      orderDate: '2026-10-28',
      createdAt: '2026-10-28',
      paymentMethodName: 'Efectivo',
      items: [{ fruitId: 1, fruitName: 'Fresa', grammage: 1000, quantity: 10, unitPrice: 13800, subtotal: 138000 }]
    });
    fixture.detectChanges();

    const compiled: HTMLElement = fixture.nativeElement as HTMLElement;
    const successModal: HTMLElement | null = compiled.querySelector('.success-modal');
    const whatsAppBtn: HTMLButtonElement | null = compiled.querySelector('.btn-send-whatsapp');
    const newOrderBtn: HTMLButtonElement | null = compiled.querySelector('.btn-new-order');

    expect(successModal).not.toBeNull();
    expect(whatsAppBtn).not.toBeNull();
    expect(whatsAppBtn?.textContent).toContain('Enviar Confirmación por WhatsApp');
    expect(newOrderBtn).not.toBeNull();
    expect(newOrderBtn?.textContent).toContain('Hacer Otro Pedido');
  });

  it('should reset success modal state when clicking start new order button', () => {
    component.showSuccessModal.set(true);
    component.submittedOrder.set({
      orderId: 501,
      orderNumber: 'ORD-501',
      clientId: 1,
      clientName: 'Cafe del Parque',
      clientPhone: '3147778899',
      clientAddress: 'Calle 93 # 12-40',
      branchId: 1,
      status: 'PENDING',
      totalAmount: 138000,
      isPaid: false,
      isBilled: false,
      isPriority: false,
      orderDate: '2026-10-28',
      createdAt: '2026-10-28',
      paymentMethodName: 'Efectivo',
      items: [{ fruitId: 1, fruitName: 'Fresa', grammage: 1000, quantity: 10, unitPrice: 13800, subtotal: 138000 }]
    });
    fixture.detectChanges();

    const compiled: HTMLElement = fixture.nativeElement as HTMLElement;
    const newOrderBtn: HTMLButtonElement | null = compiled.querySelector('.btn-new-order');
    newOrderBtn?.click();
    fixture.detectChanges();

    expect(component.showSuccessModal()).toBeFalse();
    expect(component.submittedOrder()).toBeNull();
  });

  it('should resolve canonical weekday and set isPriority true when selecting Hoy mismo (Prioritario)', () => {
    const fresa = mockFruits()[0];
    component.updateItemQuantity(fresa, 1000, 3);
    component.clientName.set('Restaurante Gourmet');
    component.clientPhone.set('3159998877');
    component.clientAddress.set('Carrera 15 # 85-30');
    component.deliveryDay.set('Hoy mismo (Prioritario)');

    component.submitClientOrder();

    expect(createOrderSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        clientName: 'Restaurante Gourmet',
        isPriority: true,
        scheduledDay: component.resolveCanonicalWeekday('Hoy mismo (Prioritario)')
      })
    );
  });
});
