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
  CreatePayrollSettlementDto,
  EmployeeDto,
  ExpenseDto,
  FruitDto,
  IdealVsRealAuditDto,
  OrderDto,
  OrderMetricsDto,
  OrderStatus,
  PayrollPeriodDto,
  PayrollSettlementDto,
  ProductVariantDto,
  PulpStockAdjustmentDto,
  PulpStockItem,
  SalesPerformanceKpiDto,
  SalesTargetDto,
  UpsertSalesTargetDto,
  WorkShiftDto,
  CompanyConfig,
  PaymentMethodDto
} from '../models/business.models';
import {
  FruitConfig,
  INITIAL_BATCHES_SAMPLE,
  INITIAL_CLIENTS_SAMPLE,
  INITIAL_EMPLOYEES_SAMPLE,
  INITIAL_EXPENSES_SAMPLE,
  INITIAL_FRUITS,
  INITIAL_ORDERS_SAMPLE,
  INITIAL_PAYROLL_PERIODS_SAMPLE,
  INITIAL_PAYROLL_SETTLEMENTS_SAMPLE,
  INITIAL_PRODUCT_VARIANTS,
  INITIAL_SALES_TARGETS_SAMPLE,
  INITIAL_SHIFTS_SAMPLE,
  DEFAULT_COMPANY_CONFIG,
  INITIAL_PAYMENT_METHODS
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
  readonly shifts = signal<WorkShiftDto[]>(this.loadShiftsFromStorage());

  // Modules from Excel: Variants, Targets, Payroll
  readonly productVariants = signal<ProductVariantDto[]>(this.loadVariantsFromStorage());
  readonly salesTargets = signal<SalesTargetDto[]>(this.loadSalesTargetsFromStorage());
  readonly payrollPeriods = signal<PayrollPeriodDto[]>(this.loadPayrollPeriodsFromStorage());
  readonly payrollSettlements = signal<PayrollSettlementDto[]>(this.loadPayrollSettlementsFromStorage());
  readonly companyInfo = signal<CompanyConfig>(this.loadCompanyInfoFromStorage());
  readonly paymentMethods = signal<PaymentMethodDto[]>(this.loadPaymentMethodsFromStorage());
  readonly activePaymentMethods = computed(() => this.paymentMethods().filter(p => p.isActive));

  readonly isLoading = signal<boolean>(false);
  readonly isOnline = signal<boolean>(navigator.onLine);
  readonly isSidebarCollapsed = signal<boolean>(false);
  readonly activeTheme = signal<'dark' | 'light'>(
    (localStorage.getItem('despulpadora_theme') as 'dark' | 'light') || 'light'
  );

  toggleSidebar() {
    this.isSidebarCollapsed.update(v => !v);
    if (typeof window !== 'undefined') {
      setTimeout(() => window.dispatchEvent(new Event('resize')), 260);
    }
  }

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

  readonly lowStockFruitsCount = computed(() => {
    return this.fruits().filter(f => {
      return (f.stock.g140 <= f.minStock.g140) ||
             (f.stock.g250 <= f.minStock.g250) ||
             (f.stock.g500 <= f.minStock.g500) ||
             (f.stock.g1000 <= f.minStock.g1000);
    }).length;
  });

  // ==========================================
  // MODULE 2: DYNAMIC SALES KPIS & GOAL SYSTEM
  // ==========================================
  readonly salesPerformance = computed<SalesPerformanceKpiDto>(() => {
    const orders = this.orders().filter(o => o.status !== 'CANCELLED');
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

    // Target for current month or active target
    const targetObj = this.salesTargets().find(t => t.year === currentYear && t.month === currentMonth)
      || this.salesTargets()[0]
      || { targetRevenue: 18000000, workingDays: 26 };

    // Orders for current month (with demo resilience fallback)
    let currentMonthOrders = orders.filter(o => (o.orderDate || o.createdAt).startsWith(currentMonthStr));
    if (currentMonthOrders.length === 0) {
      currentMonthOrders = orders; // Provides immediate rich dashboard metrics
    }

    const currentMonthRevenue = currentMonthOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    // Cost of goods sold (COGS) estimation (~55% cost margin)
    const cogs = currentMonthOrders.reduce((sum, o) => {
      const orderCogs = o.items.reduce((iSum, item) => iSum + (item.subtotal * 0.55), 0);
      return sum + orderCogs;
    }, 0);

    const grossProfit = currentMonthRevenue - cogs;
    const grossMarginPercentage = currentMonthRevenue > 0
      ? Number(((grossProfit / currentMonthRevenue) * 100).toFixed(1))
      : 0;

    // Previous month benchmark
    const previousMonthRevenue = 14850000;
    const growthPercentage = previousMonthRevenue > 0
      ? Number((((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100).toFixed(1))
      : 0;

    const monthTargetRevenue = targetObj.targetRevenue;
    const workingDays = targetObj.workingDays || 26;
    const currentDay = Math.min(workingDays, Math.max(1, now.getDate()));
    const targetAccumulatedProrated = Math.round((monthTargetRevenue / workingDays) * currentDay);

    const compliancePercentage = monthTargetRevenue > 0
      ? Number(((currentMonthRevenue / monthTargetRevenue) * 100).toFixed(1))
      : 0;

    const projectedClosingRevenue = currentDay > 0
      ? Math.round((currentMonthRevenue / currentDay) * workingDays)
      : monthTargetRevenue;

    return {
      currentMonthRevenue,
      previousMonthRevenue,
      growthPercentage,
      grossProfit,
      grossMarginPercentage,
      monthTargetRevenue,
      targetAccumulatedProrated,
      compliancePercentage,
      projectedClosingRevenue,
      totalOrdersCount: currentMonthOrders.length,
      averageTicketValue: currentMonthOrders.length > 0 ? Math.round(currentMonthRevenue / currentMonthOrders.length) : 0
    };
  });

  // ==========================================
  // MODULE 3: IDEAL VS REAL LOSS AUDIT (MERMAS)
  // ==========================================
  readonly idealVsRealLossAudit = computed<IdealVsRealAuditDto[]>(() => {
    const batches = this.batches();
    const orders = this.orders().filter(o => o.status === 'BILLED' || o.status === 'DISPATCHED' || o.status === 'DELIVERED');
    const fruits = this.fruits();

    return fruits.map(f => {
      // 1. Units produced from batches or current inventory base
      const fruitBatches = batches.filter(b => b.fruitName?.toLowerCase() === f.name.toLowerCase() || b.fruitId === f.fruitId);
      const totalPulpKgProduced = fruitBatches.reduce((sum, b) => sum + (b.pulpProducedKg || 0), 0);
      const unitsProduced = totalPulpKgProduced > 0
        ? Math.floor(totalPulpKgProduced / 0.25)
        : (f.stock.g140 + f.stock.g250 + f.stock.g500 + f.stock.g1000);

      // 2. Units actually billed in orders
      let unitsBilled = 0;
      let realRevenue = 0;
      orders.forEach(o => {
        o.items.forEach(i => {
          if (i.fruitName?.toLowerCase() === f.name.toLowerCase() || i.fruitId === f.fruitId) {
            unitsBilled += i.quantity;
            realRevenue += i.subtotal;
          }
        });
      });

      const avgPrice = f.prices?.g250 || 3200;
      const idealRevenue = unitsProduced * avgPrice;
      const unitsDifference = unitsBilled - unitsProduced;
      const moneyDifference = realRevenue - idealRevenue;
      const lossPercentage = unitsProduced > 0
        ? Number((Math.max(0, -unitsDifference) / unitsProduced * 100).toFixed(1))
        : 0;

      return {
        auditId: f.fruitId || Date.now(),
        fruitId: f.fruitId,
        fruitName: f.name,
        periodLabel: 'Mes en Curso',
        startDate: new Date().toISOString().substring(0, 7) + '-01',
        endDate: new Date().toISOString().substring(0, 10),
        totalPulpKgProduced,
        unitsProduced,
        unitsBilled,
        unitsDifference,
        differenceUnits: unitsDifference,
        idealRevenue,
        realRevenue,
        moneyDifference,
        differenceRevenue: Math.abs(moneyDifference),
        lossPercentage,
        alertLevel: lossPercentage > 15 ? 'CRITICA' : lossPercentage > 5 ? 'MODERADA' : 'NORMAL',
        notes: unitsDifference < 0 ? 'Merma operativa o producto en maduración/bodega' : 'Inventario cuadrado',
        createdAt: new Date().toISOString()
      };
    });
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
    if (!data) return INITIAL_FRUITS;
    try {
      const list: FruitConfig[] = JSON.parse(data);
      const existingIds = new Set(list.map(f => f.id));
      const missing = INITIAL_FRUITS.filter(f => !existingIds.has(f.id));
      const merged = [...list, ...missing];
      return merged.map(f => ({ ...f, emoji: '' }));
    } catch {
      return INITIAL_FRUITS;
    }
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
    if (!data) return INITIAL_EXPENSES_SAMPLE;
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_EXPENSES_SAMPLE;
    } catch {
      return INITIAL_EXPENSES_SAMPLE;
    }
  }

  private loadClientsFromStorage(): ClientDto[] {
    const data = localStorage.getItem('despulpadora_clients');
    return data ? JSON.parse(data) : INITIAL_CLIENTS_SAMPLE;
  }

  private loadVariantsFromStorage(): ProductVariantDto[] {
    const data = localStorage.getItem('despulpadora_variants');
    return data ? JSON.parse(data) : INITIAL_PRODUCT_VARIANTS;
  }

  private loadSalesTargetsFromStorage(): SalesTargetDto[] {
    const data = localStorage.getItem('despulpadora_targets');
    return data ? JSON.parse(data) : INITIAL_SALES_TARGETS_SAMPLE;
  }

  private loadPayrollPeriodsFromStorage(): PayrollPeriodDto[] {
    const data = localStorage.getItem('despulpadora_payroll_periods');
    return data ? JSON.parse(data) : INITIAL_PAYROLL_PERIODS_SAMPLE;
  }

  private loadPayrollSettlementsFromStorage(): PayrollSettlementDto[] {
    const data = localStorage.getItem('despulpadora_payroll_settlements');
    if (!data) return INITIAL_PAYROLL_SETTLEMENTS_SAMPLE;
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_PAYROLL_SETTLEMENTS_SAMPLE;
    } catch {
      return INITIAL_PAYROLL_SETTLEMENTS_SAMPLE;
    }
  }

  private loadShiftsFromStorage(): WorkShiftDto[] {
    const data = localStorage.getItem('despulpadora_shifts');
    return data ? JSON.parse(data) : INITIAL_SHIFTS_SAMPLE;
  }

  private loadCompanyInfoFromStorage(): CompanyConfig {
    const data = localStorage.getItem('despulpadora_company_info');
    if (!data) return DEFAULT_COMPANY_CONFIG;
    const parsed = JSON.parse(data) as Partial<CompanyConfig>;
    if (parsed.nit === '901.458.789-2' || !parsed.logoUrl) {
      return DEFAULT_COMPANY_CONFIG;
    }
    return { ...DEFAULT_COMPANY_CONFIG, ...parsed };
  }

  syncCompanyInfoSilent(updates: Partial<CompanyConfig>) {
    this.companyInfo.update(prev => ({ ...prev, ...updates }));
    this.saveAllToStorage();
  }

  updateCompanyInfo(updates: Partial<CompanyConfig>) {
    this.companyInfo.update(prev => ({ ...prev, ...updates }));
    this.saveAllToStorage();
    this.notification.success('Configuración Guardada', 'Información de la empresa actualizada exitosamente.');
  }

  // ==========================================
  // PAYMENT METHODS (MÉTODOS DE PAGO) CRUD
  // ==========================================
  private loadPaymentMethodsFromStorage(): PaymentMethodDto[] {
    try {
      const data = localStorage.getItem('despulpadora_payment_methods');
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return INITIAL_PAYMENT_METHODS;
  }

  createPaymentMethod(dto: { name: string; code?: string; type?: 'cash' | 'transfer' | 'card' | 'credit' | 'other'; description?: string }): PaymentMethodDto {
    const nextId = Math.max(0, ...this.paymentMethods().map(p => p.paymentMethodId)) + 1;
    const item: PaymentMethodDto = {
      paymentMethodId: nextId,
      name: dto.name.trim(),
      code: (dto.code || dto.name.toUpperCase().replace(/[^A-Z0-9]/g, '_')).trim(),
      isActive: true,
      type: dto.type || 'other',
      description: dto.description?.trim() || ''
    };
    this.paymentMethods.update(list => [...list, item]);
    this.saveAllToStorage();
    this.notification.success('Método de Pago Creado', `${item.name} se encuentra disponible para todos los pedidos.`);
    return item;
  }

  updatePaymentMethod(id: number, changes: Partial<PaymentMethodDto>) {
    this.paymentMethods.update(list => list.map(p => p.paymentMethodId === id ? { ...p, ...changes } : p));
    this.saveAllToStorage();
    this.notification.success('Método de Pago Actualizado', 'Los cambios han sido guardados.');
  }

  deletePaymentMethod(id: number) {
    const target = this.paymentMethods().find(p => p.paymentMethodId === id);
    this.paymentMethods.update(list => list.filter(p => p.paymentMethodId !== id));
    this.saveAllToStorage();
    if (target) {
      this.notification.info('Método de Pago Eliminado', `${target.name} fue retirado de las opciones.`);
    }
  }

  togglePaymentMethodStatus(id: number) {
    this.paymentMethods.update(list => list.map(p => p.paymentMethodId === id ? { ...p, isActive: !p.isActive } : p));
    this.saveAllToStorage();
  }

  resetPaymentMethodsToDefault() {
    this.paymentMethods.set(INITIAL_PAYMENT_METHODS);
    this.saveAllToStorage();
    this.notification.info('Métodos de Pago Restablecidos', 'Se han restaurado los medios de pago predeterminados.');
  }

  private saveAllToStorage() {
    localStorage.setItem('despulpadora_fruits', JSON.stringify(this.fruits()));
    localStorage.setItem('despulpadora_batches', JSON.stringify(this.batches()));
    localStorage.setItem('despulpadora_orders', JSON.stringify(this.orders()));
    localStorage.setItem('despulpadora_employees', JSON.stringify(this.employees()));
    localStorage.setItem('despulpadora_expenses', JSON.stringify(this.expenses()));
    localStorage.setItem('despulpadora_clients', JSON.stringify(this.clients()));
    localStorage.setItem('despulpadora_variants', JSON.stringify(this.productVariants()));
    localStorage.setItem('despulpadora_targets', JSON.stringify(this.salesTargets()));
    localStorage.setItem('despulpadora_payroll_periods', JSON.stringify(this.payrollPeriods()));
    localStorage.setItem('despulpadora_payroll_settlements', JSON.stringify(this.payrollSettlements()));
    localStorage.setItem('despulpadora_shifts', JSON.stringify(this.shifts()));
    localStorage.setItem('despulpadora_company_info', JSON.stringify(this.companyInfo()));
    localStorage.setItem('despulpadora_payment_methods', JSON.stringify(this.paymentMethods()));
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

  adjustFreshFruitStock(fruitIdOrName: string, deltaKg: number) {
    let targetFruitName = fruitIdOrName;
    this.fruits.update(list =>
      list.map(f => {
        if (f.id === fruitIdOrName || f.name.toLowerCase() === fruitIdOrName.toLowerCase()) {
          targetFruitName = f.name;
          const nextKg = Math.max(0, Number(((f.freshStockKg || 0) + deltaKg).toFixed(1)));
          return { ...f, freshStockKg: nextKg };
        }
        return f;
      })
    );
    this.saveAllToStorage();
    this.notification.info(
      'Inventario de Fruta Actualizado',
      `${targetFruitName}: ${deltaKg > 0 ? '+' : ''}${deltaKg} Kg de fruta fresca`
    );
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
    courierName?: string;
    scheduledDay?: string;
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
      scheduledDay: orderData.scheduledDay,
      totalAmount,
      isPaid: false,
      paymentMethodName: orderData.paymentMethodName || 'Contra Entrega Efectivo',
      courierName: orderData.courierName,
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

  updateOrder(
    orderId: number,
    orderData: {
      clientName: string;
      clientPhone?: string;
      clientAddress?: string;
      items: {
        fruitName: string;
        grammage: 140 | 250 | 500 | 1000;
        quantity: number;
        unitPrice: number;
        pickedQuantity?: number;
      }[];
      notes?: string;
      paymentMethodName?: string;
      courierName?: string;
      status?: OrderStatus;
      isPaid?: boolean;
    }
  ) {
    const totalAmount = orderData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

    this.orders.update(list =>
      list.map(o => {
        if (o.orderId === orderId) {
          return {
            ...o,
            clientName: orderData.clientName,
            clientPhone: orderData.clientPhone || o.clientPhone,
            clientAddress: orderData.clientAddress || o.clientAddress,
            paymentMethodName: orderData.paymentMethodName || o.paymentMethodName,
            courierName: orderData.courierName !== undefined ? orderData.courierName : o.courierName,
            status: orderData.status || o.status,
            isPaid: orderData.isPaid !== undefined ? orderData.isPaid : o.isPaid,
            notes: orderData.notes,
            totalAmount,
            items: orderData.items.map(i => {
              const fruit = this.fruits().find(f => f.name.toLowerCase() === i.fruitName.toLowerCase());
              const existingItem = o.items.find(
                ex => ex.fruitName?.toLowerCase() === i.fruitName.toLowerCase() && ex.grammage === i.grammage
              );
              const preservedPicked = i.pickedQuantity ?? existingItem?.pickedQuantity ?? 0;
              return {
                fruitId: fruit?.fruitId || existingItem?.fruitId || 1,
                fruitName: i.fruitName,
                grammage: i.grammage,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                subtotal: i.quantity * i.unitPrice,
                pickedQuantity: Math.min(i.quantity, preservedPicked)
              };
            })
          };
        }
        return o;
      })
    );

    this.saveAllToStorage();
    this.notification.success('Pedido Modificado', `Los cambios del pedido fueron guardados ($${totalAmount.toLocaleString('es-CO')}).`);
  }

  updateOrderScheduledDay(orderId: number, dayName: string) {
    const target = this.orders().find(o => o.orderId === orderId);
    if (!target) return;

    this.orders.update(list =>
      list.map(o => (o.orderId === orderId ? { ...o, scheduledDay: dayName } : o))
    );
    this.saveAllToStorage();
    this.notification.success(
      'Día de Alistamiento Actualizado',
      `El pedido #${target.orderNumber} fue movido al día ${dayName}.`
    );
  }

  deleteOrder(orderId: number) {
    const target = this.orders().find(o => o.orderId === orderId);
    this.orders.update(list => list.filter(o => o.orderId !== orderId));
    this.saveAllToStorage();
    if (target) {
      this.notification.info('Pedido Eliminado', `La orden #${target.orderNumber} fue retirada.`);
    }
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

  toggleOrderPriority(orderId: number, isPriority?: boolean) {
    this.orders.update(list => list.map(o => {
      if (o.orderId === orderId) {
        const nextVal = isPriority !== undefined ? isPriority : !o.isPriority;
        return { ...o, isPriority: nextVal };
      }
      return o;
    }));
    this.saveAllToStorage();
  }

  setOrderPriority(identifier: number | string, isPriority: boolean = true) {
    this.orders.update(list => list.map(o => {
      if (o.orderId === identifier || o.orderNumber === identifier) {
        return { ...o, isPriority };
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

  // ==========================================
  // MODULE 2: SALES TARGET MUTATIONS
  // ==========================================
  upsertSalesTarget(dto: UpsertSalesTargetDto) {
    this.salesTargets.update(list => {
      const idx = list.findIndex(t => t.year === dto.year && t.month === dto.month);
      if (idx >= 0) {
        const updated = [...list];
        updated[idx] = {
          ...updated[idx],
          targetRevenue: dto.targetRevenue,
          targetUnits: dto.targetUnits || updated[idx].targetUnits,
          notes: dto.notes
        };
        return updated;
      } else {
        const newTarget: SalesTargetDto = {
          targetId: Date.now(),
          year: dto.year,
          month: dto.month,
          targetRevenue: dto.targetRevenue,
          targetUnits: dto.targetUnits,
          workingDays: 26,
          notes: dto.notes,
          createdAt: new Date().toISOString()
        };
        return [newTarget, ...list];
      }
    });

    this.saveAllToStorage();
    this.notification.success('Meta Actualizada', `Meta fijada en $${dto.targetRevenue.toLocaleString('es-CO')}`);
  }

  // ==========================================
  // MODULE 5: FORTNIGHTLY PAYROLL SETTLEMENT
  // ==========================================
  settlePayroll(dto: CreatePayrollSettlementDto): PayrollSettlementDto {
    const employee = this.employees().find(e => e.employeeId === dto.employeeId);
    if (!employee) {
      throw new Error('Empleado no encontrado');
    }

    const days = Math.min(15, Math.max(1, dto.daysWorked));
    const baseDaily = employee.baseSalary / 30;
    const baseSalaryEarned = Math.round(baseDaily * days);

    // Prorrateo de Auxilio de Transporte
    const transportAllowanceTotal = employee.transportAllowance ?? 162000;
    const transportDaily = transportAllowanceTotal / 30;
    const transportAllowanceEarned = Math.round(transportDaily * days);

    // Bonos por domicilios entregados (área Domicilios)
    const deliveryRate = dto.deliveryBonusRate || employee.deliveryBonusRate || 3500;
    const deliveryBonuses = (dto.deliveryCount || 0) * deliveryRate;

    const overtime = dto.overtimeAmount || 0;
    const otherBonuses = dto.otherBonuses || 0;
    const totalEarnings = baseSalaryEarned + transportAllowanceEarned + deliveryBonuses + overtime + otherBonuses;

    // Deducciones de ley en Colombia: 4% salud + 4% pensión sobre salario devengado
    const healthDeduction = Math.round(baseSalaryEarned * 0.04);
    const pensionDeduction = Math.round(baseSalaryEarned * 0.04);
    const otherDeductions = dto.otherDeductions || 0;
    const totalDeductions = healthDeduction + pensionDeduction + otherDeductions;

    const netPayable = totalEarnings - totalDeductions;

    const settlement: PayrollSettlementDto = {
      settlementId: Date.now(),
      periodId: dto.periodId,
      employeeId: employee.employeeId,
      employeeName: employee.fullName,
      gender: employee.gender,
      area: employee.area || 'PRODUCCION',
      baseSalaryMonthly: employee.baseSalary,
      daysWorked: days,
      baseSalaryEarned,
      transportAllowanceEarned,
      deliveryBonuses,
      overtimeAmount: overtime,
      otherBonuses,
      totalEarnings,
      healthDeduction,
      pensionDeduction,
      otherDeductions,
      totalDeductions,
      netPayable,
      paymentStatus: 'APPROVED',
      settledAt: new Date().toISOString()
    };

    // Actualiza o inserta
    this.payrollSettlements.update(list => {
      const filtered = list.filter(s => !(s.periodId === dto.periodId && s.employeeId === dto.employeeId));
      return [settlement, ...filtered];
    });

    this.saveAllToStorage();
    this.notification.success('Nómina Quincenal Liquidada', `${employee.fullName}: Neto a pagar $${netPayable.toLocaleString('es-CO')}`);

    return settlement;
  }

  // ==========================================
  // MODULE 1: VARIANT STOCK ADJUSTMENTS & CRUD
  // ==========================================
  adjustVariantStock(variantId: number, delta: number) {
    this.productVariants.update(list => list.map(v => {
      if (v.variantId === variantId) {
        const nextVal = Math.max(0, v.currentStock + delta);
        return { ...v, currentStock: nextVal };
      }
      return v;
    }));
    this.saveAllToStorage();
  }

  addProductVariant(variant: Omit<ProductVariantDto, 'variantId'>): ProductVariantDto {
    const nextId = Math.max(0, ...this.productVariants().map(v => v.variantId)) + 1;
    const newVariant: ProductVariantDto = {
      ...variant,
      variantId: nextId
    };

    this.productVariants.update(list => [newVariant, ...list]);
    this.saveAllToStorage();
    this.notification.success('Presentación Creada', `${newVariant.name} agregada al inventario.`);
    return newVariant;
  }

  updateProductVariant(variantId: number, changes: Partial<ProductVariantDto>) {
    this.productVariants.update(list => list.map(v => {
      if (v.variantId === variantId) {
        return { ...v, ...changes };
      }
      return v;
    }));
    this.saveAllToStorage();
    this.notification.success('Presentación Actualizada', 'Los cambios han sido guardados.');
  }

  deleteProductVariant(variantId: number) {
    const existing = this.productVariants().find(v => v.variantId === variantId);
    this.productVariants.update(list => list.filter(v => v.variantId !== variantId));
    this.saveAllToStorage();
    if (existing) {
      this.notification.info('Presentación Eliminada', `${existing.name} retirada del inventario.`);
    }
  }

  resetProductVariantsToDefault() {
    this.productVariants.set(INITIAL_PRODUCT_VARIANTS);
    this.saveAllToStorage();
    this.notification.info('Catálogo Restablecido', 'Se cargaron las presentaciones predeterminadas.');
  }

  // ==========================================
  // CLIENTS CRUD
  // ==========================================
  createClient(dto: CreateClientDto): ClientDto {
    const nextId = Math.max(0, ...this.clients().map(c => c.clientId)) + 1;
    const newClient: ClientDto = {
      clientId: nextId,
      fullName: dto.fullName.trim(),
      identificationTypeId: dto.identificationTypeId ?? 1,
      identificationNumber: dto.identificationNumber.trim(),
      phone: dto.phone.trim(),
      email: dto.email?.trim() || '',
      address: dto.address?.trim() || '',
      city: dto.city?.trim() || 'Bogotá D.C.',
      notes: dto.notes?.trim() || '',
      isActive: true
    };

    this.clients.update(list => [newClient, ...list]);
    this.saveAllToStorage();
    this.notification.success('Cliente Creado', `${newClient.fullName} fue registrado exitosamente.`);
    return newClient;
  }

  updateClient(clientId: number, changes: Partial<ClientDto>) {
    this.clients.update(list =>
      list.map(c => (c.clientId === clientId ? { ...c, ...changes } : c))
    );
    this.saveAllToStorage();
    this.notification.success('Cliente Actualizado', 'Los datos del cliente han sido guardados.');
  }

  deleteClient(clientId: number) {
    const target = this.clients().find(c => c.clientId === clientId);
    this.clients.update(list => list.filter(c => c.clientId !== clientId));
    this.saveAllToStorage();
    if (target) {
      this.notification.info('Cliente Eliminado', `${target.fullName} fue retirado del directorio.`);
    }
  }

  // ==========================================
  // WORK SHIFTS MANAGEMENT
  // ==========================================
  startWorkShift(employeeId: number, shiftType: 'MORNING' | 'AFTERNOON' | 'NIGHT', notes?: string): WorkShiftDto {
    const emp = this.employees().find(e => e.employeeId === employeeId);
    const newShift: WorkShiftDto = {
      shiftId: Date.now(),
      employeeId,
      employeeName: emp ? emp.fullName : 'Colaborador',
      branchId: 1,
      branchName: 'Planta Principal',
      startTime: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true }),
      shiftType,
      status: 'ACTIVE',
      notes: notes || 'Ingreso registrado en terminal de planta'
    };
    this.shifts.update(list => [newShift, ...list]);
    this.saveAllToStorage();
    return newShift;
  }

  closeWorkShift(shiftId: number, notes?: string) {
    this.shifts.update(list => list.map(s => {
      if (s.shiftId === shiftId) {
        return {
          ...s,
          status: 'CLOSED',
          endTime: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true }),
          hoursWorked: 8,
          notes: notes ? `${s.notes || ''} | Cierre: ${notes}` : s.notes
        };
      }
      return s;
    }));
    this.saveAllToStorage();
  }

  deleteEmployee(employeeId: number) {
    const target = this.employees().find(e => e.employeeId === employeeId);
    this.employees.update(list => list.filter(e => e.employeeId !== employeeId));
    this.saveAllToStorage();
    if (target) {
      this.notification.info('Personal Eliminado', `${target.fullName} fue retirado del personal de la empresa.`);
    }
  }
}


