# 📜 REGLAS ESTRICTAS DE ARQUITECTURA, NEGOCIO Y FLUJO DE TRABAJO IA (`DespulpadoraPwa` - Angular)

Este documento constituye la **Única Fuente de Verdad y Reglas de Oro** para cualquier asistente de IA o desarrollador trabajando en el Frontend PWA (`DespulpadoraPwa`). **Estas reglas son inquebrantables.**

👉 **Especificación Maestra de Referencia**: [BUSINESS_RULES_AND_MICROSERVICES_SPEC.md](./BUSINESS_RULES_AND_MICROSERVICES_SPEC.md)

---

## 🛑 1. FLUJO DE ANÁLISIS, AGENTE VERIFICADOR Y PLAN EN ARCHIVO EXTERNO (NO EN EL CHAT)
> [!IMPORTANT]
> **PROHIBICIÓN DE PLANES EN EL CHAT Y PROHIBICIÓN DE RE-ANÁLISIS**: Todo cambio debe pasar por un agente de verificación previo y documentarse en un archivo físico externo antes de tocar una sola línea de código.

1. **Fase 1 — Análisis Exhaustivo y Sub-Agente de Verificación de Impacto**:
   - Ante cualquier solicitud, la IA debe ejecutar primero un **Agente de Verificación** que inspeccione todos los componentes, servicios, estados, rutas y hojas de estilo relacionados.
   - Este agente debe comprobar que el cambio propuesto **no rompe ni altera negativamente ninguna otra vista, modal o flujo del frontend**.
2. **Fase 2 — Entrega del Plan Detallado en Archivo Físico Externo (`implementation_plan.md`)**:
   - **PROHIBIDO entregar el plan únicamente como texto dentro del chat**. El plan debe generarse y escribirse como un **archivo físico externo completo** (`implementation_plan.md` / artefacto dedicado fuera del hilo de conversación).
   - Cuando la IA entrega este documento de plan es porque **ya analizó, verificó y comprobó el 100% del impacto**. El plan debe detallar con precisión quirúrgica: qué archivos se van a tocar, qué componentes/métodos cambiarán, cómo se manejarán los estilos globales y qué pruebas unitarias se ejecutarán o crearán.
   - **Nunca modificar código del proyecto** sin que el usuario apruebe explícitamente el documento del plan.
3. **Fase 3 — Ejecución Directa Post-Aprobación (Cero Re-análisis), Agente Auditor Punto por Punto y Agente de Revisión Par**:
   - Una vez aprobado el plan por el usuario, la IA **ejecuta los cambios de inmediato sin volver a analizar ni investigar desde cero**.
   - Durante y al finalizar la ejecución, es **obligatorio** desplegar dos sub-agentes de control de calidad:
     - **Agente Auditor Punto por Punto**: Revisa ítem por ítem todo lo implementado frente a los requerimientos del usuario y las reglas de `AGENTS.md`, verificando qué está bien y qué presenta desviaciones.
     - **Agente de Revisión Par (Peer Reviewer)**: Espera el resultado de la auditoría punto por punto para realizar una revisión par cruzada del código y, si detecta cualquier anomalía o mejora requerida, genera inmediatamente el plan correctivo en `implementation_plan.md`.

---

## 🎯 2. AISLAMIENTO QUIRÚRGICO DE CAMBIOS Y ARQUITECTURA GLOBAL DE ESTILOS
> [!CAUTION]
> **PROHIBICIÓN ESTRICTA DE DAÑOS COLATERALES EN UI O LÓGICA**: Si se pide cambiar una modal, un botón o una tabla, **SOLO se toca ese elemento específico**.

1. **Alcance Quirúrgico (Cero Regresiones Visuales o Funcionales)**:
   - Si el usuario solicita modificar una modal, tarjeta o vista puntual, está **terminantemente prohibido** alterar otras modales, otros componentes, contratos de servicios o flujos que ya funcionan correctamente.
   - Ejecutar un cambio puntual jamás puede dañar ni desconfigurar el resto del frontend.
2. **Manejo Estricto de Estilos Globales y Sistema de Diseño**:
   - **Estilos Centralizados**: Todos los estilos compartidos (modales, botones, tablas, badges, colores, tipografías, layouts) deben gobernarse desde la arquitectura de **estilos globales y variables CSS/SCSS del proyecto** (`styles.scss` / tokens globales).
   - **Prohibición de Parches Destructivos**: No sobre-escribir reglas globales de forma descontrolada ni duplicar CSS quemado componente por componente que rompa la consistencia visual. Si se ajusta un estilo global, el Agente Verificador debe auditar todas las vistas que consumen esa clase.

---

## 💻 3. ESTÁNDARES ESTRICTOS DE CÓDIGO TYPESCRIPT / ANGULAR
1. **Código 100% en Inglés**:
   - Nombres de componentes, servicios, interfaces, modelos, propiedades, variables, métodos y archivos deben estar escritos **estrictamente en inglés** (los textos visibles de interfaz de usuario para el cliente final se mantienen en español según el diseño).
2. **Tipado Explícito Estricto**:
   - Prohibido el uso de `any` y prohibida la inferencia ambigua; toda variable, parámetro, `Signal`, `Observable` y retorno de método debe declarar su tipo explícito o interfaz (`interface` / `type`).
3. **Manejo de Errores Obligatorio (`try-catch` / `catchError`)**:
   - Todo método asíncrono, suscripción o flujo reactivo debe contar con manejo de errores estructurado (`try-catch` o `catchError` de RxJS) para evitar bloqueos silenciosos en la interfaz.
4. **Regla Estricta de Comentarios (Solo JSDoc Superior)**:
   - **Obligatorio**: Documentar clases, componentes y métodos en su parte superior usando bloques `/** ... */` (JSDoc).
   - **Prohibido**: Escribir comentarios sueltos dentro del cuerpo de los métodos (`// ...`) o comentarios basura en las plantillas HTML.
5. **Prohibición Absoluta de Información Quemada (Cero Hardcoded Data, Mocks o Fallbacks de Negocio Inventados)**:
   - **Cero Datos Quemados o Fallbacks Inventados**: En ninguna parte de la PWA (componentes, servicios, estados, mapeadores o payloads HTTP) puede existir jamás información quemada de negocio, ni valores por defecto inventados (como `?? 'Cliente Comercial'`, `?? '3000000000'`, `?? 'Sede Principal'`, `?? 'Efectivo'`, `?? 'Usuario2026*'`, precios quemados, salarios quemados, ni listas mock de frutas, clientes, pedidos, roles o módulos en memoria).
   - **Origen 100% Real y Validación Estricta**: Toda la información operativa y de seguridad debe provenir **100% de la base de datos (vía API)** o de los **formularios/parámetros explícitos ingresados por el usuario**, validando los campos requeridos en el formulario o servicio sin inventar jamás datos sustitutos.

---

## 🧪 4. REGLA DE ORO: COBERTURA DEL 100% DE PRUEBAS UNITARIAS POR CADA COMPONENTE Y SERVICIO (`100% PASS`)
> [!CAUTION]
> **COBERTURA DEL 100% DE ARCHIVOS `.spec.ts` Y EJECUCIÓN OBLIGATORIA**: Ningún artefacto de Angular puede existir sin su archivo `.spec.ts` y ningún cambio en el frontend se da por terminado sin validación completa de tests unitarios y compilación de producción.

1. **Cobertura del 100% de Pruebas Unitarias (`.spec.ts` Obligatorio por Artefacto)**:
   - **Cada componente, servicio, directiva, pipe, guard e interceptor** en `DespulpadoraPwa` debe tener obligatoriamente su propio archivo `.spec.ts` completo, real y funcional.
   - Si se crea o modifica cualquier componente, servicio, directiva, guard o interceptor, la IA está **obligada a crear o actualizar su archivo `.spec.ts`** cubriendo todos sus métodos, señales/estados, interacciones y casos de borde (sin usar datos mock de negocio quemados en el código productivo).
2. **Ejecución Total de la Suite de Pruebas y Build**:
   - Antes de dar por concluida cualquier tarea, es obligatorio ejecutar **TODAS las pruebas unitarias del frontend** (`npm test` / `ng test --watch=false`) y validar la compilación (`npm run build`).
   - **Cero Fallos Tolerados**: Tanto el build de producción como el 100% de los tests unitarios deben pasar con **0 Errores y 0 Fallos**.

---

## 🚫 5. CONTROL DE VERSIONES (GIT) — PROHIBICIÓN ABSOLUTA DE COMMIT Y PUSH
> [!CAUTION]
> **REGLA ESTRICTA DE GIT**: El control del versionamiento pertenece exclusivamente al usuario.

1. **PROHIBIDO ejecutar `git commit`**: Bajo ninguna circunstancia el asistente debe crear commits automáticos.
2. **PROHIBIDO ejecutar `git push`**: Jamás enviar cambios ni ramas al repositorio remoto (`origin`, `--force`, etc.).
3. **Única Excepción**: Solo cuando el usuario lo ordene de forma literal y explícita en su mensaje actual (ej.: *"haz commit de esto"* o *"haz push a la rama X"*).
4. **Flujo Habitual**: Aplicar los cambios aprobados, certificar `npm run build` y el 100% de las pruebas unitarias, registrar en el historial y entregar el reporte al usuario.

---

## 🏭 6. REGLAS DE NEGOCIO INVIOLABLES DEL SISTEMA DESPULPADORA
Cualquier desarrollo en `DespulpadoraPwa` debe preservar y respetar estrictamente la lógica de dominio definida en `./BUSINESS_RULES_AND_MICROSERVICES_SPEC.md`:

1. **Transiciones de Estado de Pedidos**:
   - Secuencia estricta: `PENDING` -> `PICKING` -> `BILLED` -> `DISPATCHED` -> `DELIVERED` (o `CANCELLED`).
   - Al pasar a `DISPATCHED`, el sistema debe descontar automáticamente el stock de pulpa congelada por gramaje (`g140`, `g250`, `g500`, `g1000`).
2. **Prioridad Urgente en Cava (`isPriority`)**:
   - Se activa desde despacho o mapa con el botón `[⚡]`.
   - En el KDS genera un borde rojo de 2px (`border: 2px solid #ef4444 !important;`), fondo claro y banner de urgencia en cava.
3. **Bloqueo de Asignación si No está Facturado**:
   - Ningún pedido puede asignarse a un mensajero si `isBilled == false`.
   - Si se intenta asignar, se bloquea la acción y se muestra un banner de advertencia de 10 segundos con barra de cuenta regresiva y botón de *"Solicitar Prioridad"*.
4. **Liquidación de Ruta y Cuadre de Caja**:
   - Cuando los domiciliarios completan sus paradas pasan al estado `isCourierReadyToReceive`.
   - Se desglosa el recaudo por método de pago (`EFECTIVO`, `NEQUI`, `BANCOLOMBIA`, `CRÉDITO`), se calcula el arqueo de efectivo y se genera el vale de caja antes de liberar al domiciliario.
5. **Lotes de Producción y Rendimiento**:
   - Fórmula oficial: `Rendimiento = (Kg Pulpa Obtenida / Kg Fruta Bruta) * 100`.
   - Descuenta fruta fresca (`freshStockKg`) y suma al stock congelado clasificado por gramajes.
6. **Nómina Quincenal**:
   - Cortes quincenales: Días `1 al 15` y `16 a Fin de mes`.
   - Aplica deducciones de `4% Salud`, `4% Pensión`, cálculo de Auxilio de transporte proporcional y Bonos por entregas de domicilios.
7. **Estética y UI de Cards (Mapa de Entregas y Tableros)**:
   - En el mapa de entregas y tarjetas operativas, cada concepto debe tener **su propia línea dedicada** para evitar textos truncados o cortados (`Caf...` o `PED-` roto).

---

## 📝 7. PROTOCOLO DE CONTEXTO MULTI-PC (`HISTORIAL_CAMBIOS.md`)
1. **Reanudación de Sesión en Otro PC**: Cuando el usuario indique *"Lee el historial de cambios / contexto"*, la IA debe leer obligatoriamente `./HISTORIAL_CAMBIOS.md` antes de elaborar cualquier plan.
2. **Registro al Finalizar**: Todo cambio completado debe documentarse en `./HISTORIAL_CAMBIOS.md` incluyendo:
   - `💬 Prompt Original del Usuario`
   - `🤖 Resumen Técnico para la IA` (arquitectura, estilos globales e informe del agente verificador)
   - `📦 Componentes Modificados` (rutas relativas)
   - `✅ Verificación, Build y Tests Unitarios` (`npm run build` OK + `100% Unit Tests Passed`).
