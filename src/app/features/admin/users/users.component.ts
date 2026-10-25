import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { NotificationService } from '../../../core/services/notification.service';
import { UserAdminDto, UserRoleDto } from '../../../core/models/business.models';

const STORAGE_USERS_KEY = 'dgl_users_v2';

/**
 * System Users Administration component connected to `/api/users` and `/api/roles`.
 */
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

  readonly showCreateModal = signal<boolean>(false);
  readonly newUsername = signal<string>('');
  readonly newFullName = signal<string>('');
  readonly newEmail = signal<string>('');
  readonly newPhone = signal<string>('');
  readonly newDocumentNumber = signal<string>('');
  readonly newPassword = signal<string>('');
  readonly newRoleId = signal<number>(0);
  readonly newIsSystemDeveloper = signal<boolean>(false);

  /**
   * Initializes users and roles from the backend API.
   */
  ngOnInit(): void {
    try {
      this.loadUsersAndRoles();
    } catch {
      return;
    }
  }

  /**
   * Loads users (`/api/users`) and roles (`/api/roles`) from the backend API.
   */
  loadUsersAndRoles(): void {
    try {
      this.isLoading.set(true);

      forkJoin({
        roles: this.api.getRoles(),
        users: this.api.getUsers()
      }).subscribe({
        next: (res: { roles: UserRoleDto[]; users: UserAdminDto[] }) => {
          this.isLoading.set(false);
          if (Array.isArray(res.roles)) {
            this.roles.set(res.roles);
            if (res.roles.length > 0 && this.newRoleId() === 0) {
              this.newRoleId.set(res.roles[0].roleId);
            }
          } else {
            this.roles.set([]);
          }

          if (Array.isArray(res.users)) {
            this.users.set(res.users);
            this.saveUsersToStorage(res.users);
          } else {
            this.users.set([]);
          }
        },
        error: () => {
          this.isLoading.set(false);
          this.roles.set([]);
          this.users.set([]);
          this.notification.error('Error de Conexión', 'No se pudieron cargar los usuarios y roles del servidor.');
        }
      });
    } catch {
      this.isLoading.set(false);
      this.roles.set([]);
      this.users.set([]);
    }
  }

  /**
   * Creates a new user via `POST /api/users`.
   */
  submitNewUser(): void {
    try {
      const username = this.newUsername().trim();
      const fullName = this.newFullName().trim();
      const email = this.newEmail().trim();

      if (!username || !fullName || !email) {
        this.notification.warning('Campos incompletos', 'Completa nombre de usuario, nombre completo y correo.');
        return;
      }

      const roleId = Number(this.newRoleId());

      this.api
        .createUser({
          username,
          fullName,
          email,
          phone: this.newPhone().trim() || undefined,
          documentNumber: this.newDocumentNumber().trim() || undefined,
          password: this.newPassword(),
          roleId,
          isSystemDeveloper: this.newIsSystemDeveloper()
        })
        .subscribe({
          next: (created: UserAdminDto) => {
            const updated = [...this.users(), created];
            this.users.set(updated);
            this.saveUsersToStorage(updated);
            this.resetCreateForm();
            this.notification.success(
              'Usuario Creado',
              `Cuenta "${created.username}" registrada con rol ${created.roleName}.`
            );
          },
          error: () => {
            this.notification.error(
              'Error al Crear Usuario',
              'No se pudo registrar el usuario en el servidor.'
            );
          }
        });
    } catch {
      return;
    }
  }

  /**
   * Assigns a new role to an existing user via `PATCH /api/users/{id}/role`.
   */
  onUserRoleChange(user: UserAdminDto, newRoleId: number): void {
    try {
      const roleIdNum = Number(newRoleId);

      this.api.assignUserRole(user.userId, roleIdNum).subscribe({
        next: (updatedUser: UserAdminDto) => {
          this.users.update((list: UserAdminDto[]) =>
            list.map((u: UserAdminDto) => (u.userId === user.userId ? { ...u, ...updatedUser } : u))
          );
          this.saveUsersToStorage(this.users());
          this.notification.success(
            'Rol Actualizado',
            `El usuario @${user.username} ahora tiene el rol "${updatedUser.roleName}".`
          );
        },
        error: () => {
          this.notification.error(
            'Error al Actualizar Rol',
            `No se pudo actualizar el rol para @${user.username}.`
          );
        }
      });
    } catch {
      return;
    }
  }

  /**
   * Toggles a user's active status via `PATCH /api/users/{id}/status`.
   */
  toggleUserStatus(user: UserAdminDto): void {
    try {
      if (user.userId === 1) {
        this.notification.warning('Usuario Protegido', 'No se puede desactivar la cuenta Super Administrador.');
        return;
      }

      const nextStatus = !user.isActive;
      this.api.updateUserStatus(user.userId, nextStatus).subscribe({
        next: () => {
          this.applyStatusChangeLocally(user, nextStatus);
        },
        error: () => {
          this.notification.error(
            'Error de Estado',
            `No se pudo cambiar el estado del usuario "${user.username}".`
          );
        }
      });
    } catch {
      return;
    }
  }

  /**
   * Deletes a user account via `DELETE /api/users/{id}`.
   */
  deleteUser(user: UserAdminDto): void {
    try {
      if (user.userId === 1) {
        this.notification.warning('Usuario Protegido', 'No se puede eliminar la cuenta Super Administrador.');
        return;
      }

      if (!confirm(`¿Eliminar al usuario "${user.fullName}" (@${user.username})?`)) {
        return;
      }

      this.api.deleteUser(user.userId).subscribe({
        next: () => {
          const updated = this.users().filter((u: UserAdminDto) => u.userId !== user.userId);
          this.users.set(updated);
          this.saveUsersToStorage(updated);
          this.notification.info('Usuario Eliminado', `La cuenta @${user.username} ha sido retirada.`);
        },
        error: () => {
          this.notification.error(
            'Error al Eliminar',
            `No se pudo eliminar la cuenta @${user.username}.`
          );
        }
      });
    } catch {
      return;
    }
  }

  /**
   * Resets the user creation modal fields.
   */
  private resetCreateForm(): void {
    try {
      this.showCreateModal.set(false);
      this.newUsername.set('');
      this.newFullName.set('');
      this.newEmail.set('');
      this.newPhone.set('');
      this.newDocumentNumber.set('');
      this.newPassword.set('');
      this.newIsSystemDeveloper.set(false);
    } catch {
      return;
    }
  }

  /**
   * Updates user active status in local state and storage.
   */
  private applyStatusChangeLocally(user: UserAdminDto, nextStatus: boolean): void {
    try {
      const updated = this.users().map((u: UserAdminDto) =>
        u.userId === user.userId ? { ...u, isActive: nextStatus } : u
      );
      this.users.set(updated);
      this.saveUsersToStorage(updated);
      this.notification.info(
        nextStatus ? 'Usuario Activado' : 'Usuario Desactivado',
        `El usuario "${user.username}" ahora está ${nextStatus ? 'activo' : 'inactivo'}.`
      );
    } catch {
      return;
    }
  }

  /**
   * Saves users list to `localStorage`.
   */
  private saveUsersToStorage(users: UserAdminDto[]): void {
    try {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
    } catch {
      return;
    }
  }
}
