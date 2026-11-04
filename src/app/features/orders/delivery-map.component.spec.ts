import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { Courier, DeliveryMapComponent, DeliveryWaypoint } from './delivery-map.component';
import { StateService } from '../../core/services/state.service';
import { DEFAULT_COMPANY_CONFIG } from '../../core/data/initial-data';
import { NotificationService } from '../../core/services/notification.service';
import { GeocodingService } from '../../core/services/geocoding.service';
import { CompanyConfig, CourierDto, EmployeeDto, FruitConfig, OrderDto, UserAdminDto, UserRoleDto } from '../../core/models/business.models';

/**
 * Unit tests for DeliveryMapComponent verifying empty initial stops, dynamic couriers, and zeroed form defaults.
 */
describe('DeliveryMapComponent', () => {
  let component: DeliveryMapComponent;
  let fixture: ComponentFixture<DeliveryMapComponent>;
  let createOrderSpy: jasmine.Spy;
  let updateOrderStatusSpy: jasmine.Spy;
  let dispatchCourierRouteSpy: jasmine.Spy;
  let settleCourierRouteSpy: jasmine.Spy;
  let fetchLiveCouriersSpy: jasmine.Spy;
  let geocodeBestMatchSpy: jasmine.Spy;

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
  const mockUsers = signal<UserAdminDto[]>([]);
  const mockRoles = signal<UserRoleDto[]>([]);
  const mockOrders = signal<OrderDto[]>([]);

  const mockCompanyInfo = signal<CompanyConfig>({
    ...DEFAULT_COMPANY_CONFIG,
    companyName: 'Despulpadora Cundinamarca',
    nit: '900123456-7'
  });

  beforeEach(async () => {
    localStorage.removeItem('despulpadora_plant_coords_v1');
    mockEmployees.set([]);
    mockUsers.set([]);
    mockRoles.set([]);
    mockOrders.set([]);
    mockCompanyInfo.set({
      ...DEFAULT_COMPANY_CONFIG,
      companyName: 'Despulpadora Cundinamarca',
      nit: '900123456-7'
    });

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
    dispatchCourierRouteSpy = jasmine.createSpy('dispatchCourierRoute');
    settleCourierRouteSpy = jasmine.createSpy('settleCourierRoute');
    fetchLiveCouriersSpy = jasmine.createSpy('fetchLiveCouriers').and.returnValue(of([]));

    const stateServiceMock: Partial<StateService> = {
      fruits: mockFruits,
      employees: mockEmployees,
      users: mockUsers,
      roles: mockRoles,
      orders: mockOrders,
      companyInfo: mockCompanyInfo,
      createOrder: createOrderSpy,
      updateOrderStatus: updateOrderStatusSpy,
      dispatchCourierRoute: dispatchCourierRouteSpy,
      settleCourierRoute: settleCourierRouteSpy,
      fetchLiveCouriers: fetchLiveCouriersSpy,
      setOrderPriority: jasmine.createSpy('setOrderPriority')
    };

    const notificationMock: Partial<NotificationService> = {
      success: jasmine.createSpy('success'),
      warning: jasmine.createSpy('warning'),
      error: jasmine.createSpy('error'),
      info: jasmine.createSpy('info')
    };

    geocodeBestMatchSpy = jasmine.createSpy('geocodeBestMatch').and.returnValue(Promise.resolve(null));

    const geocodingMock: Partial<GeocodingService> = {
      detectBogotaZone: jasmine.createSpy('detectBogotaZone').and.returnValue('Chapinero'),
      geocodeBestMatch: geocodeBestMatchSpy,
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

  it('should populate couriers strictly from active courier users in StateService and ignore HR DOMICILIOS employees not created as users', () => {
    mockEmployees.set([
      {
        id: 7,
        employeeId: 7,
        firstName: 'Sandra',
        lastName: 'Nómina',
        fullName: 'Sandra Nómina',
        name: 'Sandra Nómina',
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
    mockUsers.set([
      {
        userId: 6,
        username: 'domSebalas',
        fullName: 'Camilo Repartidor',
        roleId: 3,
        roleName: 'Domiciliario',
        isActive: true,
        companyId: 1,
        branches: [],
        email: 'camilo@dgl.com',
        phone: '3112223344'
      }
    ]);
    component.refreshDeliveriesFromOrders();
    expect(component.couriers().length).toBe(1);
    expect(component.couriers()[0].name).toBe('Camilo Repartidor');
    expect(component.couriers().some(c => c.name.toLowerCase().includes('sandra'))).toBeFalse();
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
    expect(component.deliveryStops()[0].lat).toBe(component.plantLocation().lat);
    expect(component.deliveryStops()[0].lng).toBe(component.plantLocation().lng);
  });
  it('should render the fullscreen fab in bottom-left corner when map is in locked mode', () => {
    component.mapViewMode.set('locked');
    fixture.detectChanges();
    const fab = fixture.nativeElement.querySelector('.map-fullscreen-fab');
    expect(fab).toBeTruthy();
    spyOn(component, 'toggleMapFullscreen');
    fab.click();
    expect(component.toggleMapFullscreen).toHaveBeenCalled();
  });

  it('should dynamically populate couriers from active users with isCourier role', () => {
    mockRoles.set([
      { roleId: 9, name: 'Repartidor VIP', isCourier: true, isSystemRole: false, isActive: true }
    ]);
    mockUsers.set([
      {
        userId: 77,
        username: 'repartidor.vip',
        fullName: 'Andres Repartidor',
        roleId: 9,
        roleName: 'Repartidor VIP',
        isActive: true,
        companyId: 1,
        branches: [],
        email: 'andres@example.com'
      }
    ]);

    (component as unknown as { syncCouriersFromEmployees: () => void }).syncCouriersFromEmployees();

    expect(component.couriers().length).toBe(1);
    expect(component.couriers()[0].id).toBe('u77');
    expect(component.couriers()[0].name).toBe('Andres Repartidor');
  });

  it('should show Crear Ruta button when courier has assigned stops, open confirmation dialog, lock stop cards in light gray on confirm, and switch button to Editar', () => {
    mockRoles.set([
      { roleId: 9, name: 'Repartidor VIP', isCourier: true, isSystemRole: false, isActive: true }
    ]);
    mockUsers.set([
      {
        userId: 77,
        username: 'repartidor.vip',
        fullName: 'Andres Repartidor',
        roleId: 9,
        roleName: 'Repartidor VIP',
        isActive: true,
        companyId: 1,
        branches: [],
        email: 'andres@example.com'
      }
    ]);
    mockOrders.set([
      {
        orderId: 501,
        orderNumber: 'ORD-501',
        clientId: 1,
        clientName: 'Cafeteria Central',
        clientAddress: 'Calle 85 # 15-10',
        branchId: 1,
        status: 'BILLED',
        isBilled: true,
        isPaid: false,
        totalAmount: 42000,
        createdAt: new Date().toISOString(),
        orderDate: new Date().toISOString().substring(0, 10),
        items: []
      }
    ]);

    component.enterAllDeliveriesMode();
    fixture.detectChanges();

    component.assignCourierToStop(501, 'u77');
    fixture.detectChanges();

    const routeCodeBadge = fixture.nativeElement.querySelector('.deliveries-drawer .dcr-route-code') as HTMLElement;
    expect(routeCodeBadge).toBeTruthy();
    expect(routeCodeBadge.textContent?.trim()).toBe('RUT-77');

    const createBtn = fixture.nativeElement.querySelector('.deliveries-drawer .btn-create-courier-route') as HTMLButtonElement;
    expect(createBtn).toBeTruthy();
    expect(createBtn.textContent?.trim()).toBe('Crear Ruta');

    createBtn.click();
    fixture.detectChanges();

    expect(component.showConfirmCreateRouteModal()).toBeTrue();
    const confirmModal = fixture.nativeElement.querySelector('.confirm-route-modal') as HTMLElement;
    expect(confirmModal).toBeTruthy();

    const confirmYesBtn = confirmModal.querySelector('.btn-confirm-create-route') as HTMLButtonElement;
    confirmYesBtn.click();
    fixture.detectChanges();

    expect(component.showConfirmCreateRouteModal()).toBeFalse();
    expect(dispatchCourierRouteSpy).toHaveBeenCalledWith({
      courierId: 77,
      courierName: 'Andres Repartidor',
      routeCode: 'RUT-77',
      orderIds: [501]
    });

    const stopCard = fixture.nativeElement.querySelector('.drawer-stop-item') as HTMLElement;
    expect(stopCard.classList.contains('is-route-locked')).toBeTrue();
    expect(stopCard.getAttribute('draggable')).toBe('false');

    const editBtn = fixture.nativeElement.querySelector('.deliveries-drawer .btn-edit-courier-route') as HTMLButtonElement;
    expect(editBtn).toBeTruthy();
    expect(editBtn.textContent?.trim()).toBe('Editar');

    editBtn.click();
    fixture.detectChanges();

    expect(stopCard.classList.contains('is-route-locked')).toBeFalse();
    const restoredCreateBtn = fixture.nativeElement.querySelector('.deliveries-drawer .btn-create-courier-route') as HTMLButtonElement;
    expect(restoredCreateBtn).toBeTruthy();
    expect(restoredCreateBtn.textContent?.trim()).toBe('Actualizar');

    const lockBtn = fixture.nativeElement.querySelector('.map-unlocked-mode-bar .unlocked-mode-close') as HTMLButtonElement;
    expect(lockBtn).toBeTruthy();
    expect(lockBtn.querySelector('svg.lock-btn-icon')).toBeTruthy();
    expect(lockBtn.querySelector('.lock-btn-label')?.textContent?.trim()).toBe('Bloquear');
  });

  it('should update courier live coordinates and stop status in real time via RealtimeSyncService without page reload', () => {
    mockRoles.set([
      { roleId: 9, name: 'Repartidor VIP', isCourier: true, isSystemRole: false, isActive: true }
    ]);
    mockUsers.set([
      {
        userId: 77,
        username: 'repartidor.vip',
        fullName: 'Andres Repartidor',
        roleId: 9,
        roleName: 'Repartidor VIP',
        isActive: true,
        companyId: 1,
        branches: [],
        email: 'andres@example.com'
      }
    ]);
    fixture.detectChanges();

    component.realtimeSync.handleIncomingRawEvent(
      {
        eventId: 'ws_loc_77',
        event: 'courier_location_update',
        data: {
          courierId: 'u77',
          latitude: 4.711,
          longitude: -74.0721,
          speedKmh: 34,
          batteryLevel: 92,
          timestamp: new Date().toISOString()
        }
      },
      'websocket'
    );

    const updatedCourier = component.couriers().find(c => c.id === 'u77');
    expect(updatedCourier).toBeTruthy();
    expect(updatedCourier?.lat).toBeCloseTo(4.711, 3);
    expect(updatedCourier?.lng).toBeCloseTo(-74.0721, 3);
    expect(updatedCourier?.currentSpeedKmH).toBe(34);
    expect(updatedCourier?.batteryPct).toBe(92);
  });

  it('should geocode and sync plant marker coordinates and labels from configured company address and city', async () => {
    geocodeBestMatchSpy.and.returnValue(
      Promise.resolve({
        lat: 4.6584,
        lng: -74.1292,
        zone: 'Fontibón',
        displayName: 'Carrera 69L # 64D-50, Bogotá'
      })
    );

    mockCompanyInfo.set({
      ...DEFAULT_COMPANY_CONFIG,
      companyName: 'DGL Despulpadora',
      address: 'Carrera 69L # 64D-50',
      city: 'Bogotá D.C.',
      department: 'Cundinamarca'
    });

    await component.syncPlantLocationFromCompanyInfo();

    expect(geocodeBestMatchSpy).toHaveBeenCalledWith('Carrera 69L # 64D-50, Bogotá D.C.');
    expect(component.plantLat()).toBeCloseTo(4.6584, 4);
    expect(component.plantLng()).toBeCloseTo(-74.1292, 4);
    expect(component.plantDisplayTitle()).toBe('DGL Despulpadora');
    expect(component.plantDisplayAddress()).toBe('Carrera 69L # 64D-50 · Bogotá D.C. · Cundinamarca');
  });

  it('should open confirmation dialog when assigning a billed order to a courier who already has an active route and dispatch updated route on confirm', () => {
    mockRoles.set([
      { roleId: 9, name: 'Repartidor VIP', isCourier: true, isSystemRole: false, isActive: true }
    ]);
    mockUsers.set([
      {
        userId: 77,
        username: 'repartidor.vip',
        fullName: 'Andres Repartidor',
        roleId: 9,
        roleName: 'Repartidor VIP',
        isActive: true,
        companyId: 1,
        branches: [],
        email: 'andres@example.com'
      }
    ]);
    mockOrders.set([
      {
        orderId: 501,
        orderNumber: 'ORD-501',
        clientId: 1,
        clientName: 'Cafeteria Central',
        clientAddress: 'Calle 85 # 15-10',
        branchId: 1,
        status: 'BILLED',
        isBilled: true,
        isPaid: false,
        totalAmount: 42000,
        createdAt: new Date().toISOString(),
        orderDate: new Date().toISOString().substring(0, 10),
        items: []
      },
      {
        orderId: 502,
        orderNumber: 'ORD-502',
        clientId: 2,
        clientName: 'Restaurante Norte',
        clientAddress: 'Calle 100 # 20-30',
        branchId: 1,
        status: 'BILLED',
        isBilled: true,
        isPaid: false,
        totalAmount: 65000,
        createdAt: new Date().toISOString(),
        orderDate: new Date().toISOString().substring(0, 10),
        items: []
      }
    ]);

    component.enterAllDeliveriesMode();
    fixture.detectChanges();

    component.assignCourierToStop(501, 'u77');
    component.openConfirmCreateRouteModal('u77');
    component.confirmCreateCourierRoute();
    fixture.detectChanges();

    const secondStop = component.deliveryStops().find(s => s.id === 502)!;
    expect(secondStop).toBeTruthy();

    component.onCourierSelectChange(secondStop, 'u77');
    fixture.detectChanges();

    expect(component.showConfirmAssignToActiveRouteModal()).toBeTrue();
    const updateModal = fixture.nativeElement.querySelector('.confirm-update-active-route-modal') as HTMLElement;
    expect(updateModal).toBeTruthy();
    expect(updateModal.textContent).toContain('RUT-77');
    expect(updateModal.textContent).toContain('ORD-502');

    const confirmUpdateBtn = updateModal.querySelector('.btn-confirm-update-active-route') as HTMLButtonElement;
    confirmUpdateBtn.click();
    fixture.detectChanges();

    expect(component.showConfirmAssignToActiveRouteModal()).toBeFalse();
    expect(dispatchCourierRouteSpy).toHaveBeenCalledWith({
      courierId: 77,
      courierName: 'Andres Repartidor',
      routeCode: 'RUT-77',
      orderIds: [501, 502]
    });
  });

  it('should disable synthetic simulation in enterLiveMapMode and sync real Flutter GPS coordinates from fetchLiveCouriers', () => {
    mockRoles.set([
      { roleId: 3, name: 'Domiciliario', isCourier: true, isSystemRole: true, isActive: true }
    ]);
    mockUsers.set([
      {
        userId: 6,
        username: 'sebas',
        fullName: 'sebas domiciliario',
        roleId: 3,
        roleName: 'Domiciliario',
        isActive: true,
        companyId: 1,
        branches: [],
        email: 'sebas@dgl.com',
        phone: '3208992341'
      }
    ]);
    fixture.detectChanges();

    const initialCourier = component.couriers().find(c => c.id === 'u6');
    expect(initialCourier).toBeTruthy();
    expect(initialCourier?.currentSpeedKmH).toBe(0);

    const liveCouriersFromApi: CourierDto[] = [
      {
        id: 1,
        name: 'sebas domiciliario',
        fullName: 'sebas domiciliario',
        phone: '3208992341',
        vehiclePlate: 'FTR-98G',
        zone: 'Bogotá',
        status: 'EnRuta',
        currentLatitude: 4.64829,
        currentLongitude: -74.10245,
        activeOrdersCount: 1,
        responsibleUserId: 6
      }
    ];
    fetchLiveCouriersSpy.and.returnValue(of(liveCouriersFromApi));

    component.enterLiveMapMode();

    expect(component.mapViewMode()).toBe('live');
    expect(component.isSimulating()).toBeFalse();
    expect(fetchLiveCouriersSpy).toHaveBeenCalled();

    const updatedCourier = component.couriers().find(c => c.id === 'u6');
    expect(updatedCourier?.lat).toBeCloseTo(4.64829, 4);
    expect(updatedCourier?.lng).toBeCloseTo(-74.10245, 4);
    expect(updatedCourier?.vehiclePlate).toBe('FTR-98G');
  });

  it('should remove completed delivery markers and route segments from the map while preserving settlement counters', async () => {
    mockRoles.set([
      { roleId: 3, name: 'Domiciliario', isCourier: true, isSystemRole: true, isActive: true }
    ]);
    mockUsers.set([
      {
        userId: 88,
        username: 'domsebalas',
        fullName: 'Sebas Domiciliario',
        roleId: 3,
        roleName: 'Domiciliario',
        isActive: true,
        companyId: 1,
        branches: [],
        email: 'sebas@dgl.com',
        phone: '3109998877'
      }
    ]);
    mockOrders.set([
      {
        orderId: 601,
        orderNumber: 'ORD-601',
        clientId: 1,
        clientName: 'Adriana Redondo',
        clientAddress: 'Centro Mayor',
        latitude: 4.5921,
        longitude: -74.1241,
        branchId: 1,
        status: 'DISPATCHED',
        isBilled: true,
        isPaid: false,
        courierId: 88,
        courierName: 'Sebas Domiciliario',
        routeSequenceOrder: 1,
        totalAmount: 2000,
        createdAt: new Date().toISOString(),
        orderDate: new Date().toISOString().substring(0, 10),
        items: []
      },
      {
        orderId: 602,
        orderNumber: 'ORD-602',
        clientId: 2,
        clientName: 'Sebastian Salamanca',
        clientAddress: 'Cra 69L # 64D-50',
        latitude: 4.6685,
        longitude: -74.1125,
        branchId: 1,
        status: 'DISPATCHED',
        isBilled: true,
        isPaid: false,
        courierId: 88,
        courierName: 'Sebas Domiciliario',
        routeSequenceOrder: 2,
        totalAmount: 14000,
        createdAt: new Date().toISOString(),
        orderDate: new Date().toISOString().substring(0, 10),
        items: []
      }
    ]);

    spyOn(
      component as unknown as {
        getRoadSegment: (lat1: number, lng1: number, lat2: number, lng2: number) => Promise<[number, number][]>;
      },
      'getRoadSegment'
    ).and.callFake((lat1: number, lng1: number, lat2: number, lng2: number) =>
      Promise.resolve([
        [lat1, lng1],
        [lat2, lng2]
      ])
    );

    component.enterAllDeliveriesMode();
    fixture.detectChanges();
    await fixture.whenStable();

    const stopMarkersMap = (component as unknown as { stopMarkers: Map<number, unknown> }).stopMarkers;
    const courierMarkersMap = (component as unknown as { courierMarkers: Map<string, unknown> }).courierMarkers;
    expect(stopMarkersMap.has(601)).toBeTrue();
    expect(stopMarkersMap.has(602)).toBeTrue();
    expect(courierMarkersMap.has('u88')).toBeTrue();

    mockOrders.update(list => list.map(o => (o.orderNumber === 'ORD-601' ? { ...o, status: 'DELIVERED' } : o)));
    component.markOrderDeliveredByOrderNumber('ORD-601');
    await component.buildAndRenderRealRoadRoutes();

    expect(stopMarkersMap.has(601)).toBeFalse();
    expect(stopMarkersMap.has(602)).toBeTrue();
    expect(courierMarkersMap.has('u88')).toBeTrue();

    const courier = component.couriers().find(c => c.id === 'u88')!;
    expect(component.getCourierCompletedStops(courier)).toBe(1);
    expect(component.isCourierReadyToReceive(courier)).toBeFalse();

    mockOrders.update(list => list.map(o => (o.orderNumber === 'ORD-602' ? { ...o, status: 'DELIVERED' } : o)));
    component.markOrderDeliveredByOrderNumber('ORD-602');
    await component.buildAndRenderRealRoadRoutes();

    expect(stopMarkersMap.has(602)).toBeFalse();
    expect(courierMarkersMap.has('u88')).toBeFalse();
    const courierFullRoadPaths = (component as unknown as { courierFullRoadPaths: Map<string, [number, number][]> }).courierFullRoadPaths;
    expect(courierFullRoadPaths.get('u88')).toEqual([]);
    expect(component.getCourierCompletedStops(courier)).toBe(2);
    expect(component.isCourierReadyToReceive(courier)).toBeTrue();
  });

  it('should not render courier location marker on map when courier has no assigned stops', () => {
    mockRoles.set([
      { roleId: 3, name: 'Domiciliario', isCourier: true, isSystemRole: true, isActive: true }
    ]);
    mockUsers.set([
      {
        userId: 6,
        username: 'sebas',
        fullName: 'sebas domiciliario',
        roleId: 3,
        roleName: 'Domiciliario',
        isActive: true,
        companyId: 1,
        branches: [],
        email: 'sebas@dgl.com',
        phone: '3208992341'
      }
    ]);
    mockOrders.set([]);
    fixture.detectChanges();

    const courierMarkersMap = (component as unknown as { courierMarkers: Map<string, unknown> }).courierMarkers;
    expect(courierMarkersMap.has('u6')).toBeFalse();
  });

  it('should dispatch planned route to backend API when applyPlannedRoute is called', () => {
    mockRoles.set([
      { roleId: 9, name: 'Repartidor VIP', isCourier: true, isSystemRole: false, isActive: true }
    ]);
    mockUsers.set([
      {
        userId: 77,
        username: 'repartidor.vip',
        fullName: 'Andres Repartidor',
        roleId: 9,
        roleName: 'Repartidor VIP',
        isActive: true,
        companyId: 1,
        branches: [],
        email: 'andres@example.com'
      }
    ]);
    mockOrders.set([
      {
        orderId: 701,
        orderNumber: 'ORD-701',
        clientId: 1,
        clientName: 'Cliente Ruta 1',
        clientAddress: 'Calle 85 # 15-10',
        branchId: 1,
        status: 'BILLED',
        isBilled: true,
        isPaid: false,
        totalAmount: 42000,
        createdAt: new Date().toISOString(),
        orderDate: new Date().toISOString().substring(0, 10),
        items: []
      }
    ]);

    component.enterAllDeliveriesMode();
    fixture.detectChanges();

    component.assignCourierToStop(701, 'u77');
    component.activePlannerCourierId.set('u77');
    dispatchCourierRouteSpy.calls.reset();

    component.applyPlannedRoute();

    expect(dispatchCourierRouteSpy).toHaveBeenCalledWith({
      courierId: 77,
      courierName: 'Andres Repartidor',
      routeCode: 'RUT-77',
      orderIds: [701]
    });
  });

  it('should hide the priority button when the order is billed and show it when unbilled', () => {
    const todayIso: string = new Date().toISOString();
    mockOrders.set([
      {
        orderId: 801,
        orderNumber: 'ORD-801',
        clientId: 1,
        clientName: 'Cliente Pendiente',
        clientAddress: 'Calle 70 # 10-20',
        branchId: 1,
        status: 'PENDING',
        isBilled: false,
        isPaid: false,
        totalAmount: 25000,
        createdAt: todayIso,
        orderDate: todayIso.substring(0, 10),
        items: []
      },
      {
        orderId: 802,
        orderNumber: 'ORD-802',
        clientId: 2,
        clientName: 'Cliente Facturado',
        clientAddress: 'Carrera 69A # 63F-63',
        branchId: 1,
        status: 'BILLED',
        isBilled: true,
        isPaid: false,
        totalAmount: 20000,
        createdAt: todayIso,
        orderDate: todayIso.substring(0, 10),
        items: []
      }
    ]);

    component.deliveryStops.set([]);
    component.enterAllDeliveriesMode();
    component.showDeliveriesDrawer.set(true);
    fixture.detectChanges();

    const stopItems: NodeListOf<HTMLElement> =
      fixture.nativeElement.querySelectorAll('.drawer-stop-item');
    expect(stopItems.length).toBe(2);

    const billedCard: HTMLElement | undefined = Array.from(stopItems).find((el: HTMLElement) =>
      el.textContent?.includes('ORD-802')
    );
    const unbilledCard: HTMLElement | undefined = Array.from(stopItems).find((el: HTMLElement) =>
      el.textContent?.includes('ORD-801')
    );

    expect(billedCard).toBeDefined();
    expect(unbilledCard).toBeDefined();
    expect(billedCard?.querySelector('.drawer-stop-priority-btn')).toBeNull();
    expect(unbilledCard?.querySelector('.drawer-stop-priority-btn')).not.toBeNull();

    const billedStop = component.deliveryStops().find(s => s.id === 802)!;
    component.toggleStopPriority(billedStop, true);
    expect(component.isStopPriority(billedStop)).toBeFalse();
  });

  it('should only display orders from today weekday card in the map list and sync when scheduledDay changes', () => {
    const todayDayName: string = component.getCurrentWeekDayName();
    const otherDayName: string = todayDayName === 'Lunes' ? 'Martes' : 'Lunes';
    const todayIso: string = new Date().toISOString();

    mockOrders.set([
      {
        orderId: 901,
        orderNumber: 'ORD-901',
        clientId: 1,
        clientName: 'Cliente Hoy',
        clientAddress: 'Calle 100 # 15-20',
        branchId: 1,
        status: 'BILLED',
        isBilled: true,
        isPaid: false,
        totalAmount: 30000,
        scheduledDay: todayDayName,
        createdAt: todayIso,
        orderDate: todayIso.substring(0, 10),
        items: []
      },
      {
        orderId: 902,
        orderNumber: 'ORD-902',
        clientId: 2,
        clientName: 'Cliente Otro Dia',
        clientAddress: 'Calle 50 # 20-10',
        branchId: 1,
        status: 'BILLED',
        isBilled: true,
        isPaid: false,
        totalAmount: 45000,
        scheduledDay: otherDayName,
        createdAt: todayIso,
        orderDate: todayIso.substring(0, 10),
        items: []
      }
    ]);

    component.deliveryStops.set([]);
    component.enterAllDeliveriesMode();
    fixture.detectChanges();

    expect(component.deliveryStops().map(s => s.id)).toEqual([901]);
    expect(component.filteredDrawerStops().map(s => s.id)).toEqual([901]);

    mockOrders.set([
      {
        orderId: 901,
        orderNumber: 'ORD-901',
        clientId: 1,
        clientName: 'Cliente Hoy',
        clientAddress: 'Calle 100 # 15-20',
        branchId: 1,
        status: 'BILLED',
        isBilled: true,
        isPaid: false,
        totalAmount: 30000,
        scheduledDay: otherDayName,
        createdAt: todayIso,
        orderDate: todayIso.substring(0, 10),
        items: []
      },
      {
        orderId: 902,
        orderNumber: 'ORD-902',
        clientId: 2,
        clientName: 'Cliente Otro Dia',
        clientAddress: 'Calle 50 # 20-10',
        branchId: 1,
        status: 'BILLED',
        isBilled: true,
        isPaid: false,
        totalAmount: 45000,
        scheduledDay: todayDayName,
        createdAt: todayIso,
        orderDate: todayIso.substring(0, 10),
        items: []
      }
    ]);

    component.enterAllDeliveriesMode();
    fixture.detectChanges();

    expect(component.deliveryStops().map(s => s.id)).toEqual([902]);
    expect(component.filteredDrawerStops().map(s => s.id)).toEqual([902]);
  });

  it('should purge previously completed route stops when assigning and creating a new route for a courier so only the new stop is dispatched', () => {
    const todayIso: string = new Date().toISOString();
    mockRoles.set([
      { roleId: 3, name: 'Domiciliario', isCourier: true, isSystemRole: true, isActive: true }
    ]);
    mockUsers.set([
      {
        userId: 88,
        username: 'domsebalas',
        fullName: 'Sebas Domiciliario',
        roleId: 3,
        roleName: 'Domiciliario',
        isActive: true,
        companyId: 1,
        branches: [],
        email: 'sebas@dgl.com',
        phone: '3109998877'
      }
    ]);
    mockOrders.set([
      {
        orderId: 951,
        orderNumber: 'ORD-951',
        clientId: 1,
        clientName: 'Cliente Ruta Anterior 1',
        clientAddress: 'Calle 10 # 10-10',
        branchId: 1,
        status: 'DISPATCHED',
        isBilled: true,
        isPaid: false,
        courierId: 88,
        courierName: 'Sebas Domiciliario',
        routeSequenceOrder: 1,
        totalAmount: 15000,
        createdAt: todayIso,
        orderDate: todayIso.substring(0, 10),
        items: []
      },
      {
        orderId: 952,
        orderNumber: 'ORD-952',
        clientId: 2,
        clientName: 'Cliente Ruta Anterior 2',
        clientAddress: 'Calle 20 # 20-20',
        branchId: 1,
        status: 'DISPATCHED',
        isBilled: true,
        isPaid: false,
        courierId: 88,
        courierName: 'Sebas Domiciliario',
        routeSequenceOrder: 2,
        totalAmount: 18000,
        createdAt: todayIso,
        orderDate: todayIso.substring(0, 10),
        items: []
      },
      {
        orderId: 953,
        orderNumber: 'ORD-953',
        clientId: 3,
        clientName: 'Cliente Nueva Ruta',
        clientAddress: 'Calle 30 # 30-30',
        branchId: 1,
        status: 'BILLED',
        isBilled: true,
        isPaid: false,
        totalAmount: 25000,
        createdAt: todayIso,
        orderDate: todayIso.substring(0, 10),
        items: []
      }
    ]);

    component.deliveryStops.set([]);
    component.enterAllDeliveriesMode();
    fixture.detectChanges();

    mockOrders.update((list: OrderDto[]) =>
      list.map((o: OrderDto) =>
        o.orderId === 951 || o.orderId === 952 ? { ...o, status: 'DELIVERED' } : o
      )
    );
    component.markOrderDeliveredByOrderNumber('ORD-951');
    component.markOrderDeliveredByOrderNumber('ORD-952');

    const newStop: DeliveryWaypoint = component.deliveryStops().find(
      (s: DeliveryWaypoint) => s.id === 953
    )!;
    expect(newStop).toBeTruthy();

    dispatchCourierRouteSpy.calls.reset();
    component.onCourierSelectChange(newStop, 'u88');
    expect(component.showConfirmAssignToActiveRouteModal()).toBeFalse();

    const courierAfterAssign: Courier = component.couriers().find(
      (c: Courier) => c.id === 'u88'
    )!;
    expect(courierAfterAssign.orderIds).toEqual([953]);

    component.openConfirmCreateRouteModal('u88');
    component.confirmCreateCourierRoute();

    expect(dispatchCourierRouteSpy).toHaveBeenCalledWith({
      courierId: 88,
      courierName: 'Sebas Domiciliario',
      routeCode: 'RUT-88',
      orderIds: [953]
    });

    component.markOrderDeliveredByOrderNumber('ORD-953');
    const courierToSettle: Courier = component.couriers().find(
      (c: Courier) => c.id === 'u88'
    )!;
    component.openReceiveCourierModal(courierToSettle);
    component.physicalCashReceived.set(25000);
    component.receiveNotes.set('Liquidado');
    component.confirmSettlementAndReceive();

    expect(settleCourierRouteSpy).toHaveBeenCalledWith(88, 'Sebas Domiciliario', 25000, 0, 'Liquidado');
  });

  it('should hide the counter badge on the left floating courier icon when all stops are delivered and should not paint green route polylines on the PWA map', async () => {
    const todayIso: string = new Date().toISOString();
    mockRoles.set([
      { roleId: 9, name: 'Domiciliario', isCourier: true, isSystemRole: false, isActive: true }
    ]);
    mockUsers.set([
      {
        userId: 88,
        username: 'sebas.domi',
        fullName: 'Sebas Domiciliario',
        roleId: 9,
        roleName: 'Domiciliario',
        isActive: true,
        companyId: 1,
        branches: [],
        email: 'sebas@example.com'
      }
    ]);
    mockOrders.set([
      {
        orderId: 991,
        orderNumber: 'ORD-991',
        clientId: 1,
        clientName: 'Cliente Unico',
        clientAddress: 'Calle 10 # 10-10',
        branchId: 1,
        status: 'DISPATCHED',
        isBilled: true,
        isPaid: false,
        totalAmount: 30000,
        courierName: 'Sebas Domiciliario',
        createdAt: todayIso,
        orderDate: todayIso.substring(0, 10),
        items: []
      }
    ]);

    component.deliveryStops.set([]);
    component.enterLiveMapMode();
    fixture.detectChanges();

    const activeCourier: Courier = component.couriers().find((c: Courier) => c.id === 'u88')!;
    expect(activeCourier).toBeTruthy();
    expect(component.getCourierPendingStopsCount(activeCourier)).toBe(1);

    const fabBefore = fixture.nativeElement.querySelector('.courier-fab-item:not(.fab-planta)') as HTMLElement;
    expect(fabBefore).toBeTruthy();
    expect(fabBefore.querySelector('.fab-badge')?.textContent?.trim()).toBe('1');

    await component.buildAndRenderRealRoadRoutes();
    expect((component as unknown as { routePolylines: Map<string, unknown> }).routePolylines.size).toBe(0);
    expect((component as unknown as { routeCasingPolylines: Map<string, unknown> }).routeCasingPolylines.size).toBe(0);

    mockOrders.update((list: OrderDto[]) =>
      list.map((o: OrderDto) => (o.orderId === 991 ? { ...o, status: 'DELIVERED' } : o))
    );
    component.markOrderDeliveredByOrderNumber('ORD-991');
    fixture.detectChanges();

    const completedCourier: Courier = component.couriers().find((c: Courier) => c.id === 'u88')!;
    expect(component.getCourierPendingStopsCount(completedCourier)).toBe(0);

    const fabAfter = fixture.nativeElement.querySelector('.courier-fab-item:not(.fab-planta)') as HTMLElement;
    expect(fabAfter).toBeTruthy();
    expect(fabAfter.querySelector('.fab-badge')).toBeNull();
  });

  it('should enqueue an order into deliveryStops with isBilled false and open All Deliveries drawer when enqueueOrderForDeliveryAssignment is called', () => {
    const todayDayName: string = component.getCurrentWeekDayName();
    const orderPendingBilling: OrderDto = {
      orderId: 1008,
      orderNumber: 'ORD-0008',
      clientId: 20,
      clientName: 'sebastian salamanca redondo',
      clientPhone: '3102207910',
      clientAddress: 'cra 69L 64d - 50',
      branchId: 1,
      status: 'PICKING',
      isBilled: false,
      isPaid: false,
      totalAmount: 40000,
      scheduledDay: todayDayName,
      createdAt: '2026-10-15T10:00:00.000Z',
      orderDate: '2026-10-15',
      items: []
    };

    mockOrders.set([orderPendingBilling]);
    component.deliveryStops.set([]);

    component.enqueueOrderForDeliveryAssignment(orderPendingBilling);
    fixture.detectChanges();

    expect(component.mapViewMode()).toBe('stops');
    expect(component.showDeliveriesDrawer()).toBeTrue();
    expect(component.drawerCourierFilter()).toBe('all');
    expect(component.deliveryStops().length).toBe(1);
    expect(component.deliveryStops()[0].id).toBe(1008);
    expect(component.deliveryStops()[0].orderNumber).toBe('ORD-0008');
    expect(component.deliveryStops()[0].isBilled).toBeFalse();
    expect(component.filteredDrawerStops().map((s: DeliveryWaypoint) => s.orderNumber)).toContain('ORD-0008');
  });

  it('should reject the legacy hardcoded 4.69680, -74.09250 fallback coordinate and update live courier position only from real GPS telemetry', () => {
    const todayIso: string = new Date().toISOString();
    mockRoles.set([
      { roleId: 9, name: 'Domiciliario', isCourier: true, isSystemRole: false, isActive: true }
    ]);
    mockUsers.set([
      {
        userId: 88,
        username: 'sebas.domi',
        fullName: 'sebas domiciliario',
        roleId: 9,
        roleName: 'Domiciliario',
        isActive: true,
        companyId: 1,
        branches: [],
        email: 'sebas@example.com'
      }
    ]);
    mockOrders.set([
      {
        orderId: 995,
        orderNumber: 'ORD-995',
        clientId: 1,
        clientName: 'Cliente Ruta',
        clientAddress: 'Carrera 69L # 64D-50',
        branchId: 1,
        status: 'DISPATCHED',
        isBilled: true,
        isPaid: false,
        totalAmount: 35000,
        courierName: 'sebas domiciliario',
        createdAt: todayIso,
        orderDate: todayIso.substring(0, 10),
        items: []
      }
    ]);
    fixture.detectChanges();

    expect(component.isRealCourierGpsCoordinate(4.6968, -74.0925)).toBeFalse();
    expect(component.isRealCourierGpsCoordinate(0, 0)).toBeFalse();
    expect(component.isRealCourierGpsCoordinate(4.6584, -74.1292)).toBeTrue();

    fetchLiveCouriersSpy.and.returnValue(
      of([
        {
          id: 1,
          fullName: 'sebas domiciliario',
          vehiclePlate: '232323',
          phone: '3102207910',
          status: 'EnRuta',
          currentLatitude: 4.6968,
          currentLongitude: -74.0925
        } as CourierDto
      ])
    );

    component.enterLiveMapMode();

    const courierAfterLegacyPoll: Courier = component.couriers().find((c: Courier) => c.id === 'u88')!;
    expect(courierAfterLegacyPoll.lat).toBeCloseTo(component.plantLat(), 4);
    expect(courierAfterLegacyPoll.lng).toBeCloseTo(component.plantLng(), 4);

    fetchLiveCouriersSpy.and.returnValue(
      of([
        {
          id: 1,
          fullName: 'sebas domiciliario',
          vehiclePlate: '232323',
          phone: '3102207910',
          status: 'EnRuta',
          currentLatitude: 4.6612,
          currentLongitude: -74.1145
        } as CourierDto
      ])
    );

    component.pollRealCourierLocations();

    const courierAfterRealGps: Courier = component.couriers().find((c: Courier) => c.id === 'u88')!;
    expect(courierAfterRealGps.lat).toBeCloseTo(4.6612, 4);
    expect(courierAfterRealGps.lng).toBeCloseTo(-74.1145, 4);
    expect(courierAfterRealGps.vehiclePlate).toBe('232323');
    expect(courierAfterRealGps.status).toBe('en_ruta');
  });

  it('should forward latitude, longitude, and neighborhood when saving point as order on map', () => {
    component.newOrderLat.set(4.6782);
    component.newOrderLng.set(-74.0981);
    component.newOrderZone.set('Bosque Popular');
    component.newOrderClient = 'caldo parado';
    component.newOrderAddress = 'Avenida Calle 64C 69J, Bosque Popular, Bogotá';
    component.newOrderPhone = '3164953397';
    component.newOrderAmount = 9000;

    component.savePointAsOrder();

    expect(createOrderSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        clientName: 'caldo parado',
        clientAddress: 'Avenida Calle 64C 69J, Bosque Popular, Bogotá',
        neighborhood: 'Bosque Popular',
        latitude: 4.6782,
        longitude: -74.0981
      })
    );
  });

  it('should settle courier route with confirmed digital transfers and avoid redundant updateOrderStatus calls for stops already delivered in the mobile app', () => {
    const todayIso: string = new Date().toISOString();
    mockRoles.set([
      { roleId: 9, name: 'Domiciliario', isCourier: true, isSystemRole: false, isActive: true }
    ]);
    mockUsers.set([
      {
        userId: 88,
        username: 'sebas.domi',
        fullName: 'sebas domiciliario',
        roleId: 9,
        roleName: 'Domiciliario',
        isActive: true,
        companyId: 1,
        branches: [],
        email: 'sebas@example.com'
      }
    ]);
    mockOrders.set([
      {
        orderId: 996,
        orderNumber: 'ORD-996',
        clientId: 1,
        clientName: 'Cliente Efectivo',
        clientAddress: 'Carrera 69L # 64D-50',
        branchId: 1,
        status: 'DELIVERED',
        isBilled: true,
        isPaid: true,
        paymentMethodName: 'Efectivo',
        totalAmount: 40000,
        courierId: 88,
        courierName: 'sebas domiciliario',
        routeCode: 'RUT-88',
        routeSequenceOrder: 1,
        dispatchedAtUtc: todayIso,
        deliveredAtUtc: todayIso,
        createdAt: todayIso,
        orderDate: todayIso.substring(0, 10),
        items: []
      },
      {
        orderId: 997,
        orderNumber: 'ORD-997',
        clientId: 2,
        clientName: 'Cliente Nequi',
        clientAddress: 'Carrera 70 # 65-10',
        branchId: 1,
        status: 'DISPATCHED',
        isBilled: true,
        isPaid: false,
        paymentMethodName: 'Nequi',
        totalAmount: 25000,
        courierId: 88,
        courierName: 'sebas domiciliario',
        routeCode: 'RUT-88',
        routeSequenceOrder: 2,
        dispatchedAtUtc: todayIso,
        createdAt: todayIso,
        orderDate: todayIso.substring(0, 10),
        items: []
      }
    ]);
    fixture.detectChanges();

    const courier: Courier = component.couriers().find((c: Courier) => c.id === 'u88')!;
    component.openReceiveCourierModal(courier);
    component.toggleStopDelivered(997);
    component.setStopPaymentMethod(997, 'NEQUI');
    component.physicalCashReceived.set(40000);
    component.receiveNotes.set('Liquidación completa');

    updateOrderStatusSpy.calls.reset();
    settleCourierRouteSpy.calls.reset();

    component.confirmSettlementAndReceive();

    expect(updateOrderStatusSpy.calls.count()).toBe(1);
    expect(updateOrderStatusSpy).toHaveBeenCalledWith(997, 'DELIVERED');
    expect(settleCourierRouteSpy).toHaveBeenCalledWith(
      88,
      'sebas domiciliario',
      40000,
      25000,
      'Liquidación completa'
    );
  });
});
