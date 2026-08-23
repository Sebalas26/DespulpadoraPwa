import React, { useState } from 'react';
import { MessageSquare, Sparkles, CheckCircle2, ArrowRight, User, Phone, MapPin, Send } from 'lucide-react';
import confetti from 'canvas-confetti';

const SAMPLE_TEMPLATES = [
  {
    title: 'Restaurante / Mayorista (1Kg)',
    text: `Hola PulpasPro, requiero urgente para Restaurante Sabor Latino:
- 10 pulpas de Maracuyá de 1000g
- 10 pulpas de Mango Tommy de 1000g
- 5 pulpas de Lulo de 1000g
Dirección: Calle 85 #15-30, Chicó
Contacto: Chef Andrés Morales (312 998 7744)
Pago por Transferencia Bancolombia`
  },
  {
    title: 'Hogar / Combo 10x140g + Obsequio',
    text: `Buenas tardes, quiero pedir el Combo Familiar 10x140g surtido:
- 4 pulpas de Mora 140g
- 3 pulpas de Fresa 140g
- 3 pulpas de Maracuyá 140g
+ Mi obsequio de pulpa gratis
Nombre: Valentina Gómez
Dirección: Carrera 19 #134-22 Apto 502
Teléfono: 320 445 6789
Pago por Nequi`
  },
  {
    title: 'Cafetería / Jugos (140g Porciones)',
    text: `Hola amigos, pedido para Cafetería Aroma Café:
- 15 pulpas de Guanábana 250g
- 15 pulpas de Piña 250g
- 10 pulpas de Mango 250g
Dirección: Carrera 7 #53-20
Contacto: Julián (315 220 1199)
Pago contraentrega en efectivo`
  }
];

export default function WhatsAppSimulatorModal({ fruits, promotions, onOrderCreated, onClose }) {
  const [inputText, setInputText] = useState(SAMPLE_TEMPLATES[0].text);
  const [parsedPreview, setParsedPreview] = useState(null);

  const formatCOP = (num) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
  };

  const handleParseMessage = (text) => {
    // Intelligent text parsing simulation for WhatsApp templates
    let clientName = 'Cliente WhatsApp';
    let phone = '310 000 0000';
    let address = 'Bogotá D.C.';
    let zone = 'Zona Norte';
    let isPromo = false;
    let promoId = null;

    const lines = text.split('\n');
    lines.forEach(line => {
      const lower = line.toLowerCase();
      if (lower.includes('para ') || lower.includes('nombre:') || lower.includes('contacto:')) {
        clientName = line.replace(/(hola|requiero|urgente|pedido|para|nombre:|contacto:)/gi, '').trim() || clientName;
      }
      if (lower.includes('dirección:') || lower.includes('carrera') || lower.includes('calle') || lower.includes('avenida')) {
        address = line.replace(/dirección:/gi, '').trim() || address;
      }
      if (lower.includes('31') || lower.includes('32') || lower.includes('30')) {
        const phoneMatch = line.match(/\b3\d{2}[- ]?\d{3}[- ]?\d{4}\b/);
        if (phoneMatch) phone = phoneMatch[0];
      }
    });

    if (text.toLowerCase().includes('combo familiar') || text.toLowerCase().includes('10x140')) {
      isPromo = true;
      promoId = 'promo-familiar-10';
    } else if (text.toLowerCase().includes('lonchera') || text.toLowerCase().includes('6x140')) {
      isPromo = true;
      promoId = 'promo-lonchera-6';
    } else if (text.toLowerCase().includes('1000g') && text.toLowerCase().includes('restaurante')) {
      isPromo = true;
      promoId = 'promo-restaurante-5k';
    }

    // Extract items based on fruits keywords
    const items = [];
    fruits.forEach(fruit => {
      const regex = new RegExp(`(\\d+)\\s*(pulpas?|unidades?|de)?\\s*(de)?\\s*${fruit.name.split(' ')[0]}`, 'i');
      const match = text.match(regex);
      if (match) {
        const qty = parseInt(match[1], 10) || 5;
        let size = 'g140';
        let sizeLabel = '140g';

        if (text.toLowerCase().includes(`${fruit.name.toLowerCase().split(' ')[0]}`) && text.toLowerCase().includes('1000g')) {
          size = 'g1000';
          sizeLabel = '1000g (1 Kg)';
        } else if (text.toLowerCase().includes('250g')) {
          size = 'g250';
          sizeLabel = '250g';
        } else if (text.toLowerCase().includes('500g')) {
          size = 'g500';
          sizeLabel = '500g';
        }

        items.push({
          fruitId: fruit.id,
          fruitName: fruit.name,
          size,
          sizeLabel,
          qty,
          unitPrice: fruit.prices[size] || 2000,
          picked: false
        });
      }
    });

    // Fallback if no specific fruits matched
    if (items.length === 0) {
      items.push(
        { fruitId: 'maracuya', fruitName: 'Maracuyá', size: 'g140', sizeLabel: '140g', qty: 5, unitPrice: 2000, picked: false },
        { fruitId: 'mango', fruitName: 'Mango Tommy', size: 'g140', sizeLabel: '140g', qty: 5, unitPrice: 1800, picked: false }
      );
    }

    const subtotal = items.reduce((s, i) => s + (i.qty * i.unitPrice), 0);
    const promo = promotions.find(p => p.id === promoId);
    const discount = promo ? Math.round(subtotal * (promo.discountPercent / 100)) : 0;
    const total = subtotal - discount;

    const parsed = {
      client: { name: clientName, phone, address, zone },
      items,
      promotion: promoId,
      subtotal,
      discount,
      total,
      paymentMethod: text.toLowerCase().includes('nequi') ? 'Nequi / Daviplata' : 
                     text.toLowerCase().includes('bancolombia') ? 'Transferencia Bancolombia' : 'Efectivo Contraentrega',
      notes: text
    };

    setParsedPreview(parsed);
  };

  const handleConfirmOrder = () => {
    if (!parsedPreview) return;

    const newOrder = {
      id: `ORD-${Math.floor(1050 + Math.random() * 100)}`,
      date: new Date().toISOString().slice(0, 16).replace('T', ' '),
      source: 'WhatsApp',
      client: parsedPreview.client,
      items: parsedPreview.items,
      promotion: parsedPreview.promotion,
      subtotal: parsedPreview.subtotal,
      discount: parsedPreview.discount,
      total: parsedPreview.total,
      paymentMethod: parsedPreview.paymentMethod,
      paymentStatus: 'Pendiente',
      status: 'nuevo',
      courierId: null,
      invoiceId: null,
      notes: parsedPreview.notes
    };

    onOrderCreated(newOrder);
    onClose();

    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.7 }
      });
    } catch (e) {}
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-full)',
              background: '#25D366',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff'
            }}>
              <MessageSquare size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '800' }}>
                Simulador / Parser de Pedidos de WhatsApp
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Convierte mensajes de texto de clientes en pedidos estructurados para alistamiento
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon">✕</button>
        </div>

        <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '20px' }}>
          
          {/* Left Column: Input text and templates */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <span style={{ fontSize: '0.76rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Plantillas Rápidas de Prueba:
              </span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                {SAMPLE_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setInputText(tmpl.text);
                      handleParseMessage(tmpl.text);
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.74rem' }}
                  >
                    {tmpl.title}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="input-label">Mensaje recibido por WhatsApp:</label>
              <textarea
                className="textarea"
                rows="9"
                style={{ fontFamily: 'monospace', fontSize: '0.84rem', lineHeight: '1.4' }}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Pega aquí el texto del mensaje de WhatsApp del cliente..."
              />
            </div>

            <button
              onClick={() => handleParseMessage(inputText)}
              className="btn btn-secondary"
              style={{ gap: '8px', width: '100%', borderColor: 'rgba(37, 211, 102, 0.4)', color: '#25D366' }}
            >
              <Sparkles size={16} /> Analizar y Extraer Pedido
            </button>
          </div>

          {/* Right Column: Parsed Order Preview */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: '800', textTransform: 'uppercase', color: '#10b981' }}>
                  Pedido Detectado
                </span>
                <span className="badge badge-success">Listo para Bodega</span>
              </div>

              {!parsedPreview ? (
                <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                  Haz clic en "Analizar y Extraer Pedido" para previsualizar los ítems detectados.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{parsedPreview.client.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>📍 {parsedPreview.client.address}</div>
                    <div style={{ fontSize: '0.78rem', color: '#60a5fa' }}>📞 {parsedPreview.client.phone}</div>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: '700', textTransform: 'uppercase' }}>
                      Pulpas Requeridas:
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                      {parsedPreview.items.map((item, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                          <span><strong>{item.qty}x</strong> {item.fruitName} ({item.sizeLabel})</span>
                          <span style={{ color: '#10b981', fontWeight: '700' }}>{formatCOP(item.qty * item.unitPrice)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {parsedPreview.discount > 0 && (
                    <div style={{ fontSize: '0.78rem', color: '#c084fc' }}>
                      🎉 Descuento Promo: -{formatCOP(parsedPreview.discount)}
                    </div>
                  )}

                  <div style={{
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: '700' }}>Total Estimado:</span>
                    <strong style={{ fontSize: '1.2rem', color: '#10b981' }}>{formatCOP(parsedPreview.total)}</strong>
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: '16px' }}>
              <button
                onClick={handleConfirmOrder}
                disabled={!parsedPreview}
                className="btn btn-primary"
                style={{ width: '100%', gap: '8px', padding: '12px' }}
              >
                <CheckCircle2 size={18} />
                Ingresar al Módulo de Alistamiento
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
