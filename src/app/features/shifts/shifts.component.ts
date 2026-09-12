import { Component, computed, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../../core/services/state.service';
import { NotificationService } from '../../core/services/notification.service';
import { WorkShiftDto } from '../../core/models/business.models';

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

  readonly currentTime = signal<string>(new Date().toLocaleTimeString('es-CO'));
  private timer: any;

  // Clock-in form
  readonly selectedEmployeeId = signal<number>(1);
  readonly selectedShiftType = signal<'MORNING' | 'AFTERNOON' | 'NIGHT'>('MORNING');
  readonly shiftNotes = signal<string>('');

  readonly activeShiftsCount = computed(() =>
    this.activeShifts().filter(s => s.status === 'ACTIVE').length
  );

  // Sample active shifts
  readonly activeShifts = signal<WorkShiftDto[]>([
    {
      shiftId: 201,
      employeeId: 1,
      employeeName: 'Hernando Ruiz Gómez',
      branchId: 1,
      branchName: 'Planta Principal',
      startTime: '06:00 AM',
      shiftType: 'MORNING',
      status: 'ACTIVE',
      notes: 'Supervisión de despulpado de maracuyá y mora'
    },
    {
      shiftId: 202,
      employeeId: 2,
      employeeName: 'María Fernanda Castillo',
      branchId: 1,
      branchName: 'Planta Principal',
      startTime: '06:30 AM',
      shiftType: 'MORNING',
      status: 'ACTIVE',
      notes: 'Línea de dosificación y sellado 140g'
    },
    {
      shiftId: 203,
      employeeId: 3,
      employeeName: 'Carlos Andrés Montoya',
      branchId: 1,
      branchName: 'Planta Principal',
      startTime: '07:00 AM',
      shiftType: 'MORNING',
      status: 'ACTIVE',
      notes: 'Control de cava y despacho de pedidos'
    }
  ]);

  constructor() {
    this.timer = setInterval(() => {
      this.currentTime.set(new Date().toLocaleTimeString('es-CO'));
    }, 1000);
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  punchClockIn() {
    const emp = this.stateService.employees().find(e => e.employeeId === Number(this.selectedEmployeeId()));
    if (!emp) return;

    // Check if already in active shift
    const existing = this.activeShifts().find(s => s.employeeId === emp.employeeId && s.status === 'ACTIVE');
    if (existing) {
      this.notification.warning('Turno ya activo', `${emp.fullName} ya tiene un turno abierto.`);
      return;
    }

    const newShift: WorkShiftDto = {
      shiftId: Date.now(),
      employeeId: emp.employeeId,
      employeeName: emp.fullName,
      branchId: 1,
      branchName: 'Planta Principal',
      startTime: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      shiftType: this.selectedShiftType(),
      status: 'ACTIVE',
      notes: this.shiftNotes() || 'Ingreso registrado desde terminal de planta'
    };

    this.activeShifts.update(list => [newShift, ...list]);
    this.notification.success('Turno Iniciado', `${emp.fullName} ha marcado ingreso exitosamente`);
    this.shiftNotes.set('');
  }

  punchClockOut(shift: WorkShiftDto) {
    this.activeShifts.update(list => list.map(s => {
      if (s.shiftId === shift.shiftId) {
        return {
          ...s,
          status: 'CLOSED',
          endTime: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
          hoursWorked: 8
        };
      }
      return s;
    }));
    this.notification.info('Turno Cerrado', `${shift.employeeName} ha finalizado su jornada laboral`);
  }
}
