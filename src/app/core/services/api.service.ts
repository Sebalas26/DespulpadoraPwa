import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AccountCategoryDto,
  ActionDto,
  AssignRolePermissionsDto,
  BatchDto,
  ClientDto,
  CloseShiftDto,
  CompanyConfig,
  CourierDto,
  CreateBatchDto,
  CreateClientDto,
  CreateExpenseDto,
  CreateFruitDto,
  CreateOrderDto,
  CreateRoleDto,
  CreateSystemActionDto,
  CreateSystemModuleDto,
  CreateUserDto,
  DatabaseBackupInfoDto,
  DepartmentDto,
  EmployeeArea,
  EmployeeDto,
  EmployeeGender,
  ExpenseDto,
  FruitDto,
  IdentificationTypeDto,
  ModuleDto,
  OperationDto,
  OrderDto,
  OrderItemDto,
  OrderMetricsDto,
  OrderStatus,
  PaymentMethodDto,
  PositionDto,
  PulpStockAdjustmentDto,
  PulpStockItem,
  RolePermissionsMatrixDto,
  StartShiftDto,
  SystemActionCatalogDto,
  SystemModuleCatalogDto,
  UpdateOrderStatusDto,
  UpdateSystemActionDto,
  UpdateSystemModuleDto,
  UpdateUserDto,
  UserAdminDto,
  UserRoleDto,
  WorkShiftDto
} from '../models/business.models';

/**
 * Unified HTTP client service connecting all operational modules and permissions catalog views
 * with the .NET 10 Hexagonal Backend (`ApiDespulpadora`).
 */
@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /**
   * Retrieves the complete fruit catalog from `GET /api/fruits`.
   */
  getFruits(): Observable<FruitDto[]> {
    try {
      return this.http.get<Record<string, unknown>[]>(`${this.baseUrl}/fruits`).pipe(
        map((items: Record<string, unknown>[]) => (items || []).map(item => this.mapFruitFromApi(item))),
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Retrieves a single fruit by identifier from `GET /api/fruits/{id}`.
   */
  getFruitById(fruitId: number): Observable<FruitDto> {
    try {
      return this.http.get<Record<string, unknown>>(`${this.baseUrl}/fruits/${fruitId}`).pipe(
        map((item: Record<string, unknown>) => this.mapFruitFromApi(item)),
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Registers a new fruit variety via `POST /api/fruits`.
   */
  createFruit(dto: CreateFruitDto): Observable<FruitDto> {
    try {
      const payload = {
        name: dto.name,
        code: dto.code,
        category: dto.category ?? '',
        colorHex: dto.colorHex ?? dto.pulpColor ?? '',
        rawStockKg: dto.rawStockKg ?? 0,
        expectedYieldPercentage: dto.expectedYieldPercentage ?? dto.yieldPercentage ?? 0,
        brixTarget: dto.brixTarget ?? 0,
        price140g: dto.price140g ?? dto.unitPrice ?? 0,
        price100g: dto.price100g ?? dto.unitPrice ?? 0,
        price250g: dto.price250g ?? 0,
        price500g: dto.price500g ?? 0,
        price1000g: dto.price1000g ?? 0
      };
      return this.http.post<Record<string, unknown>>(`${this.baseUrl}/fruits`, payload).pipe(
        map((item: Record<string, unknown>) => this.mapFruitFromApi(item)),
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Updates an existing fruit variety via `PUT /api/fruits/{id}`.
   */
  updateFruit(fruitId: number, dto: Partial<CreateFruitDto>): Observable<FruitDto> {
    try {
      return this.http.put<Record<string, unknown>>(`${this.baseUrl}/fruits/${fruitId}`, dto).pipe(
        map((item: Record<string, unknown>) => this.mapFruitFromApi(item)),
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Adjusts fruit raw or packed stock via `/api/fruits/{id}/fresh-stock` or `/api/fruits/{id}/pulp-stock`.
   */
  adjustFruitStock(
    fruitId: number,
    dto: {
      sizeKey?: string;
      deltaUnits?: number;
      rawStockKgDelta?: number;
      stock100gDelta?: number;
      stock250gDelta?: number;
      stock500gDelta?: number;
      stock1000gDelta?: number;
    }
  ): Observable<FruitDto> {
    try {
      if (dto.rawStockKgDelta && dto.rawStockKgDelta !== 0) {
        return this.http
          .patch<Record<string, unknown>>(`${this.baseUrl}/fruits/${fruitId}/fresh-stock`, {
            deltaKg: dto.rawStockKgDelta
          })
          .pipe(
            map((item: Record<string, unknown>) => this.mapFruitFromApi(item)),
            catchError((error: unknown) => throwError(() => error))
          );
      }

      let sizeKey = dto.sizeKey ?? '';
      let deltaUnits = dto.deltaUnits ?? 0;
      if (dto.stock100gDelta && dto.stock100gDelta !== 0) {
        sizeKey = '140g';
        deltaUnits = dto.stock100gDelta;
      } else if (dto.stock250gDelta && dto.stock250gDelta !== 0) {
        sizeKey = '250g';
        deltaUnits = dto.stock250gDelta;
      } else if (dto.stock500gDelta && dto.stock500gDelta !== 0) {
        sizeKey = '500g';
        deltaUnits = dto.stock500gDelta;
      } else if (dto.stock1000gDelta && dto.stock1000gDelta !== 0) {
        sizeKey = '1000g';
        deltaUnits = dto.stock1000gDelta;
      }

      return this.http
        .patch<Record<string, unknown>>(`${this.baseUrl}/fruits/${fruitId}/pulp-stock`, {
          sizeKey,
          deltaUnits
        })
        .pipe(
          map((item: Record<string, unknown>) => this.mapFruitFromApi(item)),
          catchError((error: unknown) => throwError(() => error))
        );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Deletes a fruit variety via `DELETE /api/fruits/{id}`.
   */
  deleteFruit(fruitId: number): Observable<Record<string, unknown>> {
    try {
      return this.http.delete<Record<string, unknown>>(`${this.baseUrl}/fruits/${fruitId}`).pipe(
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Retrieves production batches from `GET /api/batches`.
   */
  getBatches(branchId?: number): Observable<BatchDto[]> {
    try {
      let params = new HttpParams();
      if (branchId) {
        params = params.set('branchId', branchId.toString());
      }
      return this.http.get<Record<string, unknown>[]>(`${this.baseUrl}/batches`, { params }).pipe(
        map((items: Record<string, unknown>[]) => (items || []).map(item => this.mapBatchFromApi(item))),
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Retrieves a specific production batch from `GET /api/batches/{id}`.
   */
  getBatchById(batchId: number): Observable<BatchDto> {
    try {
      return this.http.get<Record<string, unknown>>(`${this.baseUrl}/batches/${batchId}`).pipe(
        map((item: Record<string, unknown>) => this.mapBatchFromApi(item)),
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Registers a new production batch via `POST /api/batches`.
   */
  createBatch(dto: CreateBatchDto): Observable<BatchDto> {
    try {
      const rawKg = dto.rawWeightKg ?? dto.grossFruitKg ?? 0;
      const netKg = dto.netPulpKg ?? 0;
      const wasteKg = Math.max(0, Number((rawKg - netKg).toFixed(2)));
      const costPerKg = dto.costPerKg ?? 0;
      const payload = {
        fruitId: dto.fruitId,
        batchDateUtc: new Date().toISOString(),
        rawWeightKg: rawKg,
        wasteWeightKg: wasteKg,
        seedAndPeelWasteKg: wasteKg,
        waterAddedLiters: 0,
        netPulpWeightKg: netKg,
        netPulpKg: netKg,
        costPerKgProduced: costPerKg,
        costPerKg,
        brixDegrees: dto.brixDegrees ?? 0,
        phLevel: dto.phLevel ?? 0,
        units140gPacked: dto.units140gPacked ?? 0,
        units100gPacked: dto.units100gPacked ?? 0,
        units250gPacked: dto.units250gPacked ?? 0,
        units500gPacked: dto.units500gPacked ?? 0,
        units1000gPacked: dto.units1000gPacked ?? 0,
        notes: dto.notes ?? ''
      };
      return this.http.post<Record<string, unknown>>(`${this.baseUrl}/batches`, payload).pipe(
        map((item: Record<string, unknown>) => this.mapBatchFromApi(item)),
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Completes a production batch with actual produced kilograms.
   */
  completeBatch(batchId: number, pulpProducedKg: number): Observable<BatchDto> {
    try {
      return this.getBatchById(batchId).pipe(
        map((batch: BatchDto) => ({ ...batch, pulpProducedKg })),
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Retrieves consolidated stock items derived from `/api/fruits`.
   */
  getStock(_branchId?: number): Observable<PulpStockItem[]> {
    try {
      return this.getFruits().pipe(
        map((fruits: FruitDto[]) =>
          fruits.map(f => {
            const g140 = f.stock100g ?? 0;
            const g250 = f.stock250g ?? 0;
            const g500 = f.stock500g ?? 0;
            const g1000 = f.stock1000g ?? 0;
            const totalUnits = g140 + g250 + g500 + g1000;
            const totalKg = Number((g140 * 0.14 + g250 * 0.25 + g500 * 0.5 + g1000 * 1.0).toFixed(2));
            const rawFruit = f as unknown as Record<string, unknown>;
            const minThreshold = Number(
              rawFruit['minimumRawStockKg'] ?? rawFruit['minStockKg'] ?? f.minimumRawStockKg ?? f.minStockKg ?? 0
            );
            return {
              fruitId: f.fruitId,
              fruitName: f.name,
              code: f.code,
              category: f.category,
              pulpColor: f.pulpColor,
              yieldPercentage: f.yieldPercentage,
              stock: { g140, g250, g500, g1000 },
              totalUnits,
              totalKg,
              isLowStock: totalKg < minThreshold
            };
          })
        ),
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Adjusts pulp stock by grammage via `PATCH /api/fruits/{id}/stock`.
   */
  adjustStock(dto: PulpStockAdjustmentDto): Observable<FruitDto> {
    try {
      const payload = {
        rawStockKgDelta: 0,
        stock100gDelta: dto.grammage === 140 ? dto.quantityDelta : 0,
        stock250gDelta: dto.grammage === 250 ? dto.quantityDelta : 0,
        stock500gDelta: dto.grammage === 500 ? dto.quantityDelta : 0,
        stock1000gDelta: dto.grammage === 1000 ? dto.quantityDelta : 0
      };
      return this.adjustFruitStock(dto.fruitId, payload);
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Retrieves commercial orders from `GET /api/orders`.
   */
  getOrders(_branchId?: number, status?: string): Observable<OrderDto[]> {
    try {
      let params = new HttpParams();
      if (status) {
        params = params.set('status', status);
      }
      return this.http.get<Record<string, unknown>[]>(`${this.baseUrl}/orders`, { params }).pipe(
        map((items: Record<string, unknown>[]) => (items || []).map(item => this.mapOrderFromApi(item))),
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Retrieves a single order by identifier from `GET /api/orders/{id}`.
   */
  getOrderById(orderId: number): Observable<OrderDto> {
    try {
      return this.http.get<Record<string, unknown>>(`${this.baseUrl}/orders/${orderId}`).pipe(
        map((item: Record<string, unknown>) => this.mapOrderFromApi(item)),
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Creates a new commercial order via `POST /api/orders`.
   */
  createOrder(dto: CreateOrderDto): Observable<OrderDto> {
    try {
      const payload = {
        clientId: dto.clientId ?? null,
        clientName: dto.clientName ?? '',
        customerName: dto.clientName ?? '',
        clientPhone: dto.clientPhone ?? '',
        customerPhone: dto.clientPhone ?? '',
        clientAddress: dto.clientAddress ?? '',
        deliveryAddress: dto.clientAddress ?? '',
        paymentMethod: dto.paymentMethod ?? '',
        isPriority: dto.isPriority ?? false,
        scheduledDay: dto.scheduledDay ?? null,
        notes: dto.notes ?? null,
        items: dto.items.map(i => {
          const grams = i.presentationGrams ?? i.grammage ?? 0;
          return {
            fruitId: i.fruitId,
            sizeKey: `${grams}g`,
            presentationGrams: grams,
            quantity: i.quantity,
            unitPrice: i.unitPrice
          };
        })
      };
      return this.http.post<Record<string, unknown>>(`${this.baseUrl}/orders`, payload).pipe(
        map((item: Record<string, unknown>) => this.mapOrderFromApi(item)),
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Updates an existing order via `PUT /api/orders/{id}`.
   */
  updateOrder(orderId: number, dto: CreateOrderDto): Observable<OrderDto> {
    try {
      const payload = {
        clientId: dto.clientId ?? null,
        clientName: dto.clientName ?? '',
        customerName: dto.clientName ?? '',
        clientPhone: dto.clientPhone ?? '',
        customerPhone: dto.clientPhone ?? '',
        clientAddress: dto.clientAddress ?? '',
        deliveryAddress: dto.clientAddress ?? '',
        paymentMethod: dto.paymentMethod ?? '',
        isPriority: dto.isPriority ?? false,
        scheduledDay: dto.scheduledDay ?? null,
        notes: dto.notes ?? null,
        items: dto.items.map(i => {
          const grams = i.presentationGrams ?? i.grammage ?? 0;
          return {
            fruitId: i.fruitId,
            sizeKey: `${grams}g`,
            presentationGrams: grams,
            quantity: i.quantity,
            unitPrice: i.unitPrice
          };
        })
      };
      return this.http.put<Record<string, unknown>>(`${this.baseUrl}/orders/${orderId}`, payload).pipe(
        map((item: Record<string, unknown>) => this.mapOrderFromApi(item)),
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Updates an order's status via `PATCH /api/orders/{id}/status`.
   */
  updateOrderStatus(dto: UpdateOrderStatusDto): Observable<OrderDto> {
    try {
      const payload = {
        status: dto.status,
        courierId: dto.courierId ?? null,
        isPaid: dto.isPaid ?? null,
        isBilled: dto.isBilled ?? null,
        isPriority: dto.isPriority ?? null,
        scheduledDay: dto.scheduledDay ?? null
      };
      return this.http.patch<Record<string, unknown>>(`${this.baseUrl}/orders/${dto.orderId}/status`, payload).pipe(
        map((item: Record<string, unknown>) => this.mapOrderFromApi(item)),
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Toggles the priority flag of an order via `PATCH /api/orders/{id}/priority`.
   */
  toggleOrderPriority(orderId: number, isPriority: boolean): Observable<OrderDto> {
    try {
      return this.http
        .patch<Record<string, unknown>>(`${this.baseUrl}/orders/${orderId}/priority`, { isPriority })
        .pipe(
          map((item: Record<string, unknown>) => this.mapOrderFromApi(item)),
          catchError((error: unknown) => throwError(() => error))
        );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Dispatches a batch of orders on a delivery route via `POST /api/orders/dispatch-route`.
   */
  dispatchOrdersRoute(payload: Record<string, unknown>): Observable<unknown> {
    try {
      return this.http
        .post<unknown>(`${this.baseUrl}/orders/dispatch-route`, payload)
        .pipe(catchError((error: unknown) => throwError(() => error)));
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Updates the picked quantity of an order item via `PATCH /api/orders/{orderId}/items/{itemId}/picked`.
   */
  updateOrderItemPicking(orderId: number, itemId: number, pickedQuantity: number): Observable<OrderDto> {
    try {
      return this.http
        .patch<Record<string, unknown>>(`${this.baseUrl}/orders/${orderId}/items/${itemId}/picked`, { pickedQuantity })
        .pipe(
          map((item: Record<string, unknown>) => this.mapOrderFromApi(item)),
          catchError((error: unknown) => throwError(() => error))
        );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Deletes an order via `DELETE /api/orders/{id}`.
   */
  deleteOrder(orderId: number): Observable<Record<string, unknown>> {
    try {
      return this.http.delete<Record<string, unknown>>(`${this.baseUrl}/orders/${orderId}`).pipe(
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Computes daily order metrics from `/api/orders`.
   */
  getOrderMetrics(branchId?: number): Observable<OrderMetricsDto> {
    try {
      return this.getOrders(branchId).pipe(
        map((orders: OrderDto[]) => {
          const todayStr = new Date().toISOString().substring(0, 10);
          const todayOrders = orders.filter(o => o.createdAt.startsWith(todayStr));
          return {
            totalOrdersToday: todayOrders.length,
            pendingPickingCount: orders.filter(o => o.status === 'PENDING' || o.status === 'PICKING').length,
            readyToBillCount: orders.filter(o => o.status === 'BILLED' && !o.isPaid).length,
            dispatchedCount: orders.filter(o => o.status === 'DISPATCHED').length,
            deliveredCount: orders.filter(o => o.status === 'DELIVERED').length,
            todayRevenue: todayOrders
              .filter(o => o.status !== 'CANCELLED')
              .reduce((acc, o) => acc + o.totalAmount, 0)
          };
        }),
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Retrieves couriers from `GET /api/couriers`.
   */
  getCouriers(): Observable<CourierDto[]> {
    try {
      return this.http.get<CourierDto[]>(`${this.baseUrl}/couriers`).pipe(
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Retrieves clients from `GET /api/clients`.
   */
  getClients(): Observable<ClientDto[]> {
    try {
      return this.http.get<Record<string, unknown>[]>(`${this.baseUrl}/clients`).pipe(
        map((items: Record<string, unknown>[]) => (items || []).map(item => this.mapClientFromApi(item))),
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Retrieves a client by identifier from `GET /api/clients/{id}`.
   */
  getClientById(clientId: number): Observable<ClientDto> {
    try {
      return this.http.get<Record<string, unknown>>(`${this.baseUrl}/clients/${clientId}`).pipe(
        map((item: Record<string, unknown>) => this.mapClientFromApi(item)),
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Creates a new client via `POST /api/clients`.
   */
  createClient(dto: CreateClientDto): Observable<ClientDto> {
    try {
      const payload = {
        name: dto.fullName,
        fullName: dto.fullName,
        nit: dto.identificationNumber,
        identificationNumber: dto.identificationNumber,
        identificationTypeId: dto.identificationTypeId ?? 0,
        phone: dto.phone,
        email: dto.email ?? null,
        address: dto.address ?? '',
        city: dto.city ?? '',
        zone: dto.city ?? '',
        notes: dto.notes ?? null
      };
      return this.http.post<Record<string, unknown>>(`${this.baseUrl}/clients`, payload).pipe(
        map((item: Record<string, unknown>) => this.mapClientFromApi(item)),
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Updates an existing client via `PUT /api/clients/{id}`.
   */
  updateClient(clientId: number, dto: Partial<CreateClientDto>): Observable<ClientDto> {
    try {
      const payload = {
        name: dto.fullName ?? '',
        fullName: dto.fullName ?? '',
        nit: dto.identificationNumber ?? null,
        identificationNumber: dto.identificationNumber ?? null,
        identificationTypeId: dto.identificationTypeId ?? 0,
        phone: dto.phone ?? '',
        email: dto.email ?? null,
        address: dto.address ?? '',
        city: dto.city ?? '',
        zone: dto.city ?? '',
        notes: dto.notes ?? null,
        isActive: dto.isActive ?? true
      };
      return this.http.put<Record<string, unknown>>(`${this.baseUrl}/clients/${clientId}`, payload).pipe(
        map((item: Record<string, unknown>) => this.mapClientFromApi(item)),
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Deletes a client via `DELETE /api/clients/{id}`.
   */
  deleteClient(clientId: number): Observable<Record<string, unknown>> {
    try {
      return this.http.delete<Record<string, unknown>>(`${this.baseUrl}/clients/${clientId}`).pipe(
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Retrieves identification types from `GET /api/identificationtypes`.
   */
  getIdentificationTypes(): Observable<IdentificationTypeDto[]> {
    try {
      return this.http.get<IdentificationTypeDto[]>(`${this.baseUrl}/identificationtypes`).pipe(
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Retrieves payment methods from `GET /api/paymentmethod`.
   */
  getPaymentMethods(): Observable<PaymentMethodDto[]> {
    try {
      return this.http.get<Record<string, unknown>[]>(`${this.baseUrl}/paymentmethod`).pipe(
        map((items: Record<string, unknown>[]) =>
          (items || []).map(item => ({
            id: Number(item['id'] ?? item['paymentMethodId'] ?? 0),
            paymentMethodId: Number(item['paymentMethodId'] ?? item['id'] ?? 0),
            name: String(item['name'] ?? ''),
            code: String(item['code'] ?? item['name'] ?? '').toUpperCase(),
            isActive: Boolean(item['isActive'] ?? true),
            requiresReference: Boolean(item['requiresReference'] ?? false),
            type: (item['type'] as PaymentMethodDto['type']) ?? 'transfer',
            description: String(item['description'] ?? '')
          }))
        ),
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Creates a payment method via `POST /api/paymentmethod`.
   */
  createPaymentMethod(dto: { name: string; requiresReference?: boolean }): Observable<PaymentMethodDto> {
    try {
      return this.http.post<PaymentMethodDto>(`${this.baseUrl}/paymentmethod`, dto).pipe(
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Updates a payment method via `PUT /api/paymentmethod/{id}`.
   */
  updatePaymentMethod(id: number, dto: Partial<PaymentMethodDto>): Observable<PaymentMethodDto> {
    try {
      return this.http.put<PaymentMethodDto>(`${this.baseUrl}/paymentmethod/${id}`, dto).pipe(
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Deletes a payment method via `DELETE /api/paymentmethod/{id}`.
   */
  deletePaymentMethod(id: number): Observable<Record<string, unknown>> {
    try {
      return this.http.delete<Record<string, unknown>>(`${this.baseUrl}/paymentmethod/${id}`).pipe(
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Retrieves work shifts from `GET /api/employees/time-logs`.
   */
  getShifts(branchId?: number, date?: string): Observable<WorkShiftDto[]> {
    try {
      let params = new HttpParams();
      if (branchId) {
        params = params.set('branchId', branchId.toString());
      }
      if (date) {
        params = params.set('date', date);
      }
      return this.http.get<WorkShiftDto[]>(`${this.baseUrl}/employees/time-logs`, { params }).pipe(
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Starts a work shift via `POST /api/employees/time-logs/clock-in`.
   */
  startShift(dto: StartShiftDto): Observable<WorkShiftDto> {
    try {
      return this.http.post<WorkShiftDto>(`${this.baseUrl}/employees/time-logs/clock-in`, dto).pipe(
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Closes a work shift via `PATCH /api/employees/time-logs/{id}/clock-out`.
   */
  closeShift(dto: CloseShiftDto): Observable<WorkShiftDto> {
    try {
      return this.http
        .patch<WorkShiftDto>(`${this.baseUrl}/employees/time-logs/${dto.shiftId}/clock-out`, dto)
        .pipe(catchError((error: unknown) => throwError(() => error)));
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Settles an employee payroll payment via `POST /api/employees/payroll-settlements`.
   */
  createPayrollSettlement(dto: Record<string, unknown>): Observable<unknown> {
    try {
      return this.http
        .post<unknown>(`${this.baseUrl}/employees/payroll-settlements`, dto)
        .pipe(catchError((error: unknown) => throwError(() => error)));
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Retrieves employees from `GET /api/employees`.
   */
  getEmployees(_branchId?: number): Observable<EmployeeDto[]> {
    try {
      return this.http.get<Record<string, unknown>[]>(`${this.baseUrl}/employees`).pipe(
        map((items: Record<string, unknown>[]) => (items || []).map(item => this.mapEmployeeFromApi(item))),
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Retrieves a specific employee from `GET /api/employees/{id}`.
   */
  getEmployeeById(employeeId: number): Observable<EmployeeDto> {
    try {
      return this.http.get<Record<string, unknown>>(`${this.baseUrl}/employees/${employeeId}`).pipe(
        map((item: Record<string, unknown>) => this.mapEmployeeFromApi(item)),
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Creates an employee via `POST /api/employees`.
   */
  createEmployee(dto: Partial<EmployeeDto>): Observable<EmployeeDto> {
    try {
      const salary = dto.monthlySalary ?? dto.baseSalary ?? 0;
      const position = dto.roleTitle ?? dto.position ?? '';
      const payload = {
        fullName: dto.fullName ?? `${dto.firstName ?? ''} ${dto.lastName ?? ''}`.trim(),
        documentNumber: dto.documentNumber ?? dto.identificationNumber ?? '',
        position,
        roleTitle: position,
        area: dto.area ?? '',
        gender: dto.gender ?? '',
        phone: dto.phone ?? '',
        email: dto.email ?? null,
        baseMonthlySalary: salary,
        monthlySalary: salary,
        transportAllowance: dto.transportAllowance ?? 0,
        deliveryBonusRate: dto.deliveryBonusRate ?? 0,
        bankName: dto.bankName ?? null,
        bankAccountType: dto.bankAccountType ?? null,
        bankAccountNumber: dto.bankAccountNumber ?? null,
        hireDate: dto.hireDate ?? new Date().toISOString()
      };
      return this.http.post<Record<string, unknown>>(`${this.baseUrl}/employees`, payload).pipe(
        map((item: Record<string, unknown>) => this.mapEmployeeFromApi(item)),
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Updates an employee via `PUT /api/employees/{id}`.
   */
  updateEmployee(employeeId: number, dto: Partial<EmployeeDto>): Observable<EmployeeDto> {
    try {
      const salary = dto.monthlySalary ?? dto.baseSalary ?? 0;
      const position = dto.roleTitle ?? dto.position ?? '';
      const payload = {
        fullName: dto.fullName ?? `${dto.firstName ?? ''} ${dto.lastName ?? ''}`.trim(),
        documentNumber: dto.documentNumber ?? dto.identificationNumber ?? '',
        position,
        roleTitle: position,
        area: dto.area ?? '',
        gender: dto.gender ?? '',
        phone: dto.phone ?? '',
        email: dto.email ?? null,
        baseMonthlySalary: salary,
        monthlySalary: salary,
        transportAllowance: dto.transportAllowance ?? 0,
        deliveryBonusRate: dto.deliveryBonusRate ?? 0,
        bankName: dto.bankName ?? null,
        bankAccountType: dto.bankAccountType ?? null,
        bankAccountNumber: dto.bankAccountNumber ?? null,
        status: dto.status ?? (dto.isActive === false ? 'INACTIVE' : 'ACTIVE')
      };
      return this.http.put<Record<string, unknown>>(`${this.baseUrl}/employees/${employeeId}`, payload).pipe(
        map((item: Record<string, unknown>) => this.mapEmployeeFromApi(item)),
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Deletes an employee via `DELETE /api/employees/{id}`.
   */
  deleteEmployee(employeeId: number): Observable<Record<string, unknown>> {
    try {
      return this.http.delete<Record<string, unknown>>(`${this.baseUrl}/employees/${employeeId}`).pipe(
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Retrieves departments list.
   */
  getDepartments(): Observable<DepartmentDto[]> {
    try {
      return this.http.get<DepartmentDto[]>(`${this.baseUrl}/departments`).pipe(
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Retrieves positions list.
   */
  getPositions(): Observable<PositionDto[]> {
    try {
      return this.http.get<PositionDto[]>(`${this.baseUrl}/positions`).pipe(
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Retrieves accounting transactions and expenses from `GET /api/accounting/transactions`.
   */
  getExpenses(branchId?: number): Observable<ExpenseDto[]> {
    try {
      return this.http.get<Record<string, unknown>[]>(`${this.baseUrl}/accounting/transactions`).pipe(
        map((items: Record<string, unknown>[]) =>
          (items || []).map(item => ({
            id: Number(item['id'] ?? item['expenseId'] ?? 0),
            expenseId: Number(item['expenseId'] ?? item['id'] ?? 0),
            branchId: Number(item['branchId'] ?? branchId ?? 0),
            branchName: String(item['branchName'] ?? ''),
            categoryId: Number(item['categoryId'] ?? 0),
            categoryName: String(item['category'] ?? item['categoryName'] ?? ''),
            category: String(item['category'] ?? item['categoryName'] ?? ''),
            type: String(item['type'] ?? 'EXPENSE'),
            description: String(item['description'] ?? ''),
            amount: Number(item['amount'] ?? 0),
            expenseDate: String(item['transactionDate'] ?? item['expenseDate'] ?? new Date().toISOString()).substring(0, 10),
            receiptNumber: String(item['referenceCode'] ?? item['receiptNumber'] ?? ''),
            createdAt: String(item['transactionDate'] ?? item['createdAt'] ?? new Date().toISOString())
          }))
        ),
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Registers an accounting transaction or operational expense via `POST /api/accounting/transactions`.
   */
  createExpense(dto: CreateExpenseDto): Observable<ExpenseDto> {
    try {
      const payload = {
        type: dto.type ?? 'EXPENSE',
        category: dto.category ?? '',
        description: dto.description,
        amount: dto.amount,
        referenceCode: dto.referenceCode ?? dto.receiptNumber ?? null
      };
      return this.http.post<Record<string, unknown>>(`${this.baseUrl}/accounting/transactions`, payload).pipe(
        map((item: Record<string, unknown>) => ({
          id: Number(item['id'] ?? 0),
          expenseId: Number(item['id'] ?? 0),
          branchId: Number(item['branchId'] ?? dto.branchId ?? 0),
          branchName: String(item['branchName'] ?? ''),
          categoryId: Number(item['categoryId'] ?? dto.categoryId ?? 0),
          categoryName: String(item['category'] ?? dto.category ?? ''),
          description: String(item['description'] ?? dto.description),
          amount: Number(item['amount'] ?? dto.amount),
          expenseDate: String(item['transactionDate'] ?? new Date().toISOString()).substring(0, 10),
          receiptNumber: String(item['referenceCode'] ?? dto.receiptNumber ?? ''),
          createdAt: String(item['transactionDate'] ?? new Date().toISOString())
        })),
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Retrieves account categories.
   */
  getAccountCategories(): Observable<AccountCategoryDto[]> {
    try {
      return this.http.get<AccountCategoryDto[]>(`${this.baseUrl}/accounting/categories`).pipe(
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Retrieves company settings from `GET /api/company-settings`.
   */
  getCompanySettings(): Observable<CompanyConfig> {
    try {
      return this.http.get<Record<string, unknown>>(`${this.baseUrl}/company-settings`).pipe(
        map((item: Record<string, unknown>) => ({
          id: Number(item['id'] ?? 0),
          companyName: String(item['companyName'] ?? item['businessName'] ?? ''),
          legalName: String(item['legalName'] ?? item['businessName'] ?? ''),
          nit: String(item['nit'] ?? ''),
          logoUrl: item['logoUrl'] ? String(item['logoUrl']) : undefined,
          tagline: String(item['tagline'] ?? ''),
          address: String(item['address'] ?? ''),
          city: String(item['city'] ?? ''),
          department: String(item['department'] ?? ''),
          country: String(item['country'] ?? ''),
          phone: String(item['phone'] ?? ''),
          whatsapp: String(item['whatsapp'] ?? item['phone'] ?? ''),
          email: String(item['email'] ?? ''),
          billingEmail: String(item['billingEmail'] ?? item['email'] ?? ''),
          operatingHours: String(item['operatingHours'] ?? ''),
          dispatchHours: String(item['dispatchHours'] ?? ''),
          taxRegime: String(item['taxRegime'] ?? ''),
          dianResolution: String(item['dianResolution'] ?? ''),
          invoicePrefix: String(item['invoicePrefix'] ?? ''),
          invoiceNextNumber: Number(item['invoiceNextNumber'] ?? 1),
          invoiceFooterNote: String(item['invoiceFooterNote'] ?? ''),
          taxPercentage: Number(item['taxPercentage'] ?? 0),
          monthlySalesTarget: Number(item['monthlySalesTarget'] ?? 0)
        })),
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Updates company settings via `PUT /api/company-settings`.
   */
  updateCompanySettings(dto: Partial<CompanyConfig>): Observable<CompanyConfig> {
    try {
      const payload = {
        ...dto,
        businessName: dto.companyName ?? dto.legalName ?? ''
      };
      return this.http.put<Record<string, unknown>>(`${this.baseUrl}/company-settings`, payload).pipe(
        map((item: Record<string, unknown>) => ({
          ...(dto as CompanyConfig),
          companyName: String(item['companyName'] ?? item['businessName'] ?? dto.companyName ?? '')
        })),
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Retrieves all system users from `GET /api/users`.
   */
  getUsers(): Observable<UserAdminDto[]> {
    try {
      return this.http.get<Record<string, unknown>[]>(`${this.baseUrl}/users`).pipe(
        map((items: Record<string, unknown>[]) => (items || []).map(item => this.mapUserFromApi(item))),
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Retrieves a specific user by identifier from `GET /api/users/{id}`.
   */
  getUserById(userId: number): Observable<UserAdminDto> {
    try {
      return this.http.get<Record<string, unknown>>(`${this.baseUrl}/users/${userId}`).pipe(
        map((item: Record<string, unknown>) => this.mapUserFromApi(item)),
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Creates a new system user via `POST /api/users`.
   */
  createUser(dto: CreateUserDto): Observable<UserAdminDto> {
    try {
      const payload = {
        username: dto.username,
        email: dto.email,
        password: dto.password ?? '',
        fullName: dto.fullName,
        phone: dto.phone ?? null,
        documentNumber: dto.documentNumber ?? null,
        roleId: Number(dto.roleId),
        isSystemDeveloper: Boolean(dto.isSystemDeveloper),
        mustChangePassword: Boolean(dto.mustChangePassword)
      };
      return this.http.post<Record<string, unknown>>(`${this.baseUrl}/users`, payload).pipe(
        map((item: Record<string, unknown>) => this.mapUserFromApi(item)),
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Updates an existing system user via `PUT /api/users/{id}`.
   */
  updateUser(userId: number, dto: UpdateUserDto): Observable<UserAdminDto> {
    try {
      const payload = {
        username: dto.username ?? dto.email.split('@')[0],
        email: dto.email,
        fullName: dto.fullName,
        phone: dto.phone ?? null,
        documentNumber: dto.documentNumber ?? null,
        roleId: Number(dto.roleId),
        isSystemDeveloper: Boolean(dto.isSystemDeveloper),
        isActive: Boolean(dto.isActive)
      };
      return this.http.put<Record<string, unknown>>(`${this.baseUrl}/users/${userId}`, payload).pipe(
        map((item: Record<string, unknown>) => this.mapUserFromApi(item)),
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Updates a user's assigned role via `PATCH /api/users/{id}/role`.
   */
  assignUserRole(userId: number, roleId: number): Observable<UserAdminDto> {
    try {
      return this.http.patch<Record<string, unknown>>(`${this.baseUrl}/users/${userId}/role`, { roleId }).pipe(
        map((item: Record<string, unknown>) => this.mapUserFromApi(item)),
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Updates a user's active status via `PATCH /api/users/{id}/status`.
   */
  updateUserStatus(userId: number, isActive: boolean): Observable<UserAdminDto> {
    try {
      return this.http.patch<Record<string, unknown>>(`${this.baseUrl}/users/${userId}/status`, { isActive }).pipe(
        map((item: Record<string, unknown>) => this.mapUserFromApi(item)),
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Deactivates or deletes a user via `DELETE /api/users/{id}`.
   */
  deleteUser(userId: number): Observable<Record<string, unknown>> {
    try {
      return this.http.delete<Record<string, unknown>>(`${this.baseUrl}/users/${userId}`).pipe(
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Retrieves all roles from `GET /api/roles`.
   */
  getRoles(): Observable<UserRoleDto[]> {
    try {
      return this.http.get<Record<string, unknown>[]>(`${this.baseUrl}/roles`).pipe(
        map((items: Record<string, unknown>[]) => (items || []).map(item => this.mapRoleFromApi(item))),
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Creates a new role via `POST /api/roles`.
   */
  createRole(dto: CreateRoleDto): Observable<UserRoleDto> {
    try {
      const payload = {
        name: dto.name,
        description: dto.description ?? '',
        isActive: dto.isActive ?? true,
        isCourier: dto.isCourier ?? false
      };
      return this.http.post<Record<string, unknown>>(`${this.baseUrl}/roles`, payload).pipe(
        map((item: Record<string, unknown>) => this.mapRoleFromApi(item)),
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Updates an existing role via `PUT /api/roles/{id}`.
   */
  updateRole(roleId: number, dto: CreateRoleDto): Observable<UserRoleDto> {
    try {
      const payload = {
        name: dto.name,
        description: dto.description ?? '',
        isActive: dto.isActive ?? true,
        isCourier: dto.isCourier ?? false
      };
      return this.http.put<Record<string, unknown>>(`${this.baseUrl}/roles/${roleId}`, payload).pipe(
        map((item: Record<string, unknown>) => this.mapRoleFromApi(item)),
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Deletes a role via `DELETE /api/roles/{id}`.
   */
  deleteRole(roleId: number): Observable<Record<string, unknown>> {
    try {
      return this.http.delete<Record<string, unknown>>(`${this.baseUrl}/roles/${roleId}`).pipe(
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Retrieves the role permissions matrix (`assignedModuleIds`, `assignedActionIds`) from `GET /api/roles/{id}/permissions`.
   */
  getRolePermissionsMatrix(roleId: number): Observable<RolePermissionsMatrixDto> {
    try {
      return this.http.get<RolePermissionsMatrixDto>(`${this.baseUrl}/roles/${roleId}/permissions`).pipe(
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Saves the role permissions matrix (`moduleIds`, `actionIds`) via `PUT /api/roles/{id}/permissions`.
   */
  assignRolePermissionsMatrix(roleId: number, dto: AssignRolePermissionsDto): Observable<RolePermissionsMatrixDto> {
    try {
      return this.http.put<RolePermissionsMatrixDto>(`${this.baseUrl}/roles/${roleId}/permissions`, dto).pipe(
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Retrieves all dynamic modules and their nested actions from `GET /api/modules`.
   */
  getSystemModules(onlyActive: boolean = false): Observable<SystemModuleCatalogDto[]> {
    try {
      const params = new HttpParams().set('onlyActive', String(onlyActive));
      return this.http.get<SystemModuleCatalogDto[]>(`${this.baseUrl}/modules`, { params }).pipe(
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Creates a new dynamic module in the Master System Catalog (`POST /api/modules`).
   */
  createSystemModule(dto: CreateSystemModuleDto): Observable<SystemModuleCatalogDto> {
    try {
      return this.http.post<SystemModuleCatalogDto>(`${this.baseUrl}/modules`, dto).pipe(
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Updates an existing dynamic module (`PUT /api/modules/{id}`).
   */
  updateSystemModule(moduleId: number, dto: UpdateSystemModuleDto): Observable<SystemModuleCatalogDto> {
    try {
      return this.http.put<SystemModuleCatalogDto>(`${this.baseUrl}/modules/${moduleId}`, dto).pipe(
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Deletes or deactivates a dynamic module (`DELETE /api/modules/{id}`).
   */
  deleteSystemModule(moduleId: number): Observable<Record<string, unknown>> {
    try {
      return this.http.delete<Record<string, unknown>>(`${this.baseUrl}/modules/${moduleId}`).pipe(
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Retrieves all module actions or actions filtered by `moduleId` from `/api/actions`.
   */
  getSystemActions(moduleId?: number): Observable<SystemActionCatalogDto[]> {
    try {
      const url = moduleId ? `${this.baseUrl}/actions/by-module/${moduleId}` : `${this.baseUrl}/actions`;
      return this.http.get<SystemActionCatalogDto[]>(url).pipe(
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Creates a new granular module action (`POST /api/actions`).
   */
  createSystemAction(dto: CreateSystemActionDto): Observable<SystemActionCatalogDto> {
    try {
      return this.http.post<SystemActionCatalogDto>(`${this.baseUrl}/actions`, dto).pipe(
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Updates an existing granular module action (`PUT /api/actions/{id}`).
   */
  updateSystemAction(actionId: number, dto: UpdateSystemActionDto): Observable<SystemActionCatalogDto> {
    try {
      return this.http.put<SystemActionCatalogDto>(`${this.baseUrl}/actions/${actionId}`, dto).pipe(
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Deletes or deactivates a granular module action (`DELETE /api/actions/{id}`).
   */
  deleteSystemAction(actionId: number): Observable<Record<string, unknown>> {
    try {
      return this.http.delete<Record<string, unknown>>(`${this.baseUrl}/actions/${actionId}`).pipe(
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Legacy alias for `getSystemModules()`.
   */
  getModules(): Observable<ModuleDto[]> {
    try {
      return this.getSystemModules(false).pipe(
        map((mods: SystemModuleCatalogDto[]) =>
          mods.map(m => ({
            id: m.id,
            moduleId: m.id,
            name: m.name,
            slug: m.slug,
            menuSection: m.menuSection,
            frontendRoute: m.frontendRoute,
            icon: m.icon,
            displayOrder: m.displayOrder,
            isActive: m.isActive,
            actions: (m.actions || []).map(a => ({
              id: a.id,
              actionId: a.id,
              moduleId: a.moduleId,
              operationId: a.moduleId,
              name: a.name,
              slug: a.slug,
              httpMethod: a.httpMethod,
              description: a.description,
              isActive: a.isActive
            }))
          }))
        )
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Legacy alias for operations list.
   */
  getOperations(moduleId?: number): Observable<OperationDto[]> {
    try {
      return this.getSystemModules(false).pipe(
        map((mods: SystemModuleCatalogDto[]) =>
          mods
            .filter(m => !moduleId || m.id === moduleId)
            .map(m => ({
              operationId: m.id,
              moduleId: m.id,
              name: m.name,
              slug: m.slug
            }))
        )
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Legacy alias for `getSystemActions()`.
   */
  getActions(): Observable<ActionDto[]> {
    try {
      return this.getSystemActions().pipe(
        map((actions: SystemActionCatalogDto[]) =>
          actions.map(a => ({
            id: a.id,
            actionId: a.id,
            moduleId: a.moduleId,
            operationId: a.moduleId,
            name: a.name,
            slug: a.slug,
            httpMethod: a.httpMethod,
            description: a.description,
            isActive: a.isActive
          }))
        )
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Retrieves assigned actions for a role using `getRolePermissionsMatrix(roleId)`.
   */
  getRoleActions(roleId: number): Observable<ActionDto[]> {
    try {
      return this.getRolePermissionsMatrix(roleId).pipe(
        map((matrix: RolePermissionsMatrixDto) =>
          (matrix.assignedActionIds || []).map(id => ({
            id,
            actionId: id,
            operationId: 0,
            name: '',
            slug: '',
            isAssigned: true
          }))
        )
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Assigns role permissions using `PUT /api/roles/{id}/permissions`.
   */
  assignRoleActions(roleId: number, actionIds: number[], moduleIds: number[] = []): Observable<RolePermissionsMatrixDto> {
    try {
      return this.assignRolePermissionsMatrix(roleId, { moduleIds, actionIds });
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Lists all `.sql` database backups stored on the server (`GET /api/database-backups`).
   */
  getDatabaseBackups(): Observable<DatabaseBackupInfoDto[]> {
    try {
      return this.http.get<DatabaseBackupInfoDto[]>(`${this.baseUrl}/database-backups`).pipe(
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Generates a new physical `.sql` database backup on the server (`POST /api/database-backups`).
   */
  createDatabaseBackup(): Observable<DatabaseBackupInfoDto> {
    try {
      return this.http.post<DatabaseBackupInfoDto>(`${this.baseUrl}/database-backups`, {}).pipe(
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Downloads a `.sql` backup file as a binary `Blob` (`GET /api/database-backups/{fileName}/download`).
   */
  downloadDatabaseBackup(fileName: string): Observable<Blob> {
    try {
      return this.http
        .get(`${this.baseUrl}/database-backups/${encodeURIComponent(fileName)}/download`, {
          responseType: 'blob'
        })
        .pipe(catchError((error: unknown) => throwError(() => error)));
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Deletes a `.sql` backup file from the server (`DELETE /api/database-backups/{fileName}`).
   */
  deleteDatabaseBackup(fileName: string): Observable<void> {
    try {
      return this.http
        .delete<void>(`${this.baseUrl}/database-backups/${encodeURIComponent(fileName)}`)
        .pipe(catchError((error: unknown) => throwError(() => error)));
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Maps a backend fruit response object to `FruitDto`.
   */
  private mapFruitFromApi(item: Record<string, unknown>): FruitDto {
    try {
      const id = Number(item['id'] ?? item['fruitId'] ?? 0);
      const pulpStocks = (item['pulpStocks'] as Record<string, number> | undefined) ?? {};
      const pulpPrices = (item['pulpPrices'] as Record<string, number> | undefined) ?? {};
      return {
        id,
        fruitId: id,
        name: String(item['name'] ?? ''),
        code: String(item['code'] ?? item['name'] ?? '').substring(0, 6).toUpperCase(),
        category: String(item['category'] ?? ''),
        yieldPercentage: Number(item['expectedYieldPercentage'] ?? item['yieldPercentage'] ?? 0),
        expectedYieldPercentage: Number(item['expectedYieldPercentage'] ?? item['yieldPercentage'] ?? 0),
        rawStockKg: Number(item['rawStockKg'] ?? item['freshStockKg'] ?? 0),
        pulpColor: String(item['colorHex'] ?? item['pulpColor'] ?? ''),
        colorHex: String(item['colorHex'] ?? item['pulpColor'] ?? ''),
        brixTarget: Number(item['brixTarget'] ?? 0),
        unitPrice: Number(pulpPrices['140g'] ?? item['price140g'] ?? item['price100g'] ?? item['unitPrice'] ?? 0),
        price140g: Number(pulpPrices['140g'] ?? item['price140g'] ?? item['price100g'] ?? 0),
        price100g: Number(pulpPrices['100g'] ?? item['price100g'] ?? 0),
        price250g: Number(pulpPrices['250g'] ?? item['price250g'] ?? 0),
        price500g: Number(pulpPrices['500g'] ?? item['price500g'] ?? 0),
        price1000g: Number(pulpPrices['1000g'] ?? item['price1000g'] ?? 0),
        stock100g: Number(pulpStocks['140g'] ?? pulpStocks['100g'] ?? item['stock100g'] ?? 0),
        stock250g: Number(pulpStocks['250g'] ?? item['stock250g'] ?? 0),
        stock500g: Number(pulpStocks['500g'] ?? item['stock500g'] ?? 0),
        stock1000g: Number(pulpStocks['1000g'] ?? item['stock1000g'] ?? 0),
        minimumRawStockKg: Number(item['minimumRawStockKg'] ?? item['minStockKg'] ?? 0),
        minStockKg: Number(item['minStockKg'] ?? item['minimumRawStockKg'] ?? 0),
        isActive: Boolean(item['isActive'] ?? true)
      };
    } catch (error: unknown) {
      throw error;
    }
  }

  /**
   * Maps a backend batch response object to `BatchDto`.
   */
  private mapBatchFromApi(item: Record<string, unknown>): BatchDto {
    try {
      const id = Number(item['id'] ?? item['batchId'] ?? 0);
      const rawKg = Number(item['rawWeightKg'] ?? item['grossFruitKg'] ?? 0);
      const netKg = Number(item['netPulpWeightKg'] ?? item['netPulpKg'] ?? item['pulpProducedKg'] ?? 0);
      const yieldPct = Number(
        item['actualYieldPercentage'] ??
          item['realYieldPercentage'] ??
          item['yieldPercentage'] ??
          (rawKg > 0 ? Number(((netKg / rawKg) * 100).toFixed(1)) : 0)
      );
      const createdAt = String(item['batchDateUtc'] ?? item['createdAt'] ?? item['productionDate'] ?? new Date().toISOString());
      return {
        id,
        batchId: id,
        batchCode: String(item['batchCode'] ?? ''),
        fruitId: Number(item['fruitId'] ?? 0),
        fruitName: String(item['fruitName'] ?? ''),
        branchId: Number(item['branchId'] ?? 0),
        branchName: String(item['branchName'] ?? ''),
        grossFruitKg: rawKg,
        rawWeightKg: rawKg,
        pulpProducedKg: netKg,
        netPulpKg: netKg,
        realYieldPercentage: yieldPct,
        actualYieldPercentage: yieldPct,
        costPerKg: Number(item['costPerKgProduced'] ?? item['costPerKg'] ?? 0),
        brixDegrees: Number(item['brixDegrees'] ?? 0),
        phLevel: Number(item['phLevel'] ?? 0),
        units140gPacked: Number(item['units140gPacked'] ?? 0),
        units100gPacked: Number(item['units100gPacked'] ?? 0),
        units250gPacked: Number(item['units250gPacked'] ?? 0),
        units500gPacked: Number(item['units500gPacked'] ?? 0),
        units1000gPacked: Number(item['units1000gPacked'] ?? 0),
        status: String(item['status'] ?? 'COMPLETED'),
        operatorName: String(item['operatorName'] ?? ''),
        notes: String(item['notes'] ?? ''),
        productionDate: createdAt,
        createdAt
      };
    } catch (error: unknown) {
      throw error;
    }
  }

  /**
   * Normalizes backend order status strings into canonical `OrderStatus` values.
   */
  private normalizeOrderStatus(rawStatus: unknown): OrderStatus {
    try {
      const upper = String(rawStatus ?? 'PENDING').trim().toUpperCase().replace(/\s+/g, '');
      switch (upper) {
        case 'RECIBIDO':
        case 'PENDING':
          return 'PENDING';
        case 'ENALISTAMIENTO':
        case 'ALISTANDO':
        case 'PICKING':
          return 'PICKING';
        case 'FACTURADO':
        case 'BILLED':
          return 'BILLED';
        case 'ENRUTA':
        case 'DISPATCHED':
          return 'DISPATCHED';
        case 'ENTREGADO':
        case 'DELIVERED':
          return 'DELIVERED';
        case 'CANCELADO':
        case 'CANCELLED':
          return 'CANCELLED';
        default:
          return 'PENDING';
      }
    } catch {
      return 'PENDING';
    }
  }

  /**
   * Maps a backend order response object to `OrderDto`.
   */
  private mapOrderFromApi(item: Record<string, unknown>): OrderDto {
    try {
      const id = Number(item['id'] ?? item['orderId'] ?? 0);
      const rawItems = Array.isArray(item['items']) ? (item['items'] as Record<string, unknown>[]) : [];
      const mappedItems: OrderItemDto[] = rawItems.map(ri => {
        const sizeKeyRaw = String(ri['sizeKey'] ?? '').replace('g', '');
        const gram = Number(ri['presentationGrams'] ?? ri['grammage'] ?? (sizeKeyRaw || 0)) as 140 | 250 | 500 | 1000;
        const qty = Number(ri['quantity'] ?? 0);
        const price = Number(ri['unitPrice'] ?? 0);
        return {
          id: Number(ri['id'] ?? ri['orderItemId'] ?? 0),
          orderItemId: Number(ri['id'] ?? ri['orderItemId'] ?? 0),
          fruitId: Number(ri['fruitId'] ?? 0),
          fruitName: String(ri['fruitName'] ?? ''),
          grammage: gram,
          presentationGrams: gram,
          quantity: qty,
          unitPrice: price,
          subtotal: Number(ri['subtotal'] ?? qty * price),
          pickedQuantity: Number(ri['pickedQuantity'] ?? 0)
        };
      });

      const createdAt = String(item['createdAtUtc'] ?? item['createdAt'] ?? new Date().toISOString());
      return {
        id,
        orderId: id,
        orderNumber: String(item['orderCode'] ?? item['orderNumber'] ?? ''),
        orderCode: String(item['orderCode'] ?? item['orderNumber'] ?? ''),
        branchId: Number(item['branchId'] ?? 0),
        branchName: String(item['branchName'] ?? ''),
        clientId: Number(item['clientId'] ?? 0),
        clientName: String(item['clientName'] ?? item['customerName'] ?? ''),
        clientPhone: String(item['clientPhone'] ?? item['customerPhone'] ?? ''),
        clientAddress: String(item['clientAddress'] ?? item['deliveryAddress'] ?? ''),
        status: this.normalizeOrderStatus(item['status']),
        orderDate: createdAt.substring(0, 10),
        scheduledDay: item['scheduledDay'] ? String(item['scheduledDay']) : undefined,
        totalAmount: Number(item['totalAmount'] ?? 0),
        items: mappedItems,
        paymentMethodName: String(item['paymentMethod'] ?? item['paymentMethodName'] ?? ''),
        courierId: item['courierId'] ? Number(item['courierId']) : undefined,
        courierName: item['courierName'] ? String(item['courierName']) : undefined,
        isPaid: Boolean(item['isPaid'] ?? false),
        isPriority: Boolean(item['isPriority'] ?? false),
        isBilled: Boolean(item['isBilled'] ?? false),
        notes: item['notes'] ? String(item['notes']) : undefined,
        createdAt
      };
    } catch (error: unknown) {
      throw error;
    }
  }

  /**
   * Maps a backend client response object to `ClientDto`.
   */
  private mapClientFromApi(item: Record<string, unknown>): ClientDto {
    try {
      const id = Number(item['id'] ?? item['clientId'] ?? 0);
      return {
        id,
        clientId: id,
        fullName: String(item['fullName'] ?? item['name'] ?? ''),
        identificationTypeId: Number(item['identificationTypeId'] ?? 0),
        identificationNumber: String(item['identificationNumber'] ?? item['nit'] ?? ''),
        phone: String(item['phone'] ?? ''),
        email: String(item['email'] ?? ''),
        address: String(item['address'] ?? ''),
        city: String(item['city'] ?? item['zone'] ?? ''),
        notes: String(item['notes'] ?? ''),
        creditLimit: Number(item['creditLimit'] ?? 0),
        currentBalance: Number(item['currentBalance'] ?? 0),
        isActive: Boolean(item['isActive'] ?? true)
      };
    } catch (error: unknown) {
      throw error;
    }
  }

  /**
   * Maps a backend employee response object to `EmployeeDto`.
   */
  private mapEmployeeFromApi(item: Record<string, unknown>): EmployeeDto {
    try {
      const id = Number(item['id'] ?? item['employeeId'] ?? 0);
      const fullName = String(item['fullName'] ?? '');
      const parts = fullName.split(' ');
      const firstName = parts[0] ?? fullName;
      const lastName = parts.slice(1).join(' ');
      const salary = Number(item['baseMonthlySalary'] ?? item['monthlySalary'] ?? item['baseSalary'] ?? 0);
      return {
        id,
        employeeId: id,
        firstName,
        lastName,
        fullName,
        identificationNumber: String(item['documentNumber'] ?? item['identificationNumber'] ?? ''),
        documentNumber: String(item['documentNumber'] ?? item['identificationNumber'] ?? ''),
        gender: (item['gender'] as EmployeeGender) ?? ('' as EmployeeGender),
        area: (item['area'] as EmployeeArea) ?? ('' as EmployeeArea),
        phone: String(item['phone'] ?? ''),
        email: String(item['email'] ?? ''),
        position: String(item['position'] ?? item['roleTitle'] ?? ''),
        roleTitle: String(item['roleTitle'] ?? item['position'] ?? ''),
        department: String(item['area'] ?? item['department'] ?? ''),
        baseSalary: salary,
        monthlySalary: salary,
        transportAllowance: Number(item['transportAllowance'] ?? 0),
        deliveryBonusRate: Number(item['deliveryBonusRate'] ?? 0),
        hireDate: String(item['hireDateUtc'] ?? item['hireDate'] ?? new Date().toISOString()).substring(0, 10),
        isActive: Boolean(item['isActive'] ?? (String(item['status'] ?? 'ACTIVE').toUpperCase() !== 'INACTIVE')),
        status: String(item['status'] ?? 'ACTIVE'),
        bankName: item['bankName'] ? String(item['bankName']) : undefined,
        bankAccountType: item['bankAccountType'] ? String(item['bankAccountType']) : undefined,
        bankAccountNumber: item['bankAccountNumber'] ? String(item['bankAccountNumber']) : undefined
      };
    } catch (error: unknown) {
      throw error;
    }
  }

  /**
   * Maps a backend user response object to `UserAdminDto`.
   */
  private mapUserFromApi(item: Record<string, unknown>): UserAdminDto {
    try {
      const id = Number(item['id'] ?? item['userId'] ?? 0);
      return {
        id,
        userId: id,
        username: String(item['username'] ?? ''),
        email: String(item['email'] ?? ''),
        fullName: String(item['fullName'] ?? ''),
        phone: item['phone'] ? String(item['phone']) : undefined,
        documentNumber: item['documentNumber'] ? String(item['documentNumber']) : undefined,
        roleId: Number(item['roleId'] ?? 0),
        roleName: String(item['roleName'] ?? ''),
        companyId: Number(item['companyId'] ?? 0),
        companyName: String(item['companyName'] ?? ''),
        isSystemDeveloper: Boolean(item['isSystemDeveloper'] ?? false),
        isActive: Boolean(item['isActive'] ?? true),
        mustChangePassword: Boolean(item['mustChangePassword'] ?? false),
        branches: Array.isArray(item['branches'])
          ? (item['branches'] as { branchId: number; name: string }[])
          : []
      };
    } catch (error: unknown) {
      throw error;
    }
  }

  /**
   * Maps a backend role response object to `UserRoleDto`.
   */
  private mapRoleFromApi(item: Record<string, unknown>): UserRoleDto {
    try {
      const id = Number(item['id'] ?? item['roleId'] ?? 0);
      const name = String(item['name'] ?? '');
      return {
        id,
        roleId: id,
        name,
        description: String(item['description'] ?? ''),
        isSystemRole: id === 1 || name.toLowerCase().includes('super'),
        isActive: Boolean(item['isActive'] ?? true),
        moduleIds: Array.isArray(item['moduleIds']) ? (item['moduleIds'] as number[]) : [],
        actionIds: Array.isArray(item['actionIds']) ? (item['actionIds'] as number[]) : [],
        isCourier: item['isCourier'] !== undefined
          ? Boolean(item['isCourier'])
          : (name.toLowerCase().includes('domicili') || name.toLowerCase().includes('mensajer') || name.toLowerCase().includes('repartidor'))
      };
    } catch (error: unknown) {
      throw error;
    }
  }
}
