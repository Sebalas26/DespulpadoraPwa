import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { NotificationService } from '../../../core/services/notification.service';
import { UserAdminDto, UserRoleDto } from '../../../core/models/business.models';
import { SYSTEM_ROLES } from '../roles/roles.component';

const STORAGE_USERS_KEY = 'dgl_users_v2';
const STORAGE_ROLES_KEY = 'dgl_roles_v2';

const DEFAULT_USERS: UserAdminDto[] = [
  {
    userId: 1,
    username: 'admin',
    email: 'admin@despulpadora.com',
    fullName: 'Super Administrador Global',
    roleId: 1,
    roleName: 'Super Administrador',
    companyId: 1,
    isActive: true,
    branches: [{ branchId: 1, name: 'Sede Principal - Planta Cava' }]
  },
  {
    userId: 2,
    username: 'carlos.planta',
    email: 'produccion@despulpadora.com',
    fullName: 'Carlos Mendoza',
    roleId: 2,
    roleName: 'Jefe de Producción & Planta',
    companyId: 1,
    isActive: true,
    branches: [{ branchId: 1, name: 'Sede Principal - Planta Cava' }]
  },
  {
    userId: 3,
    username: 'andres.rutas',
    email: 'logistica@despulpadora.com',
    fullName: 'Andrés Restrepo',
    roleId: 3,
    roleName: 'Jefe de Logística & Despachos',
    companyId: 1,
    isActive: true,
    branches: [{ branchId: 1, name: 'Sede Principal - Planta Cava' }]
  },
  {
    userId: 4,
    username: 'diana.caja',
    email: 'facturacion@despulpadora.com',
    fullName: 'Diana Salazar',
    roleId: 4,
    roleName: 'Auxiliar de Facturación & POS',
    companyId: 1,
    isActive: true,
    branches: [{ branchId: 1, name: 'Sede Principal - Planta Cava' }]
  },
  {
    userId: 5,
    username: 'jorge.cava',
    email: 'picking@despulpadora.com',
    fullName: 'Jorge Beltrán',
    roleId: 5,
    roleName: 'Operario de Cava / Picking KDS',
    companyId: 1,
    isActive: true,
    branches: [{ branchId: 1, name: 'Sede Principal - Planta Cava' }]
  },
  {
    userId: 6,
    username: 'pedro.moto',
    email: 'domicilios@despulpadora.com',
    fullName: 'Pedro Rivas (Moto #01)',
    roleId: 6,
    roleName: 'Domiciliario / Mensajero Repartidor (App Móvil)',
    companyId: 1,
    isActive: true,
    branches: [{ branchId: 1, name: 'Sede Principal - Planta Cava' }]
  },
  {
    userId: 7,
    username: 'laura.rrhh',
    email: 'nomina@despulpadora.com',
    fullName: 'Laura Cardona',
    roleId: 7,
    roleName: 'Talento Humano & Nómina',
    companyId: 1,
    isActive: true,
    branches: [{ branchId: 1, name: 'Sede Principal - Planta Cava' }]
  }
];

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class AdminUsersComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly notification = inject(NotificationService);

  readonly users = signal<UserAdminDto[]>([]);
  readonly roles = signal<UserRoleDto[]>([]);
  readonly isLoading = signal<boolean>(false);

  // Modal
  readonly showCreateModal = signal<boolean>(false);
  readonly newUsername = signal<string>('');
  readonly newFullName = signal<string>('');
  readonly newEmail = signal<string>('');
  readonly newPassword = signal<string>('Usuario2026*');
  readonly newRoleId = signal<number>(2);

  ngOnInit() {
    this.loadUsersAndRoles();
  }

  loadUsersAndRoles() {
    this.isLoading.set(true);

    // 1. Roles
    const storedRoles = localStorage.getItem(STORAGE_ROLES_KEY);
    if (storedRoles) {
      try {
        const parsed = JSON.parse(storedRoles);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.roles.set(parsed);
        } else {
          this.roles.set(SYSTEM_ROLES);
        }
      } catch {
        this.roles.set(SYSTEM_ROLES);
      }
    } else {
      this.roles.set(SYSTEM_ROLES);
    }

    // 2. Users
    const storedUsers = localStorage.getItem(STORAGE_USERS_KEY);
    if (storedUsers) {
      try {
        const parsed = JSON.parse(storedUsers);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.users.set(parsed);
          this.isLoading.set(false);
          return;
        }
      } catch {
        // Fallback
      }
    }

    this.api.getUsers().subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res && res.length > 0) {
          this.users.set(res);
        } else {
          this.users.set(DEFAULT_USERS);
          this.saveUsersToStorage(DEFAULT_USERS);
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.users.set(DEFAULT_USERS);
        this.saveUsersToStorage(DEFAULT_USERS);
      }
    });
  }

  submitNewUser() {
    const username = this.newUsername().trim();
    const fullName = this.newFullName().trim();
    const email = this.newEmail().trim();

    if (!username || !fullName || !email) {
      this.notification.warning('Campos incompletos', 'Complete nombre de usuario, nombre completo y correo');
      return;
    }

    const selectedRole = this.roles().find(r => r.roleId === Number(this.newRoleId()));

    const newUser: UserAdminDto = {
      userId: Date.now(),
      username,
      fullName,
      email,
      roleId: Number(this.newRoleId()),
      roleName: selectedRole?.name || 'Operario',
      companyId: 1,
      isActive: true,
      branches: [{ branchId: 1, name: 'Sede Principal - Planta Cava' }]
    };

    const updated = [...this.users(), newUser];
    this.users.set(updated);
    this.saveUsersToStorage(updated);

    this.notification.success('Usuario Creado', `Cuenta "${newUser.username}" registrada con perfil ${newUser.roleName}`);
    this.showCreateModal.set(false);

    // API sync
    this.api.createUser({
      username: newUser.username,
      fullName: newUser.fullName,
      email: newUser.email,
      password: this.newPassword(),
      roleId: newUser.roleId,
      companyId: 1,
      branchIds: [1]
    }).subscribe({
      error: () => {}
    });

    this.newUsername.set('');
    this.newFullName.set('');
    this.newEmail.set('');
  }

  toggleUserStatus(user: UserAdminDto) {
    if (user.userId === 1) {
      this.notification.warning('Usuario Protegido', 'No se puede desactivar la cuenta Super Administrador');
      return;
    }

    const updated = this.users().map(u => {
      if (u.userId === user.userId) {
        return { ...u, isActive: !u.isActive };
      }
      return u;
    });

    this.users.set(updated);
    this.saveUsersToStorage(updated);

    const newStatus = !user.isActive;
    this.notification.info(
      newStatus ? 'Usuario Activado' : 'Usuario Desactivado',
      `El usuario "${user.username}" ahora está ${newStatus ? 'activo' : 'inactivo'}`
    );
  }

  deleteUser(user: UserAdminDto) {
    if (user.userId === 1) {
      this.notification.warning('Usuario Protegido', 'No se puede eliminar la cuenta Super Administrador');
      return;
    }

    if (!confirm(`¿Eliminar al usuario "${user.fullName}" (@${user.username})?`)) {
      return;
    }

    const updated = this.users().filter(u => u.userId !== user.userId);
    this.users.set(updated);
    this.saveUsersToStorage(updated);
    this.notification.info('Usuario Eliminado', `La cuenta @${user.username} ha sido eliminada del sistema.`);
  }

  private saveUsersToStorage(users: UserAdminDto[]) {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
  }
}
