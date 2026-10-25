import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { VoiceOrdersService } from './voice-orders.service';
import { NotificationService } from './notification.service';
import { environment } from '../../../environments/environment';
import { VoiceOrderMessageDto } from '../models/voice-order.models';

/**
 * Unit test suite for `VoiceOrdersService` verifying empty initial state,
 * modal state management, confirmation workflow, and dynamic `environment.apiUrl` usage.
 */
describe('VoiceOrdersService', () => {
  let service: VoiceOrdersService;
  let httpMock: HttpTestingController;
  let notificationSpy: jasmine.SpyObj<NotificationService>;

  beforeEach(async () => {
    localStorage.clear();
    notificationSpy = jasmine.createSpyObj<NotificationService>('NotificationService', [
      'info',
      'success',
      'error',
      'warning'
    ]);

    TestBed.configureTestingModule({
      providers: [
        VoiceOrdersService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: notificationSpy }
      ]
    });

    service = TestBed.inject(VoiceOrdersService);
    httpMock = TestBed.inject(HttpTestingController);

    const syncReq = httpMock.match(`${environment.apiUrl}/whatsapp/voice-orders`);
    syncReq.forEach(r => r.flush([]));
    await Promise.resolve();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should initialize with empty voiceOrders array and closed modal', () => {
    expect(service.voiceOrders()).toEqual([]);
    expect(service.pendingCount()).toBe(0);
    expect(service.isModalOpen()).toBeFalse();
  });

  it('should open, select, and close the voice order modal', () => {
    const sampleOrder: VoiceOrderMessageDto = {
      id: 'vo_1',
      whatsAppMessageId: 'wamid_1',
      senderPhone: '3001112233',
      customerName: 'Client One',
      mediaId: 'm_1',
      audioUrl: `${environment.apiUrl}/whatsapp/media/m_1`,
      mimeType: 'audio/wav',
      fileSizeBytes: 1024,
      durationSeconds: 5,
      status: 'Pending',
      receivedAt: new Date().toISOString()
    };

    service.openModal(sampleOrder);
    expect(service.isModalOpen()).toBeTrue();
    expect(service.activeVoiceOrder()?.id).toBe('vo_1');

    service.closeModal();
    expect(service.isModalOpen()).toBeFalse();
  });

  it('should simulate incoming audio using environment.apiUrl without hardcoded business data', () => {
    const simulated = service.simulateIncomingAudio('Custom Client', '3009998877', 'Sample transcript');
    expect(simulated.customerName).toBe('Custom Client');
    expect(simulated.senderPhone).toBe('3009998877');
    expect(simulated.audioUrl.startsWith(environment.apiUrl)).toBeTrue();

    const req = httpMock.expectOne(`${environment.apiUrl}/whatsapp/webhook/simulate-audio`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('should confirm a voice order and update status to Processed', async () => {
    const sampleOrder: VoiceOrderMessageDto = {
      id: 'vo_2',
      whatsAppMessageId: 'wamid_2',
      senderPhone: '3001112233',
      customerName: 'Client Two',
      mediaId: 'm_2',
      audioUrl: `${environment.apiUrl}/whatsapp/media/m_2`,
      mimeType: 'audio/wav',
      fileSizeBytes: 1024,
      durationSeconds: 5,
      status: 'Pending',
      receivedAt: new Date().toISOString()
    };
    service.voiceOrders.set([sampleOrder]);

    const promise = service.confirmAndSendWhatsApp('vo_2', {
      messageId: 'wamid_2',
      orderId: 500,
      customerPhone: '3001112233',
      customerName: 'Client Two',
      items: [],
      totalAmount: 10000,
      deliveryAddress: 'Street 1'
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/whatsapp/voice-orders/vo_2/confirm-and-send`);
    expect(req.request.method).toBe('POST');
    req.flush({ ok: true });

    const confirmed = await promise;
    expect(confirmed).toBeTrue();
    expect(service.voiceOrders()[0].status).toBe('Processed');
    expect(notificationSpy.success).toHaveBeenCalled();
  });
});
