import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { OrdersComponent } from './orders.component';
import { StateService } from '../../core/services/state.service';
import { DEFAULT_COMPANY_CONFIG } from '../../core/data/initial-data';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';
import { VoiceOrdersService } from '../../core/services/voice-orders.service';
import { GeocodingService } from '../../core/services/geocoding.service';
import { ClientDto, CompanyConfig, EmployeeDto, FruitConfig, OrderDto, PaymentMethodDto, UserAdminDto, UserRoleDto } from '../../core/models/business.models';
import { VoiceOrderMessageDto } from '../../core/models/voice-order.models';

/**
 * Unit tests for OrdersComponent verifying zeroed form defaults, dynamic courier catalog, and order operations.
 */
describe('OrdersComponent', () => {
  let component: OrdersComponent;
  let fixture: ComponentFixture<OrdersComponent>;
  let createOrderSpy: jasmine.Spy;
  let updateOrderSpy: jasmine.Spy;
  let updateOrderStatusSpy: jasmine.Spy;

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
      stock: { g140: 10, g250: 20, g500: 15, g1000: 10 },
      minStock: { g140: 5, g250: 5, g500: 5, g1000: 5 }
    }
  ]);

  const mockEmployees = signal<EmployeeDto[]>([
    {
      id: 10,
      employeeId: 10,
      firstName: 'Sandra',
      lastName: 'NoCreadaEnUsuarios',
      fullName: 'Sandra NoCreadaEnUsuarios',
      name: 'Sandra NoCreadaEnUsuarios',
      identificationNumber: '1001',
      documentNumber: '1001',
      position: 'Mensajero Motorizado',
      area: 'DOMICILIOS',
      baseSalary: 1300000,
      transportAllowance: 162000,
      hireDate: '2025-01-10',
      isActive: true,
      phone: '3009998877'
    }
  ]);

  const mockRoles = signal<UserRoleDto[]>([
    {
      roleId: 3,
      name: 'Domiciliario',
      description: 'Mensajero',
      isCourier: true,
      isSystemRole: true,
      isActive: true
    }
  ]);

  const mockUsers = signal<UserAdminDto[]>([
    {
      userId: 6,
      username: 'jdomi',
      fullName: 'Juan Domiciliario',
      email: 'juan@dgl.com',
      phone: '3001112233',
      roleId: 3,
      roleName: 'Domiciliario',
      companyId: 1,
      isActive: true,
      branches: []
    }
  ]);

  const mockOrders = signal<OrderDto[]>([
    {
      orderId: 50,
      orderNumber: 'ORD-050',
      invoiceNumber: 'FAC-050',
      clientId: 1,
      clientName: 'Restaurante Central',
      clientPhone: '3105556677',
      clientAddress: 'Calle 50 # 10-20',
      branchId: 1,
      status: 'PENDING',
      isPaid: false,
      paymentMethodName: 'Efectivo',
      courierName: 'Juan Domiciliario',
      totalAmount: 24000,
      createdAt: new Date().toISOString(),
      orderDate: new Date().toISOString().substring(0, 10),
      items: [
        {
          fruitId: 1,
          fruitName: 'Mora',
          grammage: 1000,
          quantity: 2,
          unitPrice: 12000,
          subtotal: 24000
        }
      ]
    }
  ]);

  const mockClients = signal<ClientDto[]>([
    {
      id: 1,
      clientId: 1,
      identificationNumber: '900111222',
      fullName: 'Restaurante Central',
      name: 'Restaurante Central',
      phone: '3105556677',
      email: 'info@central.com',
      address: 'Calle 50 # 10-20',
      city: 'Bogota',
      creditLimit: 500000,
      currentBalance: 0,
      isActive: true
    }
  ]);

  const mockPaymentMethods = signal<PaymentMethodDto[]>([
    {
      id: 1,
      paymentMethodId: 1,
      name: 'Efectivo Contraentrega',
      type: 'cash',
      description: 'Caja General',
      isActive: true
    }
  ]);

  const mockCompanyInfo = signal<CompanyConfig>({
    ...DEFAULT_COMPANY_CONFIG,
    companyName: 'Despulpadora Test',
    nit: '900000000-1',
    whatsapp: '573000000000'
  });

  beforeEach(async () => {
    mockOrders.set([
      {
        orderId: 50,
        orderNumber: 'ORD-050',
        invoiceNumber: 'FAC-050',
        clientId: 1,
        clientName: 'Restaurante Central',
        clientPhone: '3105556677',
        clientAddress: 'Calle 50 # 10-20',
        branchId: 1,
        status: 'PENDING',
        isPaid: false,
        paymentMethodName: 'Efectivo',
        courierName: 'Juan Domiciliario',
        totalAmount: 24000,
        createdAt: new Date().toISOString(),
        orderDate: new Date().toISOString().substring(0, 10),
        items: [
          {
            fruitId: 1,
            fruitName: 'Mora',
            grammage: 1000,
            quantity: 2,
            unitPrice: 12000,
            subtotal: 24000
          }
        ]
      }
    ]);
    createOrderSpy = jasmine.createSpy('createOrder').and.callFake((dto: Partial<OrderDto>) => ({
      orderId: 99,
      orderNumber: 'ORD-099',
      clientName: dto.clientName || '',
      status: 'PENDING',
      isPaid: false,
      totalAmount: 12000,
      createdAt: new Date().toISOString(),
      orderDate: new Date().toISOString().substring(0, 10),
      items: dto.items || []
    }));
    updateOrderSpy = jasmine.createSpy('updateOrder');
    updateOrderStatusSpy = jasmine.createSpy('updateOrderStatus');

    const stateServiceMock: Partial<StateService> = {
      fruits: mockFruits,
      employees: mockEmployees,
      users: mockUsers,
      roles: mockRoles,
      orders: mockOrders,
      clients: mockClients,
      paymentMethods: mockPaymentMethods,
      activePaymentMethods: mockPaymentMethods,
      companyInfo: mockCompanyInfo,
      createOrder: createOrderSpy,
      updateOrder: updateOrderSpy,
      updateOrderStatus: updateOrderStatusSpy,
      setOrderPriority: jasmine.createSpy('setOrderPriority'),
      deleteOrder: jasmine.createSpy('deleteOrder')
    };

    const notificationMock: Partial<NotificationService> = {
      success: jasmine.createSpy('success'),
      warning: jasmine.createSpy('warning'),
      error: jasmine.createSpy('error'),
      info: jasmine.createSpy('info')
    };

    const authServiceMock: Partial<AuthService> = {
      currentUser: signal(null) as unknown as AuthService['currentUser'],
      hasPermission: jasmine.createSpy('hasPermission').and.returnValue(true)
    };

    const voiceOrdersMock: Partial<VoiceOrdersService> = {
      isSignalRConnected: signal<boolean>(false) as unknown as VoiceOrdersService['isSignalRConnected'],
      pendingCount: signal<number>(0) as unknown as VoiceOrdersService['pendingCount'],
      isModalOpen: signal<boolean>(false) as unknown as VoiceOrdersService['isModalOpen'],
      voiceOrders: signal<VoiceOrderMessageDto[]>([]) as unknown as VoiceOrdersService['voiceOrders'],
      pendingVoiceOrders: signal<VoiceOrderMessageDto[]>([]) as unknown as VoiceOrdersService['pendingVoiceOrders'],
      activeVoiceOrder: signal<VoiceOrderMessageDto | null>(null) as unknown as VoiceOrdersService['activeVoiceOrder'],
      openModal: jasmine.createSpy('openModal'),
      closeModal: jasmine.createSpy('closeModal'),
      selectOrder: jasmine.createSpy('selectOrder'),
      simulateIncomingAudio: jasmine.createSpy('simulateIncomingAudio')
    };

    const geocodingMock: Partial<GeocodingService> = {
      detectBogotaZone: jasmine.createSpy('detectBogotaZone').and.returnValue('Chapinero'),
      geocodeBestMatch: jasmine.createSpy('geocodeBestMatch').and.returnValue(Promise.resolve(null)),
      searchAddress: jasmine.createSpy('searchAddress').and.returnValue(Promise.resolve([]))
    };

    await TestBed.configureTestingModule({
      imports: [OrdersComponent],
      providers: [
        provideRouter([]),
        { provide: StateService, useValue: stateServiceMock },
        { provide: NotificationService, useValue: notificationMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: VoiceOrdersService, useValue: voiceOrdersMock },
        { provide: GeocodingService, useValue: geocodingMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OrdersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and initialize whatsAppText, manualPaymentMethod, and manualItems to empty defaults', () => {
    expect(component).toBeTruthy();
    expect(component.whatsAppText()).toBe('');
    expect(component.manualPaymentMethod()).toBe('');
    expect(component.manualItems()).toEqual([]);
  });

  it('should derive COURIER_CATALOG strictly from active courier users in StateService and ignore HR employees not created as users', () => {
    const couriers = component.COURIER_CATALOG;
    expect(couriers.length).toBe(1);
    expect(couriers[0].name).toBe('Juan Domiciliario');
    expect(couriers[0].phone).toBe('3001112233');
    expect(couriers.some(c => c.name.toLowerCase().includes('sandra'))).toBeFalse();
  });

  it('should return null from getCourierForOrder when order has no courierName', () => {
    const unassignedOrder: OrderDto = {
      ...mockOrders()[0],
      courierName: undefined
    };
    expect(component.getCourierForOrder(unassignedOrder)).toBeNull();
  });

  it('should return real invoiceNumber or orderNumber in getInvoiceCode without hardcoded INV/2026 prefix', () => {
    expect(component.getInvoiceCode(mockOrders()[0])).toBe('FAC-050');
    const orderWithoutInvoice: OrderDto = {
      ...mockOrders()[0],
      invoiceNumber: undefined
    };
    expect(component.getInvoiceCode(orderWithoutInvoice)).toBe('ORD-050');
  });

  it('should populate manual order modal from configured fruits and active payment methods', () => {
    component.openCreateOrderModal();
    expect(component.showNewOrderModal()).toBeTrue();
    expect(component.manualPaymentMethod()).toBe('Efectivo Contraentrega');
    expect(component.manualItems().length).toBe(1);
    expect(component.manualItems()[0].fruitName).toBe('Mora');
    expect(component.manualItems()[0].unitPrice).toBe(12000);
  });

  it('should parse WhatsApp text using configured fruits without hardcoded phone fallback', () => {
    component.whatsAppText.set('Cliente: Cafeteria Norte\n10 de Mora de kilo');
    component.parseAndCreateWhatsAppOrder();
    expect(createOrderSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        clientName: 'Cafeteria Norte',
        clientPhone: ''
      })
    );
  });

  it('should filter allHistoryOrders by today, yesterday, month, year, and range and reset via resetHistoryFilters', () => {
    const todayStr = new Date().toISOString().substring(0, 10);
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().substring(0, 10);

    mockOrders.set([
      {
        orderId: 50,
        orderNumber: 'ORD-050',
        invoiceNumber: 'FAC-050',
        clientId: 1,
        clientName: 'Restaurante Central',
        clientPhone: '3105556677',
        clientAddress: 'Calle 50 # 10-20',
        branchId: 1,
        status: 'DELIVERED',
        isPaid: true,
        paymentMethodName: 'Efectivo',
        courierName: 'Juan Domiciliario',
        totalAmount: 24000,
        createdAt: `${todayStr}T10:00:00.000Z`,
        orderDate: todayStr,
        items: []
      },
      {
        orderId: 51,
        orderNumber: 'ORD-051',
        invoiceNumber: 'FAC-051',
        clientId: 1,
        clientName: 'Cliente Ayer',
        clientPhone: '3105556677',
        clientAddress: 'Calle 50 # 10-20',
        branchId: 1,
        status: 'DELIVERED',
        isPaid: true,
        paymentMethodName: 'Efectivo',
        courierName: 'Juan Domiciliario',
        totalAmount: 12000,
        createdAt: `${yesterdayStr}T10:00:00.000Z`,
        orderDate: yesterdayStr,
        items: []
      },
      {
        orderId: 52,
        orderNumber: 'ORD-052',
        invoiceNumber: 'FAC-052',
        clientId: 1,
        clientName: 'Cliente 2025',
        clientPhone: '3105556677',
        clientAddress: 'Calle 50 # 10-20',
        branchId: 1,
        status: 'DISPATCHED',
        isPaid: false,
        paymentMethodName: 'Efectivo',
        courierName: 'Juan Domiciliario',
        totalAmount: 36000,
        createdAt: '2025-05-15T10:00:00.000Z',
        orderDate: '2025-05-15',
        items: []
      }
    ]);

    component.setHistoryDateFilter('today');
    expect(component.allHistoryOrders().map(o => o.orderNumber)).toEqual(['ORD-050']);

    component.setHistoryDateFilter('yesterday');
    expect(component.allHistoryOrders().map(o => o.orderNumber)).toEqual(['ORD-051']);

    component.setHistoryDateFilter('month');
    component.historySelectedYear.set('2025');
    component.historySelectedMonthNumber.set('05');
    expect(component.allHistoryOrders().map(o => o.orderNumber)).toEqual(['ORD-052']);

    component.setHistoryDateFilter('year');
    component.historySelectedYear.set('2025');
    expect(component.allHistoryOrders().map(o => o.orderNumber)).toEqual(['ORD-052']);

    component.setHistoryDateFilter('range');
    component.historyRangeStartDate.set('2025-05-01');
    component.historyRangeEndDate.set('2025-05-31');
    expect(component.allHistoryOrders().map(o => o.orderNumber)).toEqual(['ORD-052']);

    component.setHistoryFilter('DELIVERED');
    component.setHistorySearchQuery('test');
    component.resetHistoryFilters();
    expect(component.historyFilter()).toBe('ALL');
    expect(component.historySearchQuery()).toBe('');
    expect(component.historyDateFilter()).toBe('today');
    expect(component.historyCurrentPage()).toBe(1);
  });

  it('should not render the removed empty state phrase when filteredHistoryOrders is empty', () => {
    mockOrders.set([]);
    component.activeSubTab.set('despachos');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('No se encontraron entregas en el histórico');
    expect(compiled.textContent).not.toContain('No hay pedidos que coincidan con el filtro');
  });

  it('should select the current weekday on initialization and map weekdays accurately via getCurrentWeekDayName', () => {
    const expectedToday: string = component.getCurrentWeekDayName(new Date());
    expect(component.selectedDay()).toBe(expectedToday);
    expect(component.getCurrentWeekDayName(new Date('2026-10-25T12:00:00'))).toBe('Domingo');
    expect(component.getCurrentWeekDayName(new Date('2026-10-26T12:00:00'))).toBe('Lunes');
    expect(component.getCurrentWeekDayName(new Date('2026-10-27T12:00:00'))).toBe('Martes');
    expect(component.getCurrentWeekDayName(new Date('2026-10-28T12:00:00'))).toBe('Miércoles');
    expect(component.getCurrentWeekDayName(new Date('2026-10-29T12:00:00'))).toBe('Jueves');
    expect(component.getCurrentWeekDayName(new Date('2026-10-30T12:00:00'))).toBe('Viernes');
    expect(component.getCurrentWeekDayName(new Date('2026-10-31T12:00:00'))).toBe('Sábado');
  });

  it('should not render colored counter badges (.day-card-badge) and should keep "<N> pedidos" text on active weekday card', () => {
    component.activeSubTab.set('picking');
    fixture.detectChanges();
    const compiled: HTMLElement = fixture.nativeElement as HTMLElement;

    const badges: NodeListOf<Element> = compiled.querySelectorAll('.day-card-badge');
    expect(badges.length).toBe(0);

    const activeCard: HTMLElement | null = compiled.querySelector('.picking-day-card.is-active');
    expect(activeCard).not.toBeNull();
    expect(activeCard?.textContent).not.toContain('Agrupado / Activo');
    expect(activeCard?.querySelector('.day-card-sub')?.textContent?.trim()).toMatch(/^\d+\s+pedidos$/);
  });

  it('should render the mobile create order button in picking header and open create modal upon click', () => {
    component.activeSubTab.set('picking');
    fixture.detectChanges();
    const compiled: HTMLElement = fixture.nativeElement as HTMLElement;
    const mobileCreateBtn: HTMLButtonElement | null = compiled.querySelector('.picking-mobile-create-btn');

    expect(mobileCreateBtn).not.toBeNull();
    expect(mobileCreateBtn?.textContent).toContain('Nuevo Pedido');

    mobileCreateBtn?.click();
    fixture.detectChanges();

    expect(component.showNewOrderModal()).toBeTrue();
  });

  it('should render create order button in empty state card when picking queue is empty and open modal upon click', () => {
    component.activeSubTab.set('picking');
    mockOrders.set([]);
    fixture.detectChanges();
    const compiled: HTMLElement = fixture.nativeElement as HTMLElement;
    const emptyCreateBtn: HTMLButtonElement | null = compiled.querySelector('.btn-empty-create-order');

    expect(emptyCreateBtn).not.toBeNull();
    expect(emptyCreateBtn?.textContent).toContain('Crear Nuevo Pedido');

    emptyCreateBtn?.click();
    fixture.detectChanges();

    expect(component.showNewOrderModal()).toBeTrue();
  });

  it('should normalize relative scheduledDay phrases, ISO dates, and unaccented names to canonical Spanish weekdays in getOrderDay', () => {
    const baseOrder: OrderDto = {
      orderId: 999,
      orderNumber: 'ORD-999',
      branchId: 1,
      clientId: 1,
      clientName: 'Portal Client',
      status: 'PENDING',
      orderDate: '2026-10-28',
      createdAt: '2026-10-28T12:00:00Z',
      totalAmount: 50000,
      isPaid: false,
      items: []
    };

    const today = component.getCurrentWeekDayName();
    const tomorrow = component.getCurrentWeekDayName(new Date(Date.now() + 86400000));

    expect(component.getOrderDay({ ...baseOrder, scheduledDay: 'Hoy mismo (Prioritario)' })).toBe(today);
    expect(component.getOrderDay({ ...baseOrder, scheduledDay: 'Mañana a primera hora' })).toBe(tomorrow);
    expect(component.getOrderDay({ ...baseOrder, scheduledDay: 'Programado fin de semana' })).toBe('Sábado');
    expect(component.getOrderDay({ ...baseOrder, scheduledDay: 'miercoles' })).toBe('Miércoles');
    expect(component.getOrderDay({ ...baseOrder, scheduledDay: 'sabado' })).toBe('Sábado');
    expect(component.getOrderDay({ ...baseOrder, scheduledDay: '2026-10-28' })).toBe('Miércoles');
    expect(component.getOrderDay({ ...baseOrder, scheduledDay: undefined })).toBe('Miércoles');
  });

  it('should include client orders with relative scheduledDay in the active weekday picking queue', () => {
    const today = component.getCurrentWeekDayName();
    component.activeSubTab.set('picking');
    component.selectedDay.set(today);
    mockOrders.set([
      {
        orderId: 777,
        orderNumber: 'ORD-777',
        branchId: 1,
        clientId: 10,
        clientName: 'Cliente Portal Web',
        status: 'PENDING',
        orderDate: '2026-10-28',
        createdAt: '2026-10-28T10:00:00Z',
        totalAmount: 25000,
        isPaid: false,
        scheduledDay: 'Hoy mismo (Prioritario)',
        items: [{ fruitId: 1, fruitName: 'Mora', grammage: 1000, quantity: 2, unitPrice: 12500, subtotal: 25000 }]
      }
    ]);
    fixture.detectChanges();

    const activeDayConfig = component.weekDays().find(w => w.name === today);
    expect(activeDayConfig?.count).toBe(1);
    expect(component.tabOrders().length).toBe(1);
    expect(component.tabOrders()[0].orderNumber).toBe('ORD-777');
  });

  it('should format order time in HH:mm format and resolve fruit names from catalog when item fruitName is empty', () => {
    const sampleDate = new Date(2026, 9, 30, 21, 34, 0).toISOString();
    expect(component.formatOrderTime(sampleDate)).toBe('21:34');
    expect(component.formatOrderTime('')).toBe('');
    expect(component.formatOrderTime('invalid-date')).toBe('');

    expect(
      component.getOrderItemFruitName({
        fruitId: 1,
        fruitName: '',
        grammage: 140,
        quantity: 2,
        unitPrice: 2500,
        subtotal: 5000
      })
    ).toBe('Mora');
  });

  it('should render order time, limit preview to 5 items, show Ver más button when order has 5 or more items, and open dialog with all products', () => {
    const sampleCreatedAt = new Date(2026, 9, 30, 14, 45, 0).toISOString();
    const sixItemsOrder: OrderDto = {
      orderId: 888,
      orderNumber: 'ORD-888',
      invoiceNumber: 'FAC00008',
      branchId: 1,
      clientId: 10,
      clientName: 'Luz Arango',
      status: 'BILLED',
      orderDate: '2026-10-30',
      createdAt: sampleCreatedAt,
      totalAmount: 150000,
      isPaid: false,
      isBilled: true,
      paymentMethodName: 'Contra Entrega (Por Cobrar)',
      items: [
        { fruitId: 1, fruitName: 'Mora', grammage: 140, quantity: 10, unitPrice: 2500, subtotal: 25000 },
        { fruitId: 1, fruitName: 'Lulo', grammage: 250, quantity: 10, unitPrice: 4000, subtotal: 40000 },
        { fruitId: 1, fruitName: 'Maracuyá', grammage: 500, quantity: 5, unitPrice: 7000, subtotal: 35000 },
        { fruitId: 1, fruitName: 'Mango', grammage: 140, quantity: 8, unitPrice: 2500, subtotal: 20000 },
        { fruitId: 1, fruitName: 'Guanábana', grammage: 250, quantity: 4, unitPrice: 5000, subtotal: 20000 },
        { fruitId: 1, fruitName: 'Fresa', grammage: 140, quantity: 4, unitPrice: 2500, subtotal: 10000 }
      ]
    };

    mockOrders.set([sixItemsOrder]);
    component.activeSubTab.set('facturacion');
    fixture.detectChanges();

    const compiled: HTMLElement = fixture.nativeElement as HTMLElement;
    const timeEl = compiled.querySelector('.queue-order-time');
    expect(timeEl).not.toBeNull();
    expect(timeEl?.textContent?.trim()).toBe('14:45');

    const previewRows = compiled.querySelectorAll('.queue-card-items-summary .queue-item-row');
    expect(previewRows.length).toBe(5);

    const viewMoreBtn = compiled.querySelector('.btn-view-more-items') as HTMLButtonElement | null;
    expect(viewMoreBtn).not.toBeNull();
    expect(viewMoreBtn?.textContent).toContain('Ver más (6 productos)');

    viewMoreBtn?.click();
    fixture.detectChanges();

    expect(component.showOrderItemsModal()).toBeTrue();
    expect(component.selectedOrderForItemsModal()?.orderId).toBe(888);

    const dialogRows = compiled.querySelectorAll('.order-items-dialog-row');
    expect(dialogRows.length).toBe(6);

    component.closeOrderItemsModal();
    fixture.detectChanges();
    expect(component.showOrderItemsModal()).toBeFalse();
    expect(component.selectedOrderForItemsModal()).toBeNull();
  });
});
