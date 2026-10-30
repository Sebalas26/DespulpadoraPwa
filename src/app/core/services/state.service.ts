import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';
import {
  BatchDto,
  ClientDto,
  CompanyConfig,
  CreateClientDto,
  CreatePayrollSettlementDto,
  DispatchCourierRouteDto,
  EmployeeArea,
  EmployeeDto,
  ExpenseDto,
  FruitDto,
  IdealVsRealAuditDto,
  InventoryCategoryConfig,
  InventoryGrammageConfig,
  OrderDto,
  OrderStatus,
  PaymentMethodDto,
  PayrollPeriodDto,
  PayrollSettlementDto,
  ProductVariantDto,
  SalesPerformanceKpiDto,
  SalesTargetDto,
  UpsertSalesTargetDto,
  UserAdminDto,
  UserRoleDto,
  WorkShiftDto
} from '../models/business.models';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_COMPANY_CONFIG,
  DEFAULT_GRAMMAGES,
  DEFAULT_PORTAL_CMS_CONFIG,
  FruitConfig,
  INITIAL_BATCHES_SAMPLE,
  INITIAL_CLIENTS_SAMPLE,
  INITIAL_EMPLOYEES_SAMPLE,
  INITIAL_EXPENSES_SAMPLE,
  INITIAL_FRUITS,
  INITIAL_ORDERS_SAMPLE,
  INITIAL_PAYMENT_METHODS,
  INITIAL_PAYROLL_PERIODS_SAMPLE,
  INITIAL_PAYROLL_SETTLEMENTS_SAMPLE,
  INITIAL_PRODUCT_VARIANTS,
  INITIAL_SALES_TARGETS_SAMPLE,
  INITIAL_SHIFTS_SAMPLE,
  PortalCmsConfig
} from '../data/initial-data';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

/**
 * Central reactive application state and operational API synchronization service.
 */
@Injectable({
  providedIn: 'root'
})
export class StateService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);

  readonly fruits = signal<FruitConfig[]>(this.loadFruitsFromStorage());
  readonly batches = signal<BatchDto[]>(this.loadBatchesFromStorage());
  readonly orders = signal<OrderDto[]>(this.loadOrdersFromStorage());
  readonly employees = signal<EmployeeDto[]>(this.loadEmployeesFromStorage());
  readonly users = signal<UserAdminDto[]>(this.loadUsersFromStorage());
  readonly roles = signal<UserRoleDto[]>(this.loadRolesFromStorage());
  readonly expenses = signal<ExpenseDto[]>(this.loadExpensesFromStorage());
  readonly clients = signal<ClientDto[]>(this.loadClientsFromStorage());
  readonly shifts = signal<WorkShiftDto[]>(this.loadShiftsFromStorage());

  readonly productVariants = signal<ProductVariantDto[]>(this.loadVariantsFromStorage());
  readonly salesTargets = signal<SalesTargetDto[]>(this.loadSalesTargetsFromStorage());
  readonly payrollPeriods = signal<PayrollPeriodDto[]>(this.loadPayrollPeriodsFromStorage());
  readonly payrollSettlements = signal<PayrollSettlementDto[]>(this.loadPayrollSettlementsFromStorage());
  readonly companyInfo = signal<CompanyConfig>(this.loadCompanyInfoFromStorage());
  readonly portalCmsConfig = signal<PortalCmsConfig>(this.loadPortalCmsConfigFromStorage());
  readonly paymentMethods = signal<PaymentMethodDto[]>(this.loadPaymentMethodsFromStorage());

  readonly grammagesConfig = signal<InventoryGrammageConfig[]>(this.loadGrammagesConfigFromStorage());
  readonly categoriesConfig = signal<InventoryCategoryConfig[]>(this.loadCategoriesConfigFromStorage());

  readonly activePaymentMethods = computed<PaymentMethodDto[]>(() => {
    try {
      return this.paymentMethods().filter(p => p.isActive);
    } catch {
      return [];
    }
  });

  readonly activeGrammages = computed<InventoryGrammageConfig[]>(() => {
    try {
      return this.grammagesConfig().filter(g => g.isActive);
    } catch {
      return [];
    }
  });

  readonly activeCategories = computed<InventoryCategoryConfig[]>(() => {
    try {
      return this.categoriesConfig().filter(c => c.isActive);
    } catch {
      return [];
    }
  });

  readonly isLoading = signal<boolean>(false);
  readonly isOnline = signal<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  readonly isSidebarCollapsed = signal<boolean>(false);
  readonly activeTheme = signal<'dark' | 'light'>(
    (localStorage.getItem('despulpadora_theme') as 'dark' | 'light') || 'light'
  );

  /**
   * Toggles the navigation sidebar collapsed state.
   */
  toggleSidebar(): void {
    try {
      this.isSidebarCollapsed.update(v => !v);
      if (typeof window !== 'undefined') {
        setTimeout(() => window.dispatchEvent(new Event('resize')), 260);
      }
    } catch {
      return;
    }
  }

  readonly totalStockKg = computed<number>(() => {
    try {
      return this.fruits().reduce((sum, f) => {
        const kg = f.stock.g140 * 0.14 + f.stock.g250 * 0.25 + f.stock.g500 * 0.5 + f.stock.g1000 * 1.0;
        return sum + kg;
      }, 0);
    } catch {
      return 0;
    }
  });

  readonly totalFreshStockKg = computed<number>(() => {
    try {
      return this.fruits().reduce((sum, f) => sum + (f.freshStockKg || 0), 0);
    } catch {
      return 0;
    }
  });

  readonly pendingOrdersCount = computed<number>(() => {
    try {
      return this.orders().filter(o => o.status === 'PENDING' || o.status === 'PICKING').length;
    } catch {
      return 0;
    }
  });

  readonly todayBatchesCount = computed<number>(() => {
    try {
      const todayStr = new Date().toISOString().substring(0, 10);
      return this.batches().filter(b => (b.productionDate || b.createdAt).startsWith(todayStr)).length;
    } catch {
      return 0;
    }
  });

  readonly activeShiftsCount = computed<number>(() => {
    try {
      return this.shifts().filter(s => s.status === 'ACTIVE').length;
    } catch {
      return 0;
    }
  });

  readonly todayRevenue = computed<number>(() => {
    try {
      const todayStr = new Date().toISOString().substring(0, 10);
      return this.orders()
        .filter(o => o.createdAt.startsWith(todayStr) && o.status !== 'CANCELLED')
        .reduce((sum, o) => sum + o.totalAmount, 0);
    } catch {
      return 0;
    }
  });

  readonly lowStockFruitsCount = computed<number>(() => {
    try {
      return this.fruits().filter(f => {
        return (
          f.stock.g140 <= f.minStock.g140 ||
          f.stock.g250 <= f.minStock.g250 ||
          f.stock.g500 <= f.minStock.g500 ||
          f.stock.g1000 <= f.minStock.g1000
        );
      }).length;
    } catch {
      return 0;
    }
  });

  readonly salesPerformance = computed<SalesPerformanceKpiDto>(() => {
    try {
      const orders = this.orders().filter(o => o.status !== 'CANCELLED');
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

      const defaultTargetRevenue = this.companyInfo().monthlySalesTarget || 0;
      const targetObj = this.salesTargets().find(t => t.year === currentYear && t.month === currentMonth) ||
        this.salesTargets()[0] || { targetRevenue: defaultTargetRevenue, workingDays: 26 };

      let currentMonthOrders = orders.filter(o => (o.orderDate || o.createdAt).startsWith(currentMonthStr));
      if (currentMonthOrders.length === 0) {
        currentMonthOrders = orders;
      }

      const currentMonthRevenue = currentMonthOrders.reduce((sum, o) => sum + o.totalAmount, 0);

      const variants = this.productVariants();
      const batches = this.batches();
      const cogs = currentMonthOrders.reduce((sum, o) => {
        const orderCogs = o.items.reduce((iSum, item) => {
          const variant = variants.find(
            v =>
              (v.fruitId === item.fruitId ||
                v.fruitName.toLowerCase() === (item.fruitName || '').toLowerCase()) &&
              v.grammage === item.grammage
          );
          if (variant && variant.unitCost > 0) {
            return iSum + variant.unitCost * item.quantity;
          }
          const batch = batches.find(
            b =>
              b.fruitId === item.fruitId ||
              b.fruitName?.toLowerCase() === (item.fruitName || '').toLowerCase()
          );
          if (batch && batch.costPerKg > 0) {
            return iSum + batch.costPerKg * (item.grammage / 1000) * item.quantity;
          }
          return iSum;
        }, 0);
        return sum + orderCogs;
      }, 0);

      const grossProfit = currentMonthRevenue - cogs;
      const grossMarginPercentage =
        currentMonthRevenue > 0 ? Number(((grossProfit / currentMonthRevenue) * 100).toFixed(1)) : 0;

      const prevDate = new Date(currentYear, currentMonth - 2, 1);
      const prevYear = prevDate.getFullYear();
      const prevMonth = prevDate.getMonth() + 1;
      const prevMonthStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
      const previousMonthOrders = orders.filter(o => (o.orderDate || o.createdAt).startsWith(prevMonthStr));
      const previousMonthRevenue = previousMonthOrders.reduce((sum, o) => sum + o.totalAmount, 0);

      const growthPercentage =
        previousMonthRevenue > 0
          ? Number((((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100).toFixed(1))
          : 0;

      const monthTargetRevenue = targetObj.targetRevenue || 0;
      const workingDays = targetObj.workingDays || 26;
      const currentDay = Math.min(workingDays, Math.max(1, now.getDate()));
      const targetAccumulatedProrated =
        workingDays > 0 ? Math.round((monthTargetRevenue / workingDays) * currentDay) : 0;

      const rawCompliancePercentage =
        monthTargetRevenue > 0 ? Math.round((currentMonthRevenue / monthTargetRevenue) * 100) : 0;
      const compliancePercentage = Math.min(100, Math.max(0, rawCompliancePercentage));

      const projectedClosingRevenue =
        currentDay > 0 ? Math.round((currentMonthRevenue / currentDay) * workingDays) : monthTargetRevenue;

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
        averageTicketValue:
          currentMonthOrders.length > 0 ? Math.round(currentMonthRevenue / currentMonthOrders.length) : 0
      };
    } catch {
      return {
        currentMonthRevenue: 0,
        previousMonthRevenue: 0,
        growthPercentage: 0,
        grossProfit: 0,
        grossMarginPercentage: 0,
        monthTargetRevenue: 0,
        targetAccumulatedProrated: 0,
        compliancePercentage: 0,
        projectedClosingRevenue: 0,
        totalOrdersCount: 0,
        averageTicketValue: 0
      };
    }
  });

  readonly idealVsRealLossAudit = computed<IdealVsRealAuditDto[]>(() => {
    try {
      const batches = this.batches();
      const orders = this.orders().filter(
        o => o.status === 'BILLED' || o.status === 'DISPATCHED' || o.status === 'DELIVERED'
      );
      const fruits = this.fruits();

      return fruits.map(f => {
        const fruitBatches = batches.filter(
          b => b.fruitName?.toLowerCase() === f.name.toLowerCase() || b.fruitId === f.fruitId
        );
        const totalPulpKgProduced = fruitBatches.reduce((sum, b) => sum + (b.pulpProducedKg || 0), 0);
        const unitsProduced =
          totalPulpKgProduced > 0
            ? Math.floor(totalPulpKgProduced / 0.25)
            : f.stock.g140 + f.stock.g250 + f.stock.g500 + f.stock.g1000;

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

        const avgPrice = f.prices?.g250 || 0;
        const idealRevenue = unitsProduced * avgPrice;
        const unitsDifference = unitsBilled - unitsProduced;
        const moneyDifference = realRevenue - idealRevenue;
        const lossPercentage =
          unitsProduced > 0 ? Number(((Math.max(0, -unitsDifference) / unitsProduced) * 100).toFixed(1)) : 0;

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
    } catch {
      return [];
    }
  });

  /**
   * Initializes theme attributes and online/offline event listeners.
   */
  constructor() {
    try {
      this.applyTheme(this.activeTheme());
      if (typeof window !== 'undefined') {
        window.addEventListener('online', () => this.isOnline.set(true));
        window.addEventListener('offline', () => this.isOnline.set(false));
      }
    } catch {
      return;
    }
  }

  /**
   * Loads fruits catalog from localStorage or falls back to initial catalog.
   */
  private loadFruitsFromStorage(): FruitConfig[] {
    try {
      const data = localStorage.getItem('despulpadora_fruits');
      if (!data) {
        return INITIAL_FRUITS;
      }
      const list: FruitConfig[] = JSON.parse(data);
      return Array.isArray(list) ? list.map(f => ({ ...f, emoji: '' })) : INITIAL_FRUITS;
    } catch {
      return INITIAL_FRUITS;
    }
  }

  /**
   * Loads production batches from localStorage.
   */
  private loadBatchesFromStorage(): BatchDto[] {
    try {
      const data = localStorage.getItem('despulpadora_batches');
      return data ? JSON.parse(data) : INITIAL_BATCHES_SAMPLE;
    } catch {
      return INITIAL_BATCHES_SAMPLE;
    }
  }

  /**
   * Loads orders from localStorage.
   */
  private loadOrdersFromStorage(): OrderDto[] {
    try {
      const data = localStorage.getItem('despulpadora_orders');
      return data ? JSON.parse(data) : INITIAL_ORDERS_SAMPLE;
    } catch {
      return INITIAL_ORDERS_SAMPLE;
    }
  }

  /**
   * Loads employees from localStorage.
   */
    /**
   * Loads users from localStorage.
   */
  private loadUsersFromStorage(): UserAdminDto[] {
    try {
      if (typeof localStorage === 'undefined') return [];
      const data = localStorage.getItem('dgl_users_v2');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Persists users to localStorage.
   */
  private saveUsersToStorage(users: UserAdminDto[]): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('dgl_users_v2', JSON.stringify(users));
      }
    } catch {
      return;
    }
  }

  /**
   * Loads roles from localStorage.
   */
  private loadRolesFromStorage(): UserRoleDto[] {
    try {
      if (typeof localStorage === 'undefined') return [];
      const data = localStorage.getItem('dgl_roles_v2');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Persists roles to localStorage.
   */
  private saveRolesToStorage(roles: UserRoleDto[]): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('dgl_roles_v2', JSON.stringify(roles));
      }
    } catch {
      return;
    }
  }

private loadEmployeesFromStorage(): EmployeeDto[] {
    try {
      const data = localStorage.getItem('despulpadora_employees');
      return data ? JSON.parse(data) : INITIAL_EMPLOYEES_SAMPLE;
    } catch {
      return INITIAL_EMPLOYEES_SAMPLE;
    }
  }

  /**
   * Loads expenses from localStorage.
   */
  private loadExpensesFromStorage(): ExpenseDto[] {
    try {
      const data = localStorage.getItem('despulpadora_expenses');
      if (!data) {
        return INITIAL_EXPENSES_SAMPLE;
      }
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : INITIAL_EXPENSES_SAMPLE;
    } catch {
      return INITIAL_EXPENSES_SAMPLE;
    }
  }

  /**
   * Loads clients from localStorage.
   */
  private loadClientsFromStorage(): ClientDto[] {
    try {
      const data = localStorage.getItem('despulpadora_clients');
      return data ? JSON.parse(data) : INITIAL_CLIENTS_SAMPLE;
    } catch {
      return INITIAL_CLIENTS_SAMPLE;
    }
  }

  /**
   * Loads product variants from localStorage.
   */
  private loadVariantsFromStorage(): ProductVariantDto[] {
    try {
      const data = localStorage.getItem('despulpadora_variants');
      return data ? JSON.parse(data) : INITIAL_PRODUCT_VARIANTS;
    } catch {
      return INITIAL_PRODUCT_VARIANTS;
    }
  }

  /**
   * Loads monthly sales targets from localStorage.
   */
  private loadSalesTargetsFromStorage(): SalesTargetDto[] {
    try {
      const data = localStorage.getItem('despulpadora_targets');
      return data ? JSON.parse(data) : INITIAL_SALES_TARGETS_SAMPLE;
    } catch {
      return INITIAL_SALES_TARGETS_SAMPLE;
    }
  }

  /**
   * Loads fortnightly payroll periods from localStorage.
   */
  private loadPayrollPeriodsFromStorage(): PayrollPeriodDto[] {
    try {
      const data = localStorage.getItem('despulpadora_payroll_periods');
      return data ? JSON.parse(data) : INITIAL_PAYROLL_PERIODS_SAMPLE;
    } catch {
      return INITIAL_PAYROLL_PERIODS_SAMPLE;
    }
  }

  /**
   * Loads payroll settlements from localStorage.
   */
  private loadPayrollSettlementsFromStorage(): PayrollSettlementDto[] {
    try {
      const data = localStorage.getItem('despulpadora_payroll_settlements');
      if (!data) {
        return INITIAL_PAYROLL_SETTLEMENTS_SAMPLE;
      }
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : INITIAL_PAYROLL_SETTLEMENTS_SAMPLE;
    } catch {
      return INITIAL_PAYROLL_SETTLEMENTS_SAMPLE;
    }
  }

  /**
   * Loads work shifts from localStorage.
   */
  private loadShiftsFromStorage(): WorkShiftDto[] {
    try {
      const data = localStorage.getItem('despulpadora_shifts');
      return data ? JSON.parse(data) : INITIAL_SHIFTS_SAMPLE;
    } catch {
      return INITIAL_SHIFTS_SAMPLE;
    }
  }

  /**
   * Loads company configuration from localStorage.
   */
  private loadCompanyInfoFromStorage(): CompanyConfig {
    try {
      const data = localStorage.getItem('despulpadora_company_info');
      if (!data) {
        return DEFAULT_COMPANY_CONFIG;
      }
      const parsed = JSON.parse(data) as Partial<CompanyConfig>;
      const merged = { ...DEFAULT_COMPANY_CONFIG, ...parsed };
      if (!merged.logoUrl || merged.logoUrl.trim() === '') {
        merged.logoUrl = DEFAULT_COMPANY_CONFIG.logoUrl;
      }
      return merged;
    } catch {
      return DEFAULT_COMPANY_CONFIG;
    }
  }

  /**
   * Synchronizes company settings locally without notification.
   */
  syncCompanyInfoSilent(updates: Partial<CompanyConfig>): void {
    try {
      this.companyInfo.update(prev => ({ ...prev, ...updates }));
      this.saveAllToStorage();
    } catch {
      return;
    }
  }

  /**
   * Updates company settings locally and persists them to the backend API.
   */
  updateCompanyInfo(updates: Partial<CompanyConfig>): void {
    try {
      this.companyInfo.update(prev => ({ ...prev, ...updates }));
      this.saveAllToStorage();
      this.api.updateCompanySettings(this.companyInfo()).subscribe({ error: () => {} });
      this.notification.success('Configuración Guardada', 'Información de la empresa actualizada exitosamente.');
    } catch {
      return;
    }
  }

  /**
   * Loads payment methods from localStorage.
   */
  private loadPaymentMethodsFromStorage(): PaymentMethodDto[] {
    try {
      const data = localStorage.getItem('despulpadora_payment_methods');
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      return INITIAL_PAYMENT_METHODS;
    }
    return INITIAL_PAYMENT_METHODS;
  }

  /**
   * Creates a new payment method locally and syncs to API.
   */
  createPaymentMethod(dto: {
    name: string;
    code?: string;
    type?: 'cash' | 'transfer' | 'card' | 'credit' | 'other';
    description?: string;
  }): PaymentMethodDto {
    try {
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
      this.api.createPaymentMethod({ name: item.name, requiresReference: item.type !== 'cash' }).subscribe({
        error: () => {}
      });
      this.notification.success(
        'Método de Pago Creado',
        `${item.name} se encuentra disponible para todos los pedidos.`
      );
      return item;
    } catch (error: unknown) {
      throw error;
    }
  }

  /**
   * Updates an existing payment method locally and syncs to API.
   */
  updatePaymentMethod(id: number, changes: Partial<PaymentMethodDto>): void {
    try {
      this.paymentMethods.update(list => list.map(p => (p.paymentMethodId === id ? { ...p, ...changes } : p)));
      this.saveAllToStorage();
      this.api.updatePaymentMethod(id, changes).subscribe({ error: () => {} });
      this.notification.success('Método de Pago Actualizado', 'Los cambios han sido guardados.');
    } catch {
      return;
    }
  }

  /**
   * Deletes a payment method locally and syncs to API.
   */
  deletePaymentMethod(id: number): void {
    try {
      const target = this.paymentMethods().find(p => p.paymentMethodId === id);
      this.paymentMethods.update(list => list.filter(p => p.paymentMethodId !== id));
      this.saveAllToStorage();
      this.api.deletePaymentMethod(id).subscribe({ error: () => {} });
      if (target) {
        this.notification.info('Método de Pago Eliminado', `${target.name} fue retirado de las opciones.`);
      }
    } catch {
      return;
    }
  }

  /**
   * Toggles the active state of a payment method.
   */
  togglePaymentMethodStatus(id: number): void {
    try {
      this.paymentMethods.update(list =>
        list.map(p => (p.paymentMethodId === id ? { ...p, isActive: !p.isActive } : p))
      );
      this.saveAllToStorage();
    } catch {
      return;
    }
  }

  /**
   * Restores payment methods to default values.
   */
  resetPaymentMethodsToDefault(): void {
    try {
      this.paymentMethods.set(INITIAL_PAYMENT_METHODS);
      this.saveAllToStorage();
      this.notification.info(
        'Métodos de Pago Restablecidos',
        'Se han restaurado los medios de pago predeterminados.'
      );
    } catch {
      return;
    }
  }

  /**
   * Persists all reactive collections to localStorage.
   */
  private saveAllToStorage(): void {
    try {
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
      localStorage.setItem('despulpadora_portal_cms_config', JSON.stringify(this.portalCmsConfig()));
      localStorage.setItem('despulpadora_payment_methods', JSON.stringify(this.paymentMethods()));
      localStorage.setItem('despulpadora_grammages_config', JSON.stringify(this.grammagesConfig()));
      localStorage.setItem('despulpadora_categories_config', JSON.stringify(this.categoriesConfig()));
    } catch {
      return;
    }
  }

  /**
   * Toggles between light and dark theme.
   */
  toggleTheme(): void {
    try {
      const next = this.activeTheme() === 'dark' ? 'light' : 'dark';
      this.activeTheme.set(next);
      localStorage.setItem('despulpadora_theme', next);
      this.applyTheme(next);
    } catch {
      return;
    }
  }

  /**
   * Applies the active theme attribute to the document root.
   */
  private applyTheme(theme: 'dark' | 'light'): void {
    try {
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', theme);
      }
    } catch {
      return;
    }
  }

  /**
   * Synchronizes all operational modules from the backend API in parallel.
   */
  refreshAll(): void {
    try {
      if (!this.auth.isAuthenticated()) {
        return;
      }

      this.isLoading.set(true);
      const branchId = this.auth.selectedBranch()?.branchId;

      forkJoin({
        fruits: this.api.getFruits().pipe(catchError(() => of([] as FruitDto[]))),
        batches: this.api.getBatches(branchId).pipe(catchError(() => of([] as BatchDto[]))),
        orders: this.api.getOrders(branchId).pipe(catchError(() => of([] as OrderDto[]))),
        clients: this.api.getClients().pipe(catchError(() => of([] as ClientDto[]))),
        employees: this.api.getEmployees(branchId).pipe(catchError(() => of([] as EmployeeDto[]))),
        expenses: this.api.getExpenses(branchId).pipe(catchError(() => of([] as ExpenseDto[]))),
        companySettings: this.api.getCompanySettings().pipe(catchError(() => of(null))),
        paymentMethods: this.api.getPaymentMethods().pipe(catchError(() => of([] as PaymentMethodDto[]))),
        shifts: (this.api.getShifts
          ? this.api.getShifts(branchId).pipe(catchError(() => of(null as WorkShiftDto[] | null)))
          : of(null as WorkShiftDto[] | null)),
        users: (this.api.getUsers
          ? this.api.getUsers().pipe(catchError(() => of([] as UserAdminDto[])))
          : of([] as UserAdminDto[])),
        roles: (this.api.getRoles
          ? this.api.getRoles().pipe(catchError(() => of([] as UserRoleDto[])))
          : of([] as UserRoleDto[]))
      }).subscribe({
        next: res => {
          this.isLoading.set(false);

          if (res.users && res.users.length > 0) {
            this.users.set(res.users);
            this.saveUsersToStorage(res.users);
          }
          if (res.roles && res.roles.length > 0) {
            this.roles.set(res.roles);
            this.saveRolesToStorage(res.roles);
          }

          const existingList = this.fruits();
          const mappedFruits: FruitConfig[] = (res.fruits || []).map((apiFruit: FruitDto) => {
            const existing = existingList.find(
              f => f.fruitId === apiFruit.fruitId || f.name.toLowerCase() === apiFruit.name.toLowerCase()
            );
            const color = apiFruit.colorHex || apiFruit.pulpColor || existing?.color || '';
            const apiRawStock = Number(apiFruit.rawStockKg ?? 0);
            const resolvedFreshStockKg =
              apiRawStock > 0 ? apiRawStock : (existing?.freshStockKg ?? apiRawStock);
            const apiYieldRate = (apiFruit.yieldPercentage || apiFruit.expectedYieldPercentage || 0) / 100;
            return {
              id:
                existing?.id ||
                (apiFruit.code || apiFruit.name || String(apiFruit.fruitId))
                  .toLowerCase()
                  .replace(/\s+/g, '_'),
              fruitId: apiFruit.fruitId,
              name: apiFruit.name,
              scientificName: existing?.scientificName || '',
              description: existing?.description || '',
              imageUrl: existing?.imageUrl || '',
              isVisibleInPortal: existing?.isVisibleInPortal ?? true,
              color,
              bgColor: existing?.bgColor || '',
              borderColor: existing?.borderColor || color,
              emoji: '',
              yieldRate: apiYieldRate > 0 ? apiYieldRate : (existing?.yieldRate ?? 0),
              waterAdditionDefault: existing?.waterAdditionDefault ?? 0,
              freshStockKg: resolvedFreshStockKg,
              stock: {
                g140: apiFruit.stock100g ?? existing?.stock.g140 ?? 0,
                g250: apiFruit.stock250g ?? existing?.stock.g250 ?? 0,
                g500: apiFruit.stock500g ?? existing?.stock.g500 ?? 0,
                g1000: apiFruit.stock1000g ?? existing?.stock.g1000 ?? 0
              },
              minStock: existing?.minStock ?? { g140: 0, g250: 0, g500: 0, g1000: 0 },
              prices: {
                g140: apiFruit.price140g ?? apiFruit.price100g ?? apiFruit.unitPrice ?? existing?.prices.g140 ?? 0,
                g250: apiFruit.price250g ?? existing?.prices.g250 ?? 0,
                g500: apiFruit.price500g ?? existing?.prices.g500 ?? 0,
                g1000: apiFruit.price1000g ?? existing?.prices.g1000 ?? 0
              },
              category: apiFruit.category || existing?.category || ''
            };
          });
          this.fruits.set(mappedFruits);

          this.batches.set(res.batches || []);
          this.orders.set(res.orders || []);
          this.clients.set(res.clients || []);
          this.employees.set(res.employees || []);
          this.expenses.set(res.expenses || []);

          if (res.shifts) {
            this.shifts.set(res.shifts);
          }

          if (res.companySettings) {
            const settings = { ...res.companySettings };
            if (!settings.logoUrl || settings.logoUrl.trim() === '') {
              settings.logoUrl = DEFAULT_COMPANY_CONFIG.logoUrl;
            }
            this.companyInfo.set(settings);
            const dbMonthlyTarget = Number(settings.monthlySalesTarget ?? 0);
            if (dbMonthlyTarget > 0) {
              const now = new Date();
              const currentYear = now.getFullYear();
              const currentMonth = now.getMonth() + 1;
              this.salesTargets.update(list => {
                const idx = list.findIndex(t => t.year === currentYear && t.month === currentMonth);
                if (idx >= 0) {
                  const updated = [...list];
                  updated[idx] = { ...updated[idx], targetRevenue: dbMonthlyTarget };
                  return updated;
                }
                return [
                  {
                    targetId: Date.now(),
                    year: currentYear,
                    month: currentMonth,
                    targetRevenue: dbMonthlyTarget,
                    workingDays: 26,
                    createdAt: now.toISOString()
                  },
                  ...list
                ];
              });
            }
          }

          this.paymentMethods.set(res.paymentMethods || []);
          this.saveAllToStorage();
        },
        error: () => {
          this.isLoading.set(false);
        }
      });
    } catch {
      this.isLoading.set(false);
    }
  }

  /**
   * Registers a new production batch and syncs to the backend API.
   */
  createBatch(batchData: {
    fruitId: string | number;
    fruitName: string;
    grossKg: number;
    waterPct: number;
    costPerKg: number;
    operatorName: string;
    notes?: string;
  }): BatchDto {
    try {
      const fruit = this.fruits().find(f => f.id === batchData.fruitId || f.fruitId === Number(batchData.fruitId));
      const yieldRate = fruit ? fruit.yieldRate : 0;
      const pulpKg = Number((batchData.grossKg * yieldRate * (1 + batchData.waterPct / 100)).toFixed(2));
      const realYield =
        batchData.grossKg > 0 ? Number(((pulpKg / batchData.grossKg) * 100).toFixed(1)) : 0;

      const newBatch: BatchDto = {
        batchId: Date.now(),
        batchCode: `LOTE-${new Date().toISOString().substring(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
        fruitId: typeof batchData.fruitId === 'number' ? batchData.fruitId : fruit?.fruitId || 0,
        fruitName: batchData.fruitName,
        branchId: this.auth.selectedBranch()?.branchId || 0,
        branchName: this.auth.selectedBranch()?.name || '',
        grossFruitKg: batchData.grossKg,
        pulpProducedKg: pulpKg,
        realYieldPercentage: realYield,
        costPerKg: batchData.costPerKg,
        status: 'COMPLETED',
        operatorName: batchData.operatorName,
        productionDate: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      this.batches.update(list => [newBatch, ...list]);

      if (fruit) {
        this.fruits.update(list =>
          list.map(f => {
            if (f.name === fruit.name) {
              const updatedFresh = Math.max(0, f.freshStockKg - batchData.grossKg);
              return { ...f, freshStockKg: updatedFresh };
            }
            return f;
          })
        );
      }

      this.saveAllToStorage();
      this.notification.success('¡Lote Procesado!', `${batchData.fruitName}: ${pulpKg} Kg de pulpa obtenidos`);

      this.api
        .createBatch({
          fruitId: newBatch.fruitId,
          branchId: newBatch.branchId,
          grossFruitKg: newBatch.grossFruitKg,
          netPulpKg: pulpKg,
          costPerKg: newBatch.costPerKg,
          notes: batchData.notes
        })
        .subscribe({
          next: apiBatch => {
            if (apiBatch?.batchId) {
              this.api.completeBatch(apiBatch.batchId, pulpKg).subscribe({ error: () => {} });
            }
          },
          error: () => {}
        });

      return newBatch;
    } catch (error: unknown) {
      throw error;
    }
  }

  /**
   * Adjusts packed pulp stock by grammage and syncs to the backend API.
   */
  adjustStock(fruitName: string, grammage: 'g140' | 'g250' | 'g500' | 'g1000', delta: number): void {
    try {
      let targetFruitId = 0;
      this.fruits.update(list =>
        list.map(f => {
          if (f.name.toLowerCase() === fruitName.toLowerCase()) {
            targetFruitId = f.fruitId || 0;
            const current = f.stock[grammage] || 0;
            const nextVal = Math.max(0, current + delta);
            return {
              ...f,
              stock: { ...f.stock, [grammage]: nextVal }
            };
          }
          return f;
        })
      );
      this.saveAllToStorage();
      if (targetFruitId > 0) {
        const numericGrammage = Number(grammage.replace('g', '')) as 140 | 250 | 500 | 1000;
        this.api
          .adjustStock({
            fruitId: targetFruitId,
            grammage: numericGrammage,
            quantityDelta: delta,
            reason: 'Ajuste operativo en planta'
          })
          .subscribe({ error: () => {} });
      }
      this.notification.info('Stock Actualizado', `${fruitName} (${grammage}): ${delta > 0 ? '+' : ''}${delta} uds`);
    } catch {
      return;
    }
  }

  /**
   * Adjusts fresh fruit stock in kilograms and syncs to the backend API.
   */
  adjustFreshFruitStock(fruitIdOrName: string, deltaKg: number): void {
    try {
      let targetFruitName = fruitIdOrName;
      let targetFruitId = 0;
      this.fruits.update(list =>
        list.map(f => {
          if (f.id === fruitIdOrName || f.name.toLowerCase() === fruitIdOrName.toLowerCase()) {
            targetFruitName = f.name;
            targetFruitId = f.fruitId || 0;
            const nextKg = Math.max(0, Number(((f.freshStockKg || 0) + deltaKg).toFixed(1)));
            return { ...f, freshStockKg: nextKg };
          }
          return f;
        })
      );
      this.saveAllToStorage();
      if (targetFruitId > 0) {
        this.api.adjustFruitStock(targetFruitId, { rawStockKgDelta: deltaKg }).subscribe({ error: () => {} });
      }
      this.notification.info(
        'Inventario de Fruta Actualizado',
        `${targetFruitName}: ${deltaKg > 0 ? '+' : ''}${deltaKg} Kg de fruta fresca`
      );
    } catch {
      return;
    }
  }

  /**
   * Creates or updates a fresh fruit inventory item in kilograms and synchronizes with the backend API and all PWA modules.
   */
  saveFreshFruitItem(payload: {
    id?: string;
    fruitId?: number;
    name: string;
    freshStockKg: number;
    yieldPercentage?: number;
    scientificName?: string;
  }): FruitConfig | null {
    try {
      const cleanName = payload.name.trim();
      if (!cleanName) {
        return null;
      }
      const weightKg = Math.max(0, Number(Number(payload.freshStockKg || 0).toFixed(1)));
      const yieldPct = Math.max(0, Math.min(100, Number(payload.yieldPercentage ?? 0)));
      const yieldRate = Number((yieldPct / 100).toFixed(4));
      const cleanScientific = (payload.scientificName ?? '').trim();

      const currentList = this.fruits();
      const existing = currentList.find(
        f =>
          (payload.id && f.id === payload.id) ||
          (payload.fruitId && f.fruitId === payload.fruitId) ||
          f.name.toLowerCase() === cleanName.toLowerCase()
      );

      if (existing) {
        const previousName = existing.name;
        const previousKg = existing.freshStockKg || 0;
        const deltaKg = Number((weightKg - previousKg).toFixed(1));
        const updatedFruit: FruitConfig = {
          ...existing,
          name: cleanName,
          scientificName: cleanScientific,
          freshStockKg: weightKg,
          yieldRate: yieldPct > 0 ? yieldRate : existing.yieldRate
        };

        this.fruits.update(list => list.map(f => (f.id === existing.id ? updatedFruit : f)));

        if (previousName.toLowerCase() !== cleanName.toLowerCase()) {
          this.productVariants.update(variants =>
            variants.map(v =>
              v.fruitId === existing.fruitId || v.fruitName.toLowerCase() === previousName.toLowerCase()
                ? { ...v, fruitName: cleanName }
                : v
            )
          );
        }

        this.saveAllToStorage();

        if (existing.fruitId && existing.fruitId > 0) {
          this.api
            .updateFruit?.(existing.fruitId, {
              name: cleanName,
              rawStockKg: weightKg,
              yieldPercentage: Math.round((updatedFruit.yieldRate || 0) * 100),
              expectedYieldPercentage: Math.round((updatedFruit.yieldRate || 0) * 100)
            })
            ?.subscribe({ error: () => {} });

          if (deltaKg !== 0) {
            this.api
              .adjustFruitStock?.(existing.fruitId, { rawStockKgDelta: deltaKg })
              ?.subscribe({ error: () => {} });
          }
        }

        this.notification.success(
          'Fruta Actualizada',
          `${cleanName}: ${weightKg} Kg disponibles en planta.`
        );
        return updatedFruit;
      }

      const nextFruitId = Math.max(0, ...currentList.map(f => f.fruitId || 0)) + 1;
      const slug =
        cleanName
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_|_$/g, '') || `fruit_${nextFruitId}`;

      let resolvedFruit: FruitConfig = {
        id: `${slug}_${nextFruitId}`,
        fruitId: nextFruitId,
        name: cleanName,
        scientificName: cleanScientific,
        description: '',
        imageUrl: '',
        isVisibleInPortal: true,
        color: '#1e5e3a',
        bgColor: '#f0fdf4',
        borderColor: '#1e5e3a',
        emoji: '',
        yieldRate,
        waterAdditionDefault: 0,
        freshStockKg: weightKg,
        stock: { g140: 0, g250: 0, g500: 0, g1000: 0 },
        minStock: { g140: 0, g250: 0, g500: 0, g1000: 0 },
        prices: { g140: 0, g250: 0, g500: 0, g1000: 0 },
        category: 'PULPAS'
      };

      this.fruits.update(list => [resolvedFruit, ...list]);
      this.saveAllToStorage();

      this.api
        .createFruit?.({
          name: cleanName,
          code: slug.toUpperCase().slice(0, 12),
          category: 'PULPAS',
          colorHex: '#1e5e3a',
          yieldPercentage: yieldPct,
          expectedYieldPercentage: yieldPct,
          rawStockKg: weightKg,
          unitPrice: 0
        })
        ?.subscribe({
          next: (createdDto: FruitDto) => {
            if (createdDto && createdDto.fruitId) {
              resolvedFruit = { ...resolvedFruit, fruitId: createdDto.fruitId };
              this.fruits.update(list =>
                list.map(f =>
                  f.id === resolvedFruit.id ? { ...f, fruitId: createdDto.fruitId } : f
                )
              );
              this.saveAllToStorage();
              if (weightKg > 0 && (createdDto.rawStockKg ?? 0) === 0) {
                this.api
                  .adjustFruitStock?.(createdDto.fruitId, { rawStockKgDelta: weightKg })
                  ?.subscribe({ error: () => {} });
              }
            }
          },
          error: () => {}
        });

      this.notification.success(
        'Fruta Registrada en Inventario',
        `${cleanName} agregada con ${weightKg} Kg disponibles en planta.`
      );
      return resolvedFruit;
    } catch {
      return null;
    }
  }

  /**
   * Deletes a fresh fruit inventory item by id or name and synchronizes with the backend API.
   */
  deleteFreshFruitItem(fruitIdOrSlug: string): void {
    try {
      const target = this.fruits().find(
        f => f.id === fruitIdOrSlug || String(f.fruitId) === String(fruitIdOrSlug)
      );
      if (!target) {
        return;
      }
      this.fruits.update(list => list.filter(f => f.id !== target.id));
      this.saveAllToStorage();
      if (target.fruitId && target.fruitId > 0) {
        this.api.deleteFruit?.(target.fruitId)?.subscribe({ error: () => {} });
      }
      this.notification.info(
        'Fruta Eliminada',
        `"${target.name}" fue retirada del inventario de planta.`
      );
    } catch {
      return;
    }
  }

  /**
   * Returns the Spanish weekday name for a date instance.
   */
  getSpanishWeekday(date: Date = new Date()): string {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const idx = date instanceof Date && !Number.isNaN(date.getTime()) ? date.getDay() : new Date().getDay();
    return days[idx] ?? 'Lunes';
  }

  /**
   * Creates a commercial order and syncs to `POST /api/orders`.
   */
  createOrder(orderData: {
    clientName: string;
    clientPhone?: string;
    clientAddress?: string;
    items: {
      fruitName: string;
      grammage: number;
      quantity: number;
      unitPrice: number;
    }[];
    notes?: string;
    paymentMethodName?: string;
    courierName?: string;
    scheduledDay?: string;
    isPriority?: boolean;
  }): OrderDto {
    try {
      const totalAmount = orderData.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

      const newOrder: OrderDto = {
        orderId: Date.now(),
        orderNumber: `PED-${new Date().toISOString().substring(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
        branchId: this.auth.selectedBranch()?.branchId || 0,
        branchName: this.auth.selectedBranch()?.name || '',
        clientId: Date.now(),
        clientName: orderData.clientName,
        clientPhone: orderData.clientPhone || '',
        clientAddress: orderData.clientAddress || '',
        status: 'PENDING',
        orderDate: new Date().toISOString().substring(0, 10),
        scheduledDay: orderData.scheduledDay || this.getSpanishWeekday(),
        isPriority: Boolean(orderData.isPriority),
        totalAmount,
        isPaid: false,
        paymentMethodName: orderData.paymentMethodName || '',
        courierName: orderData.courierName,
        notes: orderData.notes,
        createdAt: new Date().toISOString(),
        items: orderData.items.map(i => {
          const fruit = this.fruits().find(f => f.name.toLowerCase() === i.fruitName.toLowerCase());
          return {
            fruitId: fruit?.fruitId || 0,
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
      this.api
        .createOrder({
          clientName: newOrder.clientName,
          clientPhone: newOrder.clientPhone,
          clientAddress: newOrder.clientAddress,
          paymentMethod: newOrder.paymentMethodName,
          scheduledDay: newOrder.scheduledDay,
          isPriority: newOrder.isPriority,
          notes: newOrder.notes,
          items: newOrder.items.map(i => ({
            fruitId: i.fruitId,
            grammage: i.grammage,
            presentationGrams: i.grammage,
            quantity: i.quantity,
            unitPrice: i.unitPrice
          }))
        })
        .subscribe({ error: () => {} });
      this.notification.success(
        'Pedido Creado',
        `Orden #${newOrder.orderNumber} por $${totalAmount.toLocaleString('es-CO')}`
      );

      return newOrder;
    } catch (error: unknown) {
      throw error;
    }
  }

  /**
   * Updates an existing order and syncs to `PUT /api/orders/{id}`.
   */
  updateOrder(
    orderId: number,
    orderData: {
      clientName: string;
      clientPhone?: string;
      clientAddress?: string;
      items: {
        fruitName: string;
        grammage: number;
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
  ): void {
    try {
      const totalAmount = orderData.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

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
                  fruitId: fruit?.fruitId || existingItem?.fruitId || 0,
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
      const updatedOrder = this.orders().find(o => o.orderId === orderId);
      if (updatedOrder) {
        this.api
          .updateOrder(orderId, {
            clientName: updatedOrder.clientName,
            clientPhone: updatedOrder.clientPhone,
            clientAddress: updatedOrder.clientAddress,
            paymentMethod: updatedOrder.paymentMethodName,
            notes: updatedOrder.notes,
            items: updatedOrder.items.map(i => ({
              fruitId: i.fruitId,
              grammage: i.grammage,
              presentationGrams: i.grammage,
              quantity: i.quantity,
              unitPrice: i.unitPrice
            }))
          })
          .subscribe({ error: () => {} });
      }
      this.notification.success(
        'Pedido Modificado',
        `Los cambios del pedido fueron guardados ($${totalAmount.toLocaleString('es-CO')}).`
      );
    } catch {
      return;
    }
  }

  /**
   * Updates the scheduled preparation day for an order.
   */
  updateOrderScheduledDay(orderId: number, dayName: string): void {
    try {
      const target = this.orders().find(o => o.orderId === orderId);
      if (!target) {
        return;
      }

      this.orders.update(list => list.map(o => (o.orderId === orderId ? { ...o, scheduledDay: dayName } : o)));
      this.saveAllToStorage();
      this.api.updateOrderStatus({ orderId, status: target.status, scheduledDay: dayName }).subscribe({
        error: () => {}
      });
      this.notification.success(
        'Día de Alistamiento Actualizado',
        `El pedido #${target.orderNumber} fue movido al día ${dayName}.`
      );
    } catch {
      return;
    }
  }

  /**
   * Deletes an order and syncs to `DELETE /api/orders/{id}`.
   */
  deleteOrder(orderId: number): void {
    try {
      const target = this.orders().find(o => o.orderId === orderId);
      this.orders.update(list => list.filter(o => o.orderId !== orderId));
      this.saveAllToStorage();
      this.api.deleteOrder(orderId).subscribe({ error: () => {} });
      if (target) {
        this.notification.info('Pedido Eliminado', `La orden #${target.orderNumber} fue retirada.`);
      }
    } catch {
      return;
    }
  }

  /**
   * Updates an order status and syncs to `PATCH /api/orders/{id}/status`.
   */
  updateOrderStatus(orderId: number, newStatus: OrderStatus): void {
    try {
      this.orders.update(list =>
        list.map(o => {
          if (o.orderId === orderId) {
            if (newStatus === 'DISPATCHED' && o.status !== 'DISPATCHED' && o.status !== 'DELIVERED') {
              o.items.forEach(item => {
                const gramKey = `g${item.grammage}` as 'g140' | 'g250' | 'g500' | 'g1000';
                this.adjustStock(item.fruitName || '', gramKey, -item.quantity);
              });
            }
            return { ...o, status: newStatus };
          }
          return o;
        })
      );

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

      this.api.updateOrderStatus({ orderId, status: newStatus }).subscribe({
        error: () => {}
      });
    } catch {
      return;
    }
  }

  /**
   * Dispatches and persists an ordered courier delivery route to the database via `POST /api/orders/dispatch-route`.
   */
  dispatchCourierRoute(dto: DispatchCourierRouteDto): void {
    try {
      const orderIdSet = new Set(dto.orderIds);
      const normalizedCourierName = (dto.courierName || '').trim().toLowerCase();

      this.orders.update(list =>
        list.map(o => {
          if (orderIdSet.has(o.orderId)) {
            if (o.status !== 'DISPATCHED' && o.status !== 'DELIVERED') {
              o.items.forEach(item => {
                const gramKey = `g${item.grammage}` as 'g140' | 'g250' | 'g500' | 'g1000';
                this.adjustStock(item.fruitName || '', gramKey, -item.quantity);
              });
            }
            const seqIndex = dto.orderIds.indexOf(o.orderId) + 1;
            return {
              ...o,
              courierId: dto.courierId,
              courierName: dto.courierName || o.courierName,
              routeSequenceOrder: seqIndex,
              status: o.status === 'DELIVERED' ? 'DELIVERED' : 'DISPATCHED',
              dispatchedAtUtc: o.dispatchedAtUtc || new Date().toISOString()
            };
          }

          const belongedToCourier =
            (dto.courierId > 0 && o.courierId === dto.courierId) ||
            (normalizedCourierName.length > 0 && (o.courierName || '').trim().toLowerCase() === normalizedCourierName);
          if (belongedToCourier && o.status !== 'DELIVERED' && o.status !== 'CANCELLED') {
            return {
              ...o,
              courierId: undefined,
              courierName: undefined,
              routeSequenceOrder: undefined,
              status: 'BILLED'
            };
          }
          return o;
        })
      );

      this.saveAllToStorage();
      this.api
        .dispatchOrdersRoute?.({
          courierId: dto.courierId,
          courierName: dto.courierName,
          orderIds: dto.orderIds
        })
        ?.subscribe({
          error: () => {}
        });
    } catch {
      return;
    }
  }

  /**
   * Updates the picked quantity of an order item and syncs to `PATCH /api/orders/{orderId}/items/{itemId}/picked`.
   */
  updateItemPickedQuantity(orderId: number, fruitId: number, grammage: number, pickedQty: number): void {
    try {
      let targetItemId = 0;
      this.orders.update(list =>
        list.map(o => {
          if (o.orderId === orderId) {
            const updatedItems = o.items.map(item => {
              if (item.fruitId === fruitId && item.grammage === grammage) {
                targetItemId = item.orderItemId || item.id || 0;
                return { ...item, pickedQuantity: pickedQty };
              }
              return item;
            });

            const allDone = updatedItems.every(i => (i.pickedQuantity || 0) >= i.quantity);
            const nextStatus: OrderStatus = allDone ? 'BILLED' : 'PICKING';

            return { ...o, items: updatedItems, status: nextStatus };
          }
          return o;
        })
      );
      this.saveAllToStorage();
      if (targetItemId > 0) {
        this.api.updateOrderItemPicking(orderId, targetItemId, pickedQty).subscribe({ error: () => {} });
      }
    } catch {
      return;
    }
  }

  /**
   * Toggles the priority flag of an order and syncs to the backend API.
   */
  toggleOrderPriority(orderId: number, isPriority?: boolean): void {
    try {
      let resolvedPriority = false;
      this.orders.update(list =>
        list.map(o => {
          if (o.orderId === orderId) {
            const nextVal = isPriority !== undefined ? isPriority : !o.isPriority;
            resolvedPriority = nextVal;
            return { ...o, isPriority: nextVal };
          }
          return o;
        })
      );
      this.saveAllToStorage();
      if (this.api.toggleOrderPriority) {
        this.api.toggleOrderPriority(orderId, resolvedPriority).subscribe({ error: () => {} });
      }
    } catch {
      return;
    }
  }

  /**
   * Sets the priority flag of an order by identifier or order number.
   */
  setOrderPriority(identifier: number | string, isPriority: boolean = true): void {
    try {
      this.orders.update(list =>
        list.map(o => {
          if (o.orderId === identifier || o.orderNumber === identifier) {
            return { ...o, isPriority };
          }
          return o;
        })
      );
      this.saveAllToStorage();
    } catch {
      return;
    }
  }

  /**
   * Registers an operational expense and syncs to `POST /api/accounting/transactions`.
   */
  addExpense(dto: { categoryName: string; description: string; amount: number; receiptNumber?: string }): void {
    try {
      const newExpense: ExpenseDto = {
        expenseId: Date.now(),
        branchId: this.auth.selectedBranch()?.branchId || 0,
        branchName: this.auth.selectedBranch()?.name || '',
        categoryId: 0,
        categoryName: dto.categoryName,
        description: dto.description,
        amount: dto.amount,
        expenseDate: new Date().toISOString().substring(0, 10),
        receiptNumber: dto.receiptNumber || '',
        createdAt: new Date().toISOString()
      };

      this.expenses.update(list => [newExpense, ...list]);
      this.saveAllToStorage();
      this.notification.success(
        'Gasto Registrado',
        `$${dto.amount.toLocaleString('es-CO')} - ${dto.categoryName}`
      );

      this.api
        .createExpense({
          branchId: newExpense.branchId,
          categoryId: newExpense.categoryId,
          category: dto.categoryName,
          description: newExpense.description,
          amount: newExpense.amount,
          expenseDate: newExpense.expenseDate,
          receiptNumber: newExpense.receiptNumber
        })
        .subscribe({
          error: () => {}
        });
    } catch {
      return;
    }
  }

  /**
   * Upserts a monthly commercial sales target.
   */
  upsertSalesTarget(dto: UpsertSalesTargetDto): void {
    try {
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

      this.companyInfo.update(prev => ({
        ...prev,
        monthlySalesTarget: dto.targetRevenue
      }));
      this.saveAllToStorage();
      this.api.updateCompanySettings?.(this.companyInfo())?.subscribe({
        error: () => {}
      });
      this.notification.success(
        'Meta Actualizada',
        `Meta fijada en $${dto.targetRevenue.toLocaleString('es-CO')}`
      );
    } catch {
      return;
    }
  }

  /**
   * Settles fortnightly payroll for an employee.
   */
  settlePayroll(dto: CreatePayrollSettlementDto): PayrollSettlementDto {
    try {
      const employee = this.employees().find(e => e.employeeId === dto.employeeId);
      if (!employee) {
        throw new Error('Empleado no encontrado');
      }

      const days = Math.min(15, Math.max(1, dto.daysWorked));
      const baseDaily = employee.baseSalary / 30;
      const baseSalaryEarned = Math.round(baseDaily * days);

      const transportAllowanceTotal = employee.transportAllowance ?? 0;
      const transportDaily = transportAllowanceTotal / 30;
      const transportAllowanceEarned = Math.round(transportDaily * days);

      const deliveryRate = dto.deliveryBonusRate ?? employee.deliveryBonusRate ?? 0;
      const deliveryBonuses = (dto.deliveryCount || 0) * deliveryRate;

      const overtime = dto.overtimeAmount || 0;
      const otherBonuses = dto.otherBonuses || 0;
      const totalEarnings =
        baseSalaryEarned + transportAllowanceEarned + deliveryBonuses + overtime + otherBonuses;

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
        area: (employee.area ?? '') as EmployeeArea,
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

      this.payrollSettlements.update(list => {
        const filtered = list.filter(s => !(s.periodId === dto.periodId && s.employeeId === dto.employeeId));
        return [settlement, ...filtered];
      });

      this.saveAllToStorage();
      if (this.api.createPayrollSettlement) {
        this.api
          .createPayrollSettlement({
            employeeId: employee.employeeId,
            periodLabel: String(dto.periodId),
            netAmountPaid: netPayable
          })
          .pipe(catchError(() => of(null)))
          .subscribe();
      }
      this.notification.success(
        'Nómina Quincenal Liquidada',
        `${employee.fullName}: Neto a pagar $${netPayable.toLocaleString('es-CO')}`
      );

      return settlement;
    } catch (error: unknown) {
      throw error;
    }
  }

  /**
   * Adjusts product variant stock.
   */
  adjustVariantStock(variantId: number, delta: number): void {
    try {
      this.productVariants.update(list =>
        list.map(v => {
          if (v.variantId === variantId) {
            const nextVal = Math.max(0, v.currentStock + delta);
            return { ...v, currentStock: nextVal };
          }
          return v;
        })
      );
      this.saveAllToStorage();
    } catch {
      return;
    }
  }

  /**
   * Adds a new product variant.
   */
  addProductVariant(variant: Omit<ProductVariantDto, 'variantId'>): ProductVariantDto {
    try {
      const nextId = Math.max(0, ...this.productVariants().map(v => v.variantId)) + 1;
      const newVariant: ProductVariantDto = {
        ...variant,
        variantId: nextId
      };

      this.productVariants.update(list => [newVariant, ...list]);
      this.saveAllToStorage();
      this.notification.success('Presentación Creada', `${newVariant.name} agregada al inventario.`);
      return newVariant;
    } catch (error: unknown) {
      throw error;
    }
  }

  /**
   * Updates an existing product variant.
   */
  updateProductVariant(variantId: number, changes: Partial<ProductVariantDto>): void {
    try {
      this.productVariants.update(list =>
        list.map(v => {
          if (v.variantId === variantId) {
            return { ...v, ...changes };
          }
          return v;
        })
      );
      this.saveAllToStorage();
      this.notification.success('Presentación Actualizada', 'Los cambios han sido guardados.');
    } catch {
      return;
    }
  }

  /**
   * Deletes a product variant.
   */
  deleteProductVariant(variantId: number): void {
    try {
      const existing = this.productVariants().find(v => v.variantId === variantId);
      this.productVariants.update(list => list.filter(v => v.variantId !== variantId));
      this.saveAllToStorage();
      if (existing) {
        this.notification.info('Presentación Eliminada', `${existing.name} retirada del inventario.`);
      }
    } catch {
      return;
    }
  }

  /**
   * Resets product variants to default catalog.
   */
  resetProductVariantsToDefault(): void {
    try {
      this.productVariants.set(INITIAL_PRODUCT_VARIANTS);
      this.saveAllToStorage();
      this.notification.info('Catálogo Restablecido', 'Se cargaron las presentaciones predeterminadas.');
    } catch {
      return;
    }
  }

  /**
   * Creates a new client and syncs to `POST /api/clients`.
   */
  createClient(dto: CreateClientDto): ClientDto {
    try {
      const nextId = Math.max(0, ...this.clients().map(c => c.clientId)) + 1;
      const newClient: ClientDto = {
        clientId: nextId,
        fullName: dto.fullName.trim(),
        identificationTypeId: dto.identificationTypeId ?? 0,
        identificationNumber: dto.identificationNumber.trim(),
        phone: dto.phone.trim(),
        email: dto.email?.trim() || '',
        address: dto.address?.trim() || '',
        city: dto.city?.trim() || '',
        notes: dto.notes?.trim() || '',
        isActive: true
      };

      this.clients.update(list => [newClient, ...list]);
      this.saveAllToStorage();
      this.api.createClient(dto).subscribe({ error: () => {} });
      this.notification.success('Cliente Creado', `${newClient.fullName} fue registrado exitosamente.`);
      return newClient;
    } catch (error: unknown) {
      throw error;
    }
  }

  /**
   * Updates an existing client and syncs to `PUT /api/clients/{id}`.
   */
  updateClient(clientId: number, changes: Partial<ClientDto>): void {
    try {
      this.clients.update(list => list.map(c => (c.clientId === clientId ? { ...c, ...changes } : c)));
      this.saveAllToStorage();
      this.api.updateClient(clientId, changes).subscribe({ error: () => {} });
      this.notification.success('Cliente Actualizado', 'Los datos del cliente han sido guardados.');
    } catch {
      return;
    }
  }

  /**
   * Deletes a client and syncs to `DELETE /api/clients/{id}`.
   */
  deleteClient(clientId: number): void {
    try {
      const target = this.clients().find(c => c.clientId === clientId);
      this.clients.update(list => list.filter(c => c.clientId !== clientId));
      this.saveAllToStorage();
      this.api.deleteClient(clientId).subscribe({ error: () => {} });
      if (target) {
        this.notification.info('Cliente Eliminado', `${target.fullName} fue retirado del directorio.`);
      }
    } catch {
      return;
    }
  }

  /**
   * Starts a work shift for an employee or operator user.
   */
  startWorkShift(
    employeeId: number,
    shiftType: 'MORNING' | 'AFTERNOON' | 'NIGHT',
    notes?: string,
    employeeName?: string
  ): WorkShiftDto {
    try {
      const emp = this.employees().find(e => e.employeeId === employeeId);
      const resolvedName = (employeeName && employeeName.trim()) ? employeeName.trim() : (emp ? emp.fullName : '');
      const branchId = this.auth.selectedBranch()?.branchId || 0;
      const newShift: WorkShiftDto = {
        shiftId: Date.now(),
        employeeId,
        employeeName: resolvedName,
        branchId,
        branchName: this.auth.selectedBranch()?.name || '',
        startTime: new Date().toISOString(),
        shiftType,
        status: 'ACTIVE',
        notes: notes || ''
      };
      this.shifts.update(list => [newShift, ...list]);
      this.saveAllToStorage();
      this.api
        .startShift({
          employeeId,
          branchId,
          shiftType,
          notes: newShift.notes
        })
        .subscribe({ error: () => {} });
      return newShift;
    } catch (error: unknown) {
      throw error;
    }
  }

  /**
   * Closes an active work shift and computes real elapsed hours.
   */
  closeWorkShift(shiftId: number, notes?: string): void {
    try {
      const closedIso = new Date().toISOString();
      this.shifts.update(list =>
        list.map(s => {
          if (s.shiftId === shiftId) {
            const elapsedHours = this.calculateElapsedHours(s.startTime, closedIso);
            return {
              ...s,
              status: 'CLOSED',
              endTime: closedIso,
              hoursWorked: elapsedHours,
              notes: notes ? `${s.notes || ''} | Cierre: ${notes}` : s.notes
            };
          }
          return s;
        })
      );
      this.saveAllToStorage();
      this.api.closeShift({ shiftId, notes }).subscribe({ error: () => {} });
    } catch {
      return;
    }
  }

  /**
   * Calculates real elapsed hours between `startTime` and `endTime`.
   */
  private calculateElapsedHours(startTime: string, endTime: string): number {
    try {
      const startMs = Date.parse(startTime);
      const endMs = Date.parse(endTime);
      if (!Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs >= startMs) {
        return Number(((endMs - startMs) / (1000 * 60 * 60)).toFixed(2));
      }
      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * Creates an employee via `ApiService.createEmployee` and updates reactive state.
   */
  createEmployee(dto: Partial<EmployeeDto>): Observable<EmployeeDto> {
    try {
      return this.api.createEmployee(dto).pipe(
        tap((created: EmployeeDto) => {
          this.employees.update(list => [created, ...list]);
          this.saveAllToStorage();
        })
      );
    } catch (error: unknown) {
      throw error;
    }
  }

  /**
   * Updates an employee via `ApiService.updateEmployee` and updates reactive state.
   */
  updateEmployee(employeeId: number, dto: Partial<EmployeeDto>): Observable<EmployeeDto> {
    try {
      return this.api.updateEmployee(employeeId, dto).pipe(
        tap((updated: EmployeeDto) => {
          this.employees.update(list =>
            list.map(e => (e.employeeId === employeeId || e.id === employeeId ? updated : e))
          );
          this.saveAllToStorage();
        })
      );
    } catch (error: unknown) {
      throw error;
    }
  }

  /**
   * Deletes an employee locally and syncs to `DELETE /api/employees/{id}`.
   */
  deleteEmployee(employeeId: number): void {
    try {
      const target = this.employees().find(e => e.employeeId === employeeId);
      this.employees.update(list => list.filter(e => e.employeeId !== employeeId));
      this.saveAllToStorage();
      this.api.deleteEmployee(employeeId).subscribe({ error: () => {} });
      if (target) {
        this.notification.info('Personal Eliminado', `${target.fullName} fue retirado del personal de la empresa.`);
      }
    } catch {
      return;
    }
  }

  /**
   * Loads client portal CMS configuration from localStorage.
   */
  private loadPortalCmsConfigFromStorage(): PortalCmsConfig {
    try {
      const data = localStorage.getItem('despulpadora_portal_cms_config');
      if (data) {
        const parsed = JSON.parse(data) as Partial<PortalCmsConfig>;
        return { ...DEFAULT_PORTAL_CMS_CONFIG, ...parsed };
      }
    } catch {
      return DEFAULT_PORTAL_CMS_CONFIG;
    }
    return DEFAULT_PORTAL_CMS_CONFIG;
  }

  /**
   * Updates client portal CMS header and banner texts.
   */
  updatePortalCmsConfig(updates: Partial<PortalCmsConfig>): void {
    try {
      this.portalCmsConfig.update(prev => ({ ...prev, ...updates }));
      this.saveAllToStorage();
      this.notification.success(
        'Portal Clientes Actualizado',
        'Los textos del encabezado y banner han sido guardados.'
      );
    } catch {
      return;
    }
  }

  /**
   * Updates a fruit catalog card in state, synchronizes variants, and persists to `PUT /api/fruits/{id}`.
   */
  updateFruitCatalogCard(idOrFruitId: string | number, updates: Partial<FruitConfig>, silent: boolean = false): void {
    try {
      let updatedFruit: FruitConfig | undefined;

      this.fruits.update(list =>
        list.map(f => {
          if (f.id === idOrFruitId || f.fruitId === idOrFruitId) {
            updatedFruit = {
              ...f,
              ...updates,
              prices: updates.prices ? { ...f.prices, ...updates.prices } : f.prices
            };
            return updatedFruit;
          }
          return f;
        })
      );

      if (updatedFruit && updatedFruit.fruitId) {
        const fId = updatedFruit.fruitId;
        const newPrices = updatedFruit.prices;
        const newName = updatedFruit.name;
        this.productVariants.update(variants =>
          variants.map(v => {
            if (v.fruitId === fId) {
              const gKey = ('g' + v.grammage) as 'g140' | 'g250' | 'g500' | 'g1000';
              const nextPrice = newPrices && newPrices[gKey] !== undefined ? newPrices[gKey] : v.basePrice;
              return {
                ...v,
                fruitName: newName,
                name: `Pulpa de ${newName} ${v.grammage}g`,
                basePrice: nextPrice
              };
            }
            return v;
          })
        );

        this.api
          .updateFruit(fId, {
            name: updatedFruit.name,
            code: updatedFruit.id.toUpperCase(),
            category: updatedFruit.category,
            colorHex: updatedFruit.color,
            yieldPercentage: Math.round((updatedFruit.yieldRate || 0) * 100),
            unitPrice: updatedFruit.prices.g140,
            price140g: updatedFruit.prices.g140,
            price250g: updatedFruit.prices.g250,
            price500g: updatedFruit.prices.g500,
            price1000g: updatedFruit.prices.g1000
          })
          .subscribe({ error: () => {} });
      }

      this.saveAllToStorage();
      if (!silent && updatedFruit) {
        this.notification.success(
          'Card Actualizada',
          `Se guardaron los cambios de "${updatedFruit.name}" en el Portal Clientes.`
        );
      }
    } catch {
      return;
    }
  }

  /**
   * Creates a new fruit catalog card locally and persists to `POST /api/fruits`.
   */
  createFruitCatalogCard(payload: {
    name: string;
    scientificName: string;
    description: string;
    category: string;
    color: string;
    imageUrl?: string;
    prices: Record<string, number>;
  }): FruitConfig {
    try {
      const nextFruitId = Math.max(0, ...this.fruits().map(f => f.fruitId || 0)) + 1;
      const slug =
        payload.name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_|_$/g, '') || `fruit_${nextFruitId}`;

      const newCard: FruitConfig = {
        id: `${slug}_${nextFruitId}`,
        fruitId: nextFruitId,
        name: payload.name.trim(),
        scientificName: payload.scientificName.trim(),
        description: payload.description.trim(),
        imageUrl: payload.imageUrl || '',
        isVisibleInPortal: true,
        color: payload.color || '',
        bgColor: '',
        borderColor: payload.color || '',
        emoji: '',
        yieldRate: 0,
        waterAdditionDefault: 0,
        freshStockKg: 0,
        stock: { g140: 0, g250: 0, g500: 0, g1000: 0 },
        minStock: { g140: 0, g250: 0, g500: 0, g1000: 0 },
        prices: {
          g140: Number(payload.prices['g140']) || 0,
          g250: Number(payload.prices['g250']) || 0,
          g500: Number(payload.prices['g500']) || 0,
          g1000: Number(payload.prices['g1000']) || 0,
          ...payload.prices
        },
        category: payload.category.trim()
      };

      this.fruits.update(list => [newCard, ...list]);
      this.saveAllToStorage();
      this.api
        .createFruit({
          name: newCard.name,
          code: slug.toUpperCase(),
          category: newCard.category,
          colorHex: newCard.color,
          yieldPercentage: 0,
          rawStockKg: 0,
          unitPrice: Number(newCard.prices.g140) || 0,
          price140g: Number(newCard.prices.g140) || 0,
          price250g: newCard.prices.g250,
          price500g: newCard.prices.g500,
          price1000g: newCard.prices.g1000
        })
        .subscribe({ error: () => {} });
      this.notification.success('Nueva Card Creada', `"${newCard.name}" ya está publicada en el Portal Clientes.`);
      return newCard;
    } catch (error: unknown) {
      throw error;
    }
  }

  /**
   * Deletes a fruit catalog card locally and syncs to `DELETE /api/fruits/{id}`.
   */
  deleteFruitCatalogCard(id: string): void {
    try {
      const target = this.fruits().find(f => f.id === id);
      this.fruits.update(list => list.filter(f => f.id !== id));
      this.saveAllToStorage();
      if (target?.fruitId) {
        this.api.deleteFruit(target.fruitId).subscribe({ error: () => {} });
      }
      if (target) {
        this.notification.info('Card Eliminada', `"${target.name}" fue retirada del catálogo.`);
      }
    } catch {
      return;
    }
  }

  /**
   * Resets client portal catalog and CMS configuration to default empty state.
   */
  resetPortalCatalogToDefault(): void {
    try {
      this.fruits.set(INITIAL_FRUITS);
      this.productVariants.set(INITIAL_PRODUCT_VARIANTS);
      this.portalCmsConfig.set(DEFAULT_PORTAL_CMS_CONFIG);
      this.saveAllToStorage();
      this.notification.info(
        'Portal Restablecido',
        'Se restauraron todas las fotos, textos y precios predeterminados del catálogo.'
      );
    } catch {
      return;
    }
  }

  /**
   * Updates the list of inventory grammages and persists to storage.
   */
  updateGrammagesConfig(grammages: InventoryGrammageConfig[]): void {
    try {
      this.grammagesConfig.set(grammages);
      this.saveGrammagesConfig();
    } catch {
      return;
    }
  }

  /**
   * Toggles the active status of a presentation grammage.
   */
  toggleGrammage(key: string): void {
    try {
      this.grammagesConfig.update(list =>
        list.map(g => (g.key === key ? { ...g, isActive: !g.isActive } : g))
      );
      this.saveGrammagesConfig();
    } catch {
      return;
    }
  }

  /**
   * Removes a presentation grammage from the system.
   */
  deleteGrammage(key: string): void {
    try {
      this.grammagesConfig.update(list => list.filter(g => g.key !== key));
      this.saveGrammagesConfig();
    } catch {
      return;
    }
  }

  /**
   * Adds a new custom presentation grammage to the system.
   */
  addGrammage(grammage: InventoryGrammageConfig): void {
    try {
      this.grammagesConfig.update(list => [...list, grammage]);
      this.saveGrammagesConfig();
    } catch {
      return;
    }
  }

  /**
   * Updates the list of inventory product categories and persists to storage.
   */
  updateCategoriesConfig(categories: InventoryCategoryConfig[]): void {
    try {
      this.categoriesConfig.set(categories);
      this.saveCategoriesConfig();
    } catch {
      return;
    }
  }

  /**
   * Toggles the active status of a product category.
   */
  toggleCategory(id: string): void {
    try {
      this.categoriesConfig.update(list =>
        list.map(c => (c.id === id ? { ...c, isActive: !c.isActive } : c))
      );
      this.saveCategoriesConfig();
    } catch {
      return;
    }
  }

  /**
   * Removes a product category from the system.
   */
  deleteCategory(id: string): void {
    try {
      this.categoriesConfig.update(list => list.filter(c => c.id !== id));
      this.saveCategoriesConfig();
    } catch {
      return;
    }
  }

  /**
   * Adds a new custom product category to the system.
   */
  addCategory(category: InventoryCategoryConfig): void {
    try {
      this.categoriesConfig.update(list => [...list, category]);
      this.saveCategoriesConfig();
    } catch {
      return;
    }
  }

  /**
   * Loads the inventory grammages configuration from localStorage.
   */
  private loadGrammagesConfigFromStorage(): InventoryGrammageConfig[] {
    try {
      const data = localStorage.getItem('despulpadora_grammages_config');
      return data ? JSON.parse(data) : DEFAULT_GRAMMAGES;
    } catch {
      return DEFAULT_GRAMMAGES;
    }
  }

  /**
   * Saves the inventory grammages configuration to localStorage.
   */
  private saveGrammagesConfig(): void {
    try {
      localStorage.setItem('despulpadora_grammages_config', JSON.stringify(this.grammagesConfig()));
    } catch {
      return;
    }
  }

  /**
   * Loads the inventory categories configuration from localStorage.
   */
  private loadCategoriesConfigFromStorage(): InventoryCategoryConfig[] {
    try {
      const data = localStorage.getItem('despulpadora_categories_config');
      const list: InventoryCategoryConfig[] = data ? JSON.parse(data) : DEFAULT_CATEGORIES;
      return list.map(c => ({ ...c, icon: '' }));
    } catch {
      return DEFAULT_CATEGORIES;
    }
  }

  /**
   * Saves the inventory categories configuration to localStorage.
   */
  private saveCategoriesConfig(): void {
    try {
      localStorage.setItem('despulpadora_categories_config', JSON.stringify(this.categoriesConfig()));
    } catch {
      return;
    }
  }
}
