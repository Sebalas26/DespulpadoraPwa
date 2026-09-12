// ==========================================
// FRUITS & BATCHES
// ==========================================
export interface FruitDto {
  fruitId: number;
  name: string;
  code: string;
  category?: string;
  yieldPercentage: number;
  pulpColor?: string;
  brixTarget?: number;
  unitPrice: number;
  isActive: boolean;
}

export interface CreateFruitDto {
  name: string;
  code: string;
  category?: string;
  yieldPercentage: number;
  pulpColor?: string;
  brixTarget?: number;
  unitPrice: number;
}

export interface BatchDto {
  batchId: number;
  batchCode: string;
  fruitId: number;
  fruitName?: string;
  branchId: number;
  branchName?: string;
  grossFruitKg: number;
  pulpProducedKg: number;
  realYieldPercentage: number;
  costPerKg: number;
  status: 'IN_PROCESS' | 'COMPLETED' | 'CANCELLED';
  operatorName?: string;
  notes?: string;
  productionDate: string;
  createdAt: string;
}

export interface CreateBatchDto {
  fruitId: number;
  branchId: number;
  grossFruitKg: number;
  costPerKg: number;
  notes?: string;
}

// Flat stock representations for fast UI reactivity
export interface StockByGrammage {
  g140: number;
  g250: number;
  g500: number;
  g1000: number;
}

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

export interface PulpStockAdjustmentDto {
  fruitId: number;
  branchId: number;
  grammage: 140 | 250 | 500 | 1000;
  quantityDelta: number; // positive = add, negative = deduct
  reason: string;
}

// ==========================================
// CLIENTS & IDENTIFICATION
// ==========================================
export interface IdentificationTypeDto {
  identificationTypeId: number;
  code: string;
  name: string;
}

export interface PaymentMethodDto {
  paymentMethodId: number;
  name: string;
  code?: string;
  isActive: boolean;
}

export interface ClientDto {
  clientId: number;
  fullName: string;
  identificationTypeId?: number;
  identificationNumber: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  notes?: string;
  isActive: boolean;
}

export interface CreateClientDto {
  fullName: string;
  identificationTypeId?: number;
  identificationNumber: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  notes?: string;
}

// ==========================================
// ORDERS & COMMERCIAL
// ==========================================
export type OrderStatus = 'PENDING' | 'PICKING' | 'BILLED' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';

export interface OrderItemDto {
  orderItemId?: number;
  fruitId: number;
  fruitName?: string;
  grammage: 140 | 250 | 500 | 1000;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  pickedQuantity?: number;
}

export interface OrderDto {
  orderId: number;
  orderNumber: string;
  branchId: number;
  branchName?: string;
  clientId: number;
  clientName: string;
  clientPhone?: string;
  clientAddress?: string;
  status: OrderStatus;
  orderDate: string;
  deliveryDate?: string;
  totalAmount: number;
  items: OrderItemDto[];
  paymentMethodId?: number;
  paymentMethodName?: string;
  isPaid: boolean;
  notes?: string;
  createdAt: string;
}

export interface CreateOrderDto {
  branchId: number;
  clientId: number;
  paymentMethodId?: number;
  deliveryDate?: string;
  notes?: string;
  items: {
    fruitId: number;
    grammage: number;
    quantity: number;
    unitPrice: number;
  }[];
}

export interface UpdateOrderStatusDto {
  orderId: number;
  status: OrderStatus;
  notes?: string;
}

export interface OrderMetricsDto {
  totalOrdersToday: number;
  pendingPickingCount: number;
  readyToBillCount: number;
  dispatchedCount: number;
  deliveredCount: number;
  todayRevenue: number;
}

// ==========================================
// WORK SHIFTS & ATTENDANCE
// ==========================================
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

export interface StartShiftDto {
  employeeId: number;
  branchId: number;
  shiftType: string;
  notes?: string;
}

export interface CloseShiftDto {
  shiftId: number;
  notes?: string;
}

// ==========================================
// EMPLOYEES & HUMAN RESOURCES
// ==========================================
export interface DepartmentDto {
  departmentId: number;
  name: string;
  code?: string;
}

export interface PositionDto {
  positionId: number;
  title: string;
  departmentId: number;
}

export interface EmployeeDto {
  employeeId: number;
  firstName: string;
  lastName: string;
  fullName: string;
  identificationNumber: string;
  phone?: string;
  email?: string;
  position?: string;
  department?: string;
  baseSalary: number;
  hireDate: string;
  isActive: boolean;
  activeShift?: WorkShiftDto;
}

// ==========================================
// EXPENSES & ACCOUNTING
// ==========================================
export interface AccountCategoryDto {
  categoryId: number;
  name: string;
  code?: string;
  isExpense: boolean;
}

export interface ExpenseDto {
  expenseId: number;
  branchId: number;
  branchName?: string;
  categoryId: number;
  categoryName: string;
  description: string;
  amount: number;
  expenseDate: string;
  paymentMethodId?: number;
  paymentMethodName?: string;
  receiptNumber?: string;
  createdAt: string;
}

export interface CreateExpenseDto {
  branchId: number;
  categoryId: number;
  description: string;
  amount: number;
  expenseDate: string;
  paymentMethodId?: number;
  receiptNumber?: string;
}

// ==========================================
// RBAC & USER ADMINISTRATION
// ==========================================
export interface UserAdminDto {
  userId: number;
  username: string;
  email: string;
  fullName: string;
  roleId: number;
  roleName: string;
  companyId: number;
  companyName?: string;
  isActive: boolean;
  branches: { branchId: number; name: string }[];
}

export interface CreateUserDto {
  username: string;
  email: string;
  fullName: string;
  password?: string;
  roleId: number;
  companyId: number;
  branchIds: number[];
}

export interface UpdateUserDto {
  userId: number;
  fullName: string;
  email: string;
  roleId: number;
  isActive: boolean;
  branchIds: number[];
}

export interface UserRoleDto {
  roleId: number;
  name: string;
  description?: string;
  isSystemRole: boolean;
  usersCount?: number;
}

export interface ModuleDto {
  moduleId: number;
  name: string;
  slug: string;
  icon?: string;
  operations?: OperationDto[];
}

export interface OperationDto {
  operationId: number;
  moduleId: number;
  name: string;
  slug: string;
  actions?: ActionDto[];
}

export interface ActionDto {
  actionId: number;
  operationId: number;
  name: string;
  slug: string;
  isAssigned?: boolean;
}

export interface RoleActionAssignmentDto {
  roleId: number;
  actionIds: number[];
}

export interface CreateRoleDto {
  name: string;
  description?: string;
}

export interface CompanyBranchDto {
  branchId: number;
  name: string;
  code?: string;
  isMatrix: boolean;
  companyId: number;
}

