import { Component, computed, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { StateService } from '../../core/services/state.service';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { EmployeeDto, ShiftScheduleConfig, UserAdminDto, WorkShiftDto } from '../../core/models/business.models';
import { DEFAULT_SHIFT_SCHEDULES } from '../../core/data/initial-data';

/**
 * Represents a selectable operator option in the plant shift clock-in terminal.
 */
export interface ShiftOperatorOption {
  id: number;
  fullName: string;
  roleLabel: string;
  username?: string;
  email?: string;
}

/**
 * Component for plant work shift clock-in/clock-out attendance tracking and active operator supervision.
 */
@Component({
  selector: 'app-shifts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './shifts.component.html',
  styleUrls: ['./shifts.component.scss']
})
export class ShiftsComponent implements OnInit, OnDestroy {
  readonly stateService = inject(StateService);
  private readonly apiService = inject(ApiService);
  private readonly authService = inject(AuthService);
  readonly notification = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);

  readonly currentTime = signal<string>(new Date().toLocaleTimeString('es-CO'));
  private timer: ReturnType<typeof setInterval> | null = null;

  readonly systemUsers = signal<UserAdminDto[]>([]);
  readonly isLoadingUsers = signal<boolean>(false);
  readonly isLoading = computed<boolean>(() => {
    try {
      return (
        this.isLoadingUsers() ||
        (typeof this.stateService.isLoading === 'function' ? this.stateService.isLoading() : false)
      );
    } catch {
      return false;
    }
  });
  readonly selectedEmployeeId = signal<number>(1);
  readonly selectedShiftType = signal<string>('MORNING');
  readonly shiftNotes = signal<string>('');

  readonly activeShiftSchedules = computed<ShiftScheduleConfig[]>(() => {
    try {
      const list =
        typeof this.stateService.activeShiftSchedules === 'function'
          ? this.stateService.activeShiftSchedules()
          : DEFAULT_SHIFT_SCHEDULES;
      return list.length > 0 ? list : DEFAULT_SHIFT_SCHEDULES;
    } catch {
      return DEFAULT_SHIFT_SCHEDULES;
    }
  });

  readonly selectableUsers = computed<ShiftOperatorOption[]>(() => {
    try {
      const currentProfile = this.authService.user();
      const currentSession = this.authService.currentUser();
      const loggedUserId = currentProfile?.id ?? currentSession?.userId ?? 0;
      const loggedUsername = (currentProfile?.username || currentSession?.username || '').trim().toLowerCase();
      const loggedEmail = (currentProfile?.email || currentSession?.email || '').trim().toLowerCase();
      const loggedFullName = (currentProfile?.fullName || currentSession?.fullName || '').trim().toLowerCase();

      const users = this.systemUsers();
      if (users.length > 0) {
        return users
          .filter((u: UserAdminDto) => {
            if (u.isActive === false) {
              return false;
            }
            if (loggedUserId > 0 && u.userId === loggedUserId) {
              return false;
            }
            if (loggedUsername && (u.username || '').trim().toLowerCase() === loggedUsername) {
              return false;
            }
            if (loggedEmail && (u.email || '').trim().toLowerCase() === loggedEmail) {
              return false;
            }
            if (loggedFullName && (u.fullName || '').trim().toLowerCase() === loggedFullName) {
              return false;
            }
            if (Boolean(u.isSystemDeveloper) || u.roleId === 1) {
              return false;
            }
            const roleNorm = (u.roleName || '')
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .trim()
              .toLowerCase();
            if (roleNorm.includes('admin') || roleNorm.includes('developer') || roleNorm.includes('desarrollador')) {
              return false;
            }
            return true;
          })
          .map((u: UserAdminDto) => ({
            id: u.userId,
            fullName: u.fullName,
            roleLabel: u.roleName || '',
            username: u.username,
            email: u.email
          }));
      }

      return this.stateService
        .employees()
        .filter((e: EmployeeDto) => {
          if (e.isActive === false) {
            return false;
          }
          const empName = (e.fullName || e.name || '').trim().toLowerCase();
          const empEmail = (e.email || '').trim().toLowerCase();
          if (loggedFullName && empName === loggedFullName) {
            return false;
          }
          if (loggedEmail && empEmail && empEmail === loggedEmail) {
            return false;
          }
          const posNorm = (e.position || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toLowerCase();
          if (e.area === 'ADMINISTRACION' || posNorm.includes('admin')) {
            return false;
          }
          return true;
        })
        .map((e: EmployeeDto) => ({
          id: e.employeeId,
          fullName: e.fullName || e.name || '',
          roleLabel: e.position || e.area || ''
        }));
    } catch {
      return [];
    }
  });

  readonly activeShifts = computed<WorkShiftDto[]>(() => {
    try {
      return this.stateService.shifts();
    } catch {
      return [];
    }
  });

  readonly activeShiftsCount = computed<number>(() => {
    try {
      return this.activeShifts().filter(s => s.status === 'ACTIVE').length;
    } catch {
      return 0;
    }
  });

  /**
   * Initializes the live digital clock and scrolls to active shifts if requested via query parameters.
   */
  constructor() {
    try {
      this.timer = setInterval(() => {
        this.currentTime.set(new Date().toLocaleTimeString('es-CO'));
      }, 1000);

      this.route.queryParams.subscribe(params => {
        if (params['view'] === 'active') {
          setTimeout(() => {
            const el = document.getElementById('active-shifts-table');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 150);
        }
      });
    } catch {
      return;
    }
  }

  /**
   * Loads created system users from the backend API and selects the first eligible operator.
   */
  ngOnInit(): void {
    try {
      this.stateService.refreshAll?.();
      this.loadSystemUsers();
    } catch {
      return;
    }
  }

  /**
   * Fetches system users from `GET /api/users` and updates the operator selection.
   */
  loadSystemUsers(): void {
    try {
      this.isLoadingUsers.set(true);
      this.apiService.getUsers().subscribe({
        next: (users: UserAdminDto[]) => {
          this.isLoadingUsers.set(false);
          if (Array.isArray(users)) {
            this.systemUsers.set(users);
            const available = this.selectableUsers();
            if (available.length > 0) {
              const currentId = Number(this.selectedEmployeeId());
              const exists = available.some((op: ShiftOperatorOption) => op.id === currentId);
              if (!exists) {
                this.selectedEmployeeId.set(available[0].id);
              }
            } else {
              this.selectedEmployeeId.set(0);
            }
          }
        },
        error: () => {
          this.isLoadingUsers.set(false);
          return;
        }
      });
    } catch {
      this.isLoadingUsers.set(false);
      return;
    }
  }

  /**
   * Clears the digital clock interval timer when the component is destroyed.
   */
  ngOnDestroy(): void {
    try {
      if (this.timer !== null) {
        clearInterval(this.timer);
        this.timer = null;
      }
    } catch {
      return;
    }
  }

  /**
   * Registers a new work shift clock-in by delegating to the global state service.
   */
  punchClockIn(): void {
    try {
      const targetId = Number(this.selectedEmployeeId());
      const operator = this.selectableUsers().find((op: ShiftOperatorOption) => op.id === targetId);
      if (!operator) {
        return;
      }

      const existing = this.activeShifts().find(
        (s: WorkShiftDto) =>
          s.status === 'ACTIVE' &&
          (s.employeeId === operator.id ||
            (s.employeeName && s.employeeName.trim().toLowerCase() === operator.fullName.trim().toLowerCase()))
      );
      if (existing) {
        this.notification.warning('Turno ya activo', `${operator.fullName} ya tiene un turno abierto.`);
        return;
      }

      this.stateService.startWorkShift(operator.id, this.selectedShiftType(), this.shiftNotes(), operator.fullName);
      this.notification.success('Turno Iniciado', `${operator.fullName} ha marcado ingreso exitosamente`);
      this.shiftNotes.set('');
    } catch {
      this.notification.error('Error', 'No se pudo iniciar el turno.');
    }
  }

  /**
   * Closes an active work shift by delegating to the global state service.
   */
  punchClockOut(shift: WorkShiftDto): void {
    try {
      this.stateService.closeWorkShift(shift.shiftId);
      this.notification.info('Turno Cerrado', `${shift.employeeName} ha finalizado su jornada laboral`);
    } catch {
      this.notification.error('Error', 'No se pudo cerrar el turno.');
    }
  }

  /**
   * Resolves the human-readable schedule name and time range for a shift code.
   */
  getShiftTypeLabel(shiftType: string): string {
    try {
      const match = this.activeShiftSchedules().find(s => s.code === shiftType || s.id === shiftType);
      if (match) {
        return `${match.name} (${match.startTime} - ${match.endTime})`;
      }
      return shiftType;
    } catch {
      return shiftType;
    }
  }
}
