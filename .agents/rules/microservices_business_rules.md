---
description: Reglas de negocio críticas y mapa de microservicios para la plataforma Despulpadora (PWA + Backend)
globs: ["**/*"]
---

# Reglas de Negocio Críticas y Arquitectura de Microservicios

Para cualquier desarrollo en este proyecto (sea frontend en Angular o backend en .NET / microservicios), consulta siempre el documento maestro:
👉 [BUSINESS_RULES_AND_MICROSERVICES_SPEC.md](file:///c:/Users/user/Documents/PWA/DespulpadoraPwa/BUSINESS_RULES_AND_MICROSERVICES_SPEC.md)

## Reglas Inviolables del Sistema:
1. **Transiciones de Estado de Pedidos**:
   - `PENDING` -> `PICKING` -> `BILLED` -> `DISPATCHED` -> `DELIVERED` (o `CANCELLED`).
   - Al pasar a `DISPATCHED`, el sistema debe descontar automáticamente el stock de pulpa congelada por gramaje (`g140`, `g250`, `g500`, `g1000`).
2. **Prioridad Urgente en Cava (`isPriority`)**:
   - Se activa desde despacho o mapa con el botón `[⚡]`.
   - En KDS genera un borde rojo de 2px (`border: 2px solid #ef4444 !important;`), fondo claro y banner de urgencia en cava.
3. **Bloqueo de Asignación si no está Facturado**:
   - Ningún pedido puede asignarse a un mensajero si `isBilled == false`.
   - Si se intenta asignar, se bloquea y se muestra un banner de advertencia de 10 segundos con barra de cuenta regresiva y botón de "Solicitar Prioridad".
4. **Liquidación de Ruta y Cuadre de Caja**:
   - Domiciliarios al completar paradas pasan a `isCourierReadyToReceive`.
   - Se desglosa el recaudo por método de pago (`EFECTIVO`, `NEQUI`, `BANCOLOMBIA`, `CRÉDITO`), se calcula el arqueo de efectivo y se genera el vale de caja antes de liberar al domiciliario.
5. **Lotes de Producción y Rendimiento**:
   - `Rendimiento = (Kg Pulpa Obtenida / Kg Fruta Bruta) * 100`.
   - Descuenta fruta fresca (`freshStockKg`) y suma stock congelado por gramajes.
6. **Nómina Quincenal**:
   - Días 1-15 y 16-Fin de mes.
   - Aplica 4% Salud, 4% Pensión, Auxilio de transporte proporcional y Bonos por entregas de domicilios.
7. **Estética y UI de Cards**:
   - En el mapa de entregas, cada concepto tiene su propia línea para evitar truncados (`Caf...` o `PED-` roto).
