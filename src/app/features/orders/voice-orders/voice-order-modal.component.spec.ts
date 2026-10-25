import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { VoiceOrderModalComponent } from './voice-order-modal.component';
import { StateService } from '../../../core/services/state.service';
import { FruitConfig } from '../../../core/data/initial-data';
import { VoiceOrdersService } from '../../../core/services/voice-orders.service';
import { VoiceOrderMessageDto } from '../../../core/models/voice-order.models';
import { ClientDto, OrderDto, PaymentMethodDto } from '../../../core/models/business.models';

/**
 * Unit tests for VoiceOrderModalComponent verifying zeroed defaults, dynamic fruit price lookup, and order submission.
 */
describe('VoiceOrderModalComponent', () => {
  let component: VoiceOrderModalComponent;
  let fixture: ComponentFixture<VoiceOrderModalComponent>;
  let createOrderSpy: jasmine.Spy;
  let confirmAndSendSpy: jasmine.Spy;

  const mockFruits = signal<FruitConfig[]>([
    {
      id: 'guanabana',
      fruitId: 4,
      name: 'Guanabana',
      scientificName: 'Annona muricata',
      emoji: '',
      color: '#10b981',
      bgColor: '#ecfdf5',
      yieldRate: 0.72,
      waterAdditionDefault: 0.05,
      freshStockKg: 90,
      category: 'PULPAS',
      prices: { g140: 2500, g250: 4200, g500: 7800, g1000: 14000 },
      stock: { g140: 10, g250: 10, g500: 10, g1000: 10 },
      minStock: { g140: 5, g250: 5, g500: 5, g1000: 5 }
    }
  ]);

  const mockClients = signal<ClientDto[]>([
    {
      id: 5,
      clientId: 5,
      identificationNumber: '900444555',
      fullName: 'Hotel Real',
      name: 'Hotel Real',
      phone: '3123334455',
      email: 'compras@hotelreal.com',
      address: 'Av. Dorado # 68-10',
      city: 'Bogota',
      creditLimit: 1000000,
      currentBalance: 0,
      isActive: true
    }
  ]);

  const activeVoiceOrder = signal<VoiceOrderMessageDto | null>(null);

  beforeEach(async () => {
    activeVoiceOrder.set(null);
    createOrderSpy = jasmine.createSpy('createOrder').and.callFake((dto: Partial<OrderDto>) => ({
      orderId: 401,
      orderNumber: 'ORD-401',
      clientName: dto.clientName || '',
      status: 'PENDING',
      isPaid: false,
      totalAmount: 140000,
      createdAt: new Date().toISOString(),
      orderDate: new Date().toISOString().substring(0, 10),
      items: dto.items || []
    }));
    confirmAndSendSpy = jasmine.createSpy('confirmAndSendWhatsApp').and.returnValue(Promise.resolve());

    const stateServiceMock: Partial<StateService> = {
      fruits: mockFruits,
      clients: mockClients,
      activePaymentMethods: signal<PaymentMethodDto[]>([]) as unknown as StateService['activePaymentMethods'],
      createOrder: createOrderSpy
    };

    const voiceOrdersMock: Partial<VoiceOrdersService> = {
      isSignalRConnected: signal<boolean>(false) as unknown as VoiceOrdersService['isSignalRConnected'],
      isModalOpen: signal<boolean>(true) as unknown as VoiceOrdersService['isModalOpen'],
      voiceOrders: signal<VoiceOrderMessageDto[]>([]) as unknown as VoiceOrdersService['voiceOrders'],
      pendingVoiceOrders: signal<VoiceOrderMessageDto[]>([]) as unknown as VoiceOrdersService['pendingVoiceOrders'],
      activeVoiceOrder: activeVoiceOrder as unknown as VoiceOrdersService['activeVoiceOrder'],
      pendingCount: signal<number>(1) as unknown as VoiceOrdersService['pendingCount'],
      confirmAndSendWhatsApp: confirmAndSendSpy,
      closeModal: jasmine.createSpy('closeModal'),
      selectOrder: jasmine.createSpy('selectOrder'),
      simulateIncomingAudio: jasmine.createSpy('simulateIncomingAudio')
    };

    await TestBed.configureTestingModule({
      imports: [VoiceOrderModalComponent],
      providers: [
        { provide: StateService, useValue: stateServiceMock },
        { provide: VoiceOrdersService, useValue: voiceOrdersMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(VoiceOrderModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create with empty estimatedDeliveryTime and paymentMethod defaults', () => {
    expect(component).toBeTruthy();
    expect(component.estimatedDeliveryTime()).toBe('');
    expect(component.paymentMethod()).toBe('');
  });

  it('should return real fruit prices from StateService and 0 when fruit is unconfigured', () => {
    expect(component.getPriceFor('Guanabana', 1000)).toBe(14000);
    expect(component.getPriceFor('Guanabana', 500)).toBe(7800);
    expect(component.getPriceFor('Guanabana', 250)).toBe(4200);
    expect(component.getPriceFor('Guanabana', 140)).toBe(2500);
    expect(component.getPriceFor('FrutaInexistente', 1000)).toBe(0);
  });

  it('should initialize form when activeVoiceOrder changes without hardcoded address or client presets', () => {
    const voiceMsg: VoiceOrderMessageDto = {
      id: 'vo-1',
      whatsAppMessageId: 'wa-1',
      senderPhone: '+57 312 333 4455',
      customerName: 'Hotel Real',
      mediaId: 'm-1',
      audioUrl: '',
      mimeType: 'audio/ogg',
      fileSizeBytes: 1024,
      durationSeconds: 15,
      receivedAt: new Date().toISOString(),
      status: 'Pending',
      extractedItems: []
    };
    activeVoiceOrder.set(voiceMsg);
    fixture.detectChanges();

    expect(component.clientName()).toBe('Hotel Real');
    expect(component.deliveryAddress()).toBe('');
    expect(component.estimatedDeliveryTime()).toBe('');
    expect(component.paymentMethod()).toBe('');
    expect(component.items().length).toBe(1);
    expect(component.items()[0].fruitName).toBe('Guanabana');
    expect(component.items()[0].unitPrice).toBe(14000);
  });

  it('should submit order and invoke confirmAndSendWhatsApp', async () => {
    const voiceMsg: VoiceOrderMessageDto = {
      id: 'vo-2',
      whatsAppMessageId: 'wa-2',
      senderPhone: '+57 312 333 4455',
      customerName: 'Hotel Real',
      mediaId: 'm-2',
      audioUrl: '',
      mimeType: 'audio/ogg',
      fileSizeBytes: 1024,
      durationSeconds: 12,
      receivedAt: new Date().toISOString(),
      status: 'Pending',
      extractedItems: [
        {
          fruitName: 'Guanabana',
          grammage: 1000,
          quantity: 10,
          unitPrice: 14000,
          subtotal: 140000
        }
      ]
    };
    activeVoiceOrder.set(voiceMsg);
    fixture.detectChanges();

    expect(component.items().length).toBe(1);
    expect(component.totalAmount()).toBe(140000);

    await component.submitOrder();
    expect(createOrderSpy).toHaveBeenCalled();
    expect(confirmAndSendSpy).toHaveBeenCalledWith('vo-2', jasmine.objectContaining({ totalAmount: 140000 }));
  });
});
