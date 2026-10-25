import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { KdsComponent } from './kds.component';
import { StateService } from '../../../core/services/state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ClientDto, FruitConfig, OrderDto } from '../../../core/models/business.models';

/**
 * Unit tests for KdsComponent verifying dynamic order simulation, ticket filtering, and picking progress.
 */
describe('KdsComponent', () => {
  let component: KdsComponent;
  let fixture: ComponentFixture<KdsComponent>;
  let createOrderSpy: jasmine.Spy;
  let updateOrderStatusSpy: jasmine.Spy;
  let updateItemPickedQuantitySpy: jasmine.Spy;
  let warningSpy: jasmine.Spy;

  const mockFruits = signal<FruitConfig[]>([
    {
      id: 'mango',
      fruitId: 2,
      name: 'Mango',
      scientificName: 'Mangifera indica',
      emoji: '',
      color: '#f59e0b',
      bgColor: '#fef3c7',
      yieldRate: 0.65,
      waterAdditionDefault: 0.05,
      freshStockKg: 120,
      category: 'PULPAS',
      prices: { g140: 2100, g250: 3600, g500: 6800, g1000: 11500 },
      stock: { g140: 15, g250: 25, g500: 20, g1000: 12 },
      minStock: { g140: 5, g250: 5, g500: 5, g1000: 5 }
    }
  ]);

  const mockClients = signal<ClientDto[]>([
    {
      id: 1,
      clientId: 1,
      identificationNumber: '900222333',
      fullName: 'Bistro Gourmet',
      name: 'Bistro Gourmet',
      phone: '3159998877',
      email: 'laura@bistro.com',
      address: 'Cra 11 # 82-15',
      city: 'Bogota',
      creditLimit: 800000,
      currentBalance: 0,
      isActive: true
    }
  ]);

  const mockOrders = signal<OrderDto[]>([
    {
      orderId: 101,
      orderNumber: 'ORD-101',
      clientId: 1,
      clientName: 'Bistro Gourmet',
      clientAddress: 'Cra 11 # 82-15',
      branchId: 1,
      status: 'PENDING',
      isPaid: false,
      totalAmount: 57500,
      createdAt: new Date().toISOString(),
      orderDate: new Date().toISOString().substring(0, 10),
      items: [
        {
          fruitId: 2,
          fruitName: 'Mango',
          grammage: 1000,
          quantity: 5,
          pickedQuantity: 0,
          unitPrice: 11500,
          subtotal: 57500
        }
      ]
    }
  ]);

  beforeEach(async () => {
    createOrderSpy = jasmine.createSpy('createOrder').and.callFake((dto: Partial<OrderDto>) => ({
      orderId: 102,
      orderNumber: 'ORD-102',
      clientName: dto.clientName || '',
      status: 'PENDING',
      isPaid: false,
      totalAmount: 57500,
      createdAt: new Date().toISOString(),
      orderDate: new Date().toISOString().substring(0, 10),
      items: dto.items || []
    }));
    updateOrderStatusSpy = jasmine.createSpy('updateOrderStatus');
    updateItemPickedQuantitySpy = jasmine.createSpy('updateItemPickedQuantity');
    warningSpy = jasmine.createSpy('warning');

    const stateServiceMock: Partial<StateService> = {
      fruits: mockFruits,
      clients: mockClients,
      orders: mockOrders,
      createOrder: createOrderSpy,
      updateOrderStatus: updateOrderStatusSpy,
      updateItemPickedQuantity: updateItemPickedQuantitySpy
    };

    const notificationMock: Partial<NotificationService> = {
      success: jasmine.createSpy('success'),
      warning: warningSpy,
      error: jasmine.createSpy('error'),
      info: jasmine.createSpy('info')
    };

    await TestBed.configureTestingModule({
      imports: [KdsComponent],
      providers: [
        provideRouter([]),
        { provide: StateService, useValue: stateServiceMock },
        { provide: NotificationService, useValue: notificationMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(KdsComponent);
    component = fixture.componentInstance;
    component.soundEnabled.set(false);
    fixture.detectChanges();
  });

  it('should create and compute pending, picking, and ready orders', () => {
    expect(component).toBeTruthy();
    expect(component.pendingOrders().length).toBe(1);
    expect(component.pickingOrders().length).toBe(0);
    expect(component.readyOrders().length).toBe(0);
  });

  it('should simulate incoming order using dynamic clients and fruits from StateService', () => {
    component.simulateIncomingOrder();
    expect(createOrderSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        clientName: 'Bistro Gourmet',
        clientPhone: '3159998877',
        clientAddress: 'Cra 11 # 82-15'
      })
    );
  });

  it('should warn and abort simulateIncomingOrder when fruit catalog is empty', () => {
    mockFruits.set([]);
    component.simulateIncomingOrder();
    expect(createOrderSpy).not.toHaveBeenCalled();
    expect(warningSpy).toHaveBeenCalled();
    mockFruits.set([
      {
        id: 'mango',
        fruitId: 2,
        name: 'Mango',
        scientificName: 'Mangifera indica',
        emoji: '',
        color: '#f59e0b',
        bgColor: '#fef3c7',
        yieldRate: 0.65,
        waterAdditionDefault: 0.05,
        freshStockKg: 120,
        category: 'PULPAS',
        prices: { g140: 2100, g250: 3600, g500: 6800, g1000: 11500 },
        stock: { g140: 15, g250: 25, g500: 20, g1000: 12 },
        minStock: { g140: 5, g250: 5, g500: 5, g1000: 5 }
      }
    ]);
  });

  it('should toggle item picked quantity and advance order status', () => {
    const order = mockOrders()[0];
    expect(component.getOrderPickedPercentage(order)).toBe(0);
    component.toggleItem(order, order.items[0]);
    expect(updateItemPickedQuantitySpy).toHaveBeenCalledWith(101, 2, 1000, 5);

    component.advanceStatus(order, 'PICKING');
    expect(updateOrderStatusSpy).toHaveBeenCalledWith(101, 'PICKING');
  });
});
