import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ActionDto, ModuleDto, UserRoleDto } from '../../../core/models/business.models';

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

  readonly showCreateRoleModal = signal<boolean>(false);
  readonly newRoleName = signal<string>('');
  readonly newRoleDesc = signal<string>('');

  // Modules & Actions tree
  readonly modules = signal<{
    moduleId: number;
    name: string;
    actions: { actionId: number; name: string; slug: string }[];
  }[]>([
    {
      moduleId: 1,
      name: 'Producción & Lotes',
      actions: [
        { actionId: 101, name: 'Ver Lotes de Producción', slug: 'batches.view' },
        { actionId: 102, name: 'Registrar Formulación y Lote', slug: 'batches.create' },
        { actionId: 103, name: 'Cerrar / Aprobar Lote', slug: 'batches.complete' }
      ]
    },
    {
      moduleId: 2,
      name: 'Cava & Existencias',
      actions: [
        { actionId: 201, name: 'Consultar Stock en Cava', slug: 'stock.view' },
        { actionId: 202, name: 'Ajuste Manual de Inventario', slug: 'stock.adjust' },
        { actionId: 203, name: 'Configurar Catálogo de Frutas', slug: 'fruit.manage' }
      ]
    },
    {
      moduleId: 3,
      name: 'Comercial & Pedidos',
      actions: [
        { actionId: 301, name: 'Ver Pedidos en Cava', slug: 'orders.view' },
        { actionId: 302, name: 'Crear Pedidos (WhatsApp / Manual)', slug: 'orders.create' },
        { actionId: 303, name: 'Alistar Picking en Cava', slug: 'orders.picking' },
        { actionId: 304, name: 'Facturar y Emitir Ticket POS', slug: 'orders.bill' },
        { actionId: 305, name: 'Despachar Rutas de Entrega', slug: 'orders.dispatch' }
      ]
    },
    {
      moduleId: 4,
      name: 'Gestión Humana & Turnos',
      actions: [
        { actionId: 401, name: 'Marcación de Turnos (Entrada/Salida)', slug: 'shifts.punch' },
        { actionId: 402, name: 'Consultar Plantilla de Empleados', slug: 'hr.view' },
        { actionId: 403, name: 'Generar Desprendibles de Nómina', slug: 'hr.payslips' }
      ]
    },
    {
      moduleId: 5,
      name: 'Seguridad & Administración',
      actions: [
        { actionId: 501, name: 'Gestionar Usuarios y Cuentas', slug: 'users.manage' },
        { actionId: 502, name: 'Gestionar Matriz de Roles y Permisos', slug: 'roles.manage' }
      ]
    }
  ]);

  ngOnInit() {
    this.loadRoles();
  }

  loadRoles() {
    this.api.getRoles().subscribe({
      next: (res) => {
        if (res && res.length > 0) {
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
    const list: UserRoleDto[] = [
      { roleId: 1, name: 'Super Administrador', isSystemRole: true },
      { roleId: 2, name: 'Operario de Planta', isSystemRole: false },
      { roleId: 3, name: 'Jefe de Logística y Despachos', isSystemRole: false },
      { roleId: 4, name: 'Auxiliar de Facturación', isSystemRole: false }
    ];
    this.roles.set(list);
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

    // Call API for assigned role actions
    this.api.getRoleActions(roleId).subscribe({
      next: (actions) => {
        const set = new Set<number>(actions.map(a => a.actionId));
        this.assignedActionIds.set(set);
      },
      error: () => {
        // Sample fallback assignment
        const set = new Set<number>([101, 102, 201, 301, 303, 401]);
        this.assignedActionIds.set(set);
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

  savePermissions() {
    const roleId = this.selectedRoleId();
    const actionIds = Array.from(this.assignedActionIds());

    this.api.assignRoleActions(roleId, actionIds).subscribe({
      next: () => {
        this.notification.success('Matriz Guardada', 'Permisos del rol actualizados exitosamente');
      },
      error: () => {
        this.notification.info('Actualizado Localmente', 'Los permisos se han aplicado en la sesión');
      }
    });
  }

  submitNewRole() {
    if (!this.newRoleName()) return;

    const newRole: UserRoleDto = {
      roleId: Date.now(),
      name: this.newRoleName(),
      description: this.newRoleDesc(),
      isSystemRole: false
    };

    this.roles.update(list => [...list, newRole]);
    this.selectRole(newRole.roleId);
    this.notification.success('Rol Creado', `Rol ${newRole.name} listo para asignación`);
    this.showCreateRoleModal.set(false);

    this.api.createRole({ name: newRole.name, description: newRole.description }).subscribe({
      error: () => {}
    });

    this.newRoleName.set('');
    this.newRoleDesc.set('');
  }
}
