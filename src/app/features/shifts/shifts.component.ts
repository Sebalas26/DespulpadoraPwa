import { Component, computed, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { StateService } from '../../core/services/state.service';
import { NotificationService } from '../../core/services/notification.service';
import { WorkShiftDto } from '../../core/models/business.models';

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
export class ShiftsComponent implements OnDestroy {
  readonly stateService = inject(StateService);
  readonly notification = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);

  readonly currentTime = signal<string>(new Date().toLocaleTimeString('es-CO'));
  private timer: ReturnType<typeof setInterval> | null = null;

  readonly selectedEmployeeId = signal<number>(1);
  readonly selectedShiftType = signal<'MORNING' | 'AFTERNOON' | 'NIGHT'>('MORNING');
  readonly shiftNotes = signal<string>('');

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
      const emp = this.stateService.employees().find(e => e.employeeId === Number(this.selectedEmployeeId()));
      if (!emp) return;

      const existing = this.activeShifts().find(s => s.employeeId === emp.employeeId && s.status === 'ACTIVE');
      if (existing) {
        this.notification.warning('Turno ya activo', `${emp.fullName} ya tiene un turno abierto.`);
        return;
      }

      this.stateService.startWorkShift(emp.employeeId, this.selectedShiftType(), this.shiftNotes());
      this.notification.success('Turno Iniciado', `${emp.fullName} ha marcado ingreso exitosamente`);
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
}
