import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { DeliveryMapComponent } from './delivery-map.component';
import { StateService } from '../../core/services/state.service';
import { DEFAULT_COMPANY_CONFIG, FruitConfig } from '../../core/data/initial-data';
import { NotificationService } from '../../core/services/notification.service';
import { GeocodingService } from '../../core/services/geocoding.service';
import { CompanyConfig, EmployeeDto, OrderDto } from '../../core/models/business.models';

/**
 * Unit tests for DeliveryMapComponent verifying empty initial stops, dynamic couriers, and zeroed form defaults.
 */
describe('DeliveryMapComponent', () => {
  let component: DeliveryMapComponent;
  let fixture: ComponentFixture<DeliveryMapComponent>;
  let createOrderSpy: jasmine.Spy;
  let updateOrderStatusSpy: jasmine.Spy;

  const mockFruits = signal<FruitConfig[]>([
    {
      id: 'lulo',
      fruitId: 3,
      name: 'Lulo',
      scientificName: 'Solanum quitoense',
      emoji: '',
      color: '#10b981',
      bgColor: '#ecfdf5',
      yieldRate: 0.62,
      waterAdditionDefault: 0.05,
      freshStockKg: 80,
      category: 'PULPAS',
      prices: { g140: 2200, g250: 3800, g500: 7000, g1000: 13000 },
      stock: { g140: 10, g250: 10, g500: 10, g1000: 10 },
      minStock: { g140: 5, g250: 5, g500: 5, g1000: 5 }
    }
  ]);

  const mockEmployees = signal<EmployeeDto[]>([]);
  const mockOrders = signal<OrderDto[]>([]);

  const mockCompanyInfo = signal<CompanyConfig>({
    ...DEFAULT_COMPANY_CONFIG,
    companyName: 'Despulpadora Cundinamarca',
    nit: '900123456-7'
  });

  beforeEach(async () => {
    mockEmployees.set([]);
    mockOrders.set([]);

    createOrderSpy = jasmine.createSpy('createOrder').and.callFake((dto: Partial<OrderDto>) => ({
      orderId: 201,
      orderNumber: 'ORD-201',
      clientName: dto.clientName || '',
      clientPhone: dto.clientPhone || '',
      clientAddress: dto.clientAddress || '',
      status: 'PENDING',
      isPaid: false,
      totalAmount: 0,
      createdAt: new Date().toISOString(),
      orderDate: new Date().toISOString().substring(0, 10),
      items: dto.items || []
    }));
    updateOrderStatusSpy = jasmine.createSpy('updateOrderStatus');

    const stateServiceMock: Partial<StateService> = {
      fruits: mockFruits,
      employees: mockEmployees,
      orders: mockOrders,
      companyInfo: mockCompanyInfo,
      createOrder: createOrderSpy,
      updateOrderStatus: updateOrderStatusSpy,
      setOrderPriority: jasmine.createSpy('setOrderPriority')
    };

    const notificationMock: Partial<NotificationService> = {
      success: jasmine.createSpy('success'),
      warning: jasmine.createSpy('warning'),
      error: jasmine.createSpy('error'),
      info: jasmine.createSpy('info')
    };

    const geocodingMock: Partial<GeocodingService> = {
      detectBogotaZone: jasmine.createSpy('detectBogotaZone').and.returnValue('Chapinero'),
      geocodeBestMatch: jasmine.createSpy('geocodeBestMatch').and.returnValue(Promise.resolve(null)),
      searchAddress: jasmine.createSpy('searchAddress').and.returnValue(Promise.resolve([]))
    };

    await TestBed.configureTestingModule({
      imports: [DeliveryMapComponent],
      providers: [
        { provide: StateService, useValue: stateServiceMock },
        { provide: NotificationService, useValue: notificationMock },
        { provide: GeocodingService, useValue: geocodingMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DeliveryMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create with empty initial stops, empty couriers, and zeroed form defaults', () => {
    expect(component).toBeTruthy();
    expect(component.deliveryStops()).toEqual([]);
    expect(component.stops).toEqual([]);
    expect(component.couriers()).toEqual([]);
    expect(component.drawerNewAmount()).toBe(0);
    expect(component.newOrderPhone).toBe('');
    expect(component.newOrderAmount).toBe(0);
    expect(component.selectedPulpItem()).toBe('');
  });

  it('should derive quickPulpOptions dynamically from StateService fruits', () => {
    const options = component.quickPulpOptions;
    expect(options.length).toBe(1);
    expect(options[0].name).toBe('Lulo 1000g');
    expect(options[0].price).toBe(13000);
  });

  it('should populate couriers dynamically from DOMICILIOS employees on refresh', () => {
    mockEmployees.set([
      {
        id: 7,
        employeeId: 7,
        firstName: 'Camilo',
        lastName: 'Repartidor',
        fullName: 'Camilo Repartidor',
        name: 'Camilo Repartidor',
        identificationNumber: '7001',
        documentNumber: '7001',
        position: 'Motorizado',
        area: 'DOMICILIOS',
        baseSalary: 1300000,
        transportAllowance: 162000,
        hireDate: '2025-02-01',
        isActive: true,
        phone: '3112223344'
      }
    ]);
    component.refreshDeliveriesFromOrders();
    expect(component.couriers().length).toBe(1);
    expect(component.couriers()[0].name).toBe('Camilo Repartidor');
  });

  it('should save point as order without hardcoded clientName, phone, or amount fallbacks', () => {
    component.newOrderClient = 'Restaurante Norte';
    component.newOrderAddress = 'Calle 100 # 15-20';
    component.newOrderPhone = '';
    component.newOrderAmount = 0;
    component.savePointAsOrder();

    expect(createOrderSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        clientName: 'Restaurante Norte',
        clientPhone: '',
        clientAddress: 'Calle 100 # 15-20'
      })
    );
    expect(component.deliveryStops().length).toBe(1);
    expect(component.deliveryStops()[0].totalAmount).toBe(0);
  });

  it('should add existing order to map with empty phone and address fallbacks when omitted', async () => {
    const order: OrderDto = {
      orderId: 305,
      orderNumber: 'ORD-305',
      clientId: 2,
      clientName: 'Cliente Sin Telefono',
      branchId: 1,
      status: 'PENDING',
      isPaid: false,
      totalAmount: 26000,
      createdAt: new Date().toISOString(),
      orderDate: new Date().toISOString().substring(0, 10),
      items: []
    };
    await component.addExistingOrderToMap(order);
    expect(component.deliveryStops().length).toBe(1);
    expect(component.deliveryStops()[0].clientPhone).toBe('');
    expect(component.deliveryStops()[0].address).toBe('');
  });
});
