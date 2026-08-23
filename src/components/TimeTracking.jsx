import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  LogIn, 
  LogOut, 
  Utensils, 
  RotateCcw, 
  CheckCircle2, 
  Search, 
  UserCheck, 
  Calendar, 
  History, 
  AlertCircle,
  Timer
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function TimeTracking({ employees, timeLogs, onRecordPunch }) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(employees[0]?.id || 'EMP-001');
  const [punchEvent, setPunchEvent] = useState('entrada');
  const [punchNote, setPunchNote] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [filterEmployee, setFilterEmployee] = useState('all');

  // Live ticking clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId) || employees[0];

  const handlePunchSubmit = (e) => {
    e.preventDefault();
    const eventLabels = {
      entrada: 'Entrada a Turno',
      salida_almuerzo: 'Salida a Almuerzo',
      regreso_almuerzo: 'Regreso de Almuerzo',
      salida: 'Salida de Turno'
    };

    const newPunch = {
      id: `LOG-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString().slice(0, 10),
      time: currentTime.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true }),
      employeeId: selectedEmployee.id,
      employeeName: selectedEmployee.name,
      event: punchEvent,
      eventLabel: eventLabels[punchEvent] || punchEvent,
      department: selectedEmployee.department,
      status: punchEvent === 'entrada' ? 'A tiempo' : 'Registrado',
      notes: punchNote
    };

    // Determine next shift status
    let nextShiftStatus = 'en_turno';
    if (punchEvent === 'salida_almuerzo') nextShiftStatus = 'almuerzo';
    else if (punchEvent === 'salida') nextShiftStatus = 'fuera_turno';

    onRecordPunch(newPunch, nextShiftStatus);
    setPunchNote('');

    try {
      confetti({
        particleCount: 50,
        spread: 40,
        origin: { y: 0.6 }
      });
    } catch (e) {}
  };

  const filteredLogs = timeLogs.filter(log => {
    return filterEmployee === 'all' || log.employeeId === filterEmployee;
  });

  const inShiftCount = employees.filter(e => e.currentShiftStatus === 'en_turno').length;
  const onLunchCount = employees.filter(e => e.currentShiftStatus === 'almuerzo').length;
  const offShiftCount = employees.filter(e => e.currentShiftStatus === 'fuera_turno' || !e.currentShiftStatus).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-success">Control de Turnos</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Registro Biométrico & Horario de Planta</span>
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: '800' }}>
            Registro de Entrada / Salida de Turno
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '700px' }}>
            Reloj checador digital para marcar inicio de turno, pausas de almuerzo y salida de operarios, despachadores y personal administrativo.
          </p>
        </div>

        {/* Live Digital Clock Badge */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(15, 23, 42, 0.85) 100%)',
          border: '1.5px solid rgba(16, 185, 129, 0.35)',
          borderRadius: 'var(--radius-lg)',
          padding: '12px 24px',
          textAlign: 'center',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            HORA OFICIAL DE PLANTA
          </span>
          <div style={{ fontSize: '1.65rem', fontWeight: '900', color: 'var(--text-main)', fontFamily: 'monospace' }}>
            {currentTime.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
          </div>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            {currentTime.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Real-time Plant Status Overview */}
      <div className="stats-grid" style={{ marginBottom: 0 }}>
        <div className="stat-card">
          <div>
            <div className="stat-label">En Turno Activo (Planta/Ruta)</div>
            <div className="stat-value" style={{ color: '#10b981' }}>{inShiftCount}</div>
            <div className="stat-meta positive">
              <UserCheck size={14} />
              <span>Laborando actualmente</span>
            </div>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <LogIn size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">En Pausa de Almuerzo</div>
            <div className="stat-value" style={{ color: '#f59e0b' }}>{onLunchCount}</div>
            <div className="stat-meta warning">
              <Utensils size={14} />
              <span>Tiempo de descanso</span>
            </div>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            <Utensils size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Fuera de Turno</div>
            <div className="stat-value">{offShiftCount}</div>
            <div className="stat-meta">
              <LogOut size={14} />
              <span>Turno culminado / Libre</span>
            </div>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-muted)' }}>
            <LogOut size={24} />
          </div>
        </div>
      </div>

      {/* Main Grid: Punch Kiosk + Realtime Employee Status Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        
        {/* Left: Punch Form Kiosk */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <Timer size={20} color="#10b981" />
                Reloj Checador de Turno
              </h2>
              <p className="card-subtitle">Registra tu marca de asistencia y jornada</p>
            </div>
            <span className="badge badge-success">En Línea</span>
          </div>

          <form onSubmit={handlePunchSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            
            {/* Select Employee */}
            <div>
              <label className="input-label">Seleccionar Colaborador</label>
              <select
                className="select"
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
              >
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} — {emp.role} ({emp.document})
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Employee Quick Card */}
            {selectedEmployee && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '1.6rem' }}>{selectedEmployee.avatar || '👤'}</div>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.92rem' }}>{selectedEmployee.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {selectedEmployee.role} • {selectedEmployee.department}
                    </div>
                  </div>
                </div>

                <span className={`badge ${
                  selectedEmployee.currentShiftStatus === 'en_turno' ? 'badge-success' :
                  selectedEmployee.currentShiftStatus === 'almuerzo' ? 'badge-warning' : 'badge-info'
                }`}>
                  {selectedEmployee.currentShiftStatus === 'en_turno' ? 'En Turno Activo' :
                   selectedEmployee.currentShiftStatus === 'almuerzo' ? 'En Almuerzo' : 'Fuera de Turno'}
                </span>
              </div>
            )}

            {/* Event Type Buttons */}
            <div>
              <label className="input-label">Tipo de Registro / Evento:</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setPunchEvent('entrada')}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: punchEvent === 'entrada' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.03)',
                    border: `1.5px solid ${punchEvent === 'entrada' ? '#10b981' : 'var(--border-subtle)'}`,
                    color: punchEvent === 'entrada' ? '#10b981' : 'var(--text-main)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontWeight: '700',
                    fontSize: '0.85rem'
                  }}
                >
                  <LogIn size={18} />
                  Entrada a Turno
                </button>

                <button
                  type="button"
                  onClick={() => setPunchEvent('salida_almuerzo')}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: punchEvent === 'salida_almuerzo' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.03)',
                    border: `1.5px solid ${punchEvent === 'salida_almuerzo' ? '#f59e0b' : 'var(--border-subtle)'}`,
                    color: punchEvent === 'salida_almuerzo' ? '#f59e0b' : 'var(--text-main)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontWeight: '700',
                    fontSize: '0.85rem'
                  }}
                >
                  <Utensils size={18} />
                  Salida a Almuerzo
                </button>

                <button
                  type="button"
                  onClick={() => setPunchEvent('regreso_almuerzo')}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: punchEvent === 'regreso_almuerzo' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.03)',
                    border: `1.5px solid ${punchEvent === 'regreso_almuerzo' ? '#3b82f6' : 'var(--border-subtle)'}`,
                    color: punchEvent === 'regreso_almuerzo' ? '#3b82f6' : 'var(--text-main)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontWeight: '700',
                    fontSize: '0.85rem'
                  }}
                >
                  <RotateCcw size={18} />
                  Regreso Almuerzo
                </button>

                <button
                  type="button"
                  onClick={() => setPunchEvent('salida')}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: punchEvent === 'salida' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.03)',
                    border: `1.5px solid ${punchEvent === 'salida' ? '#ef4444' : 'var(--border-subtle)'}`,
                    color: punchEvent === 'salida' ? '#ef4444' : 'var(--text-main)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontWeight: '700',
                    fontSize: '0.85rem'
                  }}
                >
                  <LogOut size={18} />
                  Salida de Turno
                </button>
              </div>
            </div>

            {/* Optional Note */}
            <div>
              <label className="input-label">Observación / Novedad (Opcional):</label>
              <input
                type="text"
                className="input"
                placeholder="Ej. Apoyo en cava de congelación, turno de 8 horas..."
                value={punchNote}
                onChange={(e) => setPunchNote(e.target.value)}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '0.95rem', gap: '8px' }}
            >
              <CheckCircle2 size={18} />
              Confirmar Registro de Marca ({currentTime.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })})
            </button>
          </form>
        </div>

        {/* Right: Personal Status Live List */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <UserCheck size={20} color="#3b82f6" />
                Estado del Personal en Planta
              </h2>
              <p className="card-subtitle">Presencia y última marca registrada</p>
            </div>
            <span className="badge badge-info">{employees.length} Colaboradores</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {employees.map(emp => {
              const statusConfig = {
                en_turno: { label: 'En Turno Activo', badge: 'badge-success', dot: '#10b981' },
                almuerzo: { label: 'En Almuerzo', badge: 'badge-warning', dot: '#f59e0b' },
                fuera_turno: { label: 'Fuera de Turno', badge: 'badge-info', dot: '#94a3b8' }
              }[emp.currentShiftStatus || 'fuera_turno'];

              return (
                <div
                  key={emp.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ fontSize: '1.4rem' }}>{emp.avatar || '👤'}</div>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{emp.name}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        {emp.role} • <strong>{emp.department}</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span className={`badge ${statusConfig.badge}`}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusConfig.dot, display: 'inline-block' }}></span>
                      {statusConfig.label}
                    </span>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                      Última: {emp.lastPunchTime || '07:00 AM'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Daily Time Logs History */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <History size={20} color="#8b5cf6" />
              Historial de Marcas de Asistencia de Hoy
            </h2>
            <p className="card-subtitle">Auditoría de ingresos, salidas y pausas</p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select
              className="select"
              style={{ width: 'auto', fontSize: '0.82rem', padding: '6px 12px' }}
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
            >
              <option value="all">Todos los Colaboradores</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Hora</th>
                <th>Colaborador</th>
                <th>Área / Cargo</th>
                <th>Evento Registrado</th>
                <th>Estado</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => (
                <tr key={log.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: '700', color: 'var(--text-main)' }}>
                    {log.time}
                  </td>
                  <td>
                    <strong>{log.employeeName}</strong>
                  </td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {log.department}
                  </td>
                  <td>
                    <span className={`badge ${
                      log.event === 'entrada' ? 'badge-success' :
                      log.event === 'salida_almuerzo' ? 'badge-warning' :
                      log.event === 'regreso_almuerzo' ? 'badge-info' : 'badge-danger'
                    }`}>
                      {log.eventLabel}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: '600' }}>
                      {log.status || 'Registrado'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                    {log.notes || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
