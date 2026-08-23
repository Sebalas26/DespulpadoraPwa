import React from 'react';
import { Printer, Download, X, DollarSign, Calendar, User, Building } from 'lucide-react';
import { COMPANY_SETTINGS } from '../data/initialData';

export default function PayslipModal({ employee, period, onClose }) {
  if (!employee) return null;

  const currentPeriod = period || 'Agosto 2026 (Mensual)';

  const formatCOP = (num) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
  };

  const baseSalary = employee.baseSalary || 1600000;
  const transportAllowance = employee.transportAllowance || (baseSalary <= 3000000 ? 162000 : 0);
  const extraHours = employee.extraHours || 0;
  const bonuses = employee.bonuses || 0;

  const totalEarnings = baseSalary + transportAllowance + extraHours + bonuses;

  // Colombian Legal Deductions (4% Health, 4% Pension)
  const healthDeduction = Math.round(baseSalary * 0.04);
  const pensionDeduction = Math.round(baseSalary * 0.04);
  const otherDeductions = employee.otherDeductions || 0;

  const totalDeductions = healthDeduction + pensionDeduction + otherDeductions;
  const netPay = totalEarnings - totalDeductions;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content modal-lg" 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          color: '#0f172a',
          padding: '0',
          borderRadius: '16px',
          overflow: 'hidden'
        }}
      >
        {/* Top bar (Hidden on print) */}
        <div className="no-print" style={{
          background: '#0f172a',
          color: '#ffffff',
          padding: '14px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: '700' }}>Comprobante de Pago de Nómina</span>
            <span className="badge badge-success">Documento Oficial</span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handlePrint}
              className="btn btn-primary btn-sm"
              style={{ gap: '6px' }}
            >
              <Printer size={15} /> Imprimir / Guardar PDF
            </button>
            <button
              onClick={onClose}
              className="btn-icon"
              style={{ width: '32px', height: '32px' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Printable Payslip Sheet */}
        <div style={{ padding: '36px 40px', background: '#ffffff', color: '#1e293b', fontFamily: 'var(--font-body)' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #10b981', paddingBottom: '16px', marginBottom: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.8rem' }}>🍹</span>
                <div>
                  <h1 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#047857', margin: 0 }}>
                    {COMPANY_SETTINGS.companyName}
                  </h1>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>
                    NIT: {COMPANY_SETTINGS.nit} • {COMPANY_SETTINGS.address}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{
                background: '#f0fdf4',
                border: '1.5px solid #10b981',
                borderRadius: '8px',
                padding: '8px 14px',
                display: 'inline-block'
              }}>
                <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#047857', textTransform: 'uppercase' }}>
                  COMPROBANTE DE NÓMINA
                </span>
                <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a' }}>
                  Período: {currentPeriod}
                </div>
              </div>
            </div>
          </div>

          {/* Employee Information Card */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '14px 18px',
            marginBottom: '20px',
            fontSize: '0.84rem'
          }}>
            <div>
              <strong style={{ color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase' }}>Colaborador:</strong>
              <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.95rem' }}>{employee.name}</div>
              <div><strong>C.C.:</strong> {employee.document}</div>
            </div>

            <div>
              <strong style={{ color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase' }}>Cargo & Área:</strong>
              <div style={{ fontWeight: '700', color: '#0f172a' }}>{employee.role}</div>
              <div><strong>Área:</strong> {employee.department}</div>
            </div>

            <div>
              <strong style={{ color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase' }}>Seguridad Social:</strong>
              <div><strong>EPS:</strong> {employee.eps}</div>
              <div><strong>Pensión:</strong> {employee.pensionFund}</div>
              <div><strong>ARL:</strong> {employee.arl}</div>
            </div>
          </div>

          {/* Earnings and Deductions Table */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            
            {/* Devengados (Earnings) */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ background: '#f0fdf4', borderBottom: '1.5px solid #bbf7d0', padding: '10px 14px', fontWeight: '800', fontSize: '0.85rem', color: '#047857' }}>
                (+) INGRESOS / DEVENGADOS
              </div>
              <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Sueldo Básico Mensual:</span>
                  <strong>{formatCOP(baseSalary)}</strong>
                </div>
                {transportAllowance > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Auxilio Legal de Transporte:</span>
                    <strong>{formatCOP(transportAllowance)}</strong>
                  </div>
                )}
                {extraHours > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Horas Extras / Recargos:</span>
                    <strong>{formatCOP(extraHours)}</strong>
                  </div>
                )}
                {bonuses > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Bonificaciones por Rendimiento:</span>
                    <strong>{formatCOP(bonuses)}</strong>
                  </div>
                )}
                <div style={{
                  borderTop: '1.5px solid #cbd5e1',
                  paddingTop: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: '800',
                  color: '#047857',
                  fontSize: '0.92rem'
                }}>
                  <span>TOTAL DEVENGADO:</span>
                  <span>{formatCOP(totalEarnings)}</span>
                </div>
              </div>
            </div>

            {/* Deducciones */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ background: '#fef2f2', borderBottom: '1.5px solid #fecaca', padding: '10px 14px', fontWeight: '800', fontSize: '0.85rem', color: '#b91c1c' }}>
                (-) DEDUCCIONES DE LEY
              </div>
              <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Salud (Aporte Empleado 4%):</span>
                  <strong style={{ color: '#b91c1c' }}>-{formatCOP(healthDeduction)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Pensión (Aporte Empleado 4%):</span>
                  <strong style={{ color: '#b91c1c' }}>-{formatCOP(pensionDeduction)}</strong>
                </div>
                {otherDeductions > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Otras Deducciones / Anticipos:</span>
                    <strong style={{ color: '#b91c1c' }}>-{formatCOP(otherDeductions)}</strong>
                  </div>
                )}
                <div style={{
                  borderTop: '1.5px solid #cbd5e1',
                  paddingTop: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: '800',
                  color: '#b91c1c',
                  fontSize: '0.92rem'
                }}>
                  <span>TOTAL DEDUCCIONES:</span>
                  <span>-{formatCOP(totalDeductions)}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Net Payment Box */}
          <div style={{
            background: '#f8fafc',
            border: '2px solid #0f172a',
            borderRadius: '8px',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '36px'
          }}>
            <div>
              <span style={{ fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>
                NETO PAGADO EN CUENTA DE NÓMINA:
              </span>
              <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#047857' }}>
                {formatCOP(netPay)}
              </div>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', textAlign: 'right' }}>
              Consignación Bancaria / Transferencia<br />
              Fecha de Pago: {new Date().toLocaleDateString('es-CO')}
            </div>
          </div>

          {/* Signatures */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '50px', marginTop: '40px', paddingTop: '10px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderBottom: '1px solid #000', marginBottom: '6px', height: '30px' }}></div>
              <strong style={{ fontSize: '0.85rem' }}>{employee.name}</strong><br />
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Firma del Empleado / C.C. {employee.document}</span>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ borderBottom: '1px solid #000', marginBottom: '6px', height: '30px' }}></div>
              <strong style={{ fontSize: '0.85rem' }}>{COMPANY_SETTINGS.legalRepresentative}</strong><br />
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Representante Legal / Gerencia Talento Humano</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
