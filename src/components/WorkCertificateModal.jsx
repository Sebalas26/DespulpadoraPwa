import React from 'react';
import { Printer, X, FileText, CheckCircle, ShieldCheck } from 'lucide-react';
import { COMPANY_SETTINGS } from '../data/initialData';

export default function WorkCertificateModal({ employee, destination, onClose }) {
  if (!employee) return null;

  const formatCOP = (num) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
  };

  const destinationText = destination || 'A QUIEN PUEDA INTERESAR';

  const handlePrint = () => {
    window.print();
  };

  const currentDateFormatted = new Date().toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

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
            <span style={{ fontWeight: '700' }}>Certificado Laboral Oficial</span>
            <span className="badge badge-success">Válido para Trámites</span>
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

        {/* Printable Official Certificate Sheet */}
        <div style={{ padding: '50px 60px', background: '#ffffff', color: '#1e293b', fontFamily: 'var(--font-body)', minHeight: '650px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          
          <div>
            {/* Company Letterhead */}
            <div style={{ textAlign: 'center', borderBottom: '2px solid #10b981', paddingBottom: '20px', marginBottom: '36px' }}>
              <div style={{ fontSize: '2.4rem', marginBottom: '4px' }}>🍹</div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: '900', color: '#047857', margin: 0, letterSpacing: '0.04em' }}>
                {COMPANY_SETTINGS.companyName}
              </h1>
              <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600', marginTop: '4px' }}>
                NIT: {COMPANY_SETTINGS.nit} • {COMPANY_SETTINGS.address} • Bogotá D.C.<br />
                PBX: {COMPANY_SETTINGS.phone} • {COMPANY_SETTINGS.email}
              </div>
            </div>

            {/* Destination */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: '800', letterSpacing: '0.1em', color: '#0f172a' }}>
                EL SUSCRITO REPRESENTANTE LEGAL DE {COMPANY_SETTINGS.companyName}
              </span>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#047857', marginTop: '14px', letterSpacing: '0.08em' }}>
                CERTIFICA:
              </h2>
            </div>

            {/* Certificate Body Text */}
            <div style={{ fontSize: '1rem', lineHeight: '1.8', color: '#334155', textAlign: 'justify', marginBottom: '36px' }}>
              Que el(la) señor(a) <strong>{employee.name.toUpperCase()}</strong>, identificado(a) con cédula de ciudadanía número <strong>{employee.document}</strong>, labora para nuestra compañía bajo la modalidad de contrato a <strong>{employee.contractType.toUpperCase()}</strong> desde el día <strong>{new Date(employee.hireDate).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>, desempeñando actualmente el cargo de <strong>{employee.role.toUpperCase()}</strong> en el área de <strong>{employee.department.toUpperCase()}</strong>.
              <br /><br />
              Para el cumplimiento de sus funciones, devenga una asignación salarial mensual correspondiente a:
              <br />
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '14px 20px',
                margin: '16px 0',
                fontSize: '0.95rem'
              }}>
                • <strong>Salario Básico Mensual:</strong> {formatCOP(employee.baseSalary)} M/CTE.<br />
                {employee.transportAllowance > 0 && (
                  <>• <strong>Auxilio Legal de Transporte:</strong> {formatCOP(employee.transportAllowance)} M/CTE.<br /></>
                )}
                • <strong>Seguridad Social Integral:</strong> Afiliado activo a {employee.eps}, {employee.pensionFund} y {employee.arl}.
              </div>
              <br />
              Durante su permanencia en la empresa ha demostrado un excelente desempeño, honestidad, puntualidad y alto sentido de responsabilidad.
              <br /><br />
              La presente certificación se expide a solicitud del interesado con destino a <strong>{destinationText.toUpperCase()}</strong>, en la ciudad de Bogotá D.C., a los <strong>{new Date().getDate()}</strong> días del mes de <strong>{new Date().toLocaleDateString('es-CO', { month: 'long' })}</strong> del año <strong>{new Date().getFullYear()}</strong>.
            </div>
          </div>

          {/* Signature & Seal */}
          <div style={{ marginTop: '40px' }}>
            <div style={{ width: '280px' }}>
              <div style={{ borderBottom: '2px solid #0f172a', marginBottom: '8px', height: '45px' }}></div>
              <strong style={{ fontSize: '0.95rem', color: '#0f172a', display: 'block' }}>
                {COMPANY_SETTINGS.legalRepresentative}
              </strong>
              <span style={{ fontSize: '0.82rem', color: '#64748b', display: 'block' }}>
                C.C. {COMPANY_SETTINGS.repDocument}<br />
                Representante Legal / Gerencia General<br />
                {COMPANY_SETTINGS.companyName}
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
