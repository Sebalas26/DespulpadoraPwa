import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';
import {
  BatchDto,
  ClientDto,
  CreateBatchDto,
  CreateClientDto,
  CreateExpenseDto,
  CreateOrderDto,
  EmployeeDto,
  ExpenseDto,
  FruitDto,
  OrderDto,
  OrderMetricsDto,
  OrderStatus,
  PulpStockAdjustmentDto,
  PulpStockItem,
  WorkShiftDto
} from '../models/business.models';
import {
  FruitConfig,
  INITIAL_BATCHES_SAMPLE,
  INITIAL_CLIENTS_SAMPLE,
  INITIAL_EMPLOYEES_SAMPLE,
  INITIAL_FRUITS,
  INITIAL_ORDERS_SAMPLE
} from '../data/initial-data';
import { forkJoin } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class StateService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);

  // Core Reactive Signals
  readonly fruits = signal<FruitConfig[]>(this.loadFruitsFromStorage());
  readonly batches = signal<BatchDto[]>(this.loadBatchesFromStorage());
  readonly orders = signal<OrderDto[]>(this.loadOrdersFromStorage());
  readonly employees = signal<EmployeeDto[]>(this.loadEmployeesFromStorage());
  readonly expenses = signal<ExpenseDto[]>(this.loadExpensesFromStorage());
  readonly clients = signal<ClientDto[]>(this.loadClientsFromStorage());
  readonly shifts = signal<WorkShiftDto[]>([]);

  readonly isLoading = signal<boolean>(false);
  readonly isOnline = signal<boolean>(navigator.onLine);
  readonly activeTheme = signal<'dark' | 'light'>(
    (localStorage.getItem('despulpadora_theme') as 'dark' | 'light') || 'dark'
  );

  // Computed Business Metrics
  readonly totalStockKg = computed(() => {
    return this.fruits().reduce((sum, f) => {
      const kg = (f.stock.g140 * 0.14) + (f.stock.g250 * 0.25) + (f.stock.g500 * 0.5) + (f.stock.g1000 * 1.0);
      return sum + kg;
    }, 0);
  });

  readonly totalFreshStockKg = computed(() => {
    return this.fruits().reduce((sum, f) => sum + (f.freshStockKg || 0), 0);
  });

  readonly pendingOrdersCount = computed(() => {
    return this.orders().filter(o => o.status === 'PENDING' || o.status === 'PICKING').length;
  });

  readonly todayBatchesCount = computed(() => {
    const todayStr = new Date().toISOString().substring(0, 10);
    return this.batches().filter(b => (b.productionDate || b.createdAt).startsWith(todayStr)).length;
  });

  readonly activeShiftsCount = computed(() => {
    return this.shifts().filter(s => s.status === 'ACTIVE').length;
  });

  readonly todayRevenue = computed(() => {
    const todayStr = new Date().toISOString().substring(0, 10);
    return this.orders()
      .filter(o => o.createdAt.startsWith(todayStr) && o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + o.totalAmount, 0);
  });

  constructor() {
    this.applyTheme(this.activeTheme());
    window.addEventListener('online', () => this.isOnline.set(true));
    window.addEventListener('offline', () => this.isOnline.set(false));
  }

  // ==========================================
  // STORAGE HELPERS
  // ==========================================
  private loadFruitsFromStorage(): FruitConfig[] {
    const data = localStorage.getItem('despulpadora_fruits');
    return data ? JSON.parse(data) : INITIAL_FRUITS;
  }

  private loadBatchesFromStorage(): BatchDto[] {
    const data = localStorage.getItem('despulpadora_batches');
    return data ? JSON.parse(data) : INITIAL_BATCHES_SAMPLE;
  }

  private loadOrdersFromStorage(): OrderDto[] {
    const data = localStorage.getItem('despulpadora_orders');
    return data ? JSON.parse(data) : INITIAL_ORDERS_SAMPLE;
  }

  private loadEmployeesFromStorage(): EmployeeDto[] {
    const data = localStorage.getItem('despulpadora_employees');
    return data ? JSON.parse(data) : INITIAL_EMPLOYEES_SAMPLE;
  }

  private loadExpensesFromStorage(): ExpenseDto[] {
    const data = localStorage.getItem('despulpadora_expenses');
    return data ? JSON.parse(data) : [];
  }

  private loadClientsFromStorage(): ClientDto[] {
    const data = localStorage.getItem('despulpadora_clients');
    return data ? JSON.parse(data) : INITIAL_CLIENTS_SAMPLE;
  }

  private saveAllToStorage() {
    localStorage.setItem('despulpadora_fruits', JSON.stringify(this.fruits()));
    localStorage.setItem('despulpadora_batches', JSON.stringify(this.batches()));
    localStorage.setItem('despulpadora_orders', JSON.stringify(this.orders()));
    localStorage.setItem('despulpadora_employees', JSON.stringify(this.employees()));
    localStorage.setItem('despulpadora_expenses', JSON.stringify(this.expenses()));
    localStorage.setItem('despulpadora_clients', JSON.stringify(this.clients()));
  }

  // ==========================================
  // THEME SWITCHER
  // ==========================================
  toggleTheme() {
    const next = this.activeTheme() === 'dark' ? 'light' : 'dark';
    this.activeTheme.set(next);
    localStorage.setItem('despulpadora_theme', next);
    this.applyTheme(next);
  }

  private applyTheme(theme: 'dark' | 'light') {
    document.documentElement.setAttribute('data-theme', theme);
  }

  // ==========================================
  // DATA SYNC WITH API
  // ==========================================
  refreshAll() {
    if (this.auth.isDemoMode()) {
      if (!localStorage.getItem('despulpadora_fruits')) {
        this.saveAllToStorage();
      }
      this.notification.info('Modo Demo Activo', 'Operando con datos de prueba interactivos y persistencia local');
      return;
    }

    this.isLoading.set(true);
    const branchId = this.auth.selectedBranch()?.branchId;

    forkJoin({
      fruits: this.api.getFruits(),
      batches: this.api.getBatches(branchId),
      orders: this.api.getOrders(branchId),
      clients: this.api.getClients(),
      employees: this.api.getEmployees(branchId),
      expenses: this.api.getExpenses(branchId)
    }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.fruits && res.fruits.length > 0) {
          // Merge API fruits with local rich metadata (colors, stock, emojis)
          const merged = this.fruits().map(f => {
            const apiFruit = res.fruits.find(af => af.name.toLowerCase() === f.name.toLowerCase() || af.fruitId === f.fruitId);
            if (apiFruit) {
              return {
                ...f,
                fruitId: apiFruit.fruitId,
                yieldRate: apiFruit.yieldPercentage / 100,
                category: apiFruit.category || f.category
              };
            }
            return f;
          });
          this.fruits.set(merged);
        }

        if (res.batches && res.batches.length > 0) {
          this.batches.set(res.batches);
        }

        if (res.orders && res.orders.length > 0) {
          this.orders.set(res.orders);
        }

        if (res.clients && res.clients.length > 0) {
          this.clients.set(res.clients);
        }

        if (res.employees && res.employees.length > 0) {
          this.employees.set(res.employees);
        }

        if (res.expenses && res.expenses.length > 0) {
          this.expenses.set(res.expenses);
        }

        this.saveAllToStorage();
        this.notification.success('Sincronizado', 'Datos actualizados con el servidor');
      },
      error: () => {
        this.isLoading.set(false);
        // Resilient fallback keeps working locally
        this.notification.info('Modo Local Activo', 'Operando con datos cacheados en el dispositivo');
      }
    });
  }

  // ==========================================
  // BATCH OPERATIONS
  // ==========================================
  createBatch(batchData: {
    fruitId: string | number;
    fruitName: string;
    grossKg: number;
    waterPct: number;
    costPerKg: number;
    operatorName: string;
    notes?: string;
  }) {
    const fruit = this.fruits().find(f => f.id === batchData.fruitId || f.fruitId === Number(batchData.fruitId));
    const yieldRate = fruit ? fruit.yieldRate : 0.6;
    const pulpKg = Number(((batchData.grossKg * yieldRate) * (1 + batchData.waterPct / 100)).toFixed(2));
    const realYield = Number(((pulpKg / batchData.grossKg) * 100).toFixed(1));

    const newBatch: BatchDto = {
      batchId: Date.now(),
      batchCode: `LOTE-${new Date().toISOString().substring(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
      fruitId: typeof batchData.fruitId === 'number' ? batchData.fruitId : (fruit?.fruitId || 1),
      fruitName: batchData.fruitName,
      branchId: this.auth.selectedBranch()?.branchId || 1,
      branchName: this.auth.selectedBranch()?.name || 'Planta Principal',
      grossFruitKg: batchData.grossKg,
      pulpProducedKg: pulpKg,
      realYieldPercentage: realYield,
      costPerKg: batchData.costPerKg,
      status: 'COMPLETED',
      operatorName: batchData.operatorName,
      productionDate: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    // Optimistic local update
    this.batches.update(list => [newBatch, ...list]);

    // Deduct fresh fruit stock
    if (fruit) {
      this.fruits.update(list => list.map(f => {
        if (f.name === fruit.name) {
          const updatedFresh = Math.max(0, f.freshStockKg - batchData.grossKg);
          return { ...f, freshStockKg: updatedFresh };
        }
        return f;
      }));
    }

    this.saveAllToStorage();
    this.notification.success('¡Lote Procesado!', `${batchData.fruitName}: ${pulpKg} Kg de pulpa obtenidos`);

    // Sync to API
    this.api.createBatch({
      fruitId: newBatch.fruitId,
      branchId: newBatch.branchId,
      grossFruitKg: newBatch.grossFruitKg,
      costPerKg: newBatch.costPerKg,
      notes: batchData.notes
    }).subscribe({
      next: (apiBatch) => {
        // Complete the batch with produced kg
        if (apiBatch?.batchId) {
          this.api.completeBatch(apiBatch.batchId, pulpKg).subscribe();
        }
      },
      error: () => {
        // Keeps local
      }
    });

    return newBatch;
  }

  // ==========================================
  // INVENTORY ADJUSTMENT
  // ==========================================
  adjustStock(fruitName: string, grammage: 'g140' | 'g250' | 'g500' | 'g1000', delta: number) {
    this.fruits.update(list => list.map(f => {
      if (f.name.toLowerCase() === fruitName.toLowerCase()) {
        const current = f.stock[grammage] || 0;
        const nextVal = Math.max(0, current + delta);
        return {
          ...f,
          stock: { ...f.stock, [grammage]: nextVal }
        };
      }
      return f;
    }));
    this.saveAllToStorage();
    this.notification.info('Stock Actualizado', `${fruitName} (${grammage}): ${delta > 0 ? '+' : ''}${delta} uds`);
  }

  // ==========================================
  // ORDER MANAGEMENT & WORKFLOW
  // ==========================================
  createOrder(orderData: {
    clientName: string;
    clientPhone?: string;
    clientAddress?: string;
    items: {
      fruitName: string;
      grammage: 140 | 250 | 500 | 1000;
      quantity: number;
      unitPrice: number;
    }[];
    notes?: string;
    paymentMethodName?: string;
  }): OrderDto {
    const totalAmount = orderData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

    const newOrder: OrderDto = {
      orderId: Date.now(),
      orderNumber: `PED-${new Date().toISOString().substring(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
      branchId: this.auth.selectedBranch()?.branchId || 1,
      branchName: this.auth.selectedBranch()?.name || 'Planta Principal',
      clientId: Date.now(),
      clientName: orderData.clientName,
      clientPhone: orderData.clientPhone || '300 000 0000',
      clientAddress: orderData.clientAddress || 'Sede Principal',
      status: 'PENDING',
      orderDate: new Date().toISOString().substring(0, 10),
      totalAmount,
      isPaid: false,
      paymentMethodName: orderData.paymentMethodName || 'Contra Entrega Efectivo',
      notes: orderData.notes,
      createdAt: new Date().toISOString(),
      items: orderData.items.map(i => {
        const fruit = this.fruits().find(f => f.name.toLowerCase() === i.fruitName.toLowerCase());
        return {
          fruitId: fruit?.fruitId || 1,
          fruitName: i.fruitName,
          grammage: i.grammage,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          subtotal: i.quantity * i.unitPrice,
          pickedQuantity: 0
        };
      })
    };

    this.orders.update(list => [newOrder, ...list]);
    this.saveAllToStorage();
    this.notification.success('Pedido Creado', `Orden #${newOrder.orderNumber} por $${totalAmount.toLocaleString('es-CO')}`);

    return newOrder;
  }

  updateOrderStatus(orderId: number, newStatus: OrderStatus) {
    this.orders.update(list => list.map(o => {
      if (o.orderId === orderId) {
        // If dispatched or billed, deduct inventory automatically
        if (newStatus === 'DISPATCHED' && o.status !== 'DISPATCHED' && o.status !== 'DELIVERED') {
          o.items.forEach(item => {
            const gramKey = `g${item.grammage}` as 'g140' | 'g250' | 'g500' | 'g1000';
            this.adjustStock(item.fruitName || '', gramKey, -item.quantity);
          });
        }
        return { ...o, status: newStatus };
      }
      return o;
    }));

    this.saveAllToStorage();

    const statusLabels: Record<OrderStatus, string> = {
      PENDING: 'Pendiente',
      PICKING: 'En Picking (Alistamiento)',
      BILLED: 'Facturado',
      DISPATCHED: 'En Ruta de Despacho',
      DELIVERED: 'Entregado con Éxito',
      CANCELLED: 'Cancelado'
    };

    this.notification.info('Estado Actualizado', `Pedido pasó a: ${statusLabels[newStatus]}`);

    // Try API update
    this.api.updateOrderStatus({ orderId, status: newStatus }).subscribe({
      error: () => {}
    });
  }

  updateItemPickedQuantity(orderId: number, fruitId: number, grammage: number, pickedQty: number) {
    this.orders.update(list => list.map(o => {
      if (o.orderId === orderId) {
        const updatedItems = o.items.map(item => {
          if (item.fruitId === fruitId && item.grammage === grammage) {
            return { ...item, pickedQuantity: pickedQty };
          }
          return item;
        });

        // Check if all items are fully picked
        const allDone = updatedItems.every(i => (i.pickedQuantity || 0) >= i.quantity);
        const nextStatus: OrderStatus = allDone ? 'BILLED' : 'PICKING';

        return { ...o, items: updatedItems, status: nextStatus };
      }
      return o;
    }));
    this.saveAllToStorage();
  }

  // ==========================================
  // EXPENSES
  // ==========================================
  addExpense(dto: {
    categoryName: string;
    description: string;
    amount: number;
    receiptNumber?: string;
  }) {
    const newExpense: ExpenseDto = {
      expenseId: Date.now(),
      branchId: this.auth.selectedBranch()?.branchId || 1,
      branchName: this.auth.selectedBranch()?.name || 'Planta Principal',
      categoryId: 1,
      categoryName: dto.categoryName,
      description: dto.description,
      amount: dto.amount,
      expenseDate: new Date().toISOString().substring(0, 10),
      receiptNumber: dto.receiptNumber || `REC-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString()
    };

    this.expenses.update(list => [newExpense, ...list]);
    this.saveAllToStorage();
    this.notification.success('Gasto Registrado', `$${dto.amount.toLocaleString('es-CO')} - ${dto.categoryName}`);

    this.api.createExpense({
      branchId: newExpense.branchId,
      categoryId: newExpense.categoryId,
      description: newExpense.description,
      amount: newExpense.amount,
      expenseDate: newExpense.expenseDate,
      receiptNumber: newExpense.receiptNumber
    }).subscribe({
      error: () => {}
    });
  }
}
