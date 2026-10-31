import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { DashboardComponent } from './dashboard.component';
import { StateService } from '../../core/services/state.service';
import { AuthService } from '../../core/services/auth.service';
import { VoiceOrdersService } from '../../core/services/voice-orders.service';
import { FruitConfig } from '../../core/data/initial-data';
import { OrderDto, SalesPerformanceKpiDto } from '../../core/models/business.models';

/**
 * Unit tests for DashboardComponent verifying zeroed defaults, financial metrics, KPI modals, and inventory reports.
 */
describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let upsertTargetSpy: jasmine.Spy;

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
      waterAdditionDefault: 0.08,
      freshStockKg: 250,
      category: 'PULPAS',
      prices: { g140: 2000, g250: 3500, g500: 6500, g1000: 12000 },
      stock: { g140: 5, g250: 20, g500: 15, g1000: 10 },
      minStock: { g140: 10, g250: 10, g500: 10, g1000: 5 }
    }
  ]);

  const mockOrders = signal<OrderDto[]>([
    {
      orderId: 1,
      orderNumber: 'ORD-001',
      clientId: 1,
      clientName: 'Hotel Central',
      branchId: 1,
      status: 'PENDING',
      isPaid: false,
      paymentMethodName: 'Efectivo',
      totalAmount: 35000,
      createdAt: new Date().toISOString(),
      orderDate: new Date().toISOString().substring(0, 10),
      items: [
        {
          fruitId: 1,
          fruitName: 'Mora',
          grammage: 250,
          quantity: 10,
          unitPrice: 3500,
          subtotal: 35000
        }
      ]
    }
  ]);

  const mockSalesPerformance = signal<SalesPerformanceKpiDto>({
    monthTargetRevenue: 5000000,
    currentMonthRevenue: 1500000,
    previousMonthRevenue: 1200000,
    growthPercentage: 25,
    grossProfit: 600000,
    grossMarginPercentage: 40,
    targetAccumulatedProrated: 2500000,
    compliancePercentage: 30,
    projectedClosingRevenue: 3000000,
    totalOrdersCount: 1,
    averageTicketValue: 35000
  });

  const mockTotalStockKg = signal<number>(17.2);
  const mockTotalFreshStockKg = signal<number>(250);

  beforeEach(async () => {
    upsertTargetSpy = jasmine.createSpy('upsertSalesTarget');
    mockFruits.set([
      {
        id: 'mora',
        fruitId: 1,
        name: 'Mora',
        scientificName: 'Rubus glaucus',
        emoji: '',
        color: '#16a34a',
        bgColor: '#f0fdf4',
        yieldRate: 0.7,
        waterAdditionDefault: 0.08,
        freshStockKg: 250,
        category: 'PULPAS',
        prices: { g140: 2000, g250: 3500, g500: 6500, g1000: 12000 },
        stock: { g140: 5, g250: 20, g500: 15, g1000: 10 },
        minStock: { g140: 10, g250: 10, g500: 10, g1000: 5 }
      }
    ]);
    mockTotalStockKg.set(17.2);
    mockTotalFreshStockKg.set(250);

    const stateServiceMock: Partial<StateService> = {
      isOnline: signal<boolean>(true) as unknown as StateService['isOnline'],
      fruits: mockFruits,
      orders: mockOrders,
      salesPerformance: mockSalesPerformance,
      totalStockKg: mockTotalStockKg as unknown as StateService['totalStockKg'],
      totalFreshStockKg: mockTotalFreshStockKg as unknown as StateService['totalFreshStockKg'],
      upsertSalesTarget: upsertTargetSpy
    };

    const authServiceMock: Partial<AuthService> = {
      currentUser: signal(null) as unknown as AuthService['currentUser']
    };

    const voiceOrdersMock: Partial<VoiceOrdersService> = {
      pendingCount: signal<number>(0) as unknown as VoiceOrdersService['pendingCount'],
      openModal: jasmine.createSpy('openModal')
    };

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        { provide: StateService, useValue: stateServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: VoiceOrdersService, useValue: voiceOrdersMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and initialize editTargetAmount to 0 without hardcoded fallback', () => {
    expect(component).toBeTruthy();
    expect(component.editTargetAmount()).toBe(0);
  });

  it('should save target revenue with 0 when editTargetAmount is 0', () => {
    component.editTargetAmount.set(0);
    component.saveTarget();

    expect(upsertTargetSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        targetRevenue: 0
      })
    );
    expect(component.showEditTargetModal()).toBeFalse();
  });

  it('should open target modal, handle target amount input, and populate current monthTargetRevenue', () => {
    component.openTargetModal();
    expect(component.showEditTargetModal()).toBeTrue();
    expect(component.editTargetAmount()).toBe(5000000);

    const inputEl = document.createElement('input');
    inputEl.value = '$ 12.500.000';
    component.onTargetAmountInput({ target: inputEl } as unknown as Event);
    expect(component.editTargetAmount()).toBe(12500000);
  });

  it('should open and close KPI detail modals and compute todayOrdersList and todaySoldPulpsBreakdown', () => {
    component.openKpiDetail('billing');
    expect(component.selectedKpiCard()).toBe('billing');
    expect(component.todayOrdersList().length).toBe(1);
    expect(component.todaySoldPulpsBreakdown().totalUnits).toBe(10);

    component.closeKpiDetail();
    expect(component.selectedKpiCard()).toBeNull();
  });

  it('should compute ordersByStatus, todayBillingStats, and soldPulpsSummary accurately', () => {
    expect(component.ordersByStatus().pending).toBe(1);
    expect(component.todayBillingStats().revenue).toBe(35000);
    expect(component.todayBillingStats().unitsSold).toBe(10);
    expect(component.soldPulpsSummary().totalUnits).toBe(10);
    expect(component.soldPulpsSummary().totalKg).toBe(2.5);
  });

  it('should compute topClientOfMonth, totalPreparedPulpUnits, and inventory reports', () => {
    expect(component.topClientOfMonth().name).toBe('Hotel Central');
    expect(component.totalPreparedPulpUnits()).toBe(50);
    expect(component.estimatedPulpFromFreshFruitKg()).toBe(175);
    expect(component.fruitInventoryReport().length).toBe(1);
    expect(component.preparedPulpsReport().totalUnits).toBe(50);
    expect(component.lowStockItems().length).toBe(1);
  });

  it('should return currentMonthName and formatCOP strings', () => {
    expect(component.currentMonthName().length).toBeGreaterThan(0);
    expect(component.formatCOP(15000)).toContain('15.000');
  });

  it('should dynamically compute kpiSparklines trends (up, flat, down) based on real statistics', () => {
    const initialSparks = component.kpiSparklines();
    expect(initialSparks.billing.trend).toBe('down');
    expect(initialSparks.billing.endY).toBe(27);
    expect(initialSparks.pulpStock.trend).toBe('flat');
    expect(initialSparks.pulpStock.endY).toBe(17);
    expect(initialSparks.pulpsSoldToday.trend).toBe('up');
    expect(initialSparks.pulpsSoldToday.endY).toBe(7);
    expect(initialSparks.freshFruit.trend).toBe('up');
    expect(initialSparks.freshFruit.endY).toBe(7);

    mockTotalStockKg.set(0);
    mockTotalFreshStockKg.set(0);
    expect(component.kpiSparklines().pulpStock.trend).toBe('down');
    expect(component.kpiSparklines().pulpStock.endY).toBe(27);
    expect(component.kpiSparklines().freshFruit.trend).toBe('down');
    expect(component.kpiSparklines().freshFruit.endY).toBe(27);

    mockTotalStockKg.set(40);
    mockTotalFreshStockKg.set(150);
    expect(component.kpiSparklines().pulpStock.trend).toBe('up');
    expect(component.kpiSparklines().pulpStock.endY).toBe(7);
    expect(component.kpiSparklines().freshFruit.trend).toBe('flat');
    expect(component.kpiSparklines().freshFruit.endY).toBe(17);
  });

  it('should render downward expand chevron indicator and title label in all 4 top KPI cards without icon boxes and toggle expanded class when selected', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const chevrons = Array.from(compiled.querySelectorAll('.quick-kpi-card .kpi-card-top-row .kpi-expand-chevron'));
    const topLabels = Array.from(compiled.querySelectorAll('.quick-kpi-card .kpi-card-top-row .kpi-label'));
    const topIcons = Array.from(compiled.querySelectorAll('.quick-kpis-grid .kpi-icon-box'));

    expect(chevrons.length).toBe(4);
    expect(topLabels.length).toBe(4);
    expect(topIcons.length).toBe(0);
    expect(chevrons.every(el => !el.classList.contains('expanded'))).toBeTrue();

    component.openKpiDetail('billing');
    fixture.detectChanges();

    expect(chevrons[0].classList.contains('expanded')).toBeTrue();
    expect(chevrons[1].classList.contains('expanded')).toBeFalse();
  });

  it('should exclude fruits with 0 prepared pulp units and no registered variants from preparedPulpsReport', () => {
    mockFruits.set([
      {
        id: 'batido_verde',
        fruitId: 10,
        name: 'Batido Verde',
        scientificName: '',
        emoji: '',
        color: '#1e5e3a',
        bgColor: '#f0fdf4',
        yieldRate: 0.75,
        waterAdditionDefault: 0,
        freshStockKg: 300,
        category: 'PULPAS',
        prices: { g140: 0, g250: 0, g500: 0, g1000: 0 },
        stock: { g140: 0, g250: 0, g500: 0, g1000: 0 },
        minStock: { g140: 0, g250: 0, g500: 0, g1000: 0 }
      },
      {
        id: 'maracuya_portal',
        fruitId: 11,
        name: 'Maracuya',
        scientificName: '',
        emoji: '',
        color: '#1e5e3a',
        bgColor: '#f0fdf4',
        yieldRate: 0,
        waterAdditionDefault: 0,
        freshStockKg: 0,
        category: 'PULPAS',
        prices: { g140: 0, g250: 4000, g500: 0, g1000: 0 },
        stock: { g140: 0, g250: 0, g500: 0, g1000: 0 },
        minStock: { g140: 0, g250: 0, g500: 0, g1000: 0 }
      }
    ]);
    fixture.detectChanges();

    expect(component.preparedPulpsReport().items.length).toBe(0);
    expect(component.preparedPulpsReport().totalUnits).toBe(0);
    expect(component.fruitInventoryReport().length).toBe(1);
    expect(component.fruitInventoryReport()[0].name).toBe('Batido Verde');
  });

  it('should round monthly goal percentage to integer, cap at 100%, and apply red/orange/green card and pace styles', () => {
    mockSalesPerformance.update(prev => ({ ...prev, compliancePercentage: 0.1 }));
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const salesCard = compiled.querySelector('.financial-metrics-row .fin-metric-box') as HTMLElement;
    const pctEl = compiled.querySelector('.target-pct') as HTMLElement;
    const paceEl = compiled.querySelector('.target-rate-warning span') as HTMLElement;

    expect(component.monthlyGoalPercentage()).toBe(0);
    expect(component.monthlyGoalTier()).toBe('red');
    expect(salesCard.classList.contains('dark-red-card')).toBeTrue();
    expect(pctEl.textContent?.trim()).toBe('0%');
    expect(paceEl.textContent?.trim()).toBe('Ritmo de venta bajo');

    mockSalesPerformance.update(prev => ({ ...prev, compliancePercentage: 55.4 }));
    fixture.detectChanges();
    expect(component.monthlyGoalPercentage()).toBe(55);
    expect(component.monthlyGoalTier()).toBe('orange');
    expect(salesCard.classList.contains('dark-orange-card')).toBeTrue();
    expect(pctEl.textContent?.trim()).toBe('55%');
    expect(paceEl.textContent?.trim()).toBe('Ritmo de venta medio');

    mockSalesPerformance.update(prev => ({ ...prev, compliancePercentage: 85.2 }));
    fixture.detectChanges();
    expect(component.monthlyGoalPercentage()).toBe(85);
    expect(component.monthlyGoalTier()).toBe('green');
    expect(salesCard.classList.contains('dark-green-card')).toBeTrue();
    expect(pctEl.textContent?.trim()).toBe('85%');
    expect(paceEl.textContent?.trim()).toBe('Ritmo de venta óptimo');

    mockSalesPerformance.update(prev => ({ ...prev, compliancePercentage: 150 }));
    fixture.detectChanges();
    expect(component.monthlyGoalPercentage()).toBe(100);
    expect(component.monthlyGoalTier()).toBe('green');
    expect(pctEl.textContent?.trim()).toBe('100%');
  });

  it('should display only Bodega principal in mobile-location-tag without En línea', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const locationTag = compiled.querySelector('.mobile-location-tag') as HTMLElement;
    expect(locationTag).not.toBeNull();
    expect(locationTag.textContent?.trim()).toBe('Bodega principal');
    expect(locationTag.textContent).not.toContain('En línea');
  });
});
