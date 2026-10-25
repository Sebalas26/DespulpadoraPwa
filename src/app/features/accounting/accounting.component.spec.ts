import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { AccountingComponent } from './accounting.component';
import { StateService } from '../../core/services/state.service';
import { NotificationService } from '../../core/services/notification.service';
import { ClientDto, OrderDto } from '../../core/models/business.models';

/**
 * Unit tests for AccountingComponent verifying client CRUD, purchase history, and reorder logic without hardcoded fallbacks.
 */
describe('AccountingComponent', () => {
  let component: AccountingComponent;
  let fixture: ComponentFixture<AccountingComponent>;
  let routerSpy: jasmine.SpyObj<Router>;
  let notificationSpy: jasmine.SpyObj<NotificationService>;
  let createClientSpy: jasmine.Spy;
  let updateClientSpy: jasmine.Spy;
  let deleteClientSpy: jasmine.Spy;
  let createOrderSpy: jasmine.Spy;

  const mockClients = signal<ClientDto[]>([
    {
      clientId: 1,
      fullName: 'Restaurante El Jardín',
      identificationNumber: '900123456-1',
      phone: '3001112233',
      email: 'contacto@eljardin.com',
      address: 'Calle 10 # 5-20',
      city: 'Medellín',
      isActive: true
    }
  ]);

  const mockOrders = signal<OrderDto[]>([
    {
      orderId: 50,
      orderNumber: 'ORD-050',
      clientId: 1,
      clientName: 'Restaurante El Jardín',
      branchId: 1,
      status: 'DELIVERED',
      isPaid: true,
      paymentMethodName: '',
      totalAmount: 20000,
      createdAt: '2026-10-10T12:00:00Z',
      orderDate: '2026-10-10',
      items: [
        {
          fruitId: 1,
          fruitName: '',
          grammage: 0 as unknown as 140 | 250 | 500 | 1000,
          quantity: 4,
          unitPrice: 5000,
          subtotal: 20000
        }
      ]
    }
  ]);

  beforeEach(async () => {
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    notificationSpy = jasmine.createSpyObj<NotificationService>('NotificationService', [
      'success',
      'error',
      'warning',
      'info'
    ]);
    createClientSpy = jasmine.createSpy('createClient');
    updateClientSpy = jasmine.createSpy('updateClient');
    deleteClientSpy = jasmine.createSpy('deleteClient');
    createOrderSpy = jasmine.createSpy('createOrder');

    const stateServiceMock: Partial<StateService> = {
      clients: mockClients,
      orders: mockOrders,
      createClient: createClientSpy,
      updateClient: updateClientSpy,
      deleteClient: deleteClientSpy,
      createOrder: createOrderSpy
    };

    await TestBed.configureTestingModule({
      imports: [AccountingComponent],
      providers: [
        { provide: StateService, useValue: stateServiceMock },
        { provide: Router, useValue: routerSpy },
        { provide: NotificationService, useValue: notificationSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AccountingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and initialize city signal as empty string', () => {
    expect(component).toBeTruthy();
    expect(component.city()).toBe('');
  });

  it('should save a new client with empty identificationNumber and city when omitted without hardcoded defaults', () => {
    component.openCreateClient();
    component.fullName.set('Cliente Nuevo');
    component.phone.set('3109998877');
    component.identificationNumber.set('');
    component.city.set('');

    component.saveClient();

    expect(createClientSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        fullName: 'Cliente Nuevo',
        identificationNumber: '',
        phone: '3109998877',
        city: ''
      })
    );
  });

  it('should update an existing client when editingClientId is set', () => {
    component.editClient(mockClients()[0]);
    expect(component.editingClientId()).toBe(1);
    expect(component.city()).toBe('Medellín');

    component.fullName.set('Restaurante El Jardín Norte');
    component.saveClient();

    expect(updateClientSpy).toHaveBeenCalledWith(
      1,
      jasmine.objectContaining({
        fullName: 'Restaurante El Jardín Norte',
        city: 'Medellín'
      })
    );
  });

  it('should reorder a purchase without hardcoded paymentMethodName, fruitName, or grammage fallbacks', () => {
    createOrderSpy.and.returnValue({ orderId: 99 });
    const client = mockClients()[0];
    const order = mockOrders()[0];

    component.reorderPurchase(order, client);

    expect(createOrderSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        paymentMethodName: '',
        items: [
          jasmine.objectContaining({
            fruitName: '',
            grammage: 0
          })
        ]
      })
    );
  });

  it('should calculate client purchase stats and open/close sales history modal', () => {
    const client = mockClients()[0];
    expect(component.getClientPurchaseCount(client)).toBe(1);
    expect(component.getClientTotalSpent(client)).toBe(20000);

    component.openClientSalesHistory(client);
    expect(component.selectedHistoryClient()).toEqual(client);
    expect(component.selectedClientHistoryStats().totalPurchases).toBe(1);
    expect(component.selectedClientHistoryStats().totalSpent).toBe(20000);

    component.closeClientSalesHistory();
    expect(component.selectedHistoryClient()).toBeNull();
  });
});
