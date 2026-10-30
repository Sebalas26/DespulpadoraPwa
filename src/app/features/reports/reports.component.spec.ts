import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { ReportsComponent } from './reports.component';
import { StateService } from '../../core/services/state.service';
import { DEFAULT_COMPANY_CONFIG } from '../../core/data/initial-data';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';
import {
  BatchDto,
  ClientDto,
  CompanyConfig,
  EmployeeDto,
  ExpenseDto,
  FruitConfig,
  IdealVsRealAuditDto,
  OrderDto,
  PaymentMethodDto,
  PayrollPeriodDto,
  PayrollSettlementDto,
  ProductVariantDto,
  SalesPerformanceKpiDto,
  WorkShiftDto
} from '../../core/models/business.models';

/**
 * Unit tests for ReportsComponent verifying dynamic couriers, real cost calculations, and zeroed defaults.
 */
describe('ReportsComponent', () => {
  let component: ReportsComponent;
  let fixture: ComponentFixture<ReportsComponent>;

  const mockFruits = signal<FruitConfig[]>([
    {
      id: 'mora',
      fruitId: 1,
      name: 'Mora',
      scientificName: 'Rubus glaucus',
      emoji: '',
      color: '#16a34a',
      bgColor: '#f0fdf4',
      yieldRate: 0.7,
      waterAdditionDefault: 0.05,
      freshStockKg: 50,
      costPerKg: 3000,
      category: 'PULPAS',
      prices: { g140: 2000, g250: 3500, g500: 6500, g1000: 12000 },
      stock: { g140: 0, g250: 0, g500: 0, g1000: 10 },
      minStock: { g140: 5, g250: 5, g500: 5, g1000: 5 }
    }
  ]);

  const mockProductVariants = signal<ProductVariantDto[]>([
    {
      variantId: 1,
      fruitId: 1,
      fruitName: 'Mora',
      category: 'PULPAS',
      name: 'Mora 1000g',
      sku: 'MOR-1000',
      grammage: 1000,
      basePrice: 12000,
      unitCost: 7000,
      currentStock: 10,
      minStockAlert: 5,
      isActive: true
    }
  ]);

  const mockBatches = signal<BatchDto[]>([]);
  const mockExpenses = signal<ExpenseDto[]>([
    {
      expenseId: 1,
      branchId: 1,
      categoryId: 1,
      description: 'Empaque',
      categoryName: 'Empaque',
      amount: 20000,
      expenseDate: new Date().toISOString().substring(0, 10),
      createdAt: new Date().toISOString()
    }
  ]);

  const mockEmployees = signal<EmployeeDto[]>([
    {
      id: 21,
      employeeId: 21,
      firstName: 'Mario',
      lastName: 'Mensajero',
      fullName: 'Mario Mensajero',
      name: 'Mario Mensajero',
      identificationNumber: '8001',
      documentNumber: '8001',
      position: 'Domiciliario',
      area: 'DOMICILIOS',
      baseSalary: 1300000,
      transportAllowance: 162000,
      hireDate: '2025-01-15',
      isActive: true,
      phone: '3101112233'
    }
  ]);

  const mockOrders = signal<OrderDto[]>([
    {
      orderId: 601,
      orderNumber: 'ORD-601',
      invoiceNumber: 'FAC-601',
      clientId: 1,
      clientName: 'Hotel Mirador',
      branchId: 1,
      status: 'DELIVERED',
      isPaid: true,
      paymentMethodName: 'Efectivo',
      totalAmount: 120000,
      createdAt: new Date().toISOString(),
      orderDate: new Date().toISOString().substring(0, 10),
      items: [
        {
          fruitId: 1,
          fruitName: 'Mora',
          grammage: 1000,
          quantity: 10,
          unitPrice: 12000,
          subtotal: 120000
        }
      ]
    }
  ]);

  const mockSalesPerformance = signal<SalesPerformanceKpiDto>({
    monthTargetRevenue: 0,
    currentMonthRevenue: 120000,
    previousMonthRevenue: 0,
    growthPercentage: 0,
    grossProfit: 50000,
    grossMarginPercentage: 41.7,
    targetAccumulatedProrated: 0,
    compliancePercentage: 0,
    projectedClosingRevenue: 120000,
    totalOrdersCount: 1,
    averageTicketValue: 120000
  });

  const mockCompanyInfo = signal<CompanyConfig>({
    ...DEFAULT_COMPANY_CONFIG,
    companyName: 'Despulpadora Reportes',
    monthlySalesTarget: 0
  });

  beforeEach(async () => {
    const stateServiceMock: Partial<StateService> = {
      fruits: mockFruits,
      productVariants: mockProductVariants,
      batches: mockBatches,
      expenses: mockExpenses,
      employees: mockEmployees,
      orders: mockOrders,
      shifts: signal<WorkShiftDto[]>([]) as unknown as StateService['shifts'],
      payrollPeriods: signal<PayrollPeriodDto[]>([]) as unknown as StateService['payrollPeriods'],
      payrollSettlements: signal<PayrollSettlementDto[]>([]) as unknown as StateService['payrollSettlements'],
      idealVsRealLossAudit: signal<IdealVsRealAuditDto[]>([]) as unknown as StateService['idealVsRealLossAudit'],
      clients: signal<ClientDto[]>([]) as unknown as StateService['clients'],
      paymentMethods: signal<PaymentMethodDto[]>([]) as unknown as StateService['paymentMethods'],
      activePaymentMethods: signal<PaymentMethodDto[]>([]) as unknown as StateService['activePaymentMethods'],
      salesPerformance: mockSalesPerformance,
      companyInfo: mockCompanyInfo,
      totalStockKg: signal<number>(10) as unknown as StateService['totalStockKg'],
      totalFreshStockKg: signal<number>(50) as unknown as StateService['totalFreshStockKg'],
      lowStockFruitsCount: signal<number>(0) as unknown as StateService['lowStockFruitsCount'],
      upsertSalesTarget: jasmine.createSpy('upsertSalesTarget'),
      updateOrder: jasmine.createSpy('updateOrder'),
      deleteOrder: jasmine.createSpy('deleteOrder'),
      updateOrderStatus: jasmine.createSpy('updateOrderStatus')
    };

    const notificationMock: Partial<NotificationService> = {
      success: jasmine.createSpy('success'),
      warning: jasmine.createSpy('warning'),
      error: jasmine.createSpy('error'),
      info: jasmine.createSpy('info')
    };

    const authServiceMock: Partial<AuthService> = {
      currentUser: signal(null) as unknown as AuthService['currentUser'],
      hasPermission: jasmine.createSpy('hasPermission').and.returnValue(true)
    };

    await TestBed.configureTestingModule({
      imports: [ReportsComponent],
      providers: [
        provideRouter([]),
        { provide: StateService, useValue: stateServiceMock },
        { provide: NotificationService, useValue: notificationMock },
        { provide: AuthService, useValue: authServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create with empty editPaymentMethod and editCourierName defaults', () => {
    expect(component).toBeTruthy();
    expect(component.editPaymentMethod()).toBe('');
    expect(component.editCourierName()).toBe('');
  });

  it('should derive availableCouriers dynamically from DOMICILIOS employees', () => {
    expect(component.availableCouriers).toEqual(['Mario Mensajero']);
  });

  it('should return Sin asignar from getCourierName when order has no courierName', () => {
    expect(component.getCourierName(mockOrders()[0])).toBe('Sin asignar');
    const assignedOrder: OrderDto = {
      ...mockOrders()[0],
      courierName: 'Mario Mensajero'
    };
    expect(component.getCourierName(assignedOrder)).toBe('Mario Mensajero');
  });

  it('should return real invoiceNumber or orderNumber in getInvoiceCode without INV/2026 prefix', () => {
    expect(component.getInvoiceCode(mockOrders()[0])).toBe('FAC-601');
    const unbilledOrder: OrderDto = {
      ...mockOrders()[0],
      invoiceNumber: undefined
    };
    expect(component.getInvoiceCode(unbilledOrder)).toBe('ORD-601');
  });

  it('should return 0 for filteredCompliancePct when monthTargetRevenue is 0', () => {
    expect(component.filteredCompliancePct()).toBe(0);
  });

  it('should compute filteredGrossProfit and cavaEstimatedCost without 0.55 fallback', () => {
    expect(component.totalSalesRevenue()).toBe(120000);
    expect(component.filteredGrossProfit()).toBe(100000);
    expect(component.cavaCommercialValue()).toBe(120000);
    expect(component.cavaEstimatedCost()).toBe(180000);
  });

  it('should add edit item using the first fruit from StateService', () => {
    component.editItems.set([]);
    component.addEditItem();
    expect(component.editItems().length).toBe(1);
    expect(component.editItems()[0].fruitName).toBe('Mora');
    expect(component.editItems()[0].unitPrice).toBe(12000);
  });

  it('should render dashboard-style static KPI cards without expand chevrons across all 5 report tabs and keep date filters inside reports-toolbar-actions', () => {
    const tabs: Array<'sales' | 'loss' | 'stock' | 'expenses' | 'payroll'> = [
      'sales',
      'loss',
      'stock',
      'expenses',
      'payroll'
    ];

    const hostEl = fixture.nativeElement as HTMLElement;
    expect(hostEl.querySelector('.reports-top-shell')).toBeTruthy();
    expect(hostEl.querySelector('.reports-nav-tabs')).toBeTruthy();
    expect(hostEl.querySelector('.reports-toolbar-actions .period-filter-container')).toBeTruthy();
    expect(hostEl.querySelector('.reports-print-btn.no-mobile')).toBeTruthy();

    for (const tab of tabs) {
      component.setTab(tab);
      fixture.detectChanges();
      const kpiCards = hostEl.querySelectorAll('.quick-kpis-grid .quick-kpi-card.report-kpi-card');
      expect(kpiCards.length).toBe(4);
      expect(hostEl.querySelectorAll('.quick-kpis-grid .kpi-icon-box').length).toBe(4);
      expect(hostEl.querySelectorAll('.quick-kpis-grid .kpi-sparkline').length).toBe(4);
      expect(hostEl.querySelectorAll('.quick-kpis-grid .kpi-expand-chevron').length).toBe(0);
    }
  });
});
