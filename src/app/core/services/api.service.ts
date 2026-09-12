import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AccountCategoryDto,
  ActionDto,
  BatchDto,
  ClientDto,
  CompanyBranchDto,
  CreateBatchDto,
  CreateClientDto,
  CreateExpenseDto,
  CreateFruitDto,
  CreateOrderDto,
  CreateRoleDto,
  CreateUserDto,
  DepartmentDto,
  EmployeeDto,
  ExpenseDto,
  FruitDto,
  IdentificationTypeDto,
  ModuleDto,
  OperationDto,
  OrderDto,
  OrderMetricsDto,
  PaymentMethodDto,
  PositionDto,
  PulpStockAdjustmentDto,
  PulpStockItem,
  RoleActionAssignmentDto,
  StartShiftDto,
  CloseShiftDto,
  UpdateOrderStatusDto,
  UpdateUserDto,
  UserAdminDto,
  UserRoleDto,
  WorkShiftDto
} from '../models/business.models';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  // ==========================================
  // FRUITS & BATCHES
  // ==========================================
  getFruits(): Observable<FruitDto[]> {
    return this.http.get<FruitDto[]>(`${this.baseUrl}/fruit`);
  }

  getFruitById(fruitId: number): Observable<FruitDto> {
    return this.http.get<FruitDto>(`${this.baseUrl}/fruit/${fruitId}`);
  }

  createFruit(dto: CreateFruitDto): Observable<FruitDto> {
    return this.http.post<FruitDto>(`${this.baseUrl}/fruit`, dto);
  }

  updateFruit(fruitId: number, dto: Partial<CreateFruitDto>): Observable<FruitDto> {
    return this.http.put<FruitDto>(`${this.baseUrl}/fruit/${fruitId}`, dto);
  }

  deleteFruit(fruitId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/fruit/${fruitId}`);
  }

  getBatches(branchId?: number): Observable<BatchDto[]> {
    let params = new HttpParams();
    if (branchId) params = params.set('branchId', branchId.toString());
    return this.http.get<BatchDto[]>(`${this.baseUrl}/batch`, { params });
  }

  getBatchById(batchId: number): Observable<BatchDto> {
    return this.http.get<BatchDto>(`${this.baseUrl}/batch/${batchId}`);
  }

  createBatch(dto: CreateBatchDto): Observable<BatchDto> {
    return this.http.post<BatchDto>(`${this.baseUrl}/batch`, dto);
  }

  completeBatch(batchId: number, pulpProducedKg: number): Observable<BatchDto> {
    return this.http.put<BatchDto>(`${this.baseUrl}/batch/${batchId}/complete`, { pulpProducedKg });
  }

  // ==========================================
  // STOCK & INVENTORY
  // ==========================================
  getStock(branchId?: number): Observable<PulpStockItem[]> {
    let params = new HttpParams();
    if (branchId) params = params.set('branchId', branchId.toString());
    return this.http.get<PulpStockItem[]>(`${this.baseUrl}/stock`, { params });
  }

  adjustStock(dto: PulpStockAdjustmentDto): Observable<any> {
    return this.http.post(`${this.baseUrl}/stock/adjust`, dto);
  }

  // ==========================================
  // ORDERS & COMMERCIAL
  // ==========================================
  getOrders(branchId?: number, status?: string): Observable<OrderDto[]> {
    let params = new HttpParams();
    if (branchId) params = params.set('branchId', branchId.toString());
    if (status) params = params.set('status', status);
    return this.http.get<OrderDto[]>(`${this.baseUrl}/order`, { params });
  }

  getOrderById(orderId: number): Observable<OrderDto> {
    return this.http.get<OrderDto>(`${this.baseUrl}/order/${orderId}`);
  }

  createOrder(dto: CreateOrderDto): Observable<OrderDto> {
    return this.http.post<OrderDto>(`${this.baseUrl}/order`, dto);
  }

  updateOrderStatus(dto: UpdateOrderStatusDto): Observable<OrderDto> {
    return this.http.put<OrderDto>(`${this.baseUrl}/order/${dto.orderId}/status`, dto);
  }

  getOrderMetrics(branchId?: number): Observable<OrderMetricsDto> {
    let params = new HttpParams();
    if (branchId) params = params.set('branchId', branchId.toString());
    return this.http.get<OrderMetricsDto>(`${this.baseUrl}/order/metrics`, { params });
  }

  // ==========================================
  // CLIENTS & IDENTIFICATION
  // ==========================================
  getClients(): Observable<ClientDto[]> {
    return this.http.get<ClientDto[]>(`${this.baseUrl}/client`);
  }

  getClientById(clientId: number): Observable<ClientDto> {
    return this.http.get<ClientDto>(`${this.baseUrl}/client/${clientId}`);
  }

  createClient(dto: CreateClientDto): Observable<ClientDto> {
    return this.http.post<ClientDto>(`${this.baseUrl}/client`, dto);
  }

  getIdentificationTypes(): Observable<IdentificationTypeDto[]> {
    return this.http.get<IdentificationTypeDto[]>(`${this.baseUrl}/identificationtypes`);
  }

  getPaymentMethods(): Observable<PaymentMethodDto[]> {
    return this.http.get<PaymentMethodDto[]>(`${this.baseUrl}/paymentmethod`);
  }

  // ==========================================
  // SHIFTS & WORK HOURS
  // ==========================================
  getShifts(branchId?: number, date?: string): Observable<WorkShiftDto[]> {
    let params = new HttpParams();
    if (branchId) params = params.set('branchId', branchId.toString());
    if (date) params = params.set('date', date);
    return this.http.get<WorkShiftDto[]>(`${this.baseUrl}/workshift`, { params });
  }

  startShift(dto: StartShiftDto): Observable<WorkShiftDto> {
    return this.http.post<WorkShiftDto>(`${this.baseUrl}/workshift/start`, dto);
  }

  closeShift(dto: CloseShiftDto): Observable<WorkShiftDto> {
    return this.http.post<WorkShiftDto>(`${this.baseUrl}/workshift/close`, dto);
  }

  // ==========================================
  // EMPLOYEES & HR
  // ==========================================
  getEmployees(branchId?: number): Observable<EmployeeDto[]> {
    let params = new HttpParams();
    if (branchId) params = params.set('branchId', branchId.toString());
    return this.http.get<EmployeeDto[]>(`${this.baseUrl}/employee`, { params });
  }

  getEmployeeById(employeeId: number): Observable<EmployeeDto> {
    return this.http.get<EmployeeDto>(`${this.baseUrl}/employee/${employeeId}`);
  }

  createEmployee(dto: any): Observable<EmployeeDto> {
    return this.http.post<EmployeeDto>(`${this.baseUrl}/employee`, dto);
  }

  updateEmployee(employeeId: number, dto: any): Observable<EmployeeDto> {
    return this.http.put<EmployeeDto>(`${this.baseUrl}/employee/${employeeId}`, dto);
  }

  getDepartments(): Observable<DepartmentDto[]> {
    return this.http.get<DepartmentDto[]>(`${this.baseUrl}/department`);
  }

  getPositions(): Observable<PositionDto[]> {
    return this.http.get<PositionDto[]>(`${this.baseUrl}/position`);
  }

  // ==========================================
  // EXPENSES & ACCOUNTING
  // ==========================================
  getExpenses(branchId?: number): Observable<ExpenseDto[]> {
    let params = new HttpParams();
    if (branchId) params = params.set('branchId', branchId.toString());
    return this.http.get<ExpenseDto[]>(`${this.baseUrl}/expense`, { params });
  }

  createExpense(dto: CreateExpenseDto): Observable<ExpenseDto> {
    return this.http.post<ExpenseDto>(`${this.baseUrl}/expense`, dto);
  }

  getAccountCategories(): Observable<AccountCategoryDto[]> {
    return this.http.get<AccountCategoryDto[]>(`${this.baseUrl}/accountcategory`);
  }

  // ==========================================
  // BRANCHES
  // ==========================================
  getBranches(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/companybranch`);
  }

  // ==========================================
  // RBAC & USER ADMINISTRATION
  // ==========================================
  getUsers(): Observable<UserAdminDto[]> {
    return this.http.get<UserAdminDto[]>(`${this.baseUrl}/users`);
  }

  getUserById(userId: number): Observable<UserAdminDto> {
    return this.http.get<UserAdminDto>(`${this.baseUrl}/users/${userId}`);
  }

  createUser(dto: CreateUserDto): Observable<UserAdminDto> {
    return this.http.post<UserAdminDto>(`${this.baseUrl}/users`, dto);
  }

  updateUser(userId: number, dto: UpdateUserDto): Observable<UserAdminDto> {
    return this.http.put<UserAdminDto>(`${this.baseUrl}/users/${userId}`, dto);
  }

  deleteUser(userId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/users/${userId}`);
  }

  getRoles(): Observable<UserRoleDto[]> {
    return this.http.get<UserRoleDto[]>(`${this.baseUrl}/userrole`);
  }

  createRole(dto: { name: string; description?: string }): Observable<UserRoleDto> {
    return this.http.post<UserRoleDto>(`${this.baseUrl}/userrole`, dto);
  }

  getModules(): Observable<ModuleDto[]> {
    return this.http.get<ModuleDto[]>(`${this.baseUrl}/module`);
  }

  getOperations(moduleId?: number): Observable<OperationDto[]> {
    let params = new HttpParams();
    if (moduleId) params = params.set('moduleId', moduleId.toString());
    return this.http.get<OperationDto[]>(`${this.baseUrl}/operation`, { params });
  }

  getActions(): Observable<ActionDto[]> {
    return this.http.get<ActionDto[]>(`${this.baseUrl}/actions`);
  }

  getRoleActions(roleId: number): Observable<ActionDto[]> {
    return this.http.get<ActionDto[]>(`${this.baseUrl}/roleactions/${roleId}`);
  }

  assignRoleActions(roleId: number, actionIds: number[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/roleactions/${roleId}/assign`, { roleId, actionIds });
  }
}
