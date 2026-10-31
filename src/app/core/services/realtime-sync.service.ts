import { Injectable, OnDestroy, signal } from '@angular/core';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel
} from '@microsoft/signalr';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

export type RealtimeDomainType =
  | 'parameters'
  | 'inventory'
  | 'orders'
  | 'routes'
  | 'users'
  | 'shifts'
  | 'courier_location'
  | 'all';

export type RealtimeEventOrigin = 'local-tab' | 'cross-tab' | 'signalr' | 'websocket';

export interface CourierRealtimeLocationPayload {
  courierId: string;
  courierName?: string;
  latitude: number;
  longitude: number;
  speedKmh?: number;
  batteryLevel?: number;
  heading?: number;
  timestamp: string;
}

export interface RealtimeDomainEvent {
  eventId: string;
  event: string;
  domain: RealtimeDomainType;
  action: string;
  origin: RealtimeEventOrigin;
  senderTabId: string;
  courierId?: string;
  userId?: string;
  orderIds?: string[];
  data?: Record<string, unknown>;
  timestamp: string;
}

interface WindowWithKarma extends Window {
  __karma__?: unknown;
}

/**
 * Central real-time synchronization service combining SignalR Hub (/hubs/operations),
 * continuous WebSocket stream (/ws) for Flutter courier app interoperability,
 * and BroadcastChannel / storage events for instant multi-tab and KDS synchronization.
 */
@Injectable({
  providedIn: 'root'
})
export class RealtimeSyncService implements OnDestroy {
  private hubConnection: HubConnection | null = null;
  private webSocket: WebSocket | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private wsPingInterval: ReturnType<typeof setInterval> | null = null;
  private storageListener: ((event: StorageEvent) => void) | null = null;

  private readonly tabId: string = `pwa_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  private readonly processedEventIds = new Set<string>();
  private readonly domainEventsSubject = new Subject<RealtimeDomainEvent>();
  private readonly courierLocationSubject = new Subject<CourierRealtimeLocationPayload>();

  readonly isSignalRConnected = signal<boolean>(false);
  readonly isWebSocketConnected = signal<boolean>(false);
  readonly isConnected = signal<boolean>(false);
  readonly transportMode = signal<'signalr' | 'websocket' | 'broadcast'>('broadcast');
  readonly lastEvent = signal<RealtimeDomainEvent | null>(null);
  readonly latestCourierLocation = signal<CourierRealtimeLocationPayload | null>(null);

  readonly domainEvents$: Observable<RealtimeDomainEvent> = this.domainEventsSubject.asObservable();
  readonly courierLocations$: Observable<CourierRealtimeLocationPayload> =
    this.courierLocationSubject.asObservable();

  constructor() {
    this.initializeCrossTabListeners();
    if (!this.isKarmaTestEnvironment()) {
      this.connect();
    }
  }

  /**
   * Starts both the SignalR Hub connection (/hubs/operations) and the WebSocket (/ws) stream.
   */
  connect(): void {
    try {
      this.initializeCrossTabListeners();
      if (this.isKarmaTestEnvironment()) {
        return;
      }
      this.connectSignalRHub();
      this.connectWebSocketStream();
    } catch {
      return;
    }
  }

  /**
   * Disconnects active SignalR, WebSocket, and cross-tab listeners cleanly.
   */
  disconnect(): void {
    try {
      if (this.wsReconnectTimer) {
        clearTimeout(this.wsReconnectTimer);
        this.wsReconnectTimer = null;
      }
      if (this.wsPingInterval) {
        clearInterval(this.wsPingInterval);
        this.wsPingInterval = null;
      }
      if (this.webSocket) {
        this.webSocket.onopen = null;
        this.webSocket.onmessage = null;
        this.webSocket.onerror = null;
        this.webSocket.onclose = null;
        this.webSocket.close();
        this.webSocket = null;
      }
      if (this.hubConnection) {
        void this.hubConnection.stop().catch(() => undefined);
        this.hubConnection = null;
      }
      this.isSignalRConnected.set(false);
      this.isWebSocketConnected.set(false);
      this.updateConnectionSignals();
    } catch {
      return;
    }
  }

  /**
   * Publishes a domain change across BroadcastChannel, WebSocket (/ws), and SignalR Hub
   * so all open PWA tabs, KDS screens, and the Flutter courier app receive the update in real time.
   */
  publishDomainChange(
    domain: RealtimeDomainType,
    action: string,
    data?: Record<string, unknown>,
    options?: {
      event?: string;
      courierId?: string;
      userId?: string;
      orderIds?: string[];
    }
  ): RealtimeDomainEvent {
    const eventName = options?.event || this.resolveDefaultEventName(domain, action);
    const domainEvent: RealtimeDomainEvent = {
      eventId: `${this.tabId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      event: eventName,
      domain,
      action,
      origin: 'local-tab',
      senderTabId: this.tabId,
      courierId: options?.courierId,
      userId: options?.userId,
      orderIds: options?.orderIds,
      data,
      timestamp: new Date().toISOString()
    };

    try {
      this.rememberEventId(domainEvent.eventId);
      this.lastEvent.set(domainEvent);

      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({
          ...domainEvent,
          origin: 'cross-tab'
        });
      }

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(
          'despulpadora_realtime_last_event_v1',
          JSON.stringify({
            ...domainEvent,
            origin: 'cross-tab'
          })
        );
      }

      this.sendOverWebSocket(domainEvent);
      this.sendOverSignalR(domainEvent);
    } catch {
      return domainEvent;
    }

    return domainEvent;
  }

  /**
   * Processes an incoming external event payload (from SignalR, WebSocket, or BroadcastChannel)
   * and notifies all reactive subscribers in the PWA.
   */
  handleIncomingRawEvent(
    rawPayload: Record<string, unknown>,
    origin: RealtimeEventOrigin = 'websocket'
  ): RealtimeDomainEvent | null {
    try {
      const senderTabId =
        typeof rawPayload['senderTabId'] === 'string' ? rawPayload['senderTabId'] : '';
      if (senderTabId && senderTabId === this.tabId) {
        return null;
      }

      const eventId =
        typeof rawPayload['eventId'] === 'string' && rawPayload['eventId'].trim().length > 0
          ? rawPayload['eventId']
          : `${origin}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      if (this.processedEventIds.has(eventId)) {
        return null;
      }
      this.rememberEventId(eventId);

      const rawEventName =
        typeof rawPayload['event'] === 'string'
          ? rawPayload['event']
          : typeof rawPayload['type'] === 'string'
            ? rawPayload['type']
            : 'domain_updated';

      if (rawEventName === 'pong' || rawEventName === 'connected' || rawEventName === 'location_ack') {
        return null;
      }

      const dataObj =
        rawPayload['data'] && typeof rawPayload['data'] === 'object'
          ? (rawPayload['data'] as Record<string, unknown>)
          : rawPayload;

      if (rawEventName === 'courier_location_update' || rawPayload['domain'] === 'courier_location') {
        const locationPayload = this.extractCourierLocation(dataObj);
        if (locationPayload) {
          this.latestCourierLocation.set(locationPayload);
          this.courierLocationSubject.next(locationPayload);
        }
      }

      const domain = this.inferDomainFromEvent(rawEventName, rawPayload['domain']);
      const action =
        typeof rawPayload['action'] === 'string' ? rawPayload['action'] : rawEventName;
      const courierId =
        typeof rawPayload['courierId'] === 'string'
          ? rawPayload['courierId']
          : typeof dataObj['courierId'] === 'string'
            ? dataObj['courierId']
            : undefined;
      const userId =
        typeof rawPayload['userId'] === 'string'
          ? rawPayload['userId']
          : typeof dataObj['userId'] === 'string'
            ? dataObj['userId']
            : undefined;
      const orderIds = Array.isArray(rawPayload['orderIds'])
        ? rawPayload['orderIds'].map(id => String(id))
        : Array.isArray(dataObj['orderIds'])
          ? dataObj['orderIds'].map(id => String(id))
          : undefined;

      const normalizedEvent: RealtimeDomainEvent = {
        eventId,
        event: rawEventName,
        domain,
        action,
        origin,
        senderTabId: senderTabId || origin,
        courierId,
        userId,
        orderIds,
        data: dataObj,
        timestamp:
          typeof rawPayload['timestamp'] === 'string'
            ? rawPayload['timestamp']
            : new Date().toISOString()
      };

      this.lastEvent.set(normalizedEvent);
      this.domainEventsSubject.next(normalizedEvent);
      return normalizedEvent;
    } catch {
      return null;
    }
  }

  /**
   * Cleans up connections and event listeners when the service is destroyed.
   */
  ngOnDestroy(): void {
    try {
      this.disconnect();
      if (this.broadcastChannel) {
        this.broadcastChannel.close();
        this.broadcastChannel = null;
      }
      if (this.storageListener && typeof window !== 'undefined') {
        window.removeEventListener('storage', this.storageListener);
        this.storageListener = null;
      }
    } catch {
      return;
    }
  }

  /**
   * Initializes BroadcastChannel and window storage listeners for instant cross-tab sync.
   */
  private initializeCrossTabListeners(): void {
    try {
      if (typeof BroadcastChannel !== 'undefined' && !this.broadcastChannel) {
        this.broadcastChannel = new BroadcastChannel('dgl_despulpadora_realtime_v1');
        this.broadcastChannel.onmessage = (msgEvent: MessageEvent<Record<string, unknown>>) => {
          try {
            if (msgEvent?.data && typeof msgEvent.data === 'object') {
              this.handleIncomingRawEvent(msgEvent.data, 'cross-tab');
            }
          } catch {
            return;
          }
        };
      }

      if (typeof window !== 'undefined' && !this.storageListener) {
        this.storageListener = (storageEvent: StorageEvent): void => {
          try {
            if (!storageEvent.key || !storageEvent.newValue) {
              return;
            }
            if (storageEvent.key === 'despulpadora_realtime_last_event_v1') {
              const parsed = JSON.parse(storageEvent.newValue) as Record<string, unknown>;
              this.handleIncomingRawEvent(parsed, 'cross-tab');
              return;
            }
            const mappedDomain = this.mapStorageKeyToDomain(storageEvent.key);
            if (mappedDomain) {
              this.handleIncomingRawEvent(
                {
                  eventId: `storage_${storageEvent.key}_${Date.now()}`,
                  event: `${mappedDomain}_storage_sync`,
                  domain: mappedDomain,
                  action: 'storage_sync',
                  storageKey: storageEvent.key,
                  timestamp: new Date().toISOString()
                },
                'cross-tab'
              );
            }
          } catch {
            return;
          }
        };
        window.addEventListener('storage', this.storageListener);
      }
    } catch {
      return;
    }
  }

  /**
   * Connects to the backend SignalR Hub (/hubs/operations) with automatic exponential reconnect.
   */
  private connectSignalRHub(): void {
    try {
      if (
        this.hubConnection &&
        (this.hubConnection.state === HubConnectionState.Connected ||
          this.hubConnection.state === HubConnectionState.Connecting ||
          this.hubConnection.state === HubConnectionState.Reconnecting)
      ) {
        return;
      }

      const baseUrl = environment.apiUrl.replace(/\/api\/?$/, '');
      const hubUrl = `${baseUrl}/hubs/operations`;

      this.hubConnection = new HubConnectionBuilder()
        .withUrl(hubUrl, {
          accessTokenFactory: () => this.getActiveAccessToken()
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
        .configureLogging(LogLevel.Warning)
        .build();

      const hubEvents: Array<{ name: string; domain: RealtimeDomainType; event: string }> = [
        { name: 'DomainEvent', domain: 'all', event: 'domain_updated' },
        { name: 'ParametersUpdated', domain: 'parameters', event: 'parameters_updated' },
        { name: 'InventoryUpdated', domain: 'inventory', event: 'inventory_updated' },
        { name: 'OrdersUpdated', domain: 'orders', event: 'order_updated' },
        { name: 'OrderCreated', domain: 'orders', event: 'order_created' },
        { name: 'OrderStatusChanged', domain: 'orders', event: 'order_status_changed' },
        { name: 'OrderPriorityChanged', domain: 'orders', event: 'order_priority_changed' },
        { name: 'RoutesUpdated', domain: 'routes', event: 'route_updated' },
        { name: 'RouteDispatched', domain: 'routes', event: 'route_dispatched' },
        { name: 'UsersUpdated', domain: 'users', event: 'user_updated' },
        { name: 'CourierUpdated', domain: 'users', event: 'courier_updated' },
        { name: 'ShiftsUpdated', domain: 'shifts', event: 'shift_updated' },
        {
          name: 'CourierLocationUpdated',
          domain: 'courier_location',
          event: 'courier_location_update'
        }
      ];

      for (const descriptor of hubEvents) {
        this.hubConnection.on(descriptor.name, (payload: unknown) => {
          try {
            const payloadRecord: Record<string, unknown> =
              payload && typeof payload === 'object'
                ? (payload as Record<string, unknown>)
                : { value: payload };
            this.handleIncomingRawEvent(
              {
                ...payloadRecord,
                event:
                  typeof payloadRecord['event'] === 'string'
                    ? payloadRecord['event']
                    : descriptor.event,
                domain:
                  typeof payloadRecord['domain'] === 'string'
                    ? payloadRecord['domain']
                    : descriptor.domain
              },
              'signalr'
            );
          } catch {
            return;
          }
        });
      }

      this.hubConnection.onreconnected(() => {
        this.isSignalRConnected.set(true);
        this.updateConnectionSignals();
        this.handleIncomingRawEvent(
          {
            event: 'reconnected_sync',
            domain: 'all',
            action: 'reconnected'
          },
          'signalr'
        );
      });

      this.hubConnection.onreconnecting(() => {
        this.isSignalRConnected.set(false);
        this.updateConnectionSignals();
      });

      this.hubConnection.onclose(() => {
        this.isSignalRConnected.set(false);
        this.updateConnectionSignals();
      });

      void this.hubConnection
        .start()
        .then(() => {
          this.isSignalRConnected.set(true);
          this.updateConnectionSignals();
        })
        .catch(() => {
          this.isSignalRConnected.set(false);
          this.updateConnectionSignals();
        });
    } catch {
      this.isSignalRConnected.set(false);
      this.updateConnectionSignals();
    }
  }

  /**
   * Connects to the continuous WebSocket endpoint (/ws) shared with the Flutter courier app.
   */
  private connectWebSocketStream(): void {
    try {
      if (typeof WebSocket === 'undefined') {
        return;
      }
      if (
        this.webSocket &&
        (this.webSocket.readyState === WebSocket.OPEN ||
          this.webSocket.readyState === WebSocket.CONNECTING)
      ) {
        return;
      }

      const baseHttpUrl = environment.apiUrl.replace(/\/api\/?$/, '');
      const wsBaseUrl = baseHttpUrl.replace(/^http/, 'ws');
      const token = this.getActiveAccessToken();
      const query = token
        ? `?clientType=pwa&token=${encodeURIComponent(token)}`
        : '?clientType=pwa';
      const wsUrl = `${wsBaseUrl}/ws${query}`;

      this.webSocket = new WebSocket(wsUrl);

      this.webSocket.onopen = (): void => {
        try {
          this.isWebSocketConnected.set(true);
          this.updateConnectionSignals();
          this.startWebSocketHeartbeat();
          this.webSocket?.send(
            JSON.stringify({
              event: 'subscribe_pwa',
              clientType: 'pwa',
              senderTabId: this.tabId,
              timestamp: new Date().toISOString()
            })
          );
        } catch {
          return;
        }
      };

      this.webSocket.onmessage = (event: MessageEvent<string>): void => {
        try {
          if (typeof event.data !== 'string' || !event.data.trim()) {
            return;
          }
          const parsed = JSON.parse(event.data) as Record<string, unknown>;
          this.handleIncomingRawEvent(parsed, 'websocket');
        } catch {
          return;
        }
      };

      this.webSocket.onerror = (): void => {
        this.isWebSocketConnected.set(false);
        this.updateConnectionSignals();
      };

      this.webSocket.onclose = (): void => {
        this.isWebSocketConnected.set(false);
        this.updateConnectionSignals();
        this.scheduleWebSocketReconnect();
      };
    } catch {
      this.isWebSocketConnected.set(false);
      this.updateConnectionSignals();
    }
  }

  /**
   * Schedules an automatic WebSocket reconnection attempt after 5 seconds.
   */
  private scheduleWebSocketReconnect(): void {
    try {
      if (this.isKarmaTestEnvironment()) {
        return;
      }
      if (this.wsReconnectTimer) {
        clearTimeout(this.wsReconnectTimer);
      }
      this.wsReconnectTimer = setTimeout(() => {
        this.connectWebSocketStream();
      }, 5000);
    } catch {
      return;
    }
  }

  /**
   * Starts a 25-second ping heartbeat to keep the WebSocket connection alive through proxies.
   */
  private startWebSocketHeartbeat(): void {
    try {
      if (this.wsPingInterval) {
        clearInterval(this.wsPingInterval);
      }
      this.wsPingInterval = setInterval(() => {
        try {
          if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
            this.webSocket.send(
              JSON.stringify({
                event: 'ping',
                timestamp: new Date().toISOString()
              })
            );
          }
        } catch {
          return;
        }
      }, 25000);
    } catch {
      return;
    }
  }

  /**
   * Sends a domain event over the WebSocket (/ws) stream if open.
   */
  private sendOverWebSocket(domainEvent: RealtimeDomainEvent): void {
    try {
      if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
        this.webSocket.send(
          JSON.stringify({
            eventId: domainEvent.eventId,
            event: domainEvent.event,
            domain: domainEvent.domain,
            action: domainEvent.action,
            senderTabId: domainEvent.senderTabId,
            courierId: domainEvent.courierId,
            userId: domainEvent.userId,
            orderIds: domainEvent.orderIds,
            data: domainEvent.data ?? {},
            timestamp: domainEvent.timestamp
          })
        );
      }
    } catch {
      return;
    }
  }

  /**
   * Sends a domain event over the SignalR Hub connection if connected.
   */
  private sendOverSignalR(domainEvent: RealtimeDomainEvent): void {
    try {
      if (this.hubConnection && this.hubConnection.state === HubConnectionState.Connected) {
        void this.hubConnection.invoke('BroadcastDomainEvent', domainEvent).catch(() => undefined);
      }
    } catch {
      return;
    }
  }

  /**
   * Updates the aggregate connection and transport mode signals.
   */
  private updateConnectionSignals(): void {
    try {
      const signalR = this.isSignalRConnected();
      const ws = this.isWebSocketConnected();
      this.isConnected.set(signalR || ws || this.broadcastChannel !== null);
      if (signalR) {
        this.transportMode.set('signalr');
      } else if (ws) {
        this.transportMode.set('websocket');
      } else {
        this.transportMode.set('broadcast');
      }
    } catch {
      return;
    }
  }

  /**
   * Resolves the standardized event name used by both the PWA and the Flutter courier app.
   */
  private resolveDefaultEventName(domain: RealtimeDomainType, action: string): string {
    try {
      switch (domain) {
        case 'routes':
          return action === 'dispatch' ? 'route_dispatched' : 'route_updated';
        case 'orders':
          if (action === 'priority') {
            return 'order_priority_changed';
          }
          if (action === 'status') {
            return 'order_status_changed';
          }
          return 'order_updated';
        case 'users':
          return action === 'courier' ? 'courier_updated' : 'user_updated';
        case 'inventory':
          return 'inventory_updated';
        case 'parameters':
          return 'parameters_updated';
        case 'shifts':
          return 'shift_updated';
        case 'courier_location':
          return 'courier_location_update';
        default:
          return 'domain_updated';
      }
    } catch {
      return 'domain_updated';
    }
  }

  /**
   * Infers the domain category from an incoming event name or explicit domain property.
   */
  private inferDomainFromEvent(eventName: string, rawDomain: unknown): RealtimeDomainType {
    try {
      const explicit = typeof rawDomain === 'string' ? rawDomain.toLowerCase() : '';
      if (
        explicit === 'parameters' ||
        explicit === 'inventory' ||
        explicit === 'orders' ||
        explicit === 'routes' ||
        explicit === 'users' ||
        explicit === 'shifts' ||
        explicit === 'courier_location' ||
        explicit === 'all'
      ) {
        return explicit;
      }

      const normalized = eventName.toLowerCase();
      if (normalized.includes('location')) {
        return 'courier_location';
      }
      if (normalized.includes('route') || normalized.includes('dispatch')) {
        return 'routes';
      }
      if (normalized.includes('order') || normalized.includes('kds')) {
        return 'orders';
      }
      if (
        normalized.includes('inventory') ||
        normalized.includes('stock') ||
        normalized.includes('batch') ||
        normalized.includes('fruit') ||
        normalized.includes('variant')
      ) {
        return 'inventory';
      }
      if (
        normalized.includes('param') ||
        normalized.includes('payment') ||
        normalized.includes('grammage') ||
        normalized.includes('categor') ||
        normalized.includes('company')
      ) {
        return 'parameters';
      }
      if (
        normalized.includes('user') ||
        normalized.includes('courier') ||
        normalized.includes('role') ||
        normalized.includes('employee')
      ) {
        return 'users';
      }
      if (normalized.includes('shift')) {
        return 'shifts';
      }
      return 'all';
    } catch {
      return 'all';
    }
  }

  /**
   * Maps a localStorage key modified in another browser tab to its corresponding domain.
   */
  private mapStorageKeyToDomain(storageKey: string): RealtimeDomainType | null {
    try {
      switch (storageKey) {
        case 'despulpadora_fruits':
        case 'despulpadora_fruits_v4':
        case 'despulpadora_variants':
        case 'despulpadora_variants_v4':
        case 'despulpadora_batches':
        case 'despulpadora_batches_v4':
          return 'inventory';
        case 'despulpadora_orders':
        case 'despulpadora_orders_v4':
          return 'orders';
        case 'despulpadora_employees':
        case 'despulpadora_employees_v4':
        case 'dgl_users_v2':
        case 'despulpadora_users_v4':
        case 'dgl_roles_v2':
        case 'despulpadora_roles_v4':
          return 'users';
        case 'despulpadora_shifts':
        case 'despulpadora_shifts_v4':
          return 'shifts';
        case 'despulpadora_company_info':
        case 'despulpadora_company_v4':
        case 'despulpadora_payment_methods':
        case 'despulpadora_payment_methods_v4':
        case 'despulpadora_grammages_config':
        case 'despulpadora_grammages_config_v4':
        case 'despulpadora_categories_config':
        case 'despulpadora_categories_config_v4':
        case 'despulpadora_portal_cms_config':
        case 'despulpadora_portal_cms_v4':
          return 'parameters';
        default:
          return null;
      }
    } catch {
      return null;
    }
  }

  /**
   * Extracts a normalized CourierRealtimeLocationPayload from a raw WebSocket/SignalR payload.
   */
  private extractCourierLocation(
    data: Record<string, unknown>
  ): CourierRealtimeLocationPayload | null {
    try {
      const courierId =
        typeof data['courierId'] === 'string' || typeof data['courierId'] === 'number'
          ? String(data['courierId'])
          : '';
      const latitude = Number(data['latitude'] ?? data['lat']);
      const longitude = Number(data['longitude'] ?? data['lng']);

      if (!courierId || Number.isNaN(latitude) || Number.isNaN(longitude)) {
        return null;
      }

      return {
        courierId,
        courierName: typeof data['courierName'] === 'string' ? data['courierName'] : undefined,
        latitude,
        longitude,
        speedKmh: data['speedKmh'] !== undefined ? Number(data['speedKmh']) : undefined,
        batteryLevel: data['batteryLevel'] !== undefined ? Number(data['batteryLevel']) : undefined,
        heading: data['heading'] !== undefined ? Number(data['heading']) : undefined,
        timestamp:
          typeof data['timestamp'] === 'string' ? data['timestamp'] : new Date().toISOString()
      };
    } catch {
      return null;
    }
  }

  /**
   * Stores an event ID in a bounded set to prevent duplicate processing across transports.
   */
  private rememberEventId(eventId: string): void {
    try {
      this.processedEventIds.add(eventId);
      if (this.processedEventIds.size > 250) {
        const firstId = this.processedEventIds.values().next().value;
        if (firstId) {
          this.processedEventIds.delete(firstId);
        }
      }
    } catch {
      return;
    }
  }

  /**
   * Reads the active JWT access token from browser storage.
   */
  private getActiveAccessToken(): string {
    try {
      if (typeof localStorage === 'undefined') {
        return '';
      }
      return localStorage.getItem(`${environment.storagePrefix}token`) ?? '';
    } catch {
      return '';
    }
  }

  /**
   * Detects whether the code is running inside the Karma unit test runner.
   */
  private isKarmaTestEnvironment(): boolean {
    try {
      return typeof window !== 'undefined' && Boolean((window as WindowWithKarma).__karma__);
    } catch {
      return false;
    }
  }
}
