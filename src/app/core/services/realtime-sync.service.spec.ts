import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import {
  CourierRealtimeLocationPayload,
  RealtimeDomainEvent,
  RealtimeSyncService
} from './realtime-sync.service';

describe('RealtimeSyncService', () => {
  let service: RealtimeSyncService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RealtimeSyncService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(RealtimeSyncService);
  });

  afterEach(() => {
    service.disconnect();
  });

  it('should be created and initialize cross-tab listeners', () => {
    expect(service).toBeTruthy();
    expect(service.transportMode()).toBe('broadcast');
  });

  it('should publish domain change events for parameters, inventory, routes, and users', () => {
    const paramEvt = service.publishDomainChange('parameters', 'update', {
      section: 'paymentMethods'
    });
    expect(paramEvt.event).toBe('parameters_updated');
    expect(paramEvt.domain).toBe('parameters');
    expect(service.lastEvent()?.eventId).toBe(paramEvt.eventId);

    const routeEvt = service.publishDomainChange(
      'routes',
      'dispatch',
      { courierName: 'Carlos' },
      { courierId: 'emp-1', orderIds: ['ord-1', 'ord-2'] }
    );
    expect(routeEvt.event).toBe('route_dispatched');
    expect(routeEvt.courierId).toBe('emp-1');
    expect(routeEvt.orderIds).toEqual(['ord-1', 'ord-2']);

    const userEvt = service.publishDomainChange(
      'users',
      'courier',
      { fullName: 'Carlos Mensajero' },
      { userId: 'usr-1' }
    );
    expect(userEvt.event).toBe('courier_updated');
    expect(userEvt.userId).toBe('usr-1');
  });

  it('should process incoming raw events and emit to domainEvents$ without duplicates', () => {
    const received: RealtimeDomainEvent[] = [];
    const sub = service.domainEvents$.subscribe(evt => received.push(evt));

    const result1 = service.handleIncomingRawEvent(
      {
        eventId: 'ext_evt_101',
        event: 'inventory_updated',
        action: 'adjust_stock',
        data: { fruitId: 'f-1' }
      },
      'signalr'
    );

    const duplicateResult = service.handleIncomingRawEvent(
      {
        eventId: 'ext_evt_101',
        event: 'inventory_updated',
        action: 'adjust_stock'
      },
      'websocket'
    );

    expect(result1).toBeTruthy();
    expect(result1?.domain).toBe('inventory');
    expect(duplicateResult).toBeNull();
    expect(received.length).toBe(1);

    sub.unsubscribe();
  });

  it('should extract and emit courier GPS location updates from Flutter WebSocket messages', () => {
    const locations: CourierRealtimeLocationPayload[] = [];
    const sub = service.courierLocations$.subscribe(loc => locations.push(loc));

    service.handleIncomingRawEvent(
      {
        event: 'courier_location_update',
        data: {
          courierId: 'emp-4',
          courierName: 'Sebas Domiciliario',
          latitude: 4.6512,
          longitude: -74.0834,
          speedKmh: 28.5,
          batteryLevel: 85,
          timestamp: '2026-10-30T19:55:00.000Z'
        }
      },
      'websocket'
    );

    expect(locations.length).toBe(1);
    expect(locations[0].courierId).toBe('emp-4');
    expect(locations[0].latitude).toBeCloseTo(4.6512, 4);
    expect(locations[0].longitude).toBeCloseTo(-74.0834, 4);
    expect(service.latestCourierLocation()?.courierId).toBe('emp-4');

    sub.unsubscribe();
  });
});

