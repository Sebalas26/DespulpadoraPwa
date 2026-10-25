import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
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

  it('should deduct packed stock automatically when transitioning an order to DISPATCHED', () => {
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

    service.updateOrderStatus(order.orderId, 'DISPATCHED');

    expect(service.fruits()[0].stock.g250).toBe(15);
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
});
