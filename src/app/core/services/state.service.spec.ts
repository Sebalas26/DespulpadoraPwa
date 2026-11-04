import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { StateService } from './state.service';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';
import {
  BatchDto,
  ClientDto,
  CompanyConfig,
  EmployeeDto,
  ExpenseDto,
  FruitDto,
  OrderDto,
  PaymentMethodDto,
  WorkShiftDto
} from '../models/business.models';
import { BranchDto } from '../models/auth.models';

/**
 * Unit test suite for `StateService` verifying empty initial state, `refreshAll()` API synchronization,
 * order status transitions, payroll calculations, shift elapsed hours, and client portal CMS administration.
 */
describe('StateService', () => {
  let service: StateService;
  let apiSpy: jasmine.SpyObj<ApiService>;
  let authSpy: {
    isAuthenticated: jasmine.Spy<() => boolean>;
    selectedBranch: jasmine.Spy<() => BranchDto | null>;
  };
  let notificationSpy: jasmine.SpyObj<NotificationService>;

  beforeEach(() => {
    localStorage.clear();

    apiSpy = jasmine.createSpyObj<ApiService>('ApiService', [
      'getFruits',
      'createFruit',
      'updateFruit',
      'deleteFruit',
      'getBatches',
      'getOrders',
      'getClients',
      'getEmployees',
      'getExpenses',
      'getCompanySettings',
      'getPaymentMethods',
      'createBatch',
      'completeBatch',
      'adjustStock',
      'adjustFruitStock',
      'createOrder',
      'updateOrder',
      'updateOrderStatus',
      'dispatchOrdersRoute',
      'settleCourierRoute',
      'updateOrderItemPicking',
      'deleteOrder',
      'createExpense',
      'createClient',
      'updateClient',
      'deleteClient',
      'startShift',
      'closeShift',
      'createEmployee',
      'updateEmployee',
      'deleteEmployee',
      'updateCompanySettings',
      'createPaymentMethod',
      'updatePaymentMethod',
      'deletePaymentMethod'
    ]);

    apiSpy.getFruits.and.returnValue(of([] as FruitDto[]));
    apiSpy.createFruit.and.returnValue(of({} as FruitDto));
    apiSpy.updateFruit.and.returnValue(of({} as FruitDto));
    apiSpy.deleteFruit.and.returnValue(of({}));
    apiSpy.getBatches.and.returnValue(of([] as BatchDto[]));
    apiSpy.getOrders.and.returnValue(of([] as OrderDto[]));
    apiSpy.getClients.and.returnValue(of([] as ClientDto[]));
    apiSpy.getEmployees.and.returnValue(of([] as EmployeeDto[]));
    apiSpy.getExpenses.and.returnValue(of([] as ExpenseDto[]));
    apiSpy.getCompanySettings.and.returnValue(
      of({
        companyName: 'Configured Plant',
        legalName: 'Configured Plant S.A.S.',
        nit: '900111222-3',
        tagline: 'Natural Pulps',
        address: 'Main Street 1',
        city: 'CityA',
        department: 'DeptA',
        country: 'CountryA',
        phone: '3001234567',
        whatsapp: '3001234567',
        email: 'info@plant.com',
        billingEmail: 'billing@plant.com',
        operatingHours: '08:00 - 17:00',
        dispatchHours: '09:00 - 16:00',
        taxRegime: 'Common',
        dianResolution: 'RES-1',
        invoicePrefix: 'INV',
        invoiceNextNumber: 1,
        invoiceFooterNote: '',
        taxPercentage: 0,
        monthlySalesTarget: 10000000
      } as CompanyConfig)
    );
    apiSpy.getPaymentMethods.and.returnValue(of([] as PaymentMethodDto[]));
    apiSpy.createBatch.and.returnValue(
      of({
        batchId: 10,
        batchCode: 'B-10',
        fruitId: 1,
        branchId: 1,
        grossFruitKg: 100,
        pulpProducedKg: 60,
        realYieldPercentage: 60,
        costPerKg: 2000,
        status: 'COMPLETED',
        productionDate: new Date().toISOString(),
        createdAt: new Date().toISOString()
      })
    );
    apiSpy.completeBatch.and.returnValue(
      of({
        batchId: 10,
        batchCode: 'B-10',
        fruitId: 1,
        branchId: 1,
        grossFruitKg: 100,
        pulpProducedKg: 60,
        realYieldPercentage: 60,
        costPerKg: 2000,
        status: 'COMPLETED',
        productionDate: new Date().toISOString(),
        createdAt: new Date().toISOString()
      })
    );
    apiSpy.adjustStock.and.returnValue(
      of({
        fruitId: 1,
        name: 'FruitOne',
        code: 'FR1',
        yieldPercentage: 60,
        unitPrice: 2000,
        isActive: true
      })
    );
    apiSpy.createOrder.and.returnValue(of({} as OrderDto));
    apiSpy.updateOrder.and.returnValue(of({} as OrderDto));
    apiSpy.updateOrderStatus.and.returnValue(of({} as OrderDto));
    apiSpy.updateOrderItemPicking.and.returnValue(of({} as OrderDto));
    apiSpy.dispatchOrdersRoute.and.returnValue(of([] as OrderDto[]));
    apiSpy.settleCourierRoute.and.returnValue(of({} as never));
    apiSpy.deleteOrder.and.returnValue(of({}));
    apiSpy.createExpense.and.returnValue(of({} as ExpenseDto));
    apiSpy.createClient.and.returnValue(of({} as ClientDto));
    apiSpy.startShift.and.returnValue(of({} as WorkShiftDto));
    apiSpy.closeShift.and.returnValue(of({} as WorkShiftDto));
    apiSpy.createEmployee.and.returnValue(
      of({
        employeeId: 77,
        firstName: 'Ana',
        lastName: 'Lopez',
        fullName: 'Ana Lopez',
        identificationNumber: '1010',
        baseSalary: 1500000,
        hireDate: '2026-01-01',
        isActive: true
      })
    );
    apiSpy.updateEmployee.and.returnValue(
      of({
        employeeId: 77,
        firstName: 'Ana',
        lastName: 'Lopez Updated',
        fullName: 'Ana Lopez Updated',
        identificationNumber: '1010',
        baseSalary: 1600000,
        hireDate: '2026-01-01',
        isActive: true
      })
    );

    authSpy = {
      isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(true),
      selectedBranch: jasmine.createSpy('selectedBranch').and.returnValue(null)
    };

    notificationSpy = jasmine.createSpyObj<NotificationService>('NotificationService', [
      'success',
      'error',
      'warning',
      'info'
    ]);

    TestBed.configureTestingModule({
      providers: [
        StateService,
        { provide: ApiService, useValue: apiSpy },
        { provide: AuthService, useValue: authSpy },
        { provide: NotificationService, useValue: notificationSpy }
      ]
    });

    service = TestBed.inject(StateService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should initialize with empty collections and empty company config', () => {
    expect(service.fruits().length).toBe(0);
    expect(service.orders().length).toBe(0);
    expect(service.batches().length).toBe(0);
    expect(service.clients().length).toBe(0);
    expect(service.employees().length).toBe(0);
    expect(service.expenses().length).toBe(0);
    expect(service.paymentMethods().length).toBe(0);
    expect(service.companyInfo().companyName).toBe('');
    expect(service.portalCmsConfig().heroTitle).toBe('');
  });

  it('should synchronize all collections and companySettings on refreshAll even when arrays are empty', () => {
    const apiFruits: FruitDto[] = [
      {
        fruitId: 1,
        name: 'Mango',
        code: 'MNG',
        category: 'Dulce',
        yieldPercentage: 65,
        rawStockKg: 100,
        unitPrice: 2000,
        price140g: 2000,
        price250g: 3500,
        price500g: 6500,
        price1000g: 12000,
        stock100g: 10,
        stock250g: 20,
        stock500g: 5,
        stock1000g: 2,
        isActive: true
      }
    ];
    apiSpy.getFruits.and.returnValue(of(apiFruits));

    service.refreshAll();

    expect(service.fruits().length).toBe(1);
    expect(service.fruits()[0].name).toBe('Mango');
    expect(service.fruits()[0].stock.g250).toBe(20);
    expect(service.companyInfo().companyName).toBe('Configured Plant');
    expect(service.orders()).toEqual([]);
  });

  it('should deduct packed stock once on createOrder without duplicate adjustStock calls when transitioning to DISPATCHED', () => {
    apiSpy.adjustStock.calls.reset();
    service.fruits.set([
      {
        id: 'mango',
        fruitId: 1,
        name: 'Mango',
        scientificName: '',
        color: '',
        bgColor: '',
        borderColor: '',
        emoji: '',
        yieldRate: 0.65,
        waterAdditionDefault: 0,
        freshStockKg: 50,
        stock: { g140: 10, g250: 20, g500: 10, g1000: 5 },
        minStock: { g140: 0, g250: 0, g500: 0, g1000: 0 },
        prices: { g140: 2000, g250: 3500, g500: 6000, g1000: 11000 },
        category: 'PULPAS'
      }
    ]);

    const order = service.createOrder({
      clientName: 'Client A',
      items: [{ fruitName: 'Mango', grammage: 250, quantity: 5, unitPrice: 3500 }]
    });

    expect(service.fruits()[0].stock.g250).toBe(15);
    expect(apiSpy.adjustStock).not.toHaveBeenCalled();

    service.updateOrderStatus(order.orderId, 'DISPATCHED');

    expect(service.fruits()[0].stock.g250).toBe(15);
    expect(apiSpy.adjustStock).not.toHaveBeenCalled();
  });

  it('should avoid double stock deduction in dispatchCourierRoute and restore stock on CANCELLED or deleteOrder without calling adjustStock', () => {
    apiSpy.adjustStock.calls.reset();
    apiSpy.getFruits.calls.reset();
    service.fruits.set([
      {
        id: 'mora',
        fruitId: 2,
        name: 'Mora',
        scientificName: '',
        color: '',
        bgColor: '',
        borderColor: '',
        emoji: '',
        yieldRate: 0.7,
        waterAdditionDefault: 0,
        freshStockKg: 40,
        stock: { g140: 10, g250: 30, g500: 15, g1000: 8 },
        minStock: { g140: 0, g250: 0, g500: 0, g1000: 0 },
        prices: { g140: 2500, g250: 4000, g500: 7000, g1000: 13000 },
        category: 'PULPAS'
      }
    ]);

    const firstOrder = service.createOrder({
      clientName: 'Cliente Ruta Sin Doble Descuento',
      items: [{ fruitName: 'Mora', grammage: 250, quantity: 6, unitPrice: 4000 }]
    });

    expect(service.fruits()[0].stock.g250).toBe(24);
    expect(apiSpy.adjustStock).not.toHaveBeenCalled();
    expect(apiSpy.getFruits).toHaveBeenCalled();

    service.dispatchCourierRoute({
      courierId: 12,
      courierName: 'Mensajero Ruta',
      routeCode: 'RUT-12',
      orderIds: [firstOrder.orderId]
    });

    expect(service.fruits()[0].stock.g250).toBe(24);
    expect(apiSpy.adjustStock).not.toHaveBeenCalled();

    service.updateOrderStatus(firstOrder.orderId, 'CANCELLED');

    expect(service.fruits()[0].stock.g250).toBe(30);
    expect(apiSpy.adjustStock).not.toHaveBeenCalled();

    const secondOrder = service.createOrder({
      clientName: 'Cliente Eliminar Pedido',
      items: [{ fruitName: 'Mora', grammage: 500, quantity: 4, unitPrice: 7000 }]
    });

    expect(service.fruits()[0].stock.g500).toBe(11);
    expect(apiSpy.adjustStock).not.toHaveBeenCalled();

    service.deleteOrder(secondOrder.orderId);

    expect(service.fruits()[0].stock.g500).toBe(15);
    expect(apiSpy.adjustStock).not.toHaveBeenCalled();
  });

  it('should calculate real elapsed hours when closing a work shift', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    service.shifts.set([
      {
        shiftId: 500,
        employeeId: 1,
        employeeName: 'Ana',
        branchId: 1,
        startTime: twoHoursAgo,
        shiftType: 'MORNING',
        status: 'ACTIVE'
      }
    ]);

    service.closeWorkShift(500, 'Done');
    const closed = service.shifts()[0];
    expect(closed.status).toBe('CLOSED');
    expect(closed.hoursWorked).toBeGreaterThanOrEqual(1.9);
    expect(closed.hoursWorked).toBeLessThanOrEqual(2.1);
  });

  it('should delegate createEmployee and updateEmployee to ApiService and update state', () => {
    service.createEmployee({ fullName: 'Ana Lopez', baseSalary: 1500000 }).subscribe();
    expect(service.employees().length).toBe(1);
    expect(service.employees()[0].fullName).toBe('Ana Lopez');

    service.updateEmployee(77, { fullName: 'Ana Lopez Updated', baseSalary: 1600000 }).subscribe();
    expect(service.employees()[0].fullName).toBe('Ana Lopez Updated');
  });

  it('should create, update, delete, and reset client portal catalog cards and CMS config', () => {
    service.updatePortalCmsConfig({ heroTitle: 'Custom Hero Title' });
    expect(service.portalCmsConfig().heroTitle).toBe('Custom Hero Title');

    const created = service.createFruitCatalogCard({
      name: 'Curuba',
      scientificName: 'Passiflora',
      description: 'Natural pulp',
      category: 'Acida',
      color: '#1e5e3a',
      imageUrl: '/curuba.jpg',
      prices: { g140: 1500, g250: 2800, g500: 5000, g1000: 9500 }
    });
    expect(service.fruits().length).toBe(1);
    expect(apiSpy.createFruit).toHaveBeenCalled();

    service.updateFruitCatalogCard(created.id, { name: 'Curuba Especial' }, false);
    expect(service.fruits()[0].name).toBe('Curuba Especial');
    expect(apiSpy.updateFruit).toHaveBeenCalled();

    service.deleteFruitCatalogCard(created.id);
    expect(service.fruits().length).toBe(0);
    expect(apiSpy.deleteFruit).toHaveBeenCalled();

    service.resetPortalCatalogToDefault();
    expect(service.portalCmsConfig().heroTitle).toBe('');
  });

  it('should assign isPriority when provided to createOrder and default scheduledDay to current Spanish weekday', () => {
    const currentWeekday = service.getSpanishWeekday();
    const priorityOrder = service.createOrder({
      clientName: 'Cliente Prioritario',
      isPriority: true,
      items: [{ fruitName: 'Fresa', grammage: 1000, quantity: 2, unitPrice: 12000 }]
    });

    expect(priorityOrder.isPriority).toBeTrue();
    expect(priorityOrder.scheduledDay).toBe(currentWeekday);
    expect(apiSpy.createOrder).toHaveBeenCalledWith(
      jasmine.objectContaining({
        isPriority: true,
        scheduledDay: currentWeekday
      })
    );
  });

  it('should initialize companyInfo with official logoUrl fallback when storage is empty', () => {
    expect(service.companyInfo().logoUrl).toBe('/logo-dgl.png');
  });

  it('should create, update, and delete fresh fruit inventory items via saveFreshFruitItem and deleteFreshFruitItem', () => {
    const created = service.saveFreshFruitItem({
      name: 'Maracuyá',
      freshStockKg: 120,
      yieldPercentage: 70,
      scientificName: 'Passiflora edulis'
    });

    expect(created).not.toBeNull();
    expect(service.fruits().length).toBe(1);
    expect(service.fruits()[0].name).toBe('Maracuyá');
    expect(service.fruits()[0].freshStockKg).toBe(120);
    expect(service.totalFreshStockKg()).toBe(120);
    expect(apiSpy.createFruit).toHaveBeenCalled();

    const updated = service.saveFreshFruitItem({
      id: created?.id,
      fruitId: created?.fruitId,
      name: 'Maracuyá Regional',
      freshStockKg: 150,
      yieldPercentage: 75,
      scientificName: 'Passiflora edulis'
    });

    expect(updated?.name).toBe('Maracuyá Regional');
    expect(service.fruits()[0].freshStockKg).toBe(150);
    expect(service.totalFreshStockKg()).toBe(150);
    expect(apiSpy.updateFruit).toHaveBeenCalled();

    service.deleteFreshFruitItem(String(created?.id));
    expect(service.fruits().length).toBe(0);
    expect(service.totalFreshStockKg()).toBe(0);
    expect(apiSpy.deleteFruit).toHaveBeenCalled();
  });

  it('should persist monthlySalesTarget to database via updateCompanySettings, round compliancePercentage to integer, and cap at 100', () => {
    apiSpy.updateCompanySettings.and.returnValue(
      of({ ...service.companyInfo(), monthlySalesTarget: 30000000 })
    );

    const now = new Date();
    service.upsertSalesTarget({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      targetRevenue: 30000000
    });

    expect(service.companyInfo().monthlySalesTarget).toBe(30000000);
    expect(apiSpy.updateCompanySettings).toHaveBeenCalledWith(
      jasmine.objectContaining({
        monthlySalesTarget: 30000000
      })
    );

    service.orders.set([
      {
        orderId: 901,
        orderNumber: 'ORD-901',
        clientId: 1,
        clientName: 'Test Client',
        branchId: 1,
        status: 'DELIVERED',
        isPaid: true,
        paymentMethodName: 'Efectivo',
        totalAmount: 20000,
        createdAt: now.toISOString(),
        orderDate: now.toISOString().substring(0, 10),
        items: []
      }
    ]);

    expect(service.salesPerformance().compliancePercentage).toBe(0);

    service.orders.set([
      {
        orderId: 902,
        orderNumber: 'ORD-902',
        clientId: 1,
        clientName: 'Test Client',
        branchId: 1,
        status: 'DELIVERED',
        isPaid: true,
        paymentMethodName: 'Efectivo',
        totalAmount: 45000000,
        createdAt: now.toISOString(),
        orderDate: now.toISOString().substring(0, 10),
        items: []
      }
    ]);

    expect(service.salesPerformance().compliancePercentage).toBe(100);
  });

  it('should dispatch courier route, update order status and sequence, and call api.dispatchOrdersRoute', () => {
    service.orders.set([
      {
        orderId: 701,
        orderNumber: 'ORD-701',
        clientId: 1,
        clientName: 'Cliente Ruta 1',
        branchId: 1,
        status: 'BILLED',
        isBilled: true,
        isPaid: false,
        totalAmount: 30000,
        createdAt: new Date().toISOString(),
        orderDate: new Date().toISOString().substring(0, 10),
        items: []
      }
    ]);

    service.dispatchCourierRoute({
      courierId: 15,
      courierName: 'Carlos Mensajero',
      orderIds: [701]
    });

    const dispatchedOrder = service.orders()[0];
    expect(dispatchedOrder.status).toBe('DISPATCHED');
    expect(dispatchedOrder.courierId).toBe(15);
    expect(dispatchedOrder.courierName).toBe('Carlos Mensajero');
    expect(dispatchedOrder.routeSequenceOrder).toBe(1);
    expect(apiSpy.dispatchOrdersRoute).toHaveBeenCalledWith({
      courierId: 15,
      courierName: 'Carlos Mensajero',
      orderIds: [701]
    });
  });

  it('should broadcast and reload domains in real time via RealtimeSyncService without page reload', () => {
    const publishSpy = spyOn(service.realtimeSync, 'publishDomainChange').and.callThrough();

    service.setUsers(
      [
        {
          userId: 88,
          username: 'domiciliario.live',
          fullName: 'Domiciliario Tiempo Real',
          email: 'live@despulpadora.com',
          roleId: 3,
          roleName: 'Domiciliario',
          isActive: true,
          companyId: 1,
          branches: []
        }
      ],
      {
        userId: 88,
        username: 'domiciliario.live',
        fullName: 'Domiciliario Tiempo Real',
        email: 'live@despulpadora.com',
        roleId: 3,
        roleName: 'Domiciliario',
        isActive: true,
        companyId: 1,
        branches: []
      }
    );

    expect(service.users().length).toBe(1);
    expect(publishSpy).toHaveBeenCalledWith(
      'users',
      'courier',
      jasmine.objectContaining({ username: 'domiciliario.live' }),
      jasmine.objectContaining({ event: 'courier_updated', courierId: '88' })
    );

    localStorage.setItem(
      'despulpadora_grammages_config',
      JSON.stringify([{ id: 'g-500', grams: 500, label: '500g Especial', isActive: true }])
    );

    service.realtimeSync.handleIncomingRawEvent(
      {
        eventId: 'cross_tab_param_1',
        event: 'parameters_updated',
        domain: 'parameters',
        action: 'grammages_updated'
      },
      'cross-tab'
    );

    expect(service.grammagesConfig().length).toBe(1);
    expect(service.grammagesConfig()[0].label).toBe('500g Especial');
  });

  it('should purge legacy mock variants from localStorage while preserving user-created variants and syncing stock with fruits and API', () => {
    localStorage.setItem(
      'despulpadora_variants',
      JSON.stringify([
        {
          variantId: 202,
          fruitId: 99,
          fruitName: 'Limón',
          category: 'LIMONADAS',
          sku: 'LIM-CER-140G',
          name: 'Base Limonada Cerezada 140g',
          grammage: 140,
          unitCost: 1350,
          basePrice: 2500,
          minStockAlert: 30,
          currentStock: 60,
          isActive: true
        },
        {
          variantId: 1,
          fruitId: 1,
          fruitName: 'Mora',
          category: 'PULPAS',
          sku: 'PUL-MOR-140G',
          name: 'Pulpa Mora',
          grammage: 140,
          unitCost: 4000,
          basePrice: 5000,
          minStockAlert: 0,
          currentStock: 10,
          isActive: true
        }
      ])
    );

    service.reloadDomainFromStorage('inventory');

    expect(service.productVariants().length).toBe(1);
    expect(service.productVariants()[0].name).toBe('Pulpa Mora');
    expect(service.productVariants()[0].currentStock).toBe(10);

    service.saveFreshFruitItem({
      id: 'mora',
      fruitId: 1,
      name: 'Mora',
      freshStockKg: 500,
      yieldPercentage: 75
    });

    service.adjustVariantStock(1, 10);
    expect(service.productVariants()[0].currentStock).toBe(20);
    expect(service.fruits()[0].stock.g140).toBe(20);
    expect(apiSpy.adjustStock).toHaveBeenCalledWith(
      jasmine.objectContaining({
        fruitId: 1,
        grammage: 140,
        quantityDelta: 10
      })
    );
  });

  it('should ingest incoming WhatsApp orders into orders signal without duplicates', () => {
    const initialCount = service.orders().length;
    const incomingOrder = {
      orderId: 9901,
      orderNumber: 'PED-20261102-901',
      clientName: 'Luz Arango',
      clientPhone: '3101234567',
      clientAddress: 'Calle 10 #20-30',
      status: 'PENDING' as const,
      orderDate: '2026-11-02',
      scheduledDay: 'Lunes',
      isPriority: false,
      totalAmount: 60000,
      isPaid: false,
      paymentMethodName: 'Efectivo',
      notes: 'Pedido automático WhatsApp (HISTORIAL)',
      createdAt: '2026-11-02T15:00:00Z',
      items: [
        {
          fruitId: 1,
          fruitName: 'Mora',
          grammage: 500,
          quantity: 10,
          unitPrice: 6000,
          subtotal: 60000,
          pickedQuantity: 0
        }
      ]
    };

    const firstAdded = service.ingestWhatsAppIncomingOrders([incomingOrder]);
    expect(firstAdded).toBe(1);
    expect(service.orders().length).toBe(initialCount + 1);
    expect(service.orders()[0].orderNumber).toBe('PED-20261102-901');

    const duplicateAttempt = service.ingestWhatsAppIncomingOrders([incomingOrder]);
    expect(duplicateAttempt).toBe(0);
    expect(service.orders().length).toBe(initialCount + 1);
  });

  it('should preserve user-created product variants across refreshAll and resolve fruitId in createOrder from productVariants', () => {
    localStorage.setItem(
      'despulpadora_variants',
      JSON.stringify([
        {
          variantId: 1,
          fruitId: 55,
          fruitName: 'Mora',
          category: 'PULPAS',
          name: 'Pulpa Mora 140g',
          sku: 'PUL-MOR-140',
          grammage: 140,
          basePrice: 5000,
          unitCost: 3000,
          currentStock: 30,
          minStockAlert: 5,
          isActive: true
        }
      ])
    );
    service.reloadDomainFromStorage('inventory');

    expect(service.productVariants().length).toBe(1);

    apiSpy.getFruits.and.returnValue(
      of([
        {
          fruitId: 99,
          name: 'Maracuya',
          code: 'MAR',
          category: 'Acida',
          yieldPercentage: 50,
          rawStockKg: 5,
          unitPrice: 0,
          isActive: true
        }
      ])
    );

    service.refreshAll();

    expect(service.productVariants().length).toBe(1);
    expect(service.productVariants()[0].name).toBe('Pulpa Mora 140g');
    expect(service.productVariants()[0].basePrice).toBe(5000);

    service.createOrder({
      clientName: 'Restaurante El Prado',
      clientPhone: '3101234567',
      clientAddress: 'Cra 15 # 93-40',
      items: [
        {
          fruitName: 'Pulpa Mora',
          grammage: 140,
          quantity: 2,
          unitPrice: 5000
        }
      ]
    });

    expect(apiSpy.createOrder).toHaveBeenCalledWith(
      jasmine.objectContaining({
        items: [
          jasmine.objectContaining({
            fruitId: 55,
            grammage: 140,
            quantity: 2,
            unitPrice: 5000
          })
        ]
      })
    );
  });

  it('should update local orderId with real database orderId on createOrder and resolve timestamp IDs when dispatching route', () => {
    apiSpy.createOrder.and.returnValue(
      of({
        orderId: 405,
        id: 405,
        orderNumber: 'PED-20261102-405',
        branchId: 1,
        clientId: 10,
        clientName: 'Cafetería Central',
        status: 'PENDING',
        orderDate: '2026-11-02',
        totalAmount: 30000,
        isPaid: false,
        paymentMethodName: '',
        createdAt: '2026-11-02T15:00:00Z',
        items: [
          {
            orderItemId: 801,
            fruitId: 1,
            fruitName: 'Mora',
            grammage: 500,
            quantity: 5,
            unitPrice: 6000,
            subtotal: 30000
          }
        ]
      })
    );

    service.createOrder({
      clientName: 'Cafetería Central',
      items: [{ fruitName: 'Mora', grammage: 500, quantity: 5, unitPrice: 6000 }]
    });

    const syncedOrder = service.orders().find(o => o.clientName === 'Cafetería Central');
    expect(syncedOrder?.orderId).toBe(405);
    expect(syncedOrder?.orderNumber).toBe('PED-20261102-405');

    service.dispatchCourierRoute({
      courierId: 3,
      courierName: 'Carlos Ruta',
      routeCode: 'RUT-03',
      orderIds: [405]
    });

    expect(apiSpy.dispatchOrdersRoute).toHaveBeenCalledWith(
      jasmine.objectContaining({
        courierId: 3,
        courierName: 'Carlos Ruta',
        orderIds: [405]
      })
    );

    const timestampId = 1762116000999;
    service.orders.update(list => [
      {
        orderId: timestampId,
        orderNumber: 'PED-20261102-999',
        branchId: 1,
        clientId: 20,
        clientName: 'Panadería Sur',
        status: 'BILLED',
        orderDate: '2026-11-02',
        totalAmount: 18000,
        isPaid: false,
        paymentMethodName: '',
        createdAt: '2026-11-02T15:10:00Z',
        items: []
      },
      ...list
    ]);

    apiSpy.getOrders.and.returnValue(
      of([
        {
          orderId: 512,
          id: 512,
          orderNumber: 'PED-20261102-999',
          branchId: 1,
          clientId: 20,
          clientName: 'Panadería Sur',
          status: 'BILLED',
          orderDate: '2026-11-02',
          totalAmount: 18000,
          isPaid: false,
          paymentMethodName: '',
          createdAt: '2026-11-02T15:10:00Z',
          items: []
        }
      ])
    );

    service.dispatchCourierRoute({
      courierId: 3,
      courierName: 'Carlos Ruta',
      routeCode: 'RUT-03',
      orderIds: [timestampId]
    });

    expect(apiSpy.dispatchOrdersRoute).toHaveBeenCalledWith(
      jasmine.objectContaining({
        courierId: 3,
        courierName: 'Carlos Ruta',
        orderIds: [512]
      })
    );
  });

  it('should clear routeCode and routeSequenceOrder on previously DELIVERED orders of the courier when dispatching a new route', () => {
    service.orders.set([
      {
        orderId: 701,
        orderNumber: 'PED-701',
        branchId: 1,
        clientId: 11,
        clientName: 'Entrega Anterior 1',
        status: 'DELIVERED',
        courierId: 9,
        courierName: 'Laura Domiciliaria',
        routeCode: 'RUT-09',
        routeSequenceOrder: 1,
        orderDate: '2026-11-02',
        totalAmount: 22000,
        isPaid: true,
        paymentMethodName: 'Efectivo',
        createdAt: '2026-11-02T13:00:00Z',
        items: []
      },
      {
        orderId: 702,
        orderNumber: 'PED-702',
        branchId: 1,
        clientId: 12,
        clientName: 'Entrega Anterior 2',
        status: 'DELIVERED',
        courierId: 9,
        courierName: 'Laura Domiciliaria',
        routeCode: 'RUT-09',
        routeSequenceOrder: 2,
        orderDate: '2026-11-02',
        totalAmount: 28000,
        isPaid: true,
        paymentMethodName: 'Nequi',
        createdAt: '2026-11-02T13:10:00Z',
        items: []
      },
      {
        orderId: 703,
        orderNumber: 'PED-703',
        branchId: 1,
        clientId: 13,
        clientName: 'Nueva Entrega Unica',
        status: 'BILLED',
        isBilled: true,
        orderDate: '2026-11-02',
        totalAmount: 35000,
        isPaid: false,
        paymentMethodName: 'Efectivo',
        createdAt: '2026-11-02T16:00:00Z',
        items: []
      }
    ]);

    apiSpy.dispatchOrdersRoute.calls.reset();
    service.dispatchCourierRoute({
      courierId: 9,
      courierName: 'Laura Domiciliaria',
      routeCode: 'RUT-09',
      orderIds: [701, 702, 703]
    });

    const old1: OrderDto | undefined = service.orders().find((o: OrderDto) => o.orderId === 701);
    const old2: OrderDto | undefined = service.orders().find((o: OrderDto) => o.orderId === 702);
    const activeNew: OrderDto | undefined = service.orders().find((o: OrderDto) => o.orderId === 703);

    expect(old1?.status).toBe('DELIVERED');
    expect(old1?.routeCode).toBeUndefined();
    expect(old1?.routeSequenceOrder).toBeUndefined();

    expect(old2?.status).toBe('DELIVERED');
    expect(old2?.routeCode).toBeUndefined();
    expect(old2?.routeSequenceOrder).toBeUndefined();

    expect(activeNew?.status).toBe('DISPATCHED');
    expect(activeNew?.routeCode).toBe('RUT-09');
    expect(activeNew?.routeSequenceOrder).toBe(1);

    expect(apiSpy.dispatchOrdersRoute).toHaveBeenCalledWith(
      jasmine.objectContaining({
        courierId: 9,
        courierName: 'Laura Domiciliaria',
        routeCode: 'RUT-09',
        orderIds: [703]
      })
    );
  });

  it('should clear routeCode and routeSequenceOrder and call api.settleCourierRoute when settling a courier route', () => {
    apiSpy.settleCourierRoute.and.returnValue(of({ id: 9, status: 'Disponible' }));
    service.orders.set([
      {
        orderId: 801,
        orderNumber: 'PED-801',
        branchId: 1,
        clientId: 1,
        clientName: 'Cliente Ruta Liquidada',
        clientPhone: '3001112233',
        clientAddress: 'Calle 80 # 10-20',
        status: 'DELIVERED',
        orderDate: '2026-11-02',
        scheduledDay: 'Lunes',
        isPriority: false,
        courierId: 9,
        courierName: 'Laura Domiciliaria',
        routeCode: 'RUT-09',
        routeSequenceOrder: 1,
        totalAmount: 40000,
        isPaid: true,
        paymentMethodName: 'Efectivo',
        createdAt: '2026-11-02T16:00:00Z',
        items: []
      }
    ]);

    service.settleCourierRoute(9, 'Laura Domiciliaria', 40000, 0, 'Recibido conforme');

    const settledOrder: OrderDto | undefined = service.orders().find((o: OrderDto) => o.orderId === 801);
    expect(settledOrder?.routeCode).toBeUndefined();
    expect(settledOrder?.routeSequenceOrder).toBeUndefined();
    expect(apiSpy.settleCourierRoute).toHaveBeenCalledWith(9, {
      cashDelivered: 40000,
      transfersConfirmed: 0,
      notes: 'Recibido conforme'
    });
  });

  it('should hydrate productVariants from backend fruits on refreshAll when localStorage is empty (mobile device)', () => {
    localStorage.removeItem('despulpadora_variants');
    service.productVariants.set([]);

    const apiFruits: FruitDto[] = [
      {
        fruitId: 3,
        name: 'Maracuya',
        code: 'MAR',
        category: 'PULPAS',
        yieldPercentage: 50,
        rawStockKg: 35,
        unitPrice: 0,
        price140g: 0,
        price250g: 0,
        price500g: 0,
        price1000g: 0,
        stock100g: 39,
        stock250g: 0,
        stock500g: 0,
        stock1000g: 0,
        isActive: true
      },
      {
        fruitId: 2,
        name: 'Mora',
        code: 'MOR',
        category: 'PULPAS',
        yieldPercentage: 70,
        rawStockKg: 25,
        unitPrice: 5000,
        price140g: 5000,
        price250g: 8000,
        price500g: 0,
        price1000g: 0,
        stock100g: 0,
        stock250g: 0,
        stock500g: 0,
        stock1000g: 0,
        isActive: true
      }
    ];
    apiSpy.getFruits.and.returnValue(of(apiFruits));

    service.refreshAll();

    const variants = service.productVariants();
    expect(variants.length).toBe(3);

    const maracuya140 = variants.find(v => v.fruitName === 'Maracuya' && v.grammage === 140);
    expect(maracuya140).toBeDefined();
    expect(maracuya140?.currentStock).toBe(39);

    const mora140 = variants.find(v => v.fruitName === 'Mora' && v.grammage === 140);
    expect(mora140).toBeDefined();
    expect(mora140?.basePrice).toBe(5000);

    const mora250 = variants.find(v => v.fruitName === 'Mora' && v.grammage === 250);
    expect(mora250).toBeDefined();
    expect(mora250?.basePrice).toBe(8000);
  });

  it('should persist basePrice and stock changes to backend API on addProductVariant, updateProductVariant, and deleteProductVariant', () => {
    service.fruits.set([
      {
        id: 'maracuya_3',
        fruitId: 3,
        name: 'Maracuya',
        scientificName: '',
        color: '#1e5e3a',
        bgColor: '',
        borderColor: '#1e5e3a',
        emoji: '',
        yieldRate: 0.5,
        waterAdditionDefault: 0,
        freshStockKg: 35,
        stock: { g140: 0, g250: 0, g500: 0, g1000: 0 },
        minStock: { g140: 0, g250: 0, g500: 0, g1000: 0 },
        prices: { g140: 0, g250: 0, g500: 0, g1000: 0 },
        category: 'PULPAS'
      }
    ]);

    apiSpy.updateFruit.calls.reset();
    apiSpy.adjustStock.calls.reset();

    const created = service.addProductVariant({
      fruitId: 3,
      fruitName: 'Maracuya',
      category: 'PULPAS',
      sku: 'PUL-MAR-250G',
      name: 'Pulpa de Maracuya 250g',
      grammage: 250,
      unitCost: 0,
      basePrice: 6500,
      minStockAlert: 5,
      currentStock: 15,
      isActive: true
    });

    expect(apiSpy.updateFruit).toHaveBeenCalledWith(
      3,
      jasmine.objectContaining({
        price250g: 6500
      })
    );
    expect(apiSpy.adjustStock).toHaveBeenCalledWith(
      jasmine.objectContaining({
        fruitId: 3,
        grammage: 250,
        quantityDelta: 15
      })
    );

    apiSpy.updateFruit.calls.reset();
    apiSpy.adjustStock.calls.reset();

    service.updateProductVariant(created.variantId, {
      basePrice: 7200,
      currentStock: 20
    });

    expect(apiSpy.updateFruit).toHaveBeenCalledWith(
      3,
      jasmine.objectContaining({
        price250g: 7200
      })
    );
    expect(apiSpy.adjustStock).toHaveBeenCalledWith(
      jasmine.objectContaining({
        fruitId: 3,
        grammage: 250,
        quantityDelta: 5
      })
    );

    apiSpy.updateFruit.calls.reset();
    apiSpy.adjustStock.calls.reset();

    service.deleteProductVariant(created.variantId);

    expect(service.productVariants().find(v => v.variantId === created.variantId)).toBeUndefined();
    expect(apiSpy.adjustStock).toHaveBeenCalledWith(
      jasmine.objectContaining({
        fruitId: 3,
        grammage: 250,
        quantityDelta: -20
      })
    );
    expect(apiSpy.updateFruit).toHaveBeenCalledWith(
      3,
      jasmine.objectContaining({
        price250g: 0
      })
    );
  });

  it('should persist neighborhood, latitude, and longitude in createOrder and updateOrder', () => {
    const created = service.createOrder({
      clientName: 'caldo parado',
      clientPhone: '3164953397',
      clientAddress: 'Avenida Calle 64C 69J, Bosque Popular, Bogotá',
      neighborhood: 'Bosque Popular',
      latitude: 4.6782,
      longitude: -74.0981,
      items: [{ fruitName: 'Mora', grammage: 1000, quantity: 1, unitPrice: 9000 }]
    });

    expect(created.neighborhood).toBe('Bosque Popular');
    expect(created.latitude).toBeCloseTo(4.6782, 4);
    expect(created.longitude).toBeCloseTo(-74.0981, 4);
    expect(apiSpy.createOrder).toHaveBeenCalledWith(
      jasmine.objectContaining({
        neighborhood: 'Bosque Popular',
        latitude: 4.6782,
        longitude: -74.0981
      })
    );

    service.updateOrder(created.orderId, {
      clientName: 'caldo parado',
      clientPhone: '3164953397',
      clientAddress: 'Avenida Calle 64C 69J, Bosque Popular, Bogotá',
      neighborhood: 'Engativá',
      latitude: 4.679,
      longitude: -74.099,
      items: [{ fruitName: 'Mora', grammage: 1000, quantity: 1, unitPrice: 9000 }],
      silent: true
    });

    const updatedInSignal = service.orders().find(o => o.orderId === created.orderId);
    expect(updatedInSignal?.neighborhood).toBe('Engativá');
    expect(updatedInSignal?.latitude).toBeCloseTo(4.679, 4);
    expect(updatedInSignal?.longitude).toBeCloseTo(-74.099, 4);
    expect(apiSpy.updateOrder).toHaveBeenCalledWith(
      created.orderId,
      jasmine.objectContaining({
        neighborhood: 'Engativá',
        latitude: 4.679,
        longitude: -74.099
      })
    );
  });

  it('should compute pendingOrdersCount and billingOrdersCount independently according to order status', () => {
    service.orders.set([
      {
        orderId: 901,
        orderNumber: 'ORD-901',
        branchId: 1,
        clientId: 1,
        clientName: 'Cliente 1',
        status: 'PENDING',
        orderDate: '2026-11-02',
        totalAmount: 10000,
        isPaid: false,
        paymentMethodName: 'Efectivo',
        createdAt: '2026-11-02T10:00:00Z',
        items: []
      },
      {
        orderId: 902,
        orderNumber: 'ORD-902',
        branchId: 1,
        clientId: 2,
        clientName: 'Cliente 2',
        status: 'PENDING',
        orderDate: '2026-11-02',
        totalAmount: 20000,
        isPaid: false,
        paymentMethodName: 'Efectivo',
        createdAt: '2026-11-02T11:00:00Z',
        items: []
      },
      {
        orderId: 903,
        orderNumber: 'ORD-903',
        branchId: 1,
        clientId: 3,
        clientName: 'Luz Arango',
        status: 'BILLED',
        orderDate: '2026-11-02',
        totalAmount: 273700,
        isPaid: false,
        paymentMethodName: 'Contra Entrega',
        createdAt: '2026-11-02T12:00:00Z',
        items: []
      }
    ]);

    expect(service.pendingOrdersCount()).toBe(2);
    expect(service.billingOrdersCount()).toBe(1);
  });

  it('should clear routeCode, routeSequenceOrder, and dispatchedAtUtc on courier orders and call api.settleCourierRoute when settling a courier route', () => {
    service.orders.set([
      {
        orderId: 910,
        orderNumber: 'ORD-910',
        branchId: 1,
        clientId: 1,
        clientName: 'Cliente Ruta Liquidada',
        status: 'DELIVERED',
        orderDate: '2026-11-02',
        totalAmount: 45000,
        isPaid: true,
        paymentMethodName: 'Efectivo',
        courierId: 7,
        courierName: 'Domiciliario Siete',
        routeCode: 'RUT-07',
        routeSequenceOrder: 1,
        dispatchedAtUtc: '2026-11-02T14:00:00Z',
        createdAt: '2026-11-02T13:00:00Z',
        items: []
      }
    ]);

    service.settleCourierRoute(7, 'Domiciliario Siete', 45000, 15000, 'Cuadre exacto');

    const settledOrder = service.orders().find(o => o.orderId === 910);
    expect(settledOrder?.routeCode).toBeUndefined();
    expect(settledOrder?.routeSequenceOrder).toBeUndefined();
    expect(settledOrder?.dispatchedAtUtc).toBeUndefined();
    expect(apiSpy.settleCourierRoute).toHaveBeenCalledWith(7, {
      cashDelivered: 45000,
      transfersConfirmed: 15000,
      notes: 'Cuadre exacto'
    });
  });

  it('should persist status transitions to DB in updateItemPickedQuantity and transition DISPATCHED orders to DELIVERED in settleCourierRoute', () => {
    service.orders.set([
      {
        orderId: 920,
        orderNumber: 'ORD-920',
        branchId: 1,
        clientId: 1,
        clientName: 'Cliente Picking DB',
        status: 'PENDING',
        orderDate: '2026-11-02',
        totalAmount: 40000,
        isPaid: false,
        paymentMethodName: 'Efectivo',
        createdAt: '2026-11-02T10:00:00Z',
        items: [
          {
            orderItemId: 55,
            fruitId: 1,
            fruitName: 'Mora',
            grammage: 250,
            quantity: 10,
            pickedQuantity: 0,
            unitPrice: 4000,
            subtotal: 40000
          }
        ]
      },
      {
        orderId: 921,
        orderNumber: 'ORD-921',
        branchId: 1,
        clientId: 2,
        clientName: 'Cliente En Ruta',
        status: 'DISPATCHED',
        orderDate: '2026-11-02',
        totalAmount: 60000,
        isPaid: false,
        paymentMethodName: 'Efectivo',
        courierId: 8,
        courierName: 'Domiciliario Ocho',
        routeCode: 'RUT-08',
        routeSequenceOrder: 1,
        createdAt: '2026-11-02T11:00:00Z',
        items: []
      }
    ]);

    expect(service.dispatchedOrdersCount()).toBe(1);

    service.updateItemPickedQuantity(920, 1, 250, 10);
    expect(service.orders().find(o => o.orderId === 920)?.status).toBe('BILLED');
    expect(apiSpy.updateOrderStatus).toHaveBeenCalledWith({
      orderId: 920,
      status: 'BILLED',
      isBilled: true
    });

    service.settleCourierRoute(8, 'Domiciliario Ocho', 60000, 0);
    expect(service.orders().find(o => o.orderId === 921)?.status).toBe('DELIVERED');
    expect(service.dispatchedOrdersCount()).toBe(0);
    expect(apiSpy.updateOrderStatus).toHaveBeenCalledWith({
      orderId: 921,
      status: 'DELIVERED',
      isBilled: true
    });
  });

  it('should handle HTTP mutation errors via handleMutationError without throwing and notify on server failure', () => {
    apiSpy.createClient.and.returnValue(throwError(() => ({ status: 500, message: 'Internal Server Error' })));
    notificationSpy.warning.calls.reset();

    const createdClient = service.createClient({
      fullName: 'Cliente Resiliente',
      identificationNumber: '900555666',
      phone: '3150001122'
    });

    expect(createdClient.fullName).toBe('Cliente Resiliente');
    expect(service.clients().length).toBe(1);
    expect(notificationSpy.warning).toHaveBeenCalledWith(
      'Sincronización Pendiente',
      jasmine.stringContaining('No se pudo registrar el cliente en el servidor')
    );

    const shift = service.startWorkShift(1, 'MORNING', 'Inicio turno');
    expect(service.shifts().length).toBe(1);
    service.endWorkShift(shift.shiftId, 'Fin turno');
    expect(service.shifts()[0].status).toBe('CLOSED');

    service.addExpense({ categoryName: 'Insumos', description: 'Bolsas empaque', amount: 15000 });
    expect(service.expenses().length).toBe(1);
    service.deleteExpense(service.expenses()[0].expenseId);
    expect(service.expenses().length).toBe(0);
  });

  it('should include overtime in the 4% health and pension taxable base (IBC) and apply 2847000/200000 transport allowance cap in settlePayroll', () => {
    service.employees.set([
      {
        employeeId: 50,
        firstName: 'Marta',
        lastName: 'Rojas',
        fullName: 'Marta Rojas',
        identificationNumber: '52000111',
        baseSalary: 2000000,
        hireDate: '2026-01-01',
        isActive: true
      }
    ]);

    const settlement = service.settlePayroll({
      periodId: 1,
      employeeId: 50,
      daysWorked: 15,
      overtimeAmount: 100000
    });

    expect(settlement.baseSalaryEarned).toBe(1000000);
    expect(settlement.transportAllowanceEarned).toBe(100000);
    expect(settlement.healthDeduction).toBe(44000);
    expect(settlement.pensionDeduction).toBe(44000);
  });

  it('should not set isLoading to true on subsequent refreshAll calls when initial refresh has completed or data is already hydrated', () => {
    service.refreshAll(false);
    expect(service.isLoading()).toBeFalse();

    const setSpy = spyOn(service.isLoading, 'set').and.callThrough();
    service.refreshAll(false);

    expect(setSpy).not.toHaveBeenCalledWith(true);
    expect(service.isLoading()).toBeFalse();
  });
});
