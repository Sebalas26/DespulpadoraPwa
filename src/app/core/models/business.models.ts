/**
 * Fruit master catalog configuration for plant, inventory, and client portal state.
 */
export interface FruitConfig {
  id: string;
  fruitId?: number;
  name: string;
  scientificName: string;
  description?: string;
  imageUrl?: string;
  isVisibleInPortal?: boolean;
  color: string;
  bgColor: string;
  borderColor?: string;
  emoji: string;
  yieldRate: number;
  waterAdditionDefault: number;
  freshStockKg: number;
  stock: {
    g100?: number;
    g140: number;
    g250: number;
    g500: number;
    g1000: number;
    [key: string]: number | undefined;
  };
  minStock: {
    g100?: number;
    g140: number;
    g250: number;
    g500: number;
    g1000: number;
    [key: string]: number | undefined;
  };
  prices: {
    g100?: number;
    g140: number;
    g250: number;
    g500: number;
    g1000: number;
    [key: string]: number | undefined;
  };
  costPerKg?: number;
  category: 'PULPAS' | 'CONSERVAS' | 'MERMELADAS' | 'INFUSIONES' | string;
}

/**
 * Commercial promotion configuration.
 */
export interface PromotionConfig {
  id: string;
  name: string;
  description: string;
  discountPercent: number;
  freeItemName: string;
  badge: string;
}

/**
 * Client portal CMS header and hero banner configuration.
 */
export interface PortalCmsConfig {
  brandTagline: string;
  heroBadge: string;
  heroTitle: string;
  heroDescription: string;
  chip1Text: string;
  chip2Text: string;
  chip3Text: string;
  whatsappPhone: string;
}

/**
 * Fruit master catalog item and pricing/yield configuration.
 */
export interface FruitDto {
  id?: number;
  fruitId: number;
  name: string;
  code: string;
  category?: string;
  yieldPercentage: number;
  expectedYieldPercentage?: number;
  rawStockKg?: number;
  pulpColor?: string;
  colorHex?: string;
  brixTarget?: number;
  unitPrice: number;
  price140g?: number;
  price100g?: number;
  price250g?: number;
  price500g?: number;
  price1000g?: number;
  stock100g?: number;
  stock250g?: number;
  stock500g?: number;
  stock1000g?: number;
  minimumRawStockKg?: number;
  minStockKg?: number;
  isActive: boolean;
}

/**
 * Payload for creating or updating a fruit variety in the master catalog.
 */
export interface CreateFruitDto {
  name: string;
  code: string;
  category?: string;
  yieldPercentage: number;
  expectedYieldPercentage?: number;
  rawStockKg?: number;
  pulpColor?: string;
  colorHex?: string;
  brixTarget?: number;
  unitPrice: number;
  price140g?: number;
  price100g?: number;
  price250g?: number;
  price500g?: number;
  price1000g?: number;
}

/**
 * Production batch record representing a pulping run.
 */
export interface BatchDto {
  id?: number;
  batchId: number;
  batchCode: string;
  fruitId: number;
  fruitName?: string;
  branchId: number;
  branchName?: string;
  grossFruitKg: number;
  rawWeightKg?: number;
  pulpProducedKg: number;
  netPulpKg?: number;
  realYieldPercentage: number;
  actualYieldPercentage?: number;
  costPerKg: number;
  brixDegrees?: number;
  phLevel?: number;
  units140gPacked?: number;
  units100gPacked?: number;
  units250gPacked?: number;
  units500gPacked?: number;
  units1000gPacked?: number;
  status: 'IN_PROCESS' | 'COMPLETED' | 'CANCELLED' | string;
  operatorName?: string;
  notes?: string;
  productionDate: string;
  createdAt: string;
}

/**
 * Payload to register a new production batch.
 */
export interface CreateBatchDto {
  fruitId: number;
  branchId?: number;
  grossFruitKg: number;
  rawWeightKg?: number;
  netPulpKg?: number;
  costPerKg: number;
  brixDegrees?: number;
  phLevel?: number;
  units140gPacked?: number;
  units100gPacked?: number;
  units250gPacked?: number;
  units500gPacked?: number;
  units1000gPacked?: number;
  notes?: string;
}

/**
 * Flat stock count grouped by standard grammages.
 */
export interface StockByGrammage {
  g140: number;
  g250: number;
  g500: number;
  g1000: number;
}

/**
 * Consolidated pulp stock summary per fruit variety.
 */
export interface PulpStockItem {
  fruitId: number;
  fruitName: string;
  code?: string;
  category?: string;
  pulpColor?: string;
  yieldPercentage?: number;
  stock: StockByGrammage;
  totalUnits: number;
  totalKg: number;
  minThresholdKg?: number;
  isLowStock?: boolean;
}

/**
 * Request payload to adjust finished pulp stock or fresh fruit inventory.
 */
export interface PulpStockAdjustmentDto {
  fruitId: number;
  branchId?: number;
  grammage: 140 | 250 | 500 | 1000;
  quantityDelta: number;
  reason: string;
}

/**
 * Legal identification document type.
 */
export interface IdentificationTypeDto {
  id?: number;
  identificationTypeId: number;
  code: string;
  name: string;
}

/**
 * Payment method configuration item.
 */
export interface PaymentMethodDto {
  id?: number;
  paymentMethodId: number;
  name: string;
  code?: string;
  isActive: boolean;
  requiresReference?: boolean;
  type?: 'cash' | 'transfer' | 'card' | 'credit' | 'other';
  description?: string;
}

/**
 * Commercial client directory record.
 */
export interface ClientDto {
  id?: number;
  clientId: number;
  fullName: string;
  name?: string;
  identificationTypeId?: number;
  identificationNumber: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  notes?: string;
  creditLimit?: number;
  currentBalance?: number;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
}

/**
 * Payload for creating or updating a commercial client.
 */
export interface CreateClientDto {
  fullName: string;
  identificationTypeId?: number;
  identificationNumber: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  notes?: string;
  creditLimit?: number;
  latitude?: number;
  longitude?: number;
  isActive?: boolean;
}

/**
 * Commercial order lifecycle statuses.
 */
export type OrderStatus = 'PENDING' | 'PICKING' | 'BILLED' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';

/**
 * Line item inside a commercial order.
 */
export interface OrderItemDto {
  id?: number;
  orderItemId?: number;
  fruitId: number;
  fruitName?: string;
  grammage: number;
  presentationGrams?: number;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  pickedQuantity?: number;
}

/**
 * Commercial order header and items record.
 */
export interface OrderDto {
  id?: number;
  orderId: number;
  orderNumber: string;
  orderCode?: string;
  invoiceNumber?: string;
  branchId: number;
  branchName?: string;
  clientId: number;
  clientName: string;
  clientPhone?: string;
  clientAddress?: string;
  status: OrderStatus;
  orderDate: string;
  deliveryDate?: string;
  scheduledDay?: string;
  totalAmount: number;
  items: OrderItemDto[];
  paymentMethodId?: number;
  paymentMethodName?: string;
  paymentMethod?: string;
  courierId?: number;
  courierName?: string;
  isPaid: boolean;
  notes?: string;
  createdAt: string;
  isPriority?: boolean;
  isBilled?: boolean;
  latitude?: number;
  longitude?: number;
}

/**
 * Payload for creating a new commercial order.
 */
export interface CreateOrderDto {
  branchId?: number;
  clientId?: number;
  clientName?: string;
  clientPhone?: string;
  clientAddress?: string;
  paymentMethodId?: number;
  paymentMethod?: string;
  deliveryDate?: string;
  scheduledDay?: string;
  isPriority?: boolean;
  notes?: string;
  items: {
    fruitId: number;
    grammage: number;
    presentationGrams?: number;
    quantity: number;
    unitPrice: number;
  }[];
}

/**
 * Payload to transition an order's operational status.
 */
export interface UpdateOrderStatusDto {
  orderId: number;
  status: OrderStatus;
  courierId?: number;
  isPaid?: boolean;
  isBilled?: boolean;
  isPriority?: boolean;
  scheduledDay?: string;
  notes?: string;
}

/**
 * Consolidated daily order KPIs.
 */
export interface OrderMetricsDto {
  totalOrdersToday: number;
  pendingPickingCount: number;
  readyToBillCount: number;
  dispatchedCount: number;
  deliveredCount: number;
  todayRevenue: number;
}

/**
 * Courier / delivery driver entity for dispatch and telemetry.
 */
export interface CourierDto {
  id: number;
  name: string;
  phone: string;
  vehiclePlate: string;
  zone: string;
  status: string;
  currentLatitude?: number;
  currentLongitude?: number;
  activeOrdersCount: number;
}

/**
 * Work shift attendance record.
 */
export interface WorkShiftDto {
  shiftId: number;
  employeeId: number;
  employeeName: string;
  branchId: number;
  branchName?: string;
  startTime: string;
  endTime?: string;
  shiftType: 'MORNING' | 'AFTERNOON' | 'NIGHT' | 'SPECIAL';
  status: 'ACTIVE' | 'CLOSED';
  notes?: string;
  hoursWorked?: number;
}

/**
 * Payload to open an employee work shift.
 */
export interface StartShiftDto {
  employeeId: number;
  branchId: number;
  shiftType: string;
  notes?: string;
}

/**
 * Payload to close an active work shift.
 */
export interface CloseShiftDto {
  shiftId: number;
  notes?: string;
}

/**
 * Organizational department descriptor.
 */
export interface DepartmentDto {
  departmentId: number;
  name: string;
  code?: string;
}

/**
 * Job position descriptor.
 */
export interface PositionDto {
  positionId: number;
  title: string;
  departmentId: number;
}

/**
 * Employee record for HR, attendance, and fortnightly payroll.
 */
export interface EmployeeDto {
  id?: number;
  employeeId: number;
  firstName: string;
  lastName: string;
  fullName: string;
  name?: string;
  identificationNumber: string;
  documentNumber?: string;
  gender?: EmployeeGender;
  area?: EmployeeArea;
  phone?: string;
  email?: string;
  position?: string;
  roleTitle?: string;
  department?: string;
  baseSalary: number;
  monthlySalary?: number;
  transportAllowance?: number;
  deliveryBonusRate?: number;
  hireDate: string;
  isActive: boolean;
  status?: string;
  activeShift?: WorkShiftDto;
  bankName?: string;
  bankAccountType?: string;
  bankAccountNumber?: string;
}

/**
 * Accounting category descriptor.
 */
export interface AccountCategoryDto {
  categoryId: number;
  name: string;
  code?: string;
  isExpense: boolean;
}

/**
 * Operational expense or accounting transaction record.
 */
export interface ExpenseDto {
  id?: number;
  expenseId: number;
  branchId: number;
  branchName?: string;
  categoryId: number;
  categoryName: string;
  category?: string;
  type?: string;
  description: string;
  amount: number;
  expenseDate: string;
  transactionDate?: string;
  paymentMethodId?: number;
  paymentMethodName?: string;
  receiptNumber?: string;
  referenceCode?: string;
  createdAt: string;
}

/**
 * Payload to register a new operational expense or accounting entry.
 */
export interface CreateExpenseDto {
  branchId?: number;
  categoryId?: number;
  category?: string;
  type?: 'INCOME' | 'EXPENSE' | string;
  description: string;
  amount: number;
  expenseDate?: string;
  paymentMethodId?: number;
  receiptNumber?: string;
  referenceCode?: string;
}

/**
 * System user administration DTO aligned with `/api/users`.
 */
export interface UserAdminDto {
  id?: number;
  userId: number;
  username: string;
  email: string;
  fullName: string;
  phone?: string;
  documentNumber?: string;
  roleId: number;
  roleName: string;
  companyId: number;
  companyName?: string;
  isSystemDeveloper?: boolean;
  isActive: boolean;
  mustChangePassword?: boolean;
  lastLoginAt?: string;
  branches: { branchId: number; name: string }[];
}

/**
 * Payload to create a new system user (`POST /api/users`).
 */
export interface CreateUserDto {
  username: string;
  email: string;
  fullName: string;
  password?: string;
  phone?: string;
  documentNumber?: string;
  roleId: number;
  isSystemDeveloper?: boolean;
  mustChangePassword?: boolean;
  companyId?: number;
  branchIds?: number[];
}

/**
 * Payload to update an existing system user (`PUT /api/users/{id}`).
 */
export interface UpdateUserDto {
  userId?: number;
  username?: string;
  fullName: string;
  email: string;
  phone?: string;
  documentNumber?: string;
  roleId: number;
  isSystemDeveloper?: boolean;
  isActive: boolean;
  branchIds?: number[];
}

/**
 * Security role DTO aligned with `/api/roles`.
 */
export interface UserRoleDto {
  id?: number;
  roleId: number;
  name: string;
  description?: string;
  isSystemRole: boolean;
  isActive?: boolean;
  usersCount?: number;
  moduleIds?: number[];
  actionIds?: number[];
  isCourier?: boolean;
}

/**
 * Granular action item in the Master System Catalog (`/api/actions`).
 */
export interface SystemActionCatalogDto {
  id: number;
  moduleId: number;
  moduleName?: string;
  name: string;
  slug: string;
  httpMethod: string;
  description: string;
  isActive: boolean;
}

/**
 * Payload to create a new module action (`POST /api/actions`).
 */
export interface CreateSystemActionDto {
  moduleId: number;
  name: string;
  slug: string;
  httpMethod: string;
  description: string;
  isActive: boolean;
}

/**
 * Payload to update an existing module action (`PUT /api/actions/{id}`).
 */
export interface UpdateSystemActionDto {
  moduleId: number;
  name: string;
  slug: string;
  httpMethod: string;
  description: string;
  isActive: boolean;
}

/**
 * Dynamic navigation module item in the Master System Catalog (`/api/modules`).
 */
export interface SystemModuleCatalogDto {
  id: number;
  name: string;
  slug: string;
  menuSection: string;
  frontendRoute: string;
  icon: string;
  displayOrder: number;
  isActive: boolean;
  actions: SystemActionCatalogDto[];
}

/**
 * Payload to create a new dynamic module (`POST /api/modules`).
 */
export interface CreateSystemModuleDto {
  name: string;
  slug: string;
  menuSection: string;
  frontendRoute: string;
  icon: string;
  displayOrder: number;
  isActive: boolean;
}

/**
 * Payload to update an existing dynamic module (`PUT /api/modules/{id}`).
 */
export interface UpdateSystemModuleDto {
  name: string;
  slug: string;
  menuSection: string;
  frontendRoute: string;
  icon: string;
  displayOrder: number;
  isActive: boolean;
}

/**
 * Role permissions matrix returned by `GET /api/roles/{id}/permissions`.
 */
export interface RolePermissionsMatrixDto {
  roleId: number;
  roleName: string;
  assignedModuleIds: number[];
  assignedActionIds: number[];
}

/**
 * Payload to assign modules and actions to a role (`PUT /api/roles/{id}/permissions`).
 */
export interface AssignRolePermissionsDto {
  moduleIds: number[];
  actionIds: number[];
}

/**
 * Module representation for legacy and matrix consumers.
 */
export interface ModuleDto {
  id?: number;
  moduleId: number;
  name: string;
  slug: string;
  menuSection?: string;
  frontendRoute?: string;
  icon?: string;
  displayOrder?: number;
  isActive?: boolean;
  actions?: ActionDto[];
  operations?: OperationDto[];
}

/**
 * Operation representation.
 */
export interface OperationDto {
  operationId: number;
  moduleId: number;
  name: string;
  slug: string;
  actions?: ActionDto[];
}

/**
 * Action representation.
 */
export interface ActionDto {
  id?: number;
  actionId: number;
  moduleId?: number;
  operationId: number;
  name: string;
  slug: string;
  httpMethod?: string;
  description?: string;
  isActive?: boolean;
  isAssigned?: boolean;
}

/**
 * Role action assignment payload.
 */
export interface RoleActionAssignmentDto {
  roleId: number;
  moduleIds?: number[];
  actionIds: number[];
}

/**
 * Role creation payload.
 */
export interface CreateRoleDto {
  name: string;
  description?: string;
  isActive?: boolean;
  isCourier?: boolean;
}

/**
 * Branch representation.
 */
export interface CompanyBranchDto {
  branchId: number;
  name: string;
  code?: string;
  isMatrix: boolean;
  companyId: number;
}

/**
 * Product category union type.
 */
export type ProductCategory = 'PULPAS' | 'LIMONADAS' | 'BATIDOS' | 'ESPECIAL' | string;

/**
 * Product presentation variant item.
 */
export interface ProductVariantDto {
  variantId: number;
  fruitId: number;
  fruitName: string;
  category: ProductCategory;
  sku: string;
  name: string;
  grammage: number;
  unitCost: number;
  basePrice: number;
  minStockAlert: number;
  currentStock: number;
  isActive: boolean;
}

/**
 * Payload to create a product variant.
 */
export interface CreateProductVariantDto {
  fruitId: number;
  fruitName?: string;
  category: ProductCategory;
  grammage: number;
  sku?: string;
  name?: string;
  unitCost: number;
  basePrice: number;
  minStockAlert: number;
  currentStock?: number;
}

/**
 * Inventory category display configuration.
 */
export interface InventoryCategoryConfig {
  id: string;
  name: string;
  icon: string;
  badgeClass?: string;
  isCustom?: boolean;
  isActive: boolean;
}

/**
 * Inventory grammage display configuration.
 */
export interface InventoryGrammageConfig {
  key: string;
  value: number;
  label: string;
  isCustom?: boolean;
  isActive: boolean;
}

/**
 * Inventory table column visibility configuration.
 */
export interface InventoryColumnConfig {
  key: string;
  label: string;
  description: string;
  visible: boolean;
  locked?: boolean;
}

/**
 * Consolidated inventory view settings.
 */
export interface InventorySettingsConfig {
  pageSize: number | 'all';
  defaultCategory: string;
  categories: InventoryCategoryConfig[];
  grammages: InventoryGrammageConfig[];
  columns: InventoryColumnConfig[];
}

/**
 * Monthly commercial sales target.
 */
export interface SalesTargetDto {
  targetId: number;
  branchId?: number;
  year: number;
  month: number;
  targetRevenue: number;
  targetUnits?: number;
  workingDays?: number;
  notes?: string;
  createdAt: string;
}

/**
 * Payload to upsert a monthly sales target.
 */
export interface UpsertSalesTargetDto {
  branchId?: number;
  year: number;
  month: number;
  targetRevenue: number;
  targetUnits?: number;
  notes?: string;
}

/**
 * Calculated commercial performance KPIs.
 */
export interface SalesPerformanceKpiDto {
  year?: number;
  month?: number;
  currentMonthRevenue: number;
  previousMonthRevenue: number;
  growthPercentage: number;
  grossProfit: number;
  grossMarginPercentage: number;
  monthTargetRevenue: number;
  targetAccumulatedProrated: number;
  compliancePercentage: number;
  projectedClosingRevenue: number;
  totalOrdersCount: number;
  averageTicketValue: number;
}

/**
 * Batch output breakdown by grammage.
 */
export interface BatchOutputDto {
  outputId?: number;
  batchId: number;
  variantId: number;
  grammage: 140 | 250 | 500 | 1000;
  unitsProduced: number;
  totalWeightKg: number;
  estimatedRetailValue: number;
}

/**
 * Ideal vs Real production loss audit item.
 */
export interface IdealVsRealAuditDto {
  auditId: number;
  branchId?: number;
  fruitId?: number | string;
  fruitName?: string;
  periodLabel: string;
  startDate: string;
  endDate: string;
  totalPulpKgProduced: number;
  unitsProduced: number;
  unitsBilled: number;
  unitsDifference: number;
  differenceUnits: number;
  idealRevenue: number;
  realRevenue: number;
  moneyDifference: number;
  differenceRevenue: number;
  lossPercentage: number;
  alertLevel: 'NORMAL' | 'MODERADA' | 'CRITICA';
  notes?: string;
  createdAt: string;
}

/**
 * Employee gender classification.
 */
export type EmployeeGender = 'MASCULINO' | 'FEMENINO' | 'OTRO';

/**
 * Operational plant area classification.
 */
export type EmployeeArea = 'PRODUCCION' | 'DOMICILIOS' | 'VENTAS' | 'ADMINISTRACION';

/**
 * Fortnightly payroll period descriptor.
 */
export interface PayrollPeriodDto {
  periodId: number;
  year: number;
  month: number;
  fortnight: 1 | 2;
  startDate: string;
  endDate: string;
  isClosed: boolean;
  closedAt?: string;
}

/**
 * Calculated fortnightly payroll settlement for an employee.
 */
export interface PayrollSettlementDto {
  settlementId: number;
  periodId: number;
  employeeId: number;
  employeeName: string;
  gender?: EmployeeGender;
  area: EmployeeArea;
  baseSalaryMonthly: number;
  daysWorked: number;
  baseSalaryEarned: number;
  transportAllowanceEarned: number;
  deliveryBonuses: number;
  overtimeAmount: number;
  otherBonuses: number;
  totalEarnings: number;
  healthDeduction: number;
  pensionDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  netPayable: number;
  paymentStatus: 'DRAFT' | 'APPROVED' | 'PAID';
  settledAt: string;
}

/**
 * Payload to settle an employee's fortnightly payroll.
 */
export interface CreatePayrollSettlementDto {
  periodId: number;
  employeeId: number;
  daysWorked: number;
  deliveryCount?: number;
  deliveryBonusRate?: number;
  overtimeAmount?: number;
  otherBonuses?: number;
  otherDeductions?: number;
  notes?: string;
}

/**
 * Corporate and billing settings aligned with `/api/company-settings`.
 */
export interface CompanyConfig {
  id?: number;
  companyName: string;
  legalName: string;
  nit: string;
  logoUrl?: string;
  tagline: string;
  address: string;
  city: string;
  department: string;
  country: string;
  phone: string;
  whatsapp: string;
  email: string;
  billingEmail: string;
  operatingHours: string;
  dispatchHours: string;
  taxRegime: string;
  dianResolution: string;
  invoicePrefix: string;
  invoiceNextNumber: number;
  invoiceFooterNote: string;
  taxPercentage?: number;
  monthlySalesTarget?: number;
}

/**
 * Alias for production batch record.
 */
export type ProductionBatchDto = BatchDto;

/**
 * Alias for production batch record.
 */
export type ProductionBatch = BatchDto;

/**
 * Alias for monthly sales target record.
 */
export type MonthlySalesTargetDto = SalesTargetDto;

/**
 * Alias for sales performance summary KPI record.
 */
export type SalesPerformanceSummaryDto = SalesPerformanceKpiDto;

/**
 * Alias for ideal vs real loss audit record.
 */
export type IdealVsRealLossAuditDto = IdealVsRealAuditDto;

/**
 * Metadata of a physical `.sql` database backup stored on the server (`/api/database-backups`).
 */
export interface DatabaseBackupInfoDto {
  fileName: string;
  sizeBytes: number;
  sizeFormatted: string;
  databaseName: string;
  tablesCount: number;
  totalRowsCount: number;
  durationMs: number;
  createdAtUtc: string;
  createdByUsername: string;
}

