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
      const hasCachedData =
        this.stateService.shifts().length > 0 || this.stateService.employees().length > 0;
      this.stateService.refreshAll?.(hasCachedData);
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
      const cachedUsers =
        typeof this.stateService.users === 'function' ? this.stateService.users() : [];
      if (cachedUsers.length > 0 && this.systemUsers().length === 0) {
        this.systemUsers.set(cachedUsers);
      }
      if (this.systemUsers().length === 0 && this.stateService.employees().length === 0) {
        this.isLoadingUsers.set(true);
      }
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
   * Resolves the human-readable schedule name for a shift code or identifier.
   */
  getShiftTypeLabel(shiftType?: string): string {
    try {
      const clean = (shiftType || '').trim();
      if (!clean) {
        return '—';
      }
      const normalized = clean.toLowerCase();
      const configured =
        typeof this.stateService.shiftSchedulesConfig === 'function'
          ? this.stateService.shiftSchedulesConfig()
          : [];
      const catalog: ShiftScheduleConfig[] = [
        ...this.activeShiftSchedules(),
        ...configured,
        ...DEFAULT_SHIFT_SCHEDULES
      ];
      const match = catalog.find(
        s =>
          s.code.toLowerCase() === normalized ||
          s.id.toLowerCase() === normalized ||
          s.name.toLowerCase() === normalized
      );
      return match ? match.name : clean;
    } catch {
      return shiftType || '—';
    }
  }

  /**
   * Formats a shift timestamp or time string into a human-readable date and 12-hour AM/PM time.
   */
  formatShiftDateTime(value?: string): string {
    try {
      const raw = (value || '').trim();
      if (!raw) {
        return '—';
      }
      const timeOnlyMatch = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?(?:\s*(AM|PM|am|pm))?$/);
      if (timeOnlyMatch) {
        let hours = Number(timeOnlyMatch[1]);
        const minutes = timeOnlyMatch[2];
        const explicitMeridiem = timeOnlyMatch[3]?.toUpperCase();
        if (explicitMeridiem) {
          return `${String(hours).padStart(2, '0')}:${minutes} ${explicitMeridiem}`;
        }
        const period = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${String(hours).padStart(2, '0')}:${minutes} ${period}`;
      }

      const parsedMs = Date.parse(raw);
      if (!Number.isNaN(parsedMs)) {
        const dateObj = new Date(parsedMs);
        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const year = dateObj.getFullYear();
        const hours24 = dateObj.getHours();
        const minutes = String(dateObj.getMinutes()).padStart(2, '0');
        const period = hours24 >= 12 ? 'PM' : 'AM';
        const hours12 = String(hours24 % 12 || 12).padStart(2, '0');
        return `${day}/${month}/${year} ${hours12}:${minutes} ${period}`;
      }

      return raw;
    } catch {
      return value || '—';
    }
  }

  /**
   * Calculates and formats the real elapsed time worked between shift check-in and check-out.
   */
  formatWorkedHours(shift: WorkShiftDto): string {
    try {
      const startRaw = (shift?.startTime || '').trim();
      const endRaw = (shift?.endTime || '').trim();

      if (startRaw && endRaw) {
        const startMs = Date.parse(startRaw);
        const endMs = Date.parse(endRaw);
        if (!Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs >= startMs) {
          const totalSeconds = Math.floor((endMs - startMs) / 1000);
          const hours = Math.floor(totalSeconds / 3600);
          const minutes = Math.floor((totalSeconds % 3600) / 60);
          const seconds = totalSeconds % 60;

          if (hours > 0 && minutes > 0) {
            return `${hours} h ${minutes} min`;
          }
          if (hours > 0) {
            return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
          }
          if (minutes > 0) {
            return `${minutes} min`;
          }
          return `${seconds} seg`;
        }

        const startMatch = startRaw.match(/^(\d{1,2}):(\d{2})/);
        const endMatch = endRaw.match(/^(\d{1,2}):(\d{2})/);
        if (startMatch && endMatch) {
          const startMin = Number(startMatch[1]) * 60 + Number(startMatch[2]);
          let endMin = Number(endMatch[1]) * 60 + Number(endMatch[2]);
          if (endMin < startMin) {
            endMin += 24 * 60;
          }
          const diffMin = endMin - startMin;
          const hours = Math.floor(diffMin / 60);
          const minutes = diffMin % 60;
          if (hours > 0 && minutes > 0) {
            return `${hours} h ${minutes} min`;
          }
          if (hours > 0) {
            return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
          }
          return `${minutes} min`;
        }
      }

      if (shift?.hoursWorked !== undefined && shift?.hoursWorked !== null) {
        const numericHours = Math.max(0, Number(shift.hoursWorked) || 0);
        const totalSeconds = Math.round(numericHours * 3600);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        if (hours > 0 && minutes > 0) {
          return `${hours} h ${minutes} min`;
        }
        if (hours > 0) {
          return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
        }
        if (minutes > 0) {
          return `${minutes} min`;
        }
        return `${seconds} seg`;
      }

      return '0 min';
    } catch {
      return '0 min';
    }
  }
}
