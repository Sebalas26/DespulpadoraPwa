import React from 'react';
import { Printer, Download, X, CheckCircle, QrCode } from 'lucide-react';

export default function InvoiceModal({ invoice, onClose }) {
  if (!invoice) return null;

  const formatCOP = (num) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
  };

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
        {/* Modal Top Bar (Hidden on print) */}
        <div className="no-print" style={{
          background: '#0f172a',
          color: '#ffffff',
          padding: '14px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: '700' }}>Vista Previa de Factura Electrónica de Venta</span>
            <span className="badge badge-success">Válida para Entrega</span>
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

        {/* Printable Formal Invoice Sheet */}
        <div style={{ padding: '36px 40px', background: '#ffffff', color: '#1e293b', fontFamily: 'var(--font-body)' }}>
          
          {/* Header Company & Invoice No */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #10b981', paddingBottom: '20px', marginBottom: '24px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '2rem' }}>🍹</span>
                <div>
                  <h1 style={{ fontSize: '1.6rem', fontWeight: '900', color: '#047857', margin: 0, lineHeight: 1.1 }}>
                    PULPASPRO COLOMBIA S.A.S.
                  </h1>
                  <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>
                    Procesadora & Despulpadora de Frutas 100% Naturales
                  </span>
                </div>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '8px', lineHeight: 1.4 }}>
                <strong>NIT:</strong> 901.884.210-5 • <strong>Régimen Simple de Tributación</strong><br />
                <strong>Planta:</strong> Cra. 68D #18-40, Zona Industrial de Alimentos, Bogotá D.C.<br />
                <strong>PBX / WhatsApp:</strong> +57 (601) 745-9000 / +57 312 456 7890<br />
                <strong>Email:</strong> pedidos@pulpaspro.com • www.pulpaspro.com
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{
                background: '#f0fdf4',
                border: '1.5px solid #10b981',
                borderRadius: '8px',
                padding: '12px 18px',
                display: 'inline-block',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#047857', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  FACTURA ELECTRÓNICA DE VENTA
                </span>
                <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#0f172a', margin: '4px 0' }}>
                  {invoice.id}
                </div>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Fecha: <strong>{invoice.date}</strong>
                </span>
              </div>
              <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '6px', maxWidth: '240px', lineHeight: 1.2 }}>
                {invoice.resolutionDIAN || 'Resolución DIAN No. 187640001923 del 2026-01-15 (Prefijo FAC Rango 001 al 5000)'}
              </div>
            </div>
          </div>

          {/* Client & Delivery Info Box */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr',
            gap: '20px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px 20px',
            marginBottom: '24px'
          }}>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '800', color: '#047857' }}>
                DATOS DEL ADQUIRIENTE / CLIENTE:
              </span>
              <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                {invoice.client.name}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#334155', marginTop: '4px' }}>
                <strong>NIT / C.C.:</strong> {invoice.client.nit || '222222222222'}<br />
                <strong>Dirección de Entrega:</strong> {invoice.client.address}<br />
                <strong>Teléfono:</strong> {invoice.client.phone}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '800', color: '#047857' }}>
                DETALLES COMERCIALES:
              </span>
              <div style={{ fontSize: '0.85rem', color: '#334155', marginTop: '4px', lineHeight: 1.4 }}>
                <strong>Método de Pago:</strong> {invoice.paymentMethod}<br />
                <strong>Mensajero / Ruta:</strong> {invoice.courierName || 'Asignación Automática'}<br />
                <strong>Pedido Ref:</strong> {invoice.orderId || 'Venta Mostrador'}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '800', color: '#334155' }}>#</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '800', color: '#334155' }}>DESCRIPCIÓN DEL PRODUCTO</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: '0.75rem', fontWeight: '800', color: '#334155' }}>CANT.</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '0.75rem', fontWeight: '800', color: '#334155' }}>PRECIO UNIT.</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '0.75rem', fontWeight: '800', color: '#334155' }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', fontSize: '0.88rem' }}>
                  <td style={{ padding: '10px 12px', color: '#64748b' }}>{idx + 1}</td>
                  <td style={{ padding: '10px 12px', fontWeight: '600', color: '#0f172a' }}>
                    {item.name}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '700' }}>
                    {item.qty}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#334155' }}>
                    {formatCOP(item.unitPrice)}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '800', color: '#0f172a' }}>
                    {formatCOP(item.total !== undefined ? item.total : item.qty * item.unitPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals and QR Code Section */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px', alignItems: 'flex-start' }}>
            
            {/* Legal terms & QR */}
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{
                width: '70px',
                height: '70px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {/* SVG Simulated QR code */}
                <svg viewBox="0 0 100 100" width="60" height="60">
                  <rect width="100" height="100" fill="white" />
                  <rect x="10" y="10" width="30" height="30" fill="black" />
                  <rect x="15" y="15" width="20" height="20" fill="white" />
                  <rect x="20" y="20" width="10" height="10" fill="black" />
                  <rect x="60" y="10" width="30" height="30" fill="black" />
                  <rect x="65" y="15" width="20" height="20" fill="white" />
                  <rect x="70" y="20" width="10" height="10" fill="black" />
                  <rect x="10" y="60" width="30" height="30" fill="black" />
                  <rect x="15" y="65" width="20" height="20" fill="white" />
                  <rect x="20" y="70" width="10" height="10" fill="black" />
                  <rect x="50" y="50" width="15" height="15" fill="black" />
                  <rect x="70" y="60" width="20" height="10" fill="black" />
                  <rect x="60" y="80" width="15" height="10" fill="black" />
                  <rect x="80" y="75" width="10" height="15" fill="black" />
                </svg>
              </div>

              <div style={{ fontSize: '0.72rem', color: '#475569', lineHeight: 1.3 }}>
                <strong>CUFE:</strong> 8a4f9b2c0199e74d6f83ab2938472910eafb90c1<br />
                Documento emitido según normativa de Facturación Electrónica DIAN.<br />
                Cadena de frío: Conservar congelado a -18°C.
              </div>
            </div>

            {/* Totals Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: '#475569' }}>
                <span>Subtotal:</span>
                <span style={{ fontWeight: '600', color: '#0f172a' }}>{formatCOP(invoice.subtotal)}</span>
              </div>

              {invoice.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: '#dc2626' }}>
                  <span>Descuento Promocional:</span>
                  <span style={{ fontWeight: '700' }}>-{formatCOP(invoice.discount)}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: '#475569' }}>
                <span>IVA (Exento / Régimen Simple):</span>
                <span style={{ fontWeight: '600' }}>$0 COP</span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '1.25rem',
                fontWeight: '900',
                color: '#047857',
                borderTop: '2px solid #0f172a',
                paddingTop: '8px',
                marginTop: '4px'
              }}>
                <span>TOTAL A PAGAR:</span>
                <span>{formatCOP(invoice.total)}</span>
              </div>
            </div>

          </div>

          {/* Footer note */}
          <div style={{
            marginTop: '30px',
            borderTop: '1px solid #cbd5e1',
            paddingTop: '14px',
            textAlign: 'center',
            fontSize: '0.75rem',
            color: '#64748b'
          }}>
            ¡Gracias por confiar en PulpasPro! Garantía de calidad, fruta 100% pura sin conservantes artificiales.
          </div>

        </div>
      </div>
    </div>
  );
}
