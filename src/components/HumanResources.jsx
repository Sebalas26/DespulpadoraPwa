import React, { useState } from 'react';
import { 
  Users, 
  FileText, 
  FileCheck2, 
  DollarSign, 
  Search, 
  Plus, 
  Calendar, 
  Phone, 
  Mail, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  Printer,
  ChevronRight,
  TrendingUp,
  UserCheck
} from 'lucide-react';
import PayslipModal from './PayslipModal';
import WorkCertificateModal from './WorkCertificateModal';

export default function HumanResources({ employees, onAddEmployee, onUpdateEmployee }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedPayslipEmployee, setSelectedPayslipEmployee] = useState(null);
  const [selectedCertificateEmployee, setSelectedCertificateEmployee] = useState(null);
  const [certificateDestination, setCertificateDestination] = useState('A QUIEN PUEDA INTERESAR');

  const formatCOP = (num) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
  };

  const totalPayroll = employees.reduce((sum, e) => sum + (e.baseSalary || 0) + (e.transportAllowance || 0), 0);
  const activeEmployeesCount = employees.filter(e => e.status === 'activo').length;
  const avgSalary = activeEmployeesCount > 0 ? totalPayroll / activeEmployeesCount : 0;

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.document.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDepartment === 'all' || emp.department.toLowerCase() === selectedDepartment.toLowerCase();
    return matchesSearch && matchesDept;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-purple">Talento Humano</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nómina, Certificados & Colaboradores</span>
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: '800' }}>
            Gestión Humana & Nómina
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '700px' }}>
            Administración del personal de planta, mensajería y administración. Emisión instantánea de desprendibles de pago y certificados laborales formales.
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="stats-grid" style={{ marginBottom: 0 }}>
        <div className="stat-card">
          <div>
            <div className="stat-label">Nómina Total Estimada / Mes</div>
            <div className="stat-value" style={{ color: '#10b981' }}>{formatCOP(totalPayroll)}</div>
            <div className="stat-meta positive">
              <TrendingUp size={14} />
              <span>Incluye auxilio de transporte</span>
            </div>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <DollarSign size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Colaboradores Activos</div>
            <div className="stat-value">{activeEmployeesCount} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>personas</span></div>
            <div className="stat-meta positive">
              <UserCheck size={14} />
              <span>100% Afiliados a Seguridad Social</span>
            </div>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
            <Users size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Salario Promedio</div>
            <div className="stat-value">{formatCOP(avgSalary)}</div>
            <div className="stat-meta positive">
              <Sparkles size={14} />
              <span>Planta + Logística + Admin</span>
            </div>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
            <ShieldCheck size={24} />
          </div>
        </div>
      </div>

      {/* Search and Department Filter Bar */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
          
          <div style={{ position: 'relative', minWidth: '260px', flex: '1 1 280px' }}>
            <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Buscar colaborador por nombre, cédula o cargo..."
              className="input"
              style={{ paddingLeft: '38px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['all', 'Producción', 'Logística & Despachos', 'Administración'].map(dept => (
              <button
                key={dept}
                onClick={() => setSelectedDepartment(dept)}
                className={`btn btn-sm ${selectedDepartment === dept ? 'btn-primary' : 'btn-secondary'}`}
              >
                {dept === 'all' ? 'Todos los Departamentos' : dept}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Employees Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
        {filteredEmployees.map((emp) => (
          <div
            key={emp.id}
            className="card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '16px'
            }}
          >
            <div>
              {/* Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.6rem'
                  }}>
                    {emp.avatar || '👤'}
                  </div>

                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: '800' }}>{emp.name}</h3>
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-primary)', fontWeight: '700' }}>{emp.role}</span>
                  </div>
                </div>

                <span className="badge badge-success">Activo</span>
              </div>

              {/* Information Grid */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                fontSize: '0.8rem',
                border: '1px solid var(--border-subtle)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>C.C. Identificación:</span>
                  <strong>{emp.document}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Salario Básico:</span>
                  <strong style={{ color: '#10b981' }}>{formatCOP(emp.baseSalary)}</strong>
                </div>
                {emp.transportAllowance > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Aux. Transporte:</span>
                    <span>{formatCOP(emp.transportAllowance)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Contrato:</span>
                  <span>{emp.contractType}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Seguridad Social:</span>
                  <span>{emp.eps} • {emp.pensionFund}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Fecha Ingreso:</span>
                  <span>{emp.hireDate}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons for Nómina and Certificados */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setSelectedPayslipEmployee(emp)}
                className="btn btn-secondary btn-sm"
                style={{ flex: 1, gap: '6px', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                title="Generar e imprimir volante de pago de nómina"
              >
                <FileText size={14} />
                Volante Nómina
              </button>

              <button
                onClick={() => setSelectedCertificateEmployee(emp)}
                className="btn btn-secondary btn-sm"
                style={{ flex: 1, gap: '6px', color: '#8b5cf6', borderColor: 'rgba(139, 92, 246, 0.3)' }}
                title="Generar e imprimir certificado laboral formal"
              >
                <FileCheck2 size={14} />
                Certificado Laboral
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Payslip Modal */}
      {selectedPayslipEmployee && (
        <PayslipModal
          employee={selectedPayslipEmployee}
          onClose={() => setSelectedPayslipEmployee(null)}
        />
      )}

      {/* Work Certificate Modal */}
      {selectedCertificateEmployee && (
        <WorkCertificateModal
          employee={selectedCertificateEmployee}
          destination={certificateDestination}
          onClose={() => setSelectedCertificateEmployee(null)}
        />
      )}

    </div>
  );
}
