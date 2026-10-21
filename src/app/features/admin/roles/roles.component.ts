import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { NotificationService } from '../../../core/services/notification.service';
import { UserRoleDto } from '../../../core/models/business.models';

export interface PermissionAction {
  actionId: number;
  name: string;
  slug: string;
  description: string;
}

export interface PermissionModule {
  moduleId: number;
  name: string;
  scope: 'PWA' | 'APP' | 'PWA + APP';
  description: string;
  actions: PermissionAction[];
}

export const SYSTEM_ROLES: UserRoleDto[] = [
  { roleId: 1, name: 'Super Administrador', description: 'Acceso total y sin restricciones a todos los módulos y operaciones del sistema.', isSystemRole: true },
  { roleId: 2, name: 'Jefe de Producción & Planta', description: 'Supervisión de formulación, lotes, mermas de fruta, stock en cava y turnos operativos.', isSystemRole: false },
  { roleId: 3, name: 'Jefe de Logística & Despachos', description: 'Gestión de rutas de entrega, mapa satelital, secuenciador, despacho y arqueo de mensajeros.', isSystemRole: false },
  { roleId: 4, name: 'Auxiliar de Facturación & POS', description: 'Facturación en punto de venta, cobros en efectivo/digital, gestión de clientes y cartera.', isSystemRole: false },
  { roleId: 5, name: 'Operario de Cava / Picking KDS', description: 'Visualización y checklist de alistamiento de pedidos en cava (KDS) y marcación de turno.', isSystemRole: false },
  { roleId: 6, name: 'Domiciliario / Mensajero Repartidor (App Móvil)', description: 'Operación de la App Móvil Flutter: entrega de pedidos, cobros en calle y GPS.', isSystemRole: false },
  { roleId: 7, name: 'Talento Humano & Nómina', description: 'Directorio de colaboradores, certificados bancarios/laborales y liquidación quincenal de nómina.', isSystemRole: false }
];

export const SYSTEM_MODULES: PermissionModule[] = [
  {
    moduleId: 1,
    name: 'Producción, Formulación & Mermas',
    scope: 'PWA',
    description: 'Control de lotes de despulpado, formulación por variedad y cálculo estricto de rendimiento.',
    actions: [
      { actionId: 101, name: 'Ver Lotes de Producción', slug: 'batches.view', description: 'Consultar historial y estado de lotes procesados' },
      { actionId: 102, name: 'Registrar Formulación y Lote', slug: 'batches.create', description: 'Iniciar nuevo lote con pesado de fruta e insumos' },
      { actionId: 103, name: 'Cerrar / Aprobar Lote', slug: 'batches.complete', description: 'Finalizar lote y transferir pulpas obtenidas a cava' },
      { actionId: 104, name: 'Calculadora de Rendimiento', slug: 'calculator.view', description: 'Calcular porcentaje de pulpa útil vs merma' },
      { actionId: 105, name: 'Auditoría Venta Ideal vs Real', slug: 'calculator.audit', description: 'Auditar brechas monetarias entre producido y facturado' },
      { actionId: 106, name: 'Exportar Análisis Técnico', slug: 'calculator.export', description: 'Descargar reportes técnicos de formulación' }
    ]
  },
  {
    moduleId: 2,
    name: 'Inventario, Fruta Fresca & Cava',
    scope: 'PWA',
    description: 'Gestión de existencias de fruta recibida en planta y unidades terminadas congeladas en cava.',
    actions: [
      { actionId: 201, name: 'Consultar Stock en Cava', slug: 'stock.view', description: 'Ver unidades congeladas disponibles por presentación' },
      { actionId: 202, name: 'Ajuste Manual de Inventario', slug: 'stock.adjust', description: 'Registrar conteos físicos, mermas o pérdidas en cava' },
      { actionId: 203, name: 'Inventario de Fruta Disponible', slug: 'inventory.fruit_view', description: 'Ver kilos de fruta fresca en recepción y precios' },
      { actionId: 204, name: 'Registrar Compra de Fruta', slug: 'inventory.fruit_manage', description: 'Ingresar cargamentos de fruta de proveedores' },
      { actionId: 205, name: 'Catálogo de Frutas & Variedades', slug: 'fruit.manage', description: 'Configurar catálogo, gramajes y precios base' }
    ]
  },
  {
    moduleId: 3,
    name: 'Comercial, Pedidos & Alistamiento KDS',
    scope: 'PWA',
    description: 'Recepción de órdenes por WhatsApp/manual y estación de alistamiento en cava.',
    actions: [
      { actionId: 301, name: 'Ver Pedidos en Cola', slug: 'orders.view', description: 'Visualizar listado de órdenes y estados comerciales' },
      { actionId: 302, name: 'Crear Pedidos (Manual & WhatsApp)', slug: 'orders.create', description: 'Ingresar pedidos manuales o procesar audios de IA' },
      { actionId: 303, name: 'Modificar / Cancelar Pedido', slug: 'orders.edit', description: 'Editar detalles, cantidades o anular pedidos' },
      { actionId: 304, name: 'Pantalla KDS de Alistamiento', slug: 'kds.view', description: 'Ver pantalla táctil KDS de picking en cava' },
      { actionId: 305, name: 'Checklist de Picking & Empaque', slug: 'kds.picking', description: 'Marcar productos alistados y empacados en hielera' },
      { actionId: 306, name: 'Reabrir Pedidos Alistados', slug: 'kds.reopen', description: 'Devolver órdenes de despacho a picking por cambios' }
    ]
  },
  {
    moduleId: 4,
    name: 'Facturación, Caja & POS',
    scope: 'PWA',
    description: 'Cobro de pedidos, emisión de tirilla POS, registro de medios de pago y factura corporativa.',
    actions: [
      { actionId: 401, name: 'Facturar y Emitir Factura POS', slug: 'orders.bill', description: 'Generar comprobante de venta POS y registrar salida' },
      { actionId: 402, name: 'Consultar Flujo de Facturación', slug: 'billing.view', description: 'Ver facturación diaria consolidada y arqueo' },
      { actionId: 403, name: 'Registrar Métodos de Pago', slug: 'billing.payment_collect', description: 'Registrar Efectivo, Nequi, Daviplata o Bancolombia' },
      { actionId: 404, name: 'Visualizar Factura Corporativa', slug: 'billing.invoice_preview', description: 'Consultar vista previa de factura legal de la empresa' }
    ]
  },
  {
    moduleId: 5,
    name: 'Despachos, Enrutamiento & GPS',
    scope: 'PWA',
    description: 'Asignación de zonas, enrutador inteligente de mensajeros y arqueo de entregas en planta.',
    actions: [
      { actionId: 501, name: 'Despachar Rutas de Entrega', slug: 'orders.dispatch', description: 'Asignar órdenes a domiciliarios y dar salida' },
      { actionId: 502, name: 'Mapa Interactivo & Telemetría', slug: 'map.view', description: 'Supervisar ubicación en vivo de mensajeros y paradas' },
      { actionId: 503, name: 'Georreferenciar Puntos de Entrega', slug: 'map.georeference', description: 'Fijar coordenadas exactas de clientes en el mapa' },
      { actionId: 504, name: 'Enrutador & Secuenciador', slug: 'map.route_planner', description: 'Ordenar y optimizar paradas de entrega por cercanía' },
      { actionId: 505, name: 'Recibir Domiciliario & Arqueo de Caja', slug: 'map.courier_receive', description: 'Liquidación de dinero recaudado y paz y salvo de ruta' }
    ]
  },
  {
    moduleId: 6,
    name: 'App Móvil de Domiciliarios (DespulpadoraApp)',
    scope: 'APP',
    description: 'Funcionalidades operativas de la aplicación móvil Flutter para repartidores en moto/furgón.',
    actions: [
      { actionId: 601, name: 'Acceso a la App Móvil', slug: 'mobile.app_login', description: 'Iniciar sesión en la app nativa de repartos' },
      { actionId: 602, name: 'Consultar Hoja de Ruta Asignada', slug: 'mobile.route_view', description: 'Ver paradas, direcciones y teléfonos de clientes' },
      { actionId: 603, name: 'Reportar Estado de Entrega', slug: 'mobile.delivery_status', description: 'Marcar entregado o no entregado con motivo' },
      { actionId: 604, name: 'Registrar Recaudo en Calle', slug: 'mobile.cash_collection', description: 'Cobrar en destino y confirmar método de pago' },
      { actionId: 605, name: 'Transmisión de Telemetría GPS', slug: 'mobile.gps_telemetry', description: 'Enviar ubicación satelital en tiempo real a la central' }
    ]
  },
  {
    moduleId: 7,
    name: 'Clientes & Cartera (Contabilidad)',
    scope: 'PWA',
    description: 'Directorio de clientes, cupos de crédito, estados de cuenta y libro auxiliar de cobros.',
    actions: [
      { actionId: 701, name: 'Consultar Directorio de Clientes', slug: 'clients.view', description: 'Ver información comercial y saldos pendientes' },
      { actionId: 702, name: 'Crear & Modificar Clientes', slug: 'clients.manage', description: 'Registrar nuevos clientes, direcciones y teléfonos' },
      { actionId: 703, name: 'Asignar Límite de Crédito', slug: 'clients.credit_limit', description: 'Autorizar ventas a crédito y gestionar cobros' },
      { actionId: 704, name: 'Libro Auxiliar Contable', slug: 'accounting.view', description: 'Revisar ingresos, cuentas por cobrar y egresos' }
    ]
  },
  {
    moduleId: 8,
    name: 'Gestión de Personal, Turnos & Nómina',
    scope: 'PWA',
    description: 'Directorio de colaboradores, marcación de asistencia, certificaciones bancarias y liquidación.',
    actions: [
      { actionId: 801, name: 'Consultar Directorio de Personal', slug: 'hr.view', description: 'Ver lista de colaboradores, cargos y salarios' },
      { actionId: 802, name: 'Crear & Gestionar Personal', slug: 'hr.manage', description: 'Registrar nuevo colaborador o dar de baja' },
      { actionId: 803, name: 'Certificaciones Bancarias & Laborales', slug: 'hr.certificates', description: 'Generar e imprimir cartas laborales y bancarias' },
      { actionId: 804, name: 'Liquidar Nómina Quincenal', slug: 'hr.payroll_settle', description: 'Calcular devengados, deducciones y desprendibles' },
      { actionId: 805, name: 'Supervisión de Turnos Activos', slug: 'shifts.view', description: 'Consultar operarios en línea y recesos programados' },
      { actionId: 806, name: 'Terminal de Marcación (Punch Clock)', slug: 'shifts.punch', description: 'Marcar entrada y salida de turno en planta' }
    ]
  },
  {
    moduleId: 9,
    name: 'Informes & Inteligencia de Negocio',
    scope: 'PWA',
    description: 'Análisis de ventas, rendimiento por fruta, cumplimiento de metas comerciales y exportación.',
    actions: [
      { actionId: 901, name: 'Consultar Informes de Ventas', slug: 'reports.view', description: 'Gráficos de facturación, volumen y recaudos' },
      { actionId: 902, name: 'Exportar Informes (Excel/PDF)', slug: 'reports.export', description: 'Descargar datos consolidados para auditoría' },
      { actionId: 903, name: 'Ajustar Meta Comercial Mensual', slug: 'dashboard.targets', description: 'Definir cuota objetivo de facturación' }
    ]
  },
  {
    moduleId: 10,
    name: 'Configuración & Seguridad RBAC',
    scope: 'PWA + APP',
    description: 'Administración de cuentas de usuario, roles de seguridad, catálogo general y empresa.',
    actions: [
      { actionId: 1001, name: 'Configuración de Catálogo & Parámetros', slug: 'settings.catalog', description: 'Administrar categorías, gramajes y columnas' },
      { actionId: 1002, name: 'Datos de Empresa & Facturación', slug: 'settings.company', description: 'Configurar NIT, razón social y datos fiscales' },
      { actionId: 1003, name: 'Gestionar Cuentas de Usuario', slug: 'users.manage', description: 'Crear, suspender o reactivar usuarios del sistema' },
      { actionId: 1004, name: 'Matriz de Roles & Privilegios RBAC', slug: 'roles.manage', description: 'Configurar permisos dinámicos por rol de usuario' }
    ]
  }
];

export const DEFAULT_ROLE_PERMISSIONS: Record<number, number[]> = {
  1: [
    101, 102, 103, 104, 105, 106,
    201, 202, 203, 204, 205,
    301, 302, 303, 304, 305, 306,
    401, 402, 403, 404,
    501, 502, 503, 504, 505,
    601, 602, 603, 604, 605,
    701, 702, 703, 704,
    801, 802, 803, 804, 805, 806,
    901, 902, 903,
    1001, 1002, 1003, 1004
  ],
  2: [
    101, 102, 103, 104, 105, 106,
    201, 202, 203, 204, 205,
    301, 304, 305, 306,
    805, 806
  ],
  3: [
    201,
    301, 302, 303, 304, 305, 306,
    501, 502, 503, 504, 505,
    601, 602, 603, 604, 605,
    701,
    901
  ],
  4: [
    201,
    301, 302, 303,
    401, 402, 403, 404,
    701, 702, 703, 704,
    901, 902
  ],
  5: [
    201,
    304, 305,
    806
  ],
  6: [
    502,
    601, 602, 603, 604, 605,
    806
  ],
  7: [
    801, 802, 803, 804, 805, 806
  ]
};

const STORAGE_ROLES_KEY = 'dgl_roles_v2';
const STORAGE_PERMISSIONS_KEY = 'dgl_role_permissions_v2';

@Component({
  selector: 'app-admin-roles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './roles.component.html',
  styleUrls: ['./roles.component.scss']
})
export class AdminRolesComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly notification = inject(NotificationService);

  readonly roles = signal<UserRoleDto[]>([]);
  readonly selectedRoleId = signal<number>(1);
  readonly assignedActionIds = signal<Set<number>>(new Set());

  // Search filter
  readonly searchTerm = signal<string>('');
  readonly scopeFilter = signal<'ALL' | 'PWA' | 'APP'>('ALL');

  // Modals
  readonly showCreateRoleModal = signal<boolean>(false);
  readonly newRoleName = signal<string>('');
  readonly newRoleDesc = signal<string>('');

  // Complete Modules & Actions tree
  readonly modules = signal<PermissionModule[]>(SYSTEM_MODULES);

  // Total actions count
  readonly totalActionsCount = computed(() => {
    return this.modules().reduce((acc, m) => acc + m.actions.length, 0);
  });

  // Selected role object
  readonly currentRole = computed(() => {
    const id = this.selectedRoleId();
    return this.roles().find(r => r.roleId === id) || this.roles()[0];
  });

  // Filtered modules based on search and scope
  readonly filteredModules = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const scope = this.scopeFilter();

    return this.modules()
      .filter(m => {
        if (scope === 'ALL') return true;
        if (scope === 'PWA') return m.scope === 'PWA' || m.scope === 'PWA + APP';
        if (scope === 'APP') return m.scope === 'APP' || m.scope === 'PWA + APP';
        return true;
      })
      .map(m => {
        if (!term) return m;
        const matchingActions = m.actions.filter(a =>
          a.name.toLowerCase().includes(term) ||
          a.slug.toLowerCase().includes(term) ||
          a.description.toLowerCase().includes(term)
        );
        const moduleMatches = m.name.toLowerCase().includes(term) || m.description.toLowerCase().includes(term);
        return {
          ...m,
          actions: moduleMatches ? m.actions : matchingActions
        };
      })
      .filter(m => m.actions.length > 0);
  });

  ngOnInit() {
    this.loadRoles();
  }

  loadRoles() {
    const savedRoles = localStorage.getItem(STORAGE_ROLES_KEY);
    if (savedRoles) {
      try {
        const parsed = JSON.parse(savedRoles);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.roles.set(parsed);
          this.selectRole(parsed[0].roleId);
          return;
        }
      } catch {
        // Fallback
      }
    }

    this.api.getRoles().subscribe({
      next: (res) => {
        if (res && res.length >= 4) {
          this.roles.set(res);
          this.selectRole(res[0].roleId);
        } else {
          this.fallbackRoles();
        }
      },
      error: () => {
        this.fallbackRoles();
      }
    });
  }

  private fallbackRoles() {
    this.roles.set(SYSTEM_ROLES);
    this.saveRolesToStorage(SYSTEM_ROLES);
    this.selectRole(1);
  }

  selectRole(roleId: number) {
    this.selectedRoleId.set(roleId);

    // Super Admin has all actions
    if (roleId === 1) {
      const allIds = new Set<number>();
      this.modules().forEach(m => m.actions.forEach(a => allIds.add(a.actionId)));
      this.assignedActionIds.set(allIds);
      return;
    }

    // Check localStorage map
    const storedPermsMap = this.getStoredPermissionsMap();
    if (storedPermsMap[roleId]) {
      this.assignedActionIds.set(new Set(storedPermsMap[roleId]));
      return;
    }

    // Check default role permissions
    if (DEFAULT_ROLE_PERMISSIONS[roleId]) {
      this.assignedActionIds.set(new Set(DEFAULT_ROLE_PERMISSIONS[roleId]));
      return;
    }

    // Call API for assigned role actions
    this.api.getRoleActions(roleId).subscribe({
      next: (actions) => {
        if (actions && actions.length > 0) {
          const set = new Set<number>(actions.map(a => a.actionId));
          this.assignedActionIds.set(set);
        } else {
          const fallback = DEFAULT_ROLE_PERMISSIONS[roleId] || [101, 201, 301, 805];
          this.assignedActionIds.set(new Set(fallback));
        }
      },
      error: () => {
        const fallback = DEFAULT_ROLE_PERMISSIONS[roleId] || [101, 201, 301, 805];
        this.assignedActionIds.set(new Set(fallback));
      }
    });
  }

  toggleAction(actionId: number) {
    if (this.selectedRoleId() === 1) {
      this.notification.warning('Rol Protegido', 'El Super Administrador conserva todos los privilegios globales');
      return;
    }

    this.assignedActionIds.update(set => {
      const next = new Set(set);
      if (next.has(actionId)) {
        next.delete(actionId);
      } else {
        next.add(actionId);
      }
      return next;
    });
  }

  toggleAllModuleActions(mod: PermissionModule) {
    if (this.selectedRoleId() === 1) {
      this.notification.warning('Rol Protegido', 'El Super Administrador conserva todos los privilegios globales');
      return;
    }

    const currentSet = this.assignedActionIds();
    const allAssigned = mod.actions.every(a => currentSet.has(a.actionId));

    this.assignedActionIds.update(set => {
      const next = new Set(set);
      if (allAssigned) {
        mod.actions.forEach(a => next.delete(a.actionId));
      } else {
        mod.actions.forEach(a => next.add(a.actionId));
      }
      return next;
    });
  }

  isModuleFullySelected(mod: PermissionModule): boolean {
    const set = this.assignedActionIds();
    return mod.actions.length > 0 && mod.actions.every(a => set.has(a.actionId));
  }

  getModuleAssignedCount(mod: PermissionModule): number {
    const set = this.assignedActionIds();
    return mod.actions.filter(a => set.has(a.actionId)).length;
  }

  savePermissions() {
    const roleId = this.selectedRoleId();
    const actionIds = Array.from(this.assignedActionIds());

    // Save in localStorage map
    const permsMap = this.getStoredPermissionsMap();
    permsMap[roleId] = actionIds;
    localStorage.setItem(STORAGE_PERMISSIONS_KEY, JSON.stringify(permsMap));

    // Call API
    this.api.assignRoleActions(roleId, actionIds).subscribe({
      next: () => {
        this.notification.success('Matriz Guardada', `Permisos del rol actualizados exitosamente (${actionIds.length} acciones)`);
      },
      error: () => {
        this.notification.success('Guardado Localmente', `Matriz RBAC guardada con éxito (${actionIds.length} acciones asignadas)`);
      }
    });
  }

  submitNewRole() {
    const name = this.newRoleName().trim();
    if (!name) return;

    const newRole: UserRoleDto = {
      roleId: Date.now(),
      name,
      description: this.newRoleDesc().trim() || 'Rol personalizado del sistema',
      isSystemRole: false
    };

    const updated = [...this.roles(), newRole];
    this.roles.set(updated);
    this.saveRolesToStorage(updated);
    this.selectRole(newRole.roleId);

    this.notification.success('Rol Creado', `Rol "${newRole.name}" listo para asignar permisos`);
    this.showCreateRoleModal.set(false);

    this.api.createRole({ name: newRole.name, description: newRole.description }).subscribe({
      error: () => {}
    });

    this.newRoleName.set('');
    this.newRoleDesc.set('');
  }

  deleteCustomRole(role: UserRoleDto, event: MouseEvent) {
    event.stopPropagation();
    if (role.isSystemRole) {
      this.notification.warning('No permitido', 'No es posible eliminar roles fijos del sistema');
      return;
    }

    if (!confirm(`¿Eliminar el rol "${role.name}"? Los usuarios asignados perderán este perfil.`)) {
      return;
    }

    const updated = this.roles().filter(r => r.roleId !== role.roleId);
    this.roles.set(updated);
    this.saveRolesToStorage(updated);

    // Remove permissions from storage
    const permsMap = this.getStoredPermissionsMap();
    delete permsMap[role.roleId];
    localStorage.setItem(STORAGE_PERMISSIONS_KEY, JSON.stringify(permsMap));

    this.selectRole(1);
    this.notification.info('Rol Eliminado', `El rol "${role.name}" fue eliminado.`);
  }

  private getStoredPermissionsMap(): Record<number, number[]> {
    const stored = localStorage.getItem(STORAGE_PERMISSIONS_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return { ...DEFAULT_ROLE_PERMISSIONS };
      }
    }
    return { ...DEFAULT_ROLE_PERMISSIONS };
  }

  private saveRolesToStorage(roles: UserRoleDto[]) {
    localStorage.setItem(STORAGE_ROLES_KEY, JSON.stringify(roles));
  }
}
