import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import {
  WhatsAppBotConfigDto,
  WhatsAppGatewayService,
  WhatsAppGatewayStatusDto,
  WhatsAppIncomingOrderRecord,
  WhatsAppSendResponseDto,
  WhatsAppSimulateResponseDto,
  WhatsAppSyncContextResponseDto
} from './whatsapp-gateway.service';

/**
 * Unit tests for WhatsAppGatewayService verifying status polling, message dispatch, auto-order bot configuration, and error handling.
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

  it('should get and update bot config via /bot-config', () => {
    let botConfig: WhatsAppBotConfigDto | undefined;
    service.getBotConfig().subscribe((res: WhatsAppBotConfigDto) => {
      botConfig = res;
    });
    const getReq = httpMock.expectOne('http://localhost:3005/api/whatsapp/bot-config');
    expect(getReq.request.method).toBe('GET');
    getReq.flush({
      ok: true,
      botEnabled: true,
      autoReplyEnabled: true,
      hasGeminiApiKey: false,
      geminiApiKeyMasked: '',
      backendApiUrl: 'https://apidevdespulpadora.parking-flow.com/api',
      fruitsCount: 4,
      clientsCount: 2,
      ordersHistoryCount: 5,
      incomingOrdersCount: 1,
      lastSyncedAt: '2026-11-02T15:00:00Z'
    });
    expect(botConfig?.botEnabled).toBeTrue();
    expect(botConfig?.fruitsCount).toBe(4);

    let updatedConfig: WhatsAppBotConfigDto | undefined;
    service.updateBotConfig({ botEnabled: false }).subscribe((res: WhatsAppBotConfigDto) => {
      updatedConfig = res;
    });
    const postReq = httpMock.expectOne('http://localhost:3005/api/whatsapp/bot-config');
    expect(postReq.request.method).toBe('POST');
    expect(postReq.request.body).toEqual({ botEnabled: false });
    postReq.flush({
      ok: true,
      botEnabled: false,
      autoReplyEnabled: true,
      hasGeminiApiKey: false,
      geminiApiKeyMasked: '',
      backendApiUrl: 'https://apidevdespulpadora.parking-flow.com/api',
      fruitsCount: 4,
      clientsCount: 2,
      ordersHistoryCount: 5,
      incomingOrdersCount: 1,
      lastSyncedAt: '2026-11-02T15:00:00Z'
    });
    expect(updatedConfig?.botEnabled).toBeFalse();
  });

  it('should synchronize context, fetch incoming orders, and simulate incoming customer messages', () => {
    let syncRes: WhatsAppSyncContextResponseDto | undefined;
    service
      .syncContext({
        fruits: [{ fruitId: 1, name: 'Mora', prices: { g140: 1800, g250: 3200, g500: 6000, g1000: 11500 } }],
        clients: [{ clientId: 10, fullName: 'Luz Arango', phone: '3101234567', address: 'Cra 10 #20-30' }],
        orders: []
      })
      .subscribe((res: WhatsAppSyncContextResponseDto) => {
        syncRes = res;
      });
    const syncReq = httpMock.expectOne('http://localhost:3005/api/whatsapp/sync-context');
    expect(syncReq.request.method).toBe('POST');
    syncReq.flush({
      ok: true,
      fruitsCount: 1,
      clientsCount: 1,
      ordersCount: 0,
      lastSyncedAt: '2026-11-02T15:10:00Z'
    });
    expect(syncRes?.ok).toBeTrue();
    expect(syncRes?.fruitsCount).toBe(1);

    let incomingRes: { ok: boolean; orders: WhatsAppIncomingOrderRecord[] } | undefined;
    service.getIncomingOrders().subscribe((res: { ok: boolean; orders: WhatsAppIncomingOrderRecord[] }) => {
      incomingRes = res;
    });
    const incReq = httpMock.expectOne('http://localhost:3005/api/whatsapp/incoming-orders');
    expect(incReq.request.method).toBe('GET');
    incReq.flush({ ok: true, orders: [] });
    expect(incomingRes?.ok).toBeTrue();

    let simRes: WhatsAppSimulateResponseDto | undefined;
    service
      .simulateIncomingMessage({
        phone: '3101234567',
        message: 'deme el pedido de qué días',
        autoConfirm: false
      })
      .subscribe((res: WhatsAppSimulateResponseDto) => {
        simRes = res;
      });
    const simReq = httpMock.expectOne('http://localhost:3005/api/whatsapp/simulate-incoming');
    expect(simReq.request.method).toBe('POST');
    simReq.flush({
      ok: true,
      handled: true,
      action: 'DRAFT_REPEAT_SINGLE',
      replyText: 'Resumen de tu último pedido'
    });
    expect(simRes?.handled).toBeTrue();
    expect(simRes?.action).toBe('DRAFT_REPEAT_SINGLE');

    let failReconnect: ({ success: boolean } & Partial<WhatsAppGatewayStatusDto>) | undefined;
    service.reconnect().subscribe((res: { success: boolean } & Partial<WhatsAppGatewayStatusDto>) => {
      failReconnect = res;
    });
    const failReq = httpMock.expectOne('http://localhost:3005/api/whatsapp/reconnect');
    failReq.error(new ProgressEvent('error'));
    expect(failReconnect?.success).toBeTrue();
    expect(failReconnect?.status).toBe('QR_READY');
    expect(failReconnect?.qrDataUrl).toContain('data:image/svg+xml;base64,');

    let failStatus: WhatsAppGatewayStatusDto | undefined;
    service.getStatus().subscribe((res: WhatsAppGatewayStatusDto) => {
      failStatus = res;
    });
    const failStatusReq = httpMock.expectOne('http://localhost:3005/api/whatsapp/status');
    failStatusReq.error(new ProgressEvent('error'));
    expect(failStatus?.status).toBe('QR_READY');
    expect(failStatus?.qrDataUrl).toContain('data:image/svg+xml;base64,');
  });
});
