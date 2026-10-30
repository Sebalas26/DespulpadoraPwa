import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiService } from './api.service';
import { environment } from '../../../environments/environment';

/**
 * Unit test suite for `ApiService` covering all HTTP endpoints, payload builders,
 * status normalizations, and response mappers without hardcoded business fallbacks.
 */
describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ApiService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch and map fruits from GET /api/fruits without hardcoded fallbacks', () => {
    service.getFruits().subscribe(fruits => {
      expect(fruits.length).toBe(1);
      expect(fruits[0].fruitId).toBe(10);
      expect(fruits[0].category).toBe('');
      expect(fruits[0].yieldPercentage).toBe(0);
      expect(fruits[0].price250g).toBe(0);
    });

    const req = httpMock.expectOne(`${baseUrl}/fruits`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 10, name: 'TestFruit' }]);
  });

  it('should create a fruit via POST /api/fruits with clean empty/zero defaults', () => {
    service.createFruit({ name: 'Test', code: 'TST', yieldPercentage: 0, unitPrice: 0 }).subscribe(fruit => {
      expect(fruit.name).toBe('Test');
      expect(fruit.category).toBe('');
      expect(fruit.pulpColor).toBe('');
    });

    const req = httpMock.expectOne(`${baseUrl}/fruits`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.category).toBe('');
    expect(req.request.body.colorHex).toBe('');
    expect(req.request.body.price250g).toBe(0);
    req.flush({ id: 1, name: 'Test', code: 'TST' });
  });

  it('should adjust fruit fresh stock and packed pulp stock', () => {
    service.adjustFruitStock(5, { rawStockKgDelta: 15 }).subscribe();
    const freshReq = httpMock.expectOne(`${baseUrl}/fruits/5/fresh-stock`);
    expect(freshReq.request.method).toBe('PATCH');
    expect(freshReq.request.body).toEqual({ deltaKg: 15 });
    freshReq.flush({ id: 5, name: 'Test' });

    service.adjustFruitStock(5, { stock250gDelta: 8 }).subscribe();
    const pulpReq = httpMock.expectOne(`${baseUrl}/fruits/5/pulp-stock`);
    expect(pulpReq.request.method).toBe('PATCH');
    expect(pulpReq.request.body).toEqual({ sizeKey: '250g', deltaUnits: 8 });
    pulpReq.flush({ id: 5, name: 'Test' });
  });

  it('should calculate low stock in getStock using minimumRawStockKg threshold from API', () => {
    service.getStock().subscribe(stockItems => {
      expect(stockItems.length).toBe(1);
      expect(stockItems[0].totalKg).toBe(2.5);
      expect(stockItems[0].isLowStock).toBeTrue();
    });

    const req = httpMock.expectOne(`${baseUrl}/fruits`);
    req.flush([{ id: 1, name: 'FruitA', stock250g: 10, minimumRawStockKg: 5 }]);
  });

  it('should create a batch via POST /api/batches with explicit DTO values', () => {
    service
      .createBatch({ fruitId: 2, grossFruitKg: 50, netPulpKg: 30, costPerKg: 1200 })
      .subscribe(batch => {
        expect(batch.batchId).toBe(99);
        expect(batch.pulpProducedKg).toBe(30);
      });

    const req = httpMock.expectOne(`${baseUrl}/batches`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.rawWeightKg).toBe(50);
    expect(req.request.body.netPulpKg).toBe(30);
    expect(req.request.body.units250gPacked).toBe(0);
    req.flush({ id: 99, fruitId: 2, rawWeightKg: 50, netPulpWeightKg: 30, costPerKg: 1200 });
  });

  it('should normalize backend order statuses in getOrders and mapOrderFromApi', () => {
    service.getOrders().subscribe(orders => {
      expect(orders.length).toBe(6);
      expect(orders[0].status).toBe('PENDING');
      expect(orders[1].status).toBe('PICKING');
      expect(orders[2].status).toBe('BILLED');
      expect(orders[3].status).toBe('DISPATCHED');
      expect(orders[4].status).toBe('DELIVERED');
      expect(orders[5].status).toBe('CANCELLED');
    });

    const req = httpMock.expectOne(`${baseUrl}/orders`);
    req.flush([
      { id: 1, status: 'RECIBIDO', items: [] },
      { id: 2, status: 'ENALISTAMIENTO', items: [] },
      { id: 3, status: 'FACTURADO', items: [] },
      { id: 4, status: 'ENRUTA', items: [] },
      { id: 5, status: 'ENTREGADO', items: [] },
      { id: 6, status: 'CANCELADO', items: [] }
    ]);
  });

  it('should create and update orders without hardcoded client or payment fallbacks', () => {
    service
      .createOrder({
        items: [{ fruitId: 1, grammage: 500, quantity: 2, unitPrice: 1000 }]
      })
      .subscribe(order => {
        expect(order.clientName).toBe('');
        expect(order.paymentMethodName).toBe('');
      });

    const createReq = httpMock.expectOne(`${baseUrl}/orders`);
    expect(createReq.request.body.clientName).toBe('');
    expect(createReq.request.body.clientPhone).toBe('');
    expect(createReq.request.body.clientAddress).toBe('');
    expect(createReq.request.body.paymentMethod).toBe('');
    createReq.flush({ id: 1, items: [] });

    service
      .updateOrder(1, {
        items: [{ fruitId: 1, grammage: 500, quantity: 3, unitPrice: 1000 }]
      })
      .subscribe();

    const updateReq = httpMock.expectOne(`${baseUrl}/orders/1`);
    expect(updateReq.request.method).toBe('PUT');
    expect(updateReq.request.body.clientName).toBe('');
    updateReq.flush({ id: 1, items: [] });
  });

  it('should create and update clients without hardcoded city or identificationTypeId fallbacks', () => {
    service
      .createClient({ fullName: 'Client One', identificationNumber: '12345', phone: '3001112233' })
      .subscribe(client => {
        expect(client.city).toBe('');
        expect(client.identificationTypeId).toBe(0);
      });

    const req = httpMock.expectOne(`${baseUrl}/clients`);
    expect(req.request.body.city).toBe('');
    expect(req.request.body.identificationTypeId).toBe(0);
    req.flush({ id: 1, fullName: 'Client One' });
  });

  it('should create and update employees without hardcoded salary or position fallbacks', () => {
    service.createEmployee({ fullName: 'Emp One' }).subscribe(emp => {
      expect(emp.baseSalary).toBe(0);
      expect(emp.position).toBe('');
      expect(emp.transportAllowance).toBe(0);
    });

    const req = httpMock.expectOne(`${baseUrl}/employees`);
    expect(req.request.body.monthlySalary).toBe(0);
    expect(req.request.body.position).toBe('');
    expect(req.request.body.transportAllowance).toBe(0);
    expect(req.request.body.deliveryBonusRate).toBe(0);
    req.flush({ id: 1, fullName: 'Emp One' });
  });

  it('should get and update company settings without hardcoded company names or targets', () => {
    service.getCompanySettings().subscribe(settings => {
      expect(settings.companyName).toBe('');
      expect(settings.nit).toBe('');
      expect(settings.monthlySalesTarget).toBe(0);
    });

    const getReq = httpMock.expectOne(`${baseUrl}/company-settings`);
    getReq.flush({});

    service.updateCompanySettings({ companyName: 'Configured Corp', monthlySalesTarget: 28000000 }).subscribe(updated => {
      expect(updated.companyName).toBe('Configured Corp');
      expect(updated.monthlySalesTarget).toBe(28000000);
    });

    const putReq = httpMock.expectOne(`${baseUrl}/company-settings`);
    expect(putReq.request.method).toBe('PUT');
    expect(putReq.request.body.monthlySalesTarget).toBe(28000000);
    putReq.flush({ companyName: 'Configured Corp', monthlySalesTarget: 28000000 });
  });

  it('should create a user without hardcoded default password and manage roles/modules/backups', () => {
    service
      .createUser({
        username: 'u1',
        email: 'u1@example.com',
        fullName: 'User One',
        roleId: 2
      })
      .subscribe(user => {
        expect(user.username).toBe('u1');
        expect(user.companyName).toBe('');
      });

    const userReq = httpMock.expectOne(`${baseUrl}/users`);
    expect(userReq.request.body.password).toBe('');
    userReq.flush({ id: 5, username: 'u1', email: 'u1@example.com', fullName: 'User One', roleId: 2 });

    service.getDatabaseBackups().subscribe(backups => {
      expect(backups.length).toBe(0);
    });
    const backupsReq = httpMock.expectOne(`${baseUrl}/database-backups`);
    backupsReq.flush([]);
  });
  it('should create and map role with isCourier flag via POST /api/roles', () => {
    service.createRole({ name: 'Domiciliario', description: 'Entregas', isActive: true, isCourier: true }).subscribe(role => {
      expect(role.roleId).toBe(12);
      expect(role.isCourier).toBeTrue();
    });

    const req = httpMock.expectOne(`${baseUrl}/roles`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.isCourier).toBeTrue();
    req.flush({ id: 12, name: 'Domiciliario', isCourier: true });
  });

  it('should dispatch courier route via POST /api/orders/dispatch-route and map returned orders', () => {
    service
      .dispatchOrdersRoute({ courierId: 9, courierName: 'Domi Norte', orderIds: [101, 102] })
      .subscribe(orders => {
        expect(orders.length).toBe(2);
        expect(orders[0].courierId).toBe(9);
        expect(orders[0].routeSequenceOrder).toBe(1);
        expect(orders[0].status).toBe('DISPATCHED');
      });

    const req = httpMock.expectOne(`${baseUrl}/orders/dispatch-route`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.courierId).toBe(9);
    expect(req.request.body.orderIds).toEqual([101, 102]);
    req.flush([
      { id: 101, orderCode: 'ORD-101', status: 'EnRuta', courierId: 9, courierName: 'Domi Norte', routeSequenceOrder: 1 },
      { id: 102, orderCode: 'ORD-102', status: 'EnRuta', courierId: 9, courierName: 'Domi Norte', routeSequenceOrder: 2 }
    ]);
  });
});