import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { WhatsAppGatewayService, WhatsAppGatewayStatusDto, WhatsAppSendResponseDto } from './whatsapp-gateway.service';

/**
 * Unit tests for WhatsAppGatewayService verifying status polling, message dispatch, and error handling.
 */
describe('WhatsAppGatewayService', () => {
  let service: WhatsAppGatewayService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.removeItem('despulpadora_whatsapp_gateway_url');
    TestBed.configureTestingModule({
      providers: [
        WhatsAppGatewayService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(WhatsAppGatewayService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.removeItem('despulpadora_whatsapp_gateway_url');
  });

  it('should return default gateway URL and allow updating custom URL', () => {
    expect(service.getGatewayBaseUrl()).toBe('http://localhost:3005/api/whatsapp');
    service.setGatewayBaseUrl('http://192.168.0.4:3005/api/whatsapp/');
    expect(service.getGatewayBaseUrl()).toBe('http://192.168.0.4:3005/api/whatsapp');
    service.setGatewayBaseUrl('');
    expect(service.getGatewayBaseUrl()).toBe('http://localhost:3005/api/whatsapp');
  });

  it('should fetch status from /status endpoint and fallback cleanly on error', () => {
    let result: WhatsAppGatewayStatusDto | undefined;
    service.getStatus().subscribe((res: WhatsAppGatewayStatusDto) => {
      result = res;
    });

    const req = httpMock.expectOne('http://localhost:3005/api/whatsapp/status');
    expect(req.request.method).toBe('GET');
    req.flush({
      status: 'QR_READY',
      connected: false,
      qrDataUrl: 'data:image/png;base64,AAA',
      phoneNumber: null,
      name: null
    });

    expect(result?.status).toBe('QR_READY');
    expect(result?.qrDataUrl).toBe('data:image/png;base64,AAA');
  });

  it('should send WhatsApp message via POST /send and handle HTTP failure gracefully', () => {
    let sendRes: WhatsAppSendResponseDto | undefined;
    service.sendMessage('3101234567', 'Pedido en camino').subscribe((res: WhatsAppSendResponseDto) => {
      sendRes = res;
    });

    const req = httpMock.expectOne('http://localhost:3005/api/whatsapp/send');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      phone: '3101234567',
      message: 'Pedido en camino'
    });
    req.flush({
      success: true,
      to: '573101234567@s.whatsapp.net',
      messageId: 'MSG-01'
    });

    expect(sendRes?.success).toBeTrue();
    expect(sendRes?.messageId).toBe('MSG-01');
  });

  it('should call reconnect and logout endpoints', () => {
    let reconnected = false;
    service.reconnect().subscribe((res: { success: boolean }) => {
      reconnected = res.success;
    });
    const req1 = httpMock.expectOne('http://localhost:3005/api/whatsapp/reconnect');
    expect(req1.request.method).toBe('POST');
    req1.flush({ success: true });
    expect(reconnected).toBeTrue();

    let loggedOut = false;
    service.logout().subscribe((res: { success: boolean }) => {
      loggedOut = res.success;
    });
    const req2 = httpMock.expectOne('http://localhost:3005/api/whatsapp/logout');
    expect(req2.request.method).toBe('POST');
    req2.flush({ success: true });
    expect(loggedOut).toBeTrue();
  });
});

