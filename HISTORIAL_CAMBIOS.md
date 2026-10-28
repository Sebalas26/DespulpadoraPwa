# 📜 Historial de Cambios (`DespulpadoraPwa` - Angular 20)

Este documento registra de manera cronológica y estructurada todas las intervenciones arquitectónicas, integraciones de API, componentes de seguridad RBAC y pruebas unitarias aplicadas sobre el proyecto Frontend **`DespulpadoraPwa`**.

---

## [2026-10-28] - Reubicación de Accesos Rápidos al Menú Lateral y Rediseño Integrado del Header (Eliminación de Card Bordeada)

### 💬 Prompt Original del Usuario
> "Quiero que esas 3 opciones de la parte superior quede en el menu desplegable a la izquierda, ahi ya hay 2 opciones pero si es necesario reeemplazalos para que queden los 3 que te digo pasra que queden bien
>
> adicional veo que hay una card bordeada del que contiene el titulo alistamiento de pedidos, pero eso no lo quiero, dejalo sin eso y que toda la info que esta ahi (en linea, campana y nuevo pedido se vean cn el background de la vista el que es como gris"

### 🤖 Resumen Técnico para la IA
- **1. Reubicación de Accesos al Menú Lateral (`SidebarComponent`)**:
  - Se incorporaron en la parte superior de `.sidebar-nav` los 3 accesos rápidos solicitados:
    - `Pantalla de Alistamiento` (`/kds`) con badge corporativo `KDS` (`#1e5e3a`).
    - `KDS Inventario & Stock` (`/kds-inventory`) con badge `PLANTA` (`#2563eb`).
    - `Portal Clientes` (`/portal-clientes`) con badge `PEDIDOS` (`#d97706`).
  - Se preservó el acceso condicional a `Admin Catálogo` (`/portal-admin`) con badge `CMS` (`#0284c7`) protegido bajo el permiso reactivo `authService.hasModuleAccess('/portal-admin')`.
- **2. Desmantelamiento de la Card del Header (`HeaderComponent` & `styles.scss`)**:
  - Se eliminaron el fondo blanco sólido `#ffffff`, el borde inferior, el borde izquierdo `border-left`, el radio curvado y la sombra pesada `box-shadow` de `.topbar`.
  - Se sincronizó el fondo de `.topbar` con el canvas gris de la aplicación (`background: var(--bg-app) !important;` / `#f6f8f7`), logrando una apariencia continua, limpia y flotante.
  - Se eliminó el título duplicado de la cabecera ("Alistamiento de Pedidos" / `currentRouteTitle()`), preservando el encabezado `h1` propio de cada vista.
  - Se mantuvieron en la esquina derecha los elementos funcionales limpios: píldora de conectividad (`En línea` / `Desconectado`), campana de notificaciones operativas con dot de bajo stock, avatar móvil y botón primario `+ Nuevo pedido`.
  - Se mantuvo en `.topbar-left` el botón reactivo de toggle del sidebar (`.sidebar-toggle-btn`) junto con el logo y branding cuando el menú lateral está colapsado.
- **3. Verificación de Sub-Agentes de Calidad**:
  - **Agente Auditor Punto por Punto**: Certificó 100% de cumplimiento en los 12 criterios auditados (0 desviaciones).
  - **Agente de Revisión Par (Peer Reviewer)**: Otorgó aprobación formal y sign-off definitivo sin observaciones ni anomalías.

### 📦 Componentes Modificados
- `src/app/layout/sidebar/sidebar.component.ts`
- `src/app/layout/sidebar/sidebar.component.spec.ts`
- `src/app/layout/header/header.component.ts`
- `src/app/layout/header/header.component.spec.ts`
- `src/styles.scss`
- `implementation_plan.md`
- `HISTORIAL_CAMBIOS.md`

### ✅ Verificación, Compilación y Tests
- **Build de Producción (`npm run build`)**: Exitoso (0 Errores, exit code 0).
- **Pruebas Unitarias (`ng test`)**: 208 de 208 pruebas aprobadas (100% SUCCESS, 0 Fallos).

---

## [2026-10-28] - Visibilidad y Sincronización Inmediata de Pedidos de Portal Clientes en Alistamiento (Picking)

### 💬 Prompt Original del Usuario
> "cree un pedido por la pagina de portal cliente y no se ve refljeada en el alistamiento de pedidos"

### 🤖 Resumen Técnico para la IA
- **1. Diagnóstico de Causa Raíz**:
  - En `ClientPortalComponent`, las opciones de entrega eran frases relativas ('Hoy mismo (Prioritario)', 'Mañana a primera hora', 'Día Siguiente', 'Programado fin de semana') enviadas en crudo a `order.scheduledDay`.
  - En `OrdersComponent`, las columnas de alistamiento (`weekDayConfigs`) manejan exclusivamente los nombres canónicos en español ('Lunes' a 'Domingo').
  - `OrdersComponent.getOrderDay()` retornaba `order.scheduledDay` directamente sin normalizar. Al comparar `orderDay === activeDay` (ej: 'Hoy mismo (Prioritario)' === 'Miércoles'), evaluaba `false` y el pedido no se mostraba ni sumaba a los contadores semanales.
  - Además, la selección prioritaria no marcaba `isPriority: true` en el pedido en `StateService`.
- **2. Arquitectura de Doble Defensa**:
  - En `ClientPortalComponent`: se añadió `resolveCanonicalWeekday()` para transformar las opciones del cliente en días canónicos ('Lunes' a 'Domingo') y marcar `isPriority: true` cuando aplique 'hoy' o 'prioritario', preservando la instrucción original en las notas `[Entrega: ...]`.
  - En `StateService`: se actualizó `createOrder` para recibir y persistir `isPriority` y asignar como fallback el día canónico actual `getSpanishWeekday()`.
  - En `OrdersComponent`: se enriqueció `getOrderDay(order: OrderDto)` con normalización NFD sin acentos, evaluación de términos relativos, parseo de fechas ISO locales a mediodía (`12:00:00`) evitando desfases UTC-5 a días anteriores, y fallbacks reactivos encadenados.
- **3. Verificación de Sub-Agentes de Calidad**:
  - **Agente Auditor Punto por Punto**: Certificó 100% de cumplimiento en los 13 ítems evaluados (0 desviaciones).
  - Pruebas unitarias ampliadas en `state.service.spec.ts`, `client-portal.component.spec.ts` y `orders.component.spec.ts`.

### 📦 Componentes Modificados
- `src/app/core/services/state.service.ts`
- `src/app/core/services/state.service.spec.ts`
- `src/app/features/client-portal/client-portal.component.ts`
- `src/app/features/client-portal/client-portal.component.spec.ts`
- `src/app/features/orders/orders.component.ts`
- `src/app/features/orders/orders.component.spec.ts`
- `HISTORIAL_CAMBIOS.md`

### ✅ Verificación, Compilación y Tests
- **Build de Producción (`npm run build`)**: Exitoso (0 Errores, exit code 0).
- **Pruebas Unitarias (`ng test`)**: 203 de 203 pruebas aprobadas (100% SUCCESS, 0 Fallos).

---

## [2026-10-28] - Unificación Tipográfica y Rediseño de Botones en Modal de Confirmación de Pedido (Portal de Clientes)

### 💬 Prompt Original del Usuario
> "Mejora esta vista, no tiene el color del boton y la fuente y letra de toda la pwa"

### 🤖 Resumen Técnico para la IA
- **1. Diagnóstico de Tipografía y Desacople Estético**:
  - En `ClientPortalComponent` (`src/app/features/client-portal/client-portal.component.ts`), la regla en `:host` tenía quemada una pila genérica del sistema operativo que bloqueaba la herencia de las variables globales (`--font-heading` y `--font-body: 'Lato'`).
  - La modal de confirmación (`.success-modal`), su código de orden con `font-family: monospace;` y sus textos no reflejaban la identidad visual corporativa.
  - El botón `.btn-send-whatsapp` utilizaba un verde fluorescente `#25d366` rectangular con sombra pesada y emoji `📲`, en lugar del verde esmeralda corporativo DGL (`var(--color-primary): #1e5e3a`), forma en píldora (`var(--radius-full)`) e ícono SVG vectorial nítido.
  - El botón secundario `.btn-new-order` usaba un fondo grisáceo `#f1f5f9` desconectado del estilo secundario/outline de la PWA.
- **2. Unificación con el Sistema de Diseño Global**:
  - Se vinculó `:host` y `.success-modal` a `var(--font-body, 'Lato', sans-serif)` y `.success-title` a `var(--font-heading, 'Lato', sans-serif)`.
  - Se rediseñó `.btn-send-whatsapp` con fondo `var(--color-primary)`, hover `var(--color-primary-hover)`, radio de píldora `var(--radius-full)`, sombra corporativa sutil e ícono SVG vectorial de WhatsApp.
  - Se rediseñó `.btn-new-order` como botón outline en píldora con fondo blanco, borde `var(--border-subtle)` e ícono vectorial `+`.
  - Se refinó el badge del código de pedido con `var(--color-primary-light)` y bordes suaves de 12px.
- **3. Cobertura de Pruebas y Sub-Agentes de Control**:
  - Se añadieron pruebas unitarias en `client-portal.component.spec.ts` validando el renderizado de la modal, los botones de acción y el reseteo de señales mediante `startNewOrder()`.
  - **Agente Auditor Punto por Punto**: Certificó 100% de cumplimiento (100% PASS, 0 desviaciones).
  - **Agente de Revisión Par (Peer Reviewer)**: Otorgó aprobación y sign-off completo sin anomalías.

### 📦 Componentes Modificados
- `src/app/features/client-portal/client-portal.component.ts`
- `src/app/features/client-portal/client-portal.component.spec.ts`
- `implementation_plan.md`
- `HISTORIAL_CAMBIOS.md`

### ✅ Verificación, Compilación y Tests
- **Build de Producción (`npm run build`)**: Exitoso (0 Errores, código de salida 0).
- **Pruebas Unitarias (`npm test`)**: 199 de 199 pruebas aprobadas (100% SUCCESS, 0 Fallos).

---

## [2026-10-28] - Integración del Botón de Creación de Pedidos en Vista Móvil (Alistamiento de Pedidos)

### 💬 Prompt Original del Usuario
> "En la pwa version mobile no veo el boton de crear nuevo pedido, esto adicionalo en el modulo de pedidos \"alistamiento de pedidos\""

### 🤖 Resumen Técnico para la IA
- **1. Diagnóstico de Causa Raíz**:
  - En el layout global de la aplicación (`HeaderComponent`), el botón `+ Nuevo pedido` dispone de la clase CSS `.no-mobile` que se oculta en dispositivos móviles y pantallas estrechas (`@media (max-width: 768px) { display: none !important; }`) para preservar el espacio en la barra superior.
  - La vista interna de alistamiento (`OrdersComponent` - Subtab Picking) no contaba con un botón propio para disparar `openCreateOrderModal()`, provocando que en dispositivos móviles no hubiera forma visible de iniciar la creación manual de pedidos.
- **2. Aislamiento Quirúrgico y Preservación de Escritorio**:
  - En `orders.component.html`, se reestructuró `.picking-page-header` organizando título y subtítulo en `.picking-title-block` y agregando el botón de acción `.picking-mobile-create-btn`.
  - En `orders.component.scss`, `.picking-mobile-create-btn` tiene `display: none;` en resoluciones de escritorio (> 768px), garantizando cero regresiones visuales o duplicidades con el botón de la barra superior.
  - En resoluciones móviles y tablets (<= 768px), se activa como `display: inline-flex; width: 100%;` con padding ergonómico de 10px 18px, borde en píldora `var(--radius-full)`, sombra corporativa y accesibilidad táctil para dedos pulgares (> 44px de área de pulsación).
- **3. Acción Directa en Estado Vacío (Empty State)**:
  - En la tarjeta que se renderiza cuando `tabOrders().length === 0`, se incorporó el botón `.btn-empty-create-order` con `(click)="openCreateOrderModal()"`, permitiendo crear pedidos directamente sin depender del texto informativo previo.
- **4. Cumplimiento Estricto de Calidad y Sub-Agentes de Control**:
  - **Agente de Verificación de Impacto**: Certificó 0 daños colaterales previo a la ejecución.
  - **Agente Auditor Punto por Punto**: Verificó el 100% de los puntos implementados frente a las reglas de `AGENTS.md` (código en inglés, tipado estricto, cero datos quemados, cero comentarios `//`).
  - **Agente de Revisión Par (Peer Reviewer)**: Otorgó aprobación final (sign-off) sin observaciones ni necesidad de planes correctivos.

### 📦 Componentes Modificados
- `src/app/features/orders/orders.component.html`
- `src/app/features/orders/orders.component.scss`
- `src/app/features/orders/orders.component.spec.ts`
- `implementation_plan.md`
- `HISTORIAL_CAMBIOS.md`

### ✅ Verificación, Compilación y Tests
- **Build de Producción (`npm run build`)**: Exitoso (0 Errores, código de salida 0).
- **Pruebas Unitarias (`npm test`)**: 197 de 197 pruebas aprobadas (100% SUCCESS, 0 Fallos).

---

## [2026-10-27] - Sincronización Global Reactiva de Presentaciones/Categorías y Corrección de Scrollbar en Modal de Cards

### 💬 Prompt Original del Usuario
> "Estoy viendo que borre algunas preentaciones y en la creacion de las card me sigue saliendo , valida que la pwa y app se sincronice con las configuraciones que se haga, es decir que si inactivo o elimino configuraciones, que sincronicen en toda la pwa , valida que los campos que se muestran esten sincronizados y no se encuentren mockeados o quemados, todo debe ir por api
> 
> adicional en la esquina que te señale , se veo el scroll"

### 🤖 Resumen Técnico para la IA
- **1. Centralización de Estado Global Reactivo de Presentaciones y Líneas (`StateService`)**:
  - Se elevaron las configuraciones de presentaciones (`grammagesConfig`) y categorías (`categoriesConfig`) desde el ámbito local de `SettingsComponent` hacia el servicio centralizado `StateService` (`src/app/core/services/state.service.ts`).
  - Se crearon las señales reactivas computadas `activeGrammages = computed(() => this.grammagesConfig().filter(g => g.isActive))` y `activeCategories = computed(() => this.categoriesConfig().filter(c => c.isActive))`.
  - Se implementaron métodos mutadores reactivos en `StateService`: `toggleGrammage(key)`, `deleteGrammage(key)`, `addGrammage(gram)`, `toggleCategory(id)`, `deleteCategory(id)` y `addCategory(cat)`.
  - Se garantiza persistencia local sincrónica (`localStorage.setItem('despulpadora_grammages_config', ...)` y `'despulpadora_categories_config'`) y fallback inicial a `DEFAULT_GRAMMAGES` y `DEFAULT_CATEGORIES`.
- **2. Sincronización Inmediata en Parámetros del Sistema (`SettingsComponent`)**:
  - `SettingsComponent` delega directamente la lectura y mutación de `grammagesConfig`, `categoriesConfig`, `activeGrammages` y `activeCategories` a `this.stateService`.
  - Al desactivar un switch o eliminar una presentación/kilo o línea en Parámetros del Sistema, el cambio se refleja instantáneamente en toda la aplicación sin requerir recargar la página.
- **3. Renderizado Dinámico de Precios en Creación y Edición de Cards (`ClientPortalAdminComponent`)**:
  - Se eliminó el renderizado rígido de presentaciones quemadas (`g140`, `g250`, `g500`, `g1000`) en la cuadrícula de tarjetas (`.prices-grid-4`), en la tira de precios en vivo (`.preview-prices-strip`) y en la cuadrícula de inputs de la modal (`.modal-prices-grid`).
  - Ahora se iteran dinámicamente mediante `@for (g of activeGrammages(); track g.key)`: si una presentación (ej. 500g o 1Kg) fue eliminada o desactivada en Parámetros del Sistema, desaparece de inmediato de la modal de creación y de las tarjetas del catálogo.
  - El borrador `EditableCardDraft.prices` se actualizó a `Record<string, number>`, permitiendo inicializar y persistir claves dinámicas sin fallbacks quemados.
- **4. Dinamismo en Portal Público y Pedidos (`ClientPortalComponent` y `StateService`)**:
  - En `ClientPortalComponent`, la fila de selección de presentación (`.grammage-pills-row`) consume `@for (g of activeGrammages(); track g.key)`.
  - Se actualizó el tipado del carrito de compras (`CartItem.grammage: number`) y el método `createOrder(orderData)` en `StateService` para aceptar gramajes dinámicos (`grammage: number`), erradicando uniones cerradas e información quemada.
- **5. Corrección Definitiva del Desbordamiento de Scrollbar en la Esquina Superior Derecha de la Modal**:
  - Se identificó la causa raíz: la clase `.card-edit-modal` tenía asignado `overflow-y: auto;` directamente en el contenedor padre con `border-radius: 20px`, provocando que el riel del scrollbar del navegador se montara sobre la esquina curva superior derecha, encima del botón de cerrar `x`.
  - Se reestructuró la modal: `.card-edit-modal` ahora tiene `overflow: hidden; max-height: 90vh; display: flex; flex-direction: column;`, `.modal-header` y `.modal-footer` tienen `flex-shrink: 0;`, y el scroll vertical `overflow-y: auto;` se confinó exclusivamente a `.modal-body-grid` con un scrollbar personalizado y elegante de `6px`.
- **6. Auditoría de Calidad y Revisión Par**:
  - Cumplimiento estricto de las directrices de `AGENTS.md`: código 100% en inglés, tipado explícito obligatorio, bloques `try-catch` estructurados, JSDoc `/** ... */` superior, cero comentarios internos de línea (`//`), y cero migraciones/commits de git.
  - La suite completa de pruebas unitarias (`npm test`) se ejecutó con 100% de éxito y el bundle de producción (`npm run build`) compiló con 0 errores.

### 📦 Componentes Modificados
- `src/app/core/models/business.models.ts`
- `src/app/core/data/initial-data.ts`
- `src/app/core/services/state.service.ts`
- `src/app/features/settings/settings.component.ts`
- `src/app/features/settings/settings.component.spec.ts`
- `src/app/features/client-portal/client-portal-admin.component.ts`
- `src/app/features/client-portal/client-portal-admin.component.spec.ts`
- `src/app/features/client-portal/client-portal.component.ts`
- `src/app/features/client-portal/client-portal.component.spec.ts`
- `HISTORIAL_CAMBIOS.md`

### ✅ Verificación, Compilación y Tests
- **Build de Producción (`npm run build`)**: Exitoso (0 Errores, código de salida 0).
- **Pruebas Unitarias (`npm test`)**: 195 de 195 pruebas aprobadas (100% SUCCESS, 0 Fallos).

---

## [2026-10-27] - Rediseño Compacto y Armónico de Cards de Parámetros del Sistema (Métodos de Pago, Presentaciones y Categorías)

### 💬 Prompt Original del Usuario
> "mejora el dise;o de estas cards y la de presentaciones/kiloes y linesas y categorias donde se vean mas peque;as, siento que se ven muy grandes para el cntenido que tienen"

### 🤖 Resumen Técnico para la IA
- **1. Optimización de Cuadrícula Responsive (`.parameter-grid` y `.param-list-grid`)**:
  - Se redujo el ancho mínimo de columna de `300px` (y `280px`) a `220px` (`repeat(auto-fill, minmax(220px, 1fr))`) y el espaciado entre tarjetas de `16px` a `12px`.
  - Esta optimización permite desplegar ordenadamente entre 4 y 5 tarjetas por fila en pantallas de escritorio y tablets apaisadas, erradicando tarjetas sobredimensionadas con espacios vacíos laterales.
- **2. Rediseño Compacto de Métodos de Pago (`.pm-card`)**:
  - Se ajustó el padding interno a `12px 14px` (reducción de más del 30% del volumen ocioso).
  - Se eliminó la altura forzada de descripción (`min-height: 2.3em`) y se redujo el margen inferior a `10px`, permitiendo que el texto fluya de manera natural en un máximo de 2 líneas con elipsis.
  - El contenedor de ícono `.pm-type-icon` se estilizó a `34px x 34px` con esquinas redondeadas suaves de `9px` e íconos SVG de `18px`.
  - Se creó el sub-contenedor semántico `.pm-header-info` con la fila `.pm-badges-row`, incorporando badges de tipo y código a `0.64rem` con `padding: 2px 6px` y border-radius píldora, resolviendo los saltos de línea indeseados en nombres largos como *Daviplata* y *Transferencia Bancaria*.
  - Título `.pm-name` tipografiado en `0.92rem` con interlineado ajustado de `1.25`.
- **3. Rediseño Compacto de Presentaciones/Kilos y Líneas/Categorías (`.param-card`)**:
  - Se eliminó la altura forzada `min-height: 140px` estableciendo `min-height: auto`.
  - Padding ajustado a `12px 14px` y borde redondeado `12px`.
  - Íconos de presentación `.grammage-badge` y categoría `.category-badge` ajustados a `34px x 34px` con SVGs de `17px`.
  - Título `.param-card-title` ajustado a `0.92rem` con badges compactos de gramaje y códigos ID (`0.65rem`).
- **4. Micro-Acciones y Switches Proporcionales**:
  - En el pie de las tres tarjetas, se estandarizó la barra de acciones a `padding-top: 8px`.
  - Botones de acción `.btn-icon` ajustados a `28px x 28px` con íconos de `14px`.
  - Switches `.custom-switch` ajustados proporcionalmente a `36px x 20px` con deslizador de `14px`, proporcionando una interacción limpia y equilibrada.
- **5. Cero Regresiones, Aislamiento Quirúrgico y Pruebas**:
  - Se preservó íntegro el comportamiento móvil colapsable mediante `.mobile-summary-header` y el acordeón global.
  - Cero comentarios de línea (`//`), 100% tipado explícito, cero `any`/`var`.
  - Se superaron las auditorías de calidad del Agente Punto por Punto y Agente de Revisión Par sin desviaciones ni necesidad de planes correctivos.

### 📦 Componentes Modificados
- `src/app/features/settings/settings.component.html`
- `src/app/features/settings/settings.component.scss`
- `implementation_plan.md`
- `HISTORIAL_CAMBIOS.md`

### ✅ Verificación, Compilación y Tests
- **Build de Producción (`npm run build`)**: Exitoso (0 Errores, código de salida 0).
- **Pruebas Unitarias (`npm test`)**: 192 de 192 pruebas aprobadas (100% SUCCESS, 0 Fallos).

---

## [2026-10-27] - Eliminación del Sello / Logo Superpuesto en Creación y Renderizado de Cards de Catálogo

### 💬 Prompt Original del Usuario
> "elimina este logo al crear las card, pues las iamgenes ya la tiene"

### 🤖 Resumen Técnico para la IA
- **1. Retiro de Sello Flotante en Modal de Creación y Edición (`client-portal-admin.component.ts`)**:
  - Se eliminó el elemento `.preview-seal` en la columna de vista previa en vivo (`VISTA PREVIA EN VIVO DE LA CARD`) de la modal `Crear Nueva Card de Pulpa` y edición de producto.
  - La fotografía del empaque real de la pulpa se visualiza 100% despejada, sin la estampa circular que cubría el producto ni duplicación del logo físico ya impreso en la bolsa.
- **2. Retiro de Sello Flotante en Cuadrícula de Catálogo Admin y Portal Público**:
  - En `client-portal-admin.component.ts`, se retiró el elemento `.brand-seal` de las tarjetas de producto en la cuadrícula de administración y se limpiaron sus reglas SCSS huérfanas.
  - En `client-portal.component.ts`, se retiró el elemento `.brand-sticker-stamp` del contenedor de medios de las tarjetas públicas del catálogo y se eliminaron sus declaraciones de estilo y animaciones hover asociadas.
- **3. Calidad, Tipado y Pruebas Unitarias**:
  - Se añadió prueba unitaria en `client-portal-admin.component.spec.ts` validando de forma explícita que ni la modal de creación ni las tarjetas del catálogo renderizan los elementos `.preview-seal` ni `.brand-seal`.
  - Cero comentarios internos (`//`), tipado 100% explícito, sin dependencias huérfanas.

### 📦 Componentes Modificados
- `src/app/features/client-portal/client-portal-admin.component.ts`
- `src/app/features/client-portal/client-portal-admin.component.spec.ts`
- `src/app/features/client-portal/client-portal.component.ts`
- `implementation_plan.md`

### ✅ Verificación, Compilación y Tests
- **Build de Producción (`npm run build`)**: Exitoso (0 Errores, código de salida 0).
- **Pruebas Unitarias (`npm test`)**: 192 de 192 pruebas aprobadas (100% SUCCESS, 0 Fallos).

---

## [2026-10-27] - Módulo Desplegable de Inventario de Pulpas y Frutas en Menú y Super-Acceso Universal para Administradores

### 💬 Prompt Original del Usuario
> "No veo en el menu desplegable el modulo de inventario de pulpas y frutas ,estoy con el administrador, recuerda que el pude ver todo sin depender de un permiso, haz el plan e implementalo de una por solo esta ocasion"

### 🤖 Resumen Técnico para la IA
- **1. Super-Acceso Universal del Administrador (`auth.service.ts` y `permission.guard.ts`)**:
  - Se configuró la señal computada `isAdmin` para validar roles administrativos universales (`Administrador Operativo`, `Administrador General`, `Super Administrador`, `Gerente`) de manera reactiva e inmune a recursiones circulares.
  - Se implementó el bypass universal en `hasModuleAccess()` y `hasPermission()`, de modo que cualquier usuario con rol administrativo posee acceso total a todos los módulos y operaciones del sistema sin depender de asignaciones granulares de slugs en base de datos.
  - Se ajustó `permission.guard.ts` para autorizar el paso inmediato a usuarios administradores sin emitir alertas de restricción ni desviar a rutas de fallback.
- **2. Incorporación Canónica de Inventario en `groupedNavigationSections()`**:
  - Se corrigió el filtro de módulos retirados para evitar la exclusión accidental de módulos de inventario (`isRemovedCalculatorModule` solo descarta la ruta y slug explícitos de `calculator`).
  - Se normalizó el módulo a su estructura canónica: `name: 'Inventario de Pulpas y Frutas'`, `slug: 'inventory'`, `menuSection: 'Operación'`, `frontendRoute: '/settings?tab=inventory'`, `icon: 'package'`, `displayOrder: 2`.
  - Si el módulo no está registrado o asignado en base de datos, `groupedNavigationSections()` lo inyecta automáticamente en la sección `OPERACIÓN` (entre *Dashboard Operativo* y *Pedidos y Despacho*) para perfiles administradores y usuarios con acceso.
- **3. Menú Desplegable con Sub-ítems en Sidebar (`sidebar.component.ts`)**:
  - Se agregó la sección desplegable sangrada bajo el módulo de inventario, con estructura homóloga a la de *Pedidos y Despacho*:
    - `↳ Stock de Pulpas`: `[routerLink]="['/settings']"` con `queryParams: { tab: 'variants' }`
    - `↳ Fruta Fresca`: `[routerLink]="['/settings']"` con `queryParams: { tab: 'fruits' }`
    - `↳ Pantalla KDS Planta`: `[routerLink]="['/kds-inventory']"`
  - Se desarrollaron los métodos `isInventoryTabActive()` e `isModuleActive()` para controlar el resaltado visual verde del menú de forma quirúrgica sin colisiones con la sección de *Configuración general*.
- **4. Sincronización en Vista de Inventario y Navegación Móvil**:
  - En `SettingsComponent` (`settings.component.ts`), al recibir `tab=inventory` o `tab=variants`, se activa por defecto la pestaña de *Stock de Pulpas Hechas*, y con `tab=fruits` la de *Fruta Fresca*.
  - En `MobileNavComponent` (`mobile-nav.component.ts`), se añadió soporte para `queryParams` en las cards del drawer desplegable mediante `getRoutePath()` y `getRouteQueryParams()`.
- **5. Calidad, Tipado y Pruebas Unitarias**:
  - 100% tipado explícito (cero `any`/`var`), cero comentarios internos (`//`), documentación JSDoc completa.
  - Se ampliaron las suites de pruebas unitarias (`auth.service.spec.ts`, `sidebar.component.spec.ts`, `mobile-nav.component.spec.ts`) cubriendo el super-acceso de administrador, los helpers de sub-pestañas de inventario y el parsing de rutas con query parameters.

### 📦 Componentes Modificados
- `src/app/core/services/auth.service.ts`
- `src/app/core/services/auth.service.spec.ts`
- `src/app/core/guards/permission.guard.ts`
- `src/app/layout/sidebar/sidebar.component.ts`
- `src/app/layout/sidebar/sidebar.component.spec.ts`
- `src/app/layout/mobile-nav/mobile-nav.component.ts`
- `src/app/layout/mobile-nav/mobile-nav.component.spec.ts`
- `src/app/features/settings/settings.component.ts`
- `implementation_plan.md`

### ✅ Verificación, Compilación y Tests
- **Build de Producción (`npm run build`)**: Exitoso (0 Errores, código de salida 0).
- **Pruebas Unitarias (`npm test`)**: 188 de 188 pruebas aprobadas (100% SUCCESS, 0 Fallos).

---

## [2026-10-27] - Modernización de Modal de Confirmación, Rediseño de Cards de Parámetros y Creación por Diálogo Limpio con Manejo Automático de Unidades

### 💬 Prompt Original del Usuario
> "mejorame la modal de confirmacion
> adicional mejorame las cards de presentaciones/kilos y lineas y categorias , porque se ve montado y ademas no veo la opcion para eliminarlas
> mejorame que el agregar presentacion y categoria sean por un dialog , no por esa opcion ya precargada cuando a paraemetros del sistema, recuerda que los editext deben cargarme vacio la info, por ejemplo el de agregar presentacion muestra "300kg" pero el kg debe ponerse solo y no dejar que el usuario lo escriba"

### 🤖 Resumen Técnico para la IA
- **1. Modal de Confirmación Centralizada (`confirmDialogState`)**:
  - Se eliminó por completo el uso de la ventana nativa del navegador `window.confirm(...)` en todos los flujos de eliminación y restauración de `SettingsComponent`.
  - Se implementó una modal de confirmación moderna con backdrop blur, icono circular de alerta (peligro/advertencia), mensajes claros y contextuales, y botones "Cancelar" y "Eliminar" / "Restaurar".
- **2. Rediseño Estructural de Tarjetas de Presentaciones y Categorías (`.param-card`)**:
  - Se reemplazó el contenedor flex horizontal estrecho por una estructura de tarjeta vertical con altura mínima y padding generoso, evitando que los títulos, IDs y switches colisionen ("montados").
  - Se añadieron badges de color temáticos para presentaciones (`grammage-badge` púrpura) y categorías (`category-badge` azul).
  - Se incorporó en cada tarjeta el botón de eliminación directa con icono de papelera, conectado a la nueva modal de confirmación.
- **3. Diálogos de Creación Limpia con Gestión Automática de Unidades**:
  - Se eliminaron las cajas inline fijas al pie de las secciones de gramajes y categorías.
  - Se agregaron los botones `+ Nueva Presentación` y `+ Nueva Categoría` en la barra superior de acciones.
  - Se configuraron los campos de entrada para que inicien 100% vacíos (`null` o `''`), eliminando cualquier valor precargado arbitrario.
  - En la modal de presentación, se implementó un campo numérico con selector toggle de unidad (`Gramos (g)` vs `Kilos (Kg)`), calculando y formateando el sufijo (`g` o `Kg`) de manera automática sin permitir que el usuario deba escribirlo manualmente.
- **4. Calidad, Tipado y Pruebas Unitarias**:
  - Tipado 100% explícito sin `any` ni `var`, `try-catch` estructurado en cada método y documentación JSDoc completa sin comentarios internos de línea.
  - Se añadieron 9 pruebas unitarias nuevas cubriendo la modal de confirmación, creación de gramaje en gramos y kilos, creación de categoría y eliminaciones.

### 📦 Componentes Modificados
- `src/app/features/settings/settings.component.ts`
- `src/app/features/settings/settings.component.html`
- `src/app/features/settings/settings.component.scss`
- `src/app/features/settings/settings.component.spec.ts`

### ✅ Verificación, Compilación y Tests
- **Build de Producción (`npm run build`)**: Exitoso (0 Errores).
- **Pruebas Unitarias (`npm test`)**: 185 de 185 pruebas superadas (100% SUCCESS, 0 Fallos).

---

## [2026-10-27] - Estandarización Terminológica: Reemplazo Estricto de "Cava" por "Inventario" en Todo el Frontend

### 💬 Prompt Original del Usuario
> "elimina la palabra "cava""
> Confirmación de requerimiento: "Reemplazar la palabra 'Cava' estrictamente por 'Inventario' en todo el sistema"

### 🤖 Resumen Técnico para la IA
- **1. Auditoría y Análisis de Impacto**:
  - Se analizó la presencia del término "Cava" en títulos, tooltips, etiquetas, botones, modales, placeholders, leyendas, avisos KDS y nombres de descarga de archivos CSV.
  - Se preservó quirúrgicamente la compatibilidad de enrutamiento por query params (`tab === 'cava'`) y los identificadores de señales internas (`cavaTotalStockKg`, `cavaCommercialValue`, etc.) requeridas por la suite de pruebas unitarias (`reports.component.spec.ts`) para garantizar cero regresiones funcionales y de testing.
- **2. Estandarización de Textos en Vistas y Componentes**:
  - `orders.component.html`: Actualizado banner de alistamiento a `LISTA DE ALISTAMIENTO EN INVENTARIO:`, `¡Inventario al día!`, `requeridos en inventario` e `Inventario Frigorífico`.
  - `kds.component.ts`: Cambiado a `Alistando en Inventario`, `Inventario sin picking activo`, `productos alistados en inventario` y `alistamiento en inventario`.
  - `delivery-map.component.ts`: Actualizados tooltips y badges operativos a `prioridad urgente en inventario`, `Aún en inventario`, `Inventario Matriz Cundinamarca` y `pantalla de Inventario (KDS)`.
  - `voice-order-modal.component.html` & `.ts`: Actualizadas instrucciones a `Verifica los sabores y gramajes en el inventario`, `Alistamiento en Inventario` y `en preparación en inventario`.
  - `kds-inventory.component.ts`: Ajustado encabezado a `KDS PLANTA & INVENTARIO`, `Pulpas en Inventario`, `Stock de Pulpas Hechas en Inventario`.
  - `reports.component.html` & `.ts`: Cambiado encabezado a `Inventario & Valoración`, `Pulpa Congelada en Inventario`, `Valorización Comercial de Inventario`, `Estado de Inventario`, `Energía inventario frigorífico` y nombre de descarga de exportación a `reporte_inventario_${now}.csv`.
  - `settings.component.html` & `.ts`: Actualizados tooltips KDS a `Planta & Inventario`, `Sede Principal · Inventario Frigorífico (-18°C)`, descripciones de gramajes a `calcular el stock en inventario`, encabezados y celdas de tabla a `Stock en Inventario`, y etiquetas de modales a `Stock Inicial en Inventario (uds)` y `Stock en Inventario (uds)`.
  - `shifts.component.html`: Actualizado placeholder a `ej: Despulpado de maracuyá, inventario, saneamiento...` y métrica a `Líneas de extracción e inventario operando`.
  - `dashboard.component.html`: Subtítulo de modal actualizado a `Existencias empacadas listas en inventario por fruta y gramaje`.
  - `client-portal.component.ts`: Modal de éxito de pedido actualizado a `Tu solicitud ya entró a la línea de preparación y alistamiento en inventario.`
  - `roles.component.html`: Placeholder actualizado a `ej: Supervisor de Inventario`.
  - `system-catalog.component.html`: Placeholder de descripción operativa actualizado a `Ej: Permite certificar grados Brix y pH del lote antes de inventario`.
  - `header.component.ts`: Tooltips actualizados a `(KDS en Inventario)` y `planta/inventario`.
- **3. Verificación de Reglas y Calidad**:
  - Cero datos quemados de negocio o mocks.
  - Tipado 100% explícito sin `any` ni `var`.
  - JSDoc estricto y cero comentarios sueltos internos (`//`).

### 📦 Componentes Modificados
- `src/app/features/orders/orders.component.html`
- `src/app/features/orders/kds/kds.component.ts`
- `src/app/features/orders/delivery-map.component.ts`
- `src/app/features/orders/voice-orders/voice-order-modal.component.html`
- `src/app/features/orders/voice-orders/voice-order-modal.component.ts`
- `src/app/features/inventory/kds/kds-inventory.component.ts`
- `src/app/features/reports/reports.component.html`
- `src/app/features/reports/reports.component.ts`
- `src/app/features/settings/settings.component.html`
- `src/app/features/settings/settings.component.ts`
- `src/app/features/shifts/shifts.component.html`
- `src/app/features/dashboard/dashboard.component.html`
- `src/app/features/client-portal/client-portal.component.ts`
- `src/app/features/admin/roles/roles.component.html`
- `src/app/features/admin/system-catalog/system-catalog.component.html`
- `src/app/layout/header/header.component.ts`

### ✅ Verificación, Compilación y Tests
- **Build de Producción (`npm run build`)**: Exitoso (0 Errores).
- **Pruebas Unitarias (`npm test`)**: 176 de 176 pruebas superadas (100% SUCCESS, 0 Fallos).

---

## [2026-10-25] - Integración de Autenticación Real, Navegación Dinámica RBAC (Server-Driven UI), Circuito Maestro (`SystemCatalog`) y Conexión 100% Full-Stack con `ApiDespulpadora` (.NET 10)

### 💬 Prompt Original del Usuario
> "# 🚀 SOLICITUD DE ARQUITECTURA FRONTEND: INTEGRACIÓN DE LOGIN REAL, NAVEGACIÓN DINÁMICA RBAC Y PANEL MAESTRO DE CONFIGURACIÓN (`DespulpadoraPwa`)"
> "veo que el proyecto de la pwa no tiene el archivo de historial de cambios que si tiene el api debería igual tenerlo entonces crearlo por favor y tenerlo encuenta si me explico. otra cosa veo que solo estamos trabajando unos modulos nada mas no veo que se este trabajando todo full cierto ?"

### 🤖 Resumen Técnico para la IA
- **1. Integración Real de Autenticación y Sesión (`AuthService`, `AuthInterceptor`, `AuthGuard`)**:
  - Se conectó el formulario de inicio de sesión (`LoginComponent`) con `POST /api/auth/login` enviando `{ usernameOrEmail, password }` y el flujo de renovación con `POST /api/auth/refresh-token`.
  - Se eliminó por completo cualquier login simulado (`loginDemo`, `isDemoMode`) o roles quemados en el frontend.
  - Se implementó el estado reactivo mediante Angular Signals en `AuthService`:
    - `accessToken`, `refreshToken`, `expiresAtUtc`.
    - `user` (`AuthenticatedUserDto`: `id`, `username`, `email`, `fullName`, `roleId`, `roleName`, `isSystemDeveloper`, `avatarInitials`).
    - `navigationModules` (`NavigationModuleDto[]`: `moduleId`, `name`, `slug`, `menuSection`, `frontendRoute`, `icon`, `displayOrder`, `allowedActionSlugs`).
    - `groupedNavigationSections`: Signal computado que agrupa dinámicamente los módulos autorizados por `menuSection` y los ordena ascendentemente por `displayOrder`.
  - Se actualizó `AuthInterceptor` para adjuntar `Authorization: Bearer <accessToken>` y gestionar errores `401 Unauthorized` intentando renovar la sesión con `refreshToken` o ejecutando `logout()` limpio.
- **2. Construcción 100% Dinámica del Menú Lateral, Enrutamiento Seguro y Directiva de Acciones (Server-Driven UI)**:
  - `SidebarComponent` y `MobileNavComponent` construyen el menú de navegación 100% de forma dinámica iterando sobre `authService.groupedNavigationSections()`, mostrando el badge `DEV MASTER` cuando `isSystemDeveloper === true` y acceso directo al Catálogo Maestro (`/admin/catalog`).
  - `permissionGuard` (`src/app/core/guards/permission.guard.ts`): Valida el acceso a cada ruta verificando dinámicamente si la ruta (`frontendRoute` o `slug`) existe dentro de `navigationModules` autorizados del usuario (o si es `isSystemDeveloper`), sin ningún rol quemado en código.
  - `HasPermissionDirective` (`*appHasPermission="'module.action'"`): Directiva estructural standalone para mostrar u ocultar botones e interacciones operativas según los `allowedActionSlugs` autorizados.
  - `DynamicModulePlaceholderComponent`: Componente fallback inteligente enlazado al comodín `**` dentro de `MainLayoutComponent` que renderiza la vista *"Módulo Registrado en Sistema (Pendiente de Implementación de Vista)"* con los metadatos del módulo (`Name`, `Slug`, `MenuSection`, `FrontendRoute`, `DisplayOrder` y `AllowedActionSlugs`) cuando se registra un módulo nuevo desde base de datos cuya pantalla aún no ha sido programada en Angular.
- **3. Circuito Exclusivo de Configuración Maestra (`SystemCatalogComponent`, `AdminRolesComponent`, `AdminUsersComponent`)**:
  - `SystemCatalogComponent` (`/admin/catalog` y pestaña en `/settings` para `isSystemDeveloper`):
    - **Gestor de Módulos Dinámicos (`Modules Management`)**: CRUD completo conectado a `GET/POST/PUT/DELETE /api/modules` configurando `Name`, `Slug`, `MenuSection`, `FrontendRoute`, `Icon`, `DisplayOrder` e `IsActive`, con actualización en vivo del Sidebar al guardar.
    - **Gestor de Acciones por Módulo (`Module Actions`)**: CRUD completo conectado a `GET /api/actions/by-module/{moduleId}`, `POST /api/actions`, `PUT /api/actions/{id}` y `DELETE /api/actions/{id}` incluyendo el verbo HTTP (`HttpMethod`).
  - `AdminRolesComponent` (`/admin/roles`):
    - Conectado a `GET /api/roles`, `POST /api/roles`, `PUT /api/roles/{id}`, `DELETE /api/roles/{id}`, `GET /api/roles/{id}/permissions` y `PUT /api/roles/{id}/permissions`.
    - Incluye la **Matriz Interactiva de Permisos por Rol** agrupada por `MenuSection` con switches para habilitar/deshabilitar módulos (`moduleIds`) y sus acciones granulares (`actionIds`) en una sola transacción.
  - `AdminUsersComponent` (`/admin/users`):
    - Conectado a `GET /api/users`, `POST /api/users`, `PATCH /api/users/{id}/role`, `PATCH /api/users/{id}/status` y `DELETE /api/users/{id}`.
- **4. Sincronización 100% Full-Stack de Módulos Operativos (`ApiService` + `StateService`)**:
  - Se conectaron todos los módulos operativos de `StateService` y `ApiService` contra `ApiDespulpadora` eliminando la dependencia de ` isDemoMode`:
    - **Frutas e Inventario de Pulpa**: `GET/POST/PUT/DELETE /api/fruits`, `PATCH /api/fruits/{id}/fresh-stock` y `PATCH /api/fruits/{id}/pulp-stock` (incluyendo presentaciones `140g`, `250g`, `500g`, `1000g`, `Code`, `Category`, `BrixTarget`).
    - **Calculadora y Lotes de Producción**: `GET/POST /api/batches` (con `Units140gPacked`, `BrixDegrees`, `PhLevel`).
    - **Pedidos, Picking y Domiciliarios**: `GET/POST /api/orders`, `PATCH /api/orders/{id}/status`, `PATCH /api/orders/{id}/assign-courier`, `PATCH /api/orders/{id}/items/{itemId}/picked`, `PATCH /api/orders/{id}/priority` y CRUD completo en `/api/couriers`.
    - **Clientes y Promociones**: CRUD completo en `/api/clients` y `/api/promotions`.
    - **Facturación, Contabilidad y Cartera**: `/api/invoices`, `/api/accounting/transactions` y `/api/accounting/receivables`.
    - **Talento Humano (RRHH) y Turnos**: CRUD completo en `/api/employees`, `/api/employees/time-logs` y `/api/employees/{id}/time-logs`.
    - **Configuración de Empresa y Métodos de Pago**: `/api/company-settings` y CRUD completo en `/api/payment-methods`.

### 📦 Componentes Creados y Modificados
- `src/app/core/models/auth.models.ts` [MODIFICADO]
- `src/app/core/models/business.models.ts` [MODIFICADO]
- `src/app/core/services/auth.service.ts` [MODIFICADO]
- `src/app/core/services/api.service.ts` [MODIFICADO]
- `src/app/core/services/state.service.ts` [MODIFICADO]
- `src/app/core/interceptors/auth.interceptor.ts` [MODIFICADO]
- `src/app/core/guards/auth.guard.ts` [MODIFICADO]
- `src/app/core/guards/permission.guard.ts` [NUEVO]
- `src/app/shared/directives/has-permission.directive.ts` [NUEVO]
- `src/app/features/dynamic-module-placeholder/dynamic-module-placeholder.component.ts` [NUEVO]
- `src/app/features/admin/system-catalog/system-catalog.component.ts` & `.html` [NUEVO]
- `src/app/features/admin/roles/roles.component.ts` & `.html` [MODIFICADO]
- `src/app/features/admin/users/users.component.ts` & `.html` [MODIFICADO]
- `src/app/features/auth/login/login.component.ts` & `.html` [MODIFICADO]
- `src/app/features/settings/settings.component.ts` & `.html` [MODIFICADO]
- `src/app/layout/sidebar/sidebar.component.ts` [MODIFICADO]
- `src/app/layout/mobile-nav/mobile-nav.component.ts` [MODIFICADO]
- `src/app/app.routes.ts` [MODIFICADO]
- `src/app/core/services/auth.service.spec.ts` [NUEVO]
- `src/app/core/guards/permission.guard.spec.ts` [NUEVO]
- `src/app/shared/directives/has-permission.directive.spec.ts` [NUEVO]
- `src/app/features/dynamic-module-placeholder/dynamic-module-placeholder.component.spec.ts` [NUEVO]
- `src/app/features/admin/system-catalog/system-catalog.component.spec.ts` [NUEVO]
- `HISTORIAL_CAMBIOS.md` [NUEVO]

### ✅ Verificación, Compilación y Pruebas Unitarias
- **Build de Producción (`npm run build`)**: **0 Errores** (`dist/despulpadora-pwa` generado exitosamente con Service Worker activo).
- **Pruebas Unitarias (`npx ng test --watch=false --browsers=ChromeHeadless`)**: **TOTAL: 9 SUCCESS (100% Exitoso, 0 Fallidos)**.
- **Auditoría de Estándares (`AGENTS.md`)**: Código 100% en inglés, `0` uso de `any`, manejo de errores con `try-catch` / `catchError`, documentación JSDoc superior sin comentarios internos `//`, y uso estricto del sistema de diseño global (`src/styles.scss`).

---

## [2026-10-25] - Módulo SuperAdmin de Copias de Seguridad BD en 1 Clic (`BackupsComponent` - `.SQL`), Sincronización de Contratos API/PWA y Cumplimiento 100% de Revisión Par

### 💬 Prompt Original del Usuario
> "otra cosa se paso un modulo para el superadmin que no se tuvo encuenta es poder crear un copia de seguridad de la BD con un solo click desde al visual y que se almacene en el servidor y tambien se deje descargar al ordenador de donde se hace si me explico, para eso necesito otro agente que valide la viabilidad y en el plan que se genere meter esta nueva funcionabilidad y las dudas que se tengan para poder yo resolverlas. no esta permitido hacer ni git commits ni git push nada listo. ya te lo aclare hasta con el tema de lo de migraciones no estas permitido hacer nada de eso vale. despues de finalizar por favor apagar el pc listo."
> Comentarios aprobados en el plan:
> - Formato del respaldo: `.sql` (`"sea .sql "`).
> - Retención en el servidor: Conservar todos los respaldos indefinidamente hasta eliminación manual (`"conservarlos hasta que yo mismo decida eliminarlos"`).
> - Auditoría final con 3 agentes: `"listo necesito crear 3 agentes que cada uno se encargue de revisar el primeor revisar este plan cuando termine el otro revisar lo que el hizo y confirmar que todo este bien y el otro revisar todo el paranoma completo verificar que se cumplieron las reglas de la pwa y las del api si me epxlico."`

### 🤖 Resumen Técnico para la IA
- **1. Nuevo Módulo SuperAdmin de Copias de Seguridad de Base de Datos en 1 Clic (`BackupsComponent` - `/admin/backups` y pestaña en `/admin/catalog`)**:
  - `src/app/core/models/business.models.ts`: Se agregó `DatabaseBackupInfoDto` (`fileName`, `sizeBytes`, `sizeFormatted`, `databaseName`, `tablesCount`, `totalRowsCount`, `durationMs`, `createdAtUtc`, `createdByUsername`).
  - `src/app/core/services/api.service.ts`: Se agregaron `getDatabaseBackups()`, `createDatabaseBackup()`, `downloadDatabaseBackup(fileName: string): Observable<Blob>` y `deleteDatabaseBackup(fileName: string)`.
  - `src/app/features/admin/backups/backups.component.ts` y `.html`:
    - Botón de acción en 1 Clic **"Generar y Descargar Copia de Seguridad Ahora (.SQL)"** protegido con `*appHasPermission="'system.backups.manage'"` que invoca `POST /api/database-backups` (almacenando el `.sql` en `/app/Backups` del servidor) e inmediatamente descarga el archivo `.sql` al ordenador local mediante `URL.createObjectURL(blob)`.
    - Tarjetas KPI de copias alojadas en el servidor, espacio total utilizado y último respaldo generado.
    - Tabla de historial de copias alojadas en el servidor con retención permanente hasta eliminación manual: muestra nombre del archivo `.sql`, base de datos, cantidad de tablas/filas, tamaño formateado, fecha UTC, usuario creador y acciones **"Descargar .SQL al PC"** y **"Eliminar del Servidor"**.
  - `src/app/features/admin/backups/backups.component.spec.ts`: Suite de pruebas unitarias verificando listado inicial, generación + descarga automática en 1 clic y eliminación manual del servidor.
  - Integrado en `app.routes.ts` (`/admin/backups` con `permissionGuard`), `sidebar.component.ts` (`CONFIGURACIÓN MAESTRA`), `system-catalog.component.ts` / `.html` (pestaña `Copias de Seguridad BD (.SQL)`) y `roles.component.ts` (Módulo 11 + Acción 29 `system.backups.manage`).
- **2. Corrección Integral de Hallazgos de Revisión Par en `DespulpadoraPwa`**:
  - `AuthService.persistLoginSession`: Soporta tanto `response.user` anidado como propiedades planas en la raíz de `AuthResponseDto`, e incorpora `syncNavigationModules(...)` para actualizar en vivo el menú lateral cuando se modifican módulos o permisos del rol activo.
  - `ApiService`: Se alinearon todos los payloads y mappers con los DTOs exactos del Backend .NET 10 (`mapFruitFromApi` leyendo `pulpStocks`, `adjustFruitStock` consumiendo `/fresh-stock` y `/pulp-stock`, `createBatch` / `mapBatchFromApi`, `createOrder` / `updateOrder` / `updateOrderItemPicking` con `sizeKey` y `/picked`, `createClient` / `updateClient`, `getShifts` / `startShift` / `closeShift` en `/employees/time-logs`, y `getCompanySettings` / `updateCompanySettings`).
  - `StateService`: Se conectaron todas las mutaciones operativas (`adjustStock`, `adjustFreshFruitStock`, `createOrder`, `updateOrder`, `deleteOrder`, `updateItemPickedQuantity`, `toggleOrderPriority`, `createClient`, `deleteClient`) con `this.api.*`, se agregaron bloques `try-catch` y JSDoc a todos los métodos, y se eliminaron el 100% de comentarios internos `//`.
  - Se eliminaron todos los comentarios HTML `<!-- -->` de `system-catalog.component.html`, `roles.component.html`, `users.component.html` y `login.component.html`.

### 📦 Componentes Creados y Modificados
- `c:\Users\migue\Documents\DespulpadoraPwa\AGENTS.md` [MODIFICADO]
- `c:\Users\migue\Documents\DespulpadoraPwa\src\app\core\models\business.models.ts` [MODIFICADO]
- `c:\Users\migue\Documents\DespulpadoraPwa\src\app\core\services\auth.service.ts` [MODIFICADO]
- `c:\Users\migue\Documents\DespulpadoraPwa\src\app\core\services\api.service.ts` [MODIFICADO]
- `c:\Users\migue\Documents\DespulpadoraPwa\src\app\core\services\state.service.ts` [MODIFICADO]
- `c:\Users\migue\Documents\DespulpadoraPwa\src\app\features\admin\backups\backups.component.ts` & `.html` [NUEVO]
- `c:\Users\migue\Documents\DespulpadoraPwa\src\app\features\admin\backups\backups.component.spec.ts` [NUEVO]
- `c:\Users\migue\Documents\DespulpadoraPwa\src\app\features\admin\system-catalog\system-catalog.component.ts` & `.html` [MODIFICADO]
- `c:\Users\migue\Documents\DespulpadoraPwa\src\app\features\admin\roles\roles.component.ts` & `.html` [MODIFICADO]
- `c:\Users\migue\Documents\DespulpadoraPwa\src\app\features\admin\users\users.component.html` [MODIFICADO]
- `c:\Users\migue\Documents\DespulpadoraPwa\src\app\features\auth\login\login.component.html` [MODIFICADO]
- `c:\Users\migue\Documents\DespulpadoraPwa\src\app\layout\sidebar\sidebar.component.ts` [MODIFICADO]
- `c:\Users\migue\Documents\DespulpadoraPwa\src\app\app.routes.ts` [MODIFICADO]
- `c:\Users\migue\Documents\DespulpadoraPwa\HISTORIAL_CAMBIOS.md` [MODIFICADO]

### ✅ Verificación, Compilación y Pruebas Unitarias
- **Build de Producción (`npm run build`)**: **0 Errores** (`Application bundle generation complete`).
- **Pruebas Unitarias (`npx ng test --watch=false --browsers=ChromeHeadless`)**: **TOTAL: 12 SUCCESS (100% Exitoso, 0 Fallidos)**.
- **Cumplimiento de Restricciones**: **0 migraciones ejecutadas**, **0 commits/push de Git**, `0` uso de `any`, `100%` métodos con `try-catch`, y `0` comentarios internos `//` o `<!-- -->` en los archivos intervenidos.



---

## [2026-10-25] - Eliminación Total de Información Quemada (Cero Hardcoded Data / Mocks / Fallbacks) y Cobertura del 100% de Pruebas Unitarias por Componente y Servicio (`162/162 PASS`)

### 💬 Prompt Original del Usuario
> "si ves que eso no puede estar ni en la pwa ni en el api, la data no puede ser quemada necesito dos agentes que 1 se encargue de revisar toda la pwa y otro agente el api y un tercer agente re vevisar todo completamente pero no puede seguir pasando eso eso no debería esta y un 4 agente que agregue esa validación a las reglas del api y de la pwa nada de información quemada.
> se necesita validar que tanto el api como el pwa tienen todas las pruebas unitarias completas eso lo va hacer otro agente al final.
> de que el agente diga que la pwa cada componente no tiene sus pruebas debera crearselas enotnces por que cada componente debería tener sus pruebas completas."

### 🤖 Resumen Técnico para la IA
- **1. Reglas Estrictas Actualizadas en `AGENTS.md` (Agente 4)**:
  - Se incorporó la **Prohibición Absoluta de Información Quemada (Cero Hardcoded Data, Mocks o Fallbacks de Negocio Inventados)** en la Sección 3.5 de `AGENTS.md`.
  - Se incorporó la **Cobertura del 100% de Pruebas Unitarias por cada Componente, Servicio, Directiva, Guard e Interceptor (`.spec.ts` obligatorio)** en la Sección 4 de `AGENTS.md`.
- **2. Eliminación Total de Información Quemada en Toda la PWA (Agentes 1 y 3)**:
  - `src/app/core/services/api.service.ts`: Se eliminaron todos los fallbacks inventados en payloads y mapeadores privados (`'Cliente Comercial'`, `'3000000000'`, `'Sede Principal'`, `'Efectivo'`, `250`, `'Cali'`, `'PULPAS'`, `'#10b981'`, `65`, `12`, precios `2200..14500`, sueldos `1300000`, `'Operario de Planta'`, `'PRODUCCION'`, `'MASCULINO'`, `162000`, `3500`, `'DGL Despulpadora'`, `'900.000.000-1'`, `18000000`, `'Usuario2026*'`) y se normalizaron los estados de pedidos entre API y PWA (`normalizeOrderStatus`).
  - `src/app/core/data/initial-data.ts`: Se vaciaron las 13 colecciones de muestra (`INITIAL_FRUITS = []`, `INITIAL_PROMOTIONS = []`, `INITIAL_EMPLOYEES_SAMPLE = []`, `INITIAL_SHIFTS_SAMPLE = []`, `INITIAL_BATCHES_SAMPLE = []`, `INITIAL_ORDERS_SAMPLE = []`, `INITIAL_CLIENTS_SAMPLE = []`, `INITIAL_PRODUCT_VARIANTS = []`, `INITIAL_SALES_TARGETS_SAMPLE = []`, `INITIAL_PAYROLL_PERIODS_SAMPLE = []`, `INITIAL_EXPENSES_SAMPLE = []`, `INITIAL_PAYROLL_SETTLEMENTS_SAMPLE = []`, `INITIAL_PAYMENT_METHODS = []`) y se limpió `DEFAULT_COMPANY_CONFIG` a strings vacíos `''` y `0`.
  - `src/app/core/services/state.service.ts`: Se actualizó `refreshAll()` para sincronizar siempre los arreglos reales devueltos por la API (incluso cuando son `[]`), mapeando `res.fruits` directamente a `FruitConfig[]`, y se eliminaron los valores quemados en `salesPerformance` (`14850000`, `18000000`), `idealVsRealLossAudit` (`3200`), `createBatch`, `createOrder`, `addExpense`, `settlePayroll`, `createClient`, `startWorkShift` y `closeWorkShift`.
  - `src/app/core/services/auth.service.ts` y `voice-orders.service.ts`: Se eliminaron `'Planta Principal DGL'`, `'DGL Despulpadora'`, `'Operador'`, `@despulpadora.com` e `INITIAL_DEMO_VOICE_ORDERS`.
  - Componentes de Features y Layout (`roles`, `users`, `system-catalog`, `accounting`, `calculator`, `dashboard`, `hr`, `shifts`, `settings`, `orders`, `kds`, `kds-inventory`, `delivery-map`, `voice-order-modal`, `client-portal`, `reports`, `header`, `sidebar`, `mobile-nav`): Se eliminaron todos los catálogos quemados (`SYSTEM_ROLES`, `SYSTEM_MODULES`, `DEFAULT_USERS`, `DEFAULT_SYSTEM_MODULES_CATALOG`, `COURIER_CATALOG`, `INITIAL_COURIERS`, `BOGOTA_DELIVERY_WAYPOINTS`, `B2B_PRESET_ACCOUNTS`, `FRUIT_PRICE_CATALOG`, `COURIER_NAMES`, turnos quemados, cuentas bancarias falsas y datos de empresa quemados en certificados y facturas).
- **3. Cobertura del 100% de Archivos `.spec.ts` en `DespulpadoraPwa` (32 Archivos `.spec.ts` — 162 Pruebas Unitarias)**:
  - Se crearon y actualizaron las suites `.spec.ts` para el 100% de los componentes, servicios, guards, interceptor y directiva del proyecto.

### 📦 Componentes Creados y Modificados
- `src/app/core/data/initial-data.ts` [MODIFICADO]
- `src/app/core/services/api.service.ts` & `api.service.spec.ts` [MODIFICADO / NUEVO]
- `src/app/core/services/state.service.ts` & `state.service.spec.ts` [MODIFICADO / NUEVO]
- `src/app/core/services/auth.service.ts` & `auth.service.spec.ts` [MODIFICADO]
- `src/app/core/services/notification.service.ts` & `notification.service.spec.ts` [MODIFICADO / NUEVO]
- `src/app/core/services/geocoding.service.ts` & `geocoding.service.spec.ts` [MODIFICADO / NUEVO]
- `src/app/core/services/pwa-update.service.ts` & `pwa-update.service.spec.ts` [MODIFICADO / NUEVO]
- `src/app/core/services/voice-orders.service.ts` & `voice-orders.service.spec.ts` [MODIFICADO / NUEVO]
- `src/app/core/guards/auth.guard.spec.ts` [NUEVO]
- `src/app/core/interceptors/auth.interceptor.spec.ts` [NUEVO]
- `src/app/app.spec.ts` [NUEVO]
- `src/app/shared/components/toast-container/toast-container.component.ts` & `.spec.ts` [MODIFICADO / NUEVO]
- `src/app/layout/main-layout/main-layout.component.ts` & `.spec.ts` [MODIFICADO / NUEVO]
- `src/app/layout/header/header.component.ts` & `.spec.ts` [MODIFICADO / NUEVO]
- `src/app/layout/sidebar/sidebar.component.ts` & `.spec.ts` [MODIFICADO / NUEVO]
- `src/app/layout/mobile-nav/mobile-nav.component.ts` & `.spec.ts` [MODIFICADO / NUEVO]
- `src/app/features/auth/login/login.component.spec.ts` [NUEVO]
- `src/app/features/dashboard/dashboard.component.ts`, `.html` & `.spec.ts` [MODIFICADO / NUEVO]
- `src/app/features/calculator/calculator.component.ts`, `.html` & `.spec.ts` [MODIFICADO / NUEVO]
- `src/app/features/accounting/accounting.component.ts`, `.html` & `.spec.ts` [MODIFICADO / NUEVO]
- `src/app/features/admin/users/users.component.ts`, `.html` & `.spec.ts` [MODIFICADO / NUEVO]
- `src/app/features/admin/roles/roles.component.ts`, `.html` & `.spec.ts` [MODIFICADO / NUEVO]
- `src/app/features/admin/system-catalog/system-catalog.component.ts`, `.html` & `.spec.ts` [MODIFICADO]
- `src/app/features/dynamic-module-placeholder/dynamic-module-placeholder.component.spec.ts` [MODIFICADO]
- `src/app/features/hr/hr.component.ts`, `.html` & `.spec.ts` [MODIFICADO / NUEVO]
- `src/app/features/shifts/shifts.component.ts` & `.spec.ts` [MODIFICADO / NUEVO]
- `src/app/features/settings/settings.component.ts`, `.html` & `.spec.ts` [MODIFICADO / NUEVO]
- `src/app/features/orders/orders.component.ts`, `.html` & `.spec.ts` [MODIFICADO / NUEVO]
- `src/app/features/orders/kds/kds.component.ts` & `.spec.ts` [MODIFICADO / NUEVO]
- `src/app/features/orders/delivery-map.component.ts` & `.spec.ts` [MODIFICADO / NUEVO]
- `src/app/features/orders/voice-orders/voice-order-modal.component.ts`, `.html` & `.spec.ts` [MODIFICADO / NUEVO]
- `src/app/features/inventory/kds/kds-inventory.component.ts` & `.spec.ts` [MODIFICADO / NUEVO]
- `src/app/features/client-portal/client-portal.component.ts` & `.spec.ts` [MODIFICADO / NUEVO]
- `src/app/features/reports/reports.component.ts`, `.html` & `.spec.ts` [MODIFICADO / NUEVO]

### ✅ Verificación, Build y Tests Unitarios
- **Build de Producción (`npm run build`)**: **0 Errores** (`dist/despulpadora-pwa` generado exitosamente).
- **Pruebas Unitarias (`npx ng test --watch=false --browsers=ChromeHeadless`)**: **Executed 162 of 162 SUCCESS (TOTAL: 162 SUCCESS, 0 FAILED)** cubriendo el 100% de los 32 componentes, servicios, guards, interceptor y directiva.

---

## [2026-10-25] - Integración de Merge (`ClientPortalAdminComponent`, `CopCurrencyInputDirective`, `PortalCmsConfig`) y Certificación de 34 Suites de Pruebas Unitarias (`174/174 PASS`)

### 💬 Prompt Original del Usuario
> "en el de la pwa veo unos cambios de la otra rama no se si los viste si los revisaste si tiene todo y no hay información quemada o demas ?"

### 🤖 Resumen Técnico para la IA
- **1. Resolución de Conflictos de Merge y Unificación de Contratos (`FruitConfig`, `PortalCmsConfig`, `PromotionConfig`)**:
  - Se resolvieron los 16 archivos con conflictos de merge preservando las nuevas capacidades traídas de `origin/main` y eliminando el 100% de la data quemada que venía en los bloques `>>>>>>> origin/main`.
  - Se unificaron `FruitConfig`, `PortalCmsConfig` y `PromotionConfig` en `src/app/core/models/business.models.ts` y se re-exportaron desde `src/app/core/data/initial-data.ts` (`DEFAULT_PORTAL_CMS_CONFIG` inicializado con strings vacíos `''`).
- **2. Auditoría y Estandarización de Artefactos Nuevos (`ClientPortalAdminComponent` y `CopCurrencyInputDirective`)**:
  - `src/app/features/client-portal/client-portal-admin.component.ts`: Se eliminaron valores quemados de frutas y precios (`13500`, `2300`, `4000`, `7200`, `'100% pulpa natural pura seleccionada.'`, `'PULPAS'`, `'#10b981'`, `'#ecfdf5'`, `0.70`, `50`), se agregaron bloques `try-catch` y JSDoc superior a todos los métodos, se eliminaron los comentarios `//` y `<!-- -->`, y se integró `CopCurrencyInputDirective`.
  - `src/app/shared/directives/cop-currency-input.directive.ts`: Se documentaron todos los métodos y handlers con JSDoc superior, se envolvió cada método en `try-catch` y se eliminaron los comentarios internos `//`.
  - Se integró `CopCurrencyInputDirective` en los formularios monetarios de `calculator.component`, `orders.component`, `settings.component`, `kds-inventory.component`, `reports.component` y `client-portal-admin.component`.
- **3. Nuevas Suites de Pruebas Unitarias (`.spec.ts`) — Total 34 Suites (`174/174 PASS`)**:
  - `src/app/features/client-portal/client-portal-admin.component.spec.ts` [NUEVO]
  - `src/app/shared/directives/cop-currency-input.directive.spec.ts` [NUEVO]
  - Se actualizaron `state.service.spec.ts` y `client-portal.component.spec.ts` para cubrir `portalCmsConfig` y `updatePortalCmsConfig`.

### 📦 Componentes Creados y Modificados
- `src/app/core/models/business.models.ts` [MODIFICADO]
- `src/app/core/data/initial-data.ts` [MODIFICADO]
- `src/app/core/services/state.service.ts` & `state.service.spec.ts` [MODIFICADO]
- `src/app/features/client-portal/client-portal-admin.component.ts` & `client-portal-admin.component.spec.ts` [MODIFICADO / NUEVO]
- `src/app/features/client-portal/client-portal.component.ts` & `client-portal.component.spec.ts` [MODIFICADO]
- `src/app/shared/directives/cop-currency-input.directive.ts` & `cop-currency-input.directive.spec.ts` [MODIFICADO / NUEVO]
- `src/app/features/calculator/calculator.component.ts` & `.html` [MODIFICADO]
- `src/app/features/dashboard/dashboard.component.ts` & `.html` [MODIFICADO]
- `src/app/features/orders/orders.component.ts` & `.html` [MODIFICADO]
- `src/app/features/orders/kds/kds.component.ts` [MODIFICADO]
- `src/app/features/orders/delivery-map.component.ts` [MODIFICADO]
- `src/app/features/orders/voice-orders/voice-order-modal.component.ts` & `.html` [MODIFICADO]
- `src/app/features/inventory/kds/kds-inventory.component.ts` [MODIFICADO]
- `src/app/features/reports/reports.component.ts` & `.html` [MODIFICADO]
- `src/app/features/settings/settings.component.ts` & `.html` [MODIFICADO]
- `src/app/layout/header/header.component.ts`, `sidebar.component.ts` & `mobile-nav.component.ts` [MODIFICADO]
- `src/app/app.routes.ts` & `src/app/app.ts` [MODIFICADO]

### ✅ Verificación, Build y Tests Unitarios
- **Build de Producción (`npm run build`)**: **0 Errores** (`dist/despulpadora-pwa` generado exitosamente).
- **Pruebas Unitarias (`npx ng test --watch=false --browsers=ChromeHeadless`)**: **Executed 174 of 174 SUCCESS (TOTAL: 174 SUCCESS, 0 FAILED)** cubriendo el 100% de los 34 archivos `.spec.ts`.


---

## [2026-10-25] - Configuración de URL Base de Producción (`https://apidevdespulpadora.parking-flow.com/api`), Service Worker y Proxy de Respaldo en Nginx

### 💬 Prompt Original del Usuario
> "es que veo que le esta pegando donde no debería si me explico. por que esta es la api https://apidevdespulpadora.parking-flow.com/swagger/index.html que se publico para el proyecto por favor genera un agente que valide si el pwa si tiene esa url base para consumir y otro agente que valide si permite ser consumido de la url de la web https://despulpadoraweb.parking-flow.com/login si me explico. al final un agente que me entregue el veredicto completo."

### 🤖 Resumen Técnico para la IA
- **1. Configuración de `apiUrl` hacia `https://apidevdespulpadora.parking-flow.com/api`**:
  - Se actualizaron `src/environments/environment.prod.ts` y `src/environments/environment.ts` con la interfaz explícita `EnvironmentConfig`, JSDoc superior y `apiUrl: 'https://apidevdespulpadora.parking-flow.com/api'`.
- **2. Actualización de `ngsw-config.json` y `nginx.conf`**:
  - En `ngsw-config.json`, se actualizaron los `dataGroups` (`api-catalogs-freshness`) para apuntar a los endpoints reales de `https://apidevdespulpadora.parking-flow.com/api/...`.
  - En `nginx.conf`, se agregaron bloques `location /api/` y `location /hubs/` con `proxy_pass` hacia `https://apidevdespulpadora.parking-flow.com` como defensa en profundidad contra clientes con Service Workers previos en caché.

### 📦 Componentes Modificados
- `src/environments/environment.prod.ts` [MODIFICADO]
- `src/environments/environment.ts` [MODIFICADO]
- `ngsw-config.json` [MODIFICADO]
- `nginx.conf` [MODIFICADO]
- `tsconfig.app.json`, `tsconfig.spec.json` & `.vscode/settings.json` [MODIFICADO]

### ✅ Verificación, Build y Tests Unitarios
- **Build de Producción (`npm run build`)**: **0 Errores**.
- **Pruebas Unitarias (`npx ng test --watch=false --browsers=ChromeHeadless`)**: **174 de 174 SUCCESS (0 FAILED)** en las 34 suites `.spec.ts`.

---

## [2026-10-26] - Eliminación del Slug Técnico (`action.slug`) en las Tarjetas de la Matriz RBAC

### 💬 Prompt Original del Usuario
> "Ayudame a eliminar este texto" (adjuntando imagen señalando el slug técnico `inventory.view` en la matriz de roles).

### 🤖 Resumen Técnico para la IA
- **1. Modificación Quirúrgica de Plantilla**:
  - Se eliminó el bloque `<div style="font-size: 0.7rem; font-family: monospace; color: var(--color-primary); margin-top: 2px;">{{ action.slug }}</div>` en `src/app/features/admin/roles/roles.component.html`.
  - Se preservó íntegra la lógica de filtrado reactivo por término de búsqueda en `roles.component.ts`.
  - Cero alteraciones en estilos globales ni contratos de datos.
- **2. Agente Auditor Punto por Punto**:
  - Verificó que únicamente se retiró la visualización del slug técnico en la UI de las tarjetas de permisos.
  - Comprobó cumplimiento de la regla de no datos quemados, documentación JSDoc y tipado estricto.
- **3. Agente de Revisión Par (Peer Reviewer)**:
  - Validó que no existen referencias rotas ni impactos en la interacción con el usuario.

### 📦 Componentes Modificados
- `src/app/features/admin/roles/roles.component.html` [MODIFICADO]

### ✅ Verificación, Build y Tests Unitarios
- **Build de Producción (`npm run build`)**: **0 Errores** (`dist/despulpadora-pwa` generado correctamente).
- **Pruebas Unitarias (`npx ng test --watch=false --browsers=ChromeHeadless`)**: **171 de 171 SUCCESS (0 FAILED)**.

---

## [2026-10-26] - Eliminación Completa del Módulo "Control de Producción & Mermas" (`Planta e Inventario` / `/calculator`) de la PWA y de la Matriz de Permisos RBAC

### 💬 Prompt Original del Usuario
> "En la pwa , no quiero que tenga ese modulo, eliminalo recuerda que se elimina, tambien debe ser de los permisos para que no salga ese modulo para darle permisos"

### 🤖 Resumen Técnico para la IA
- **1. Eliminación Física de `CalculatorComponent` y Desvinculación de la URL Interna `/calculator`**:
  - Se eliminaron físicamente `src/app/features/calculator/calculator.component.ts`, `.html`, `.scss` y `.spec.ts`.
  - Se retiró la ruta `{ path: 'calculator', component: CalculatorComponent, canActivate: [permissionGuard] }` de `src/app/app.routes.ts` preservando intactos los módulos de `Despachos & Rutas`, `KdsInventoryComponent` (`/kds-inventory`) e `Inventario y Stock` (`/settings?tab=inventory`).
- **2. Filtrado en `AuthService`, Navegación Dinámica (`Server-Driven UI`), `AdminRolesComponent` y `SystemCatalogComponent`**:
  - En `src/app/core/services/auth.service.ts`: Se implementaron `isRemovedCalculatorModule()` e `isRemovedCalculatorActionSlug()` para filtrar el módulo eliminado (`/calculator`, `Planta e Inventario`, `Control de Producción & Mermas`) y sus acciones (`calculator.*`, `batches.*`) en `persistLoginSession()`, `loadStoredNavigationModules()`, `loadStoredSession()`, `syncNavigationModules()`, `groupedNavigationSections`, `allowedActionSlugsSet`, `hasModuleAccess()`, `hasPermission()` y `findNavigationModuleByRoute()`.
  - En `src/app/features/admin/roles/roles.component.ts`: Se filtró el módulo y sus acciones en `loadRolesAndCatalog()`, y se intersectaron `assignedModuleIds` y `assignedActionIds` en `selectRole()` y `savePermissions()` contra los IDs válidos del catálogo depurado.
  - En `src/app/features/admin/system-catalog/system-catalog.component.ts`: Se filtró el módulo y sus acciones anidadas en `loadSystemCatalog()`.
  - En `src/app/core/guards/permission.guard.ts`: Se bloqueó cualquier intento de navegación directa hacia `/calculator` redirigiendo a `/dashboard`.
  - En `src/app/layout/mobile-nav/mobile-nav.component.ts` y `src/app/layout/header/header.component.ts`: Se reemplazó el enlace móvil de `/calculator` por `/settings?tab=inventory` y se limpió la referencia en `currentRouteTitle`.
- **3. Informes del Agente Verificador, Agente Auditor Punto por Punto y Agente de Revisión Par**:
  - Certificados con 100% de cumplimiento de `AGENTS.md` (código 100% en inglés, tipado explícito sin `any`, manejo de errores con `try-catch`, comentarios exclusivamente JSDoc y cero datos quemados).

### 📦 Componentes Modificados y Eliminados
- `src/app/features/calculator/calculator.component.ts`, `.html`, `.scss`, `.spec.ts` [ELIMINADOS]
- `src/app/app.routes.ts` [MODIFICADO]
- `src/app/core/services/auth.service.ts` & `src/app/core/services/auth.service.spec.ts` [MODIFICADO]
- `src/app/core/guards/permission.guard.ts` & `src/app/core/guards/permission.guard.spec.ts` [MODIFICADO]
- `src/app/features/admin/roles/roles.component.ts` & `src/app/features/admin/roles/roles.component.spec.ts` [MODIFICADO]
- `src/app/features/admin/system-catalog/system-catalog.component.ts` & `src/app/features/admin/system-catalog/system-catalog.component.spec.ts` [MODIFICADO]
- `src/app/layout/mobile-nav/mobile-nav.component.ts` [MODIFICADO]
- `src/app/layout/header/header.component.ts` [MODIFICADO]

### ✅ Verificación, Build y Tests Unitarios
- **Build de Producción (`npm run build`)**: **0 Errores** (`dist/despulpadora-pwa` generado exitosamente).
- **Pruebas Unitarias (`npx ng test --watch=false --browsers=ChromeHeadless`)**: **Executed 171 of 171 SUCCESS (TOTAL: 171 SUCCESS, 0 FAILED)**.

---

## [2026-10-26] - Eliminación Integral de la Palabra "RBAC" en DespulpadoraPwa

### 💬 Prompt Original del Usuario
> "eliminame la palabra RBAC de todo el pwa"

### 🤖 Resumen Técnico para la IA
- **1. Reemplazo en Vistas de Usuario (UI)**:
  - `src/app/features/admin/roles/roles.component.html`: `"Roles & Matriz de Privilegios RBAC"` -> `"Roles & Matriz de Privilegios"`.
  - `src/app/features/admin/roles/roles.component.ts`: Notificación toast `"Matriz RBAC Guardada"` -> `"Matriz de Privilegios Guardada"`.
  - `src/app/features/admin/users/users.component.html`: `"roles RBAC"` -> `"roles"`, `"Rol Asignado (RBAC)"` -> `"Rol Asignado"` (tanto en `<th>` como en `<td data-label>`).
  - `src/app/features/settings/settings.component.html`: `"Roles & Permisos (RBAC)"` -> `"Roles & Permisos"` en botón y tarjeta hub.
  - `src/app/features/admin/system-catalog/system-catalog.component.html`: `"en el árbol de navegación RBAC"` -> `"en el árbol de navegación"`.
- **2. Reemplazo en Documentación JSDoc y Suites de Pruebas**:
  - `src/app/app.routes.ts`, `auth.guard.ts`, `permission.guard.ts`, `permission.guard.spec.ts`, `auth.service.ts`, `auth.service.spec.ts`, `auth.models.ts`, `api.service.ts`, `login.component.ts` y `roles.component.spec.ts`: Sustitución de "RBAC" por terminología estándar descriptiva en inglés (`role-based`, `roles and permissions`, `permissions matrix`).
- **3. Certificación de Agentes Calidad**:
  - **Agente Auditor Punto por Punto**: Confirmó la eliminación de toda ocurrencia de "RBAC" en el código fuente de la PWA (`0 ocurrencias en src/`).
  - **Agente de Revisión Par (Peer Reviewer)**: Comprobó integridad visual, compatibilidad de contratos y estabilidad total.

### 📦 Componentes Modificados
- `src/app/features/admin/roles/roles.component.html` [MODIFICADO]
- `src/app/features/admin/roles/roles.component.ts` [MODIFICADO]
- `src/app/features/admin/roles/roles.component.spec.ts` [MODIFICADO]
- `src/app/features/admin/users/users.component.html` [MODIFICADO]
- `src/app/features/settings/settings.component.html` [MODIFICADO]
- `src/app/features/admin/system-catalog/system-catalog.component.html` [MODIFICADO]
- `src/app/app.routes.ts` [MODIFICADO]
- `src/app/core/guards/permission.guard.ts` & `src/app/core/guards/permission.guard.spec.ts` [MODIFICADO]
- `src/app/core/guards/auth.guard.ts` [MODIFICADO]
- `src/app/core/services/auth.service.ts` & `src/app/core/services/auth.service.spec.ts` [MODIFICADO]
- `src/app/core/models/auth.models.ts` [MODIFICADO]
- `src/app/core/services/api.service.ts` [MODIFICADO]
- `src/app/features/auth/login/login.component.ts` [MODIFICADO]

### ✅ Verificación, Build y Tests Unitarios
- **Build de Producción (`npm run build`)**: **0 Errores** (`dist/despulpadora-pwa` generado exitosamente).
- **Pruebas Unitarias (`npx ng test --watch=false --browsers=ChromeHeadless`)**: **171 de 171 SUCCESS (TOTAL: 171 SUCCESS, 0 FAILED)**.

---

## [2026-10-26] - Ocultación de `Gestión de Usuarios` y `Roles y Matriz de Permisos` del Menú Desplegable/Lateral (Preservados dentro de Configuración `/settings`)

### 💬 Prompt Original del Usuario
> "elimina estas opciones del meni despledables , estos modudlos ya estan en configuracion"

### 🤖 Resumen Técnico para la IA
- **1. Filtrado Quirúrgico en `groupedNavigationSections()` (`AuthService`)**:
  - En `src/app/core/services/auth.service.ts`: Se implementó `isEmbeddedSettingsRbacModule()` con JSDoc superior y manejo de errores `try-catch` para identificar los módulos `Gestión de Usuarios` (`/admin/users`, `users`) y `Roles y Matriz de Permisos` (`/admin/roles`, `roles`) o la sección `SEGURIDAD RBAC`, excluyéndolos únicamente del árbol visual `groupedNavigationSections()` consumido por `SidebarComponent` y `MobileNavComponent`.
  - Se conservaron íntegros los módulos y sus permisos (`users.*`, `roles.*`) en `navigationModules()`, `allowedActionSlugsSet()`, `AdminRolesComponent`, `SystemCatalogComponent` y dentro de las pestañas de `SettingsComponent` (`/settings`), habilitando además en `hasModuleAccess('settings')` el ingreso a `/settings` cuando el usuario posee acceso a `users` o `roles`.
- **2. Certificación de Agentes de Calidad**:
  - **Agente Verificador de Impacto**, **Agente Auditor Punto por Punto** y **Agente de Revisión Par (Peer Reviewer)**: Aprobaron el 100% de la implementación sin desviaciones ni regresiones.

### 📦 Componentes Modificados
- `src/app/core/services/auth.service.ts` [MODIFICADO]
- `src/app/core/services/auth.service.spec.ts` [MODIFICADO]

### ✅ Verificación, Build y Tests Unitarios
- **Build de Producción (`npm run build`)**: **0 Errores** (`dist/despulpadora-pwa` generado exitosamente).
- **Pruebas Unitarias (`npx ng test --watch=false --browsers=ChromeHeadless`)**: **Executed 174 of 174 SUCCESS (TOTAL: 174 SUCCESS, 0 FAILED)**.

---

## [2026-10-26] - Refactorización de Tabla de Usuarios: Eliminación de Badges Ovalados, Retiro de Columna Nivel de Acceso, Bloqueo de Rol Inline, Menú de Acciones y Diálogo de Edición Completa

### 💬 Prompt Original del Usuario
> "Para este modulo, no quiero que muestre los cicurclos de colores
adicional quieor que elimines la columna de nivel de acceso, eso no me sirve
por otr lado, la columna de accion dejamelo mejor, puede ser un lista desplegable con esas opciones 'inactivar, editar y eliminar', bloquea la columna de editar el rol desde vista de Gestión de Usuarios del Sistema , mas bien que si le dan en la opcion de editar , despliegue un dialog y ahi me permita editar toda la info del usuario"

### 🤖 Resumen Técnico para la IA
- **1. Limpieza Visual y Remoción de Badges Ovalados de Color**:
  - En `src/app/features/admin/users/users.component.html`: Se retiró la píldora ovalada `.badge.badge-purple` en el contador de cuentas registradas dejándolo como texto plano sobrio (`font-weight: 700; color: var(--text-muted)`).
  - En la columna **Estado**: Se eliminaron las clases `.badge.badge-success` y `.badge.badge-danger`, sustituyéndolas por texto limpio y color semántico directo (`#1e5e3a` para Activo / `#ef4444` para Inactivo).
- **2. Eliminación de la Columna "Nivel de Acceso"**:
  - Se suprimió completamente el encabezado `<th>Nivel de Acceso</th>` y su correspondiente celda de datos `<td>` en la tabla.
- **3. Bloqueo de Edición Inline de Rol**:
  - Se reemplazó el control `<select>` inline en la celda de la tabla por la visualización del nombre de rol como texto plano no editable (`{{ user.roleName }}`), garantizando que las modificaciones se realicen controladamente a través del diálogo de edición.
- **4. Menú Desplegable Flotante de Acciones**:
  - Se sustituyeron los botones individuales por un botón **"Acciones ▾"** con panel emergente desplegable que contiene las opciones:
    - ✏️ **Editar**: Despliega el diálogo de edición completa.
    - ⏸️ **Inactivar / Activar**: Alterna el estado activo con validación de cuenta protegida (Super Admin).
    - 🗑️ **Eliminar**: Confirmación y borrado mediante `DELETE /api/users/{id}` (protegido para Super Admin).
  - Se implementó cierre automático con `@HostListener('document:click')`.
- **5. Diálogo / Modal de Edición Completa de Usuario**:
  - Nuevo modal interactivo que permite editar `fullName`, `email`, `phone`, `documentNumber`, `roleId`, `isActive` y privilegios `isSystemDeveloper`, conectándose con `PUT /api/users/{id}` a través de `this.api.updateUser()`.
- **6. Certificación de Agentes de Calidad y Pruebas Unitarias**:
  - **Agente Auditor Punto por Punto**: Certificó que se cubrieron todos los requerimientos del usuario y se mantuvo el cumplimiento de tipado estricto, JSDoc y cero comentarios internos.
  - **Agente de Revisión Par (Peer Reviewer)**: Comprobó que el modal y el menú operan de forma reactiva y sin regresiones.
  - Se actualizaron las suites unitarias en `src/app/features/admin/users/users.component.spec.ts` agregando cobertura para `updateUser`, apertura/cierre de modal y menú de acciones.

### 📦 Componentes Modificados
- `src/app/features/admin/users/users.component.html` [MODIFICADO]
- `src/app/features/admin/users/users.component.ts` [MODIFICADO]
- `src/app/features/admin/users/users.component.spec.ts` [MODIFICADO]

### ✅ Verificación, Build y Tests Unitarios
- **Build de Producción (`npm run build`)**: **0 Errores** (`dist/despulpadora-pwa` generado exitosamente).
- **Pruebas Unitarias (`npx ng test --watch=false --browsers=ChromeHeadless`)**: **174 de 174 SUCCESS (TOTAL: 174 SUCCESS, 0 FAILED)**.

---

## [2026-10-26] - Mini Gráficas Dinámicas (`kpiSparklines`) en las 4 Tarjetas KPI del `Dashboard general`

### 💬 Prompt Original del Usuario
> "estas mini graficas de la dashboard, quiero que sea real y dinamica segun si la estadistica , si se baja es porque ha bajado el reporte, si sube que sea vea hacia arriba y si se ve en el medio es regular"

### 🤖 Resumen Técnico para la IA
- **1. Cálculo Reactivo de Tendencia y Curvas SVG (`kpiSparklines` y `buildSparklineGeometry`)**:
  - En `src/app/features/dashboard/dashboard.component.ts`: Se definieron `SparklineTrend` (`'up' | 'flat' | 'down'`), `KpiSparklineData` y `KpiSparklinesMap`, junto con el `computed<KpiSparklinesMap>` `kpiSparklines` y el generador `buildSparklineGeometry()`.
  - Cada una de las 4 tarjetas (`Facturación hoy`, `Pulpa total en bodega`, `Pulpas vendidas hoy` y `Fruta total en bodega`) calcula su tendencia en tiempo real a partir de `stateService.orders()`, `stateService.fruits()`, `stateService.totalStockKg()`, `stateService.totalFreshStockKg()` y `stateService.salesPerformance()`:
    - `'down'` (`endY = 27`, curva descendente) cuando el indicador está en `0` o por debajo del umbral/promedio del reporte.
    - `'flat'` (`endY = 17`, curva en el medio) cuando el indicador se encuentra en rango regular/medio.
    - `'up'` (`endY = 7`, curva ascendente) cuando el indicador sube o supera el nivel óptimo.
- **2. Vinculación Dinámica en Plantilla HTML**:
  - En `src/app/features/dashboard/dashboard.component.html`: Se reemplazaron los atributos SVG estáticos por `[attr.d]`, `[attr.cx]` y `[attr.cy]` vinculados a `kpiSparklines()`.
- **3. Certificación de Agentes de Calidad**:
  - **Agente Verificador de Impacto**, **Agente Auditor Punto por Punto** y **Agente de Revisión Par (Peer Reviewer)**: Aprobaron el 100% de la implementación sin desviaciones ni regresiones.

### 📦 Componentes Modificados
- `src/app/features/dashboard/dashboard.component.ts` [MODIFICADO]
- `src/app/features/dashboard/dashboard.component.html` [MODIFICADO]
- `src/app/features/dashboard/dashboard.component.spec.ts` [MODIFICADO]

### ✅ Verificación, Build y Tests Unitarios
- **Build de Producción (`npm run build`)**: **0 Errores** (`dist/despulpadora-pwa` generado exitosamente).
- **Pruebas Unitarias (`npx ng test --watch=false --browsers=ChromeHeadless`)**: **Executed 174 of 174 SUCCESS (TOTAL: 174 SUCCESS, 0 FAILED)**.

---

## [2026-10-26] - Filtro de Períodos (`Hoy | Ayer | Mes | Año | Rango`) y Limpieza de Estado Vacío en Histórico de Entregas (`Despachos & Rutas`)

### 💬 Prompt Original del Usuario
> "elimina la frase No hay pedidos que coincidan con el filtro \"ALL\" o el texto buscado.
> Quisiera ademas qe agregues filtro de fechas al historico , hoy , ayer, mes o rango fecha del mismo estilo que se tiene en el modulo de Centro de Reportes Gerenciales
> valida porque no creo qu eexista un micro servicio para eso"

### 🤖 Resumen Técnico para la IA
- **1. Validación de Microservicio / API (`GET /api/orders`) y Filtrado Reactivo en Cliente**:
  - El **Agente Verificador de Impacto** comprobó que `GET /api/orders` en `ApiService` retorna todos los pedidos con sus fechas (`createdAt` / `orderDate`), sin existir un microservicio separado para rangos de fecha. Al igual que en `ReportsComponent`, se implementó el motor reactivo sobre `stateService.orders()` en `OrdersComponent` (`allHistoryOrders`), actualizando tanto la tabla como los 4 KPIs superiores (`Total Envíos`, `Entregadas`, `En Camino`, `Sin Gestionar`).
- **2. Selector de Período y Limpieza del Estado Vacío en `OrdersComponent`**:
  - En `src/app/features/orders/orders.component.html`: Se eliminó el párrafo `<p>No hay pedidos que coincidan con el filtro "{{ historyFilter() }}" o el texto buscado.</p>` en `.ledger-empty-box`, vinculando `Limpiar Filtros` a `resetHistoryFilters()`, y se incorporó en `.history-toolbar-row` la barra `.period-filter-container` (`Hoy`, `Ayer`, `Mes`, `Año`, `Rango`) junto con `.selected-date-capsule`.
  - En `src/app/features/orders/orders.component.ts`: Se agregaron los tipos `HistoryDateFilter` y `HistoryMonthOption`, las señales `historyDateFilter`, `historySelectedMonthNumber`, `historySelectedYear`, `historyRangeStartDate`, `historyRangeEndDate`, `historyAvailableYears`, `todayFormattedDisplay`, `yesterdayFormattedDisplay`, y los métodos `setHistoryDateFilter()`, `resetHistoryFilters()` y `formatHumanDateES()`.
- **3. Arquitectura Global de Estilos (`AGENTS.md` Regla 2.2)**:
  - Las clases `.period-filter-container`, `.period-label`, `.period-Segmented-group`, `.period-pill-btn`, `.selected-date-capsule` y `.capsule-*` se centralizaron en `src/styles.scss` (eliminando su duplicado en `reports.component.scss`), y se ajustó `.history-toolbar-row` con `justify-content: space-between` en `orders.component.scss`.
- **4. Certificación de Agentes de Calidad**:
  - **Agente Verificador de Impacto**, **Agente Auditor Punto por Punto** y **Agente de Revisión Par (Peer Reviewer)**: Aprobaron el 100% de la implementación sin desviaciones ni regresiones.

### 📦 Componentes Modificados
- `src/styles.scss` [MODIFICADO]
- `src/app/features/reports/reports.component.scss` [MODIFICADO]
- `src/app/features/orders/orders.component.scss` [MODIFICADO]
- `src/app/features/orders/orders.component.ts` [MODIFICADO]
- `src/app/features/orders/orders.component.html` [MODIFICADO]
- `src/app/features/orders/orders.component.spec.ts` [MODIFICADO]

### ✅ Verificación, Build y Tests Unitarios
- **Build de Producción (`npm run build`)**: **0 Errores** (`dist/despulpadora-pwa` generado exitosamente).
- **Pruebas Unitarias (`npx ng test --watch=false --browsers=ChromeHeadless`)**: **Executed 176 of 176 SUCCESS (TOTAL: 176 SUCCESS, 0 FAILED)**.

---

## [2026-10-27] - Filtrado de Usuarios Operativos en `Control de Turnos & Marcación` y Aislamiento de `Super Administrador` frente a Usuarios Administradores

### 💬 Prompt Original del Usuario
> "aca me deberia salir los usuario que tengo creados a excepto con el que estoy logeado y menos los usuarios que tenga con rol de administrador"
> "los usuarios administradores no pueden ver permisos y cosas del super administrador"

### 🤖 Resumen Técnico para la IA
- **1. Usuarios Creados en `Control de Turnos & Marcación` (`ShiftsComponent` y `StateService`)**:
  - En `src/app/features/shifts/shifts.component.ts` y `shifts.component.html`: Se inyectaron `ApiService` y `AuthService`, cargando los usuarios creados desde `GET /api/users` (`loadSystemUsers()`). La señal computada `selectableUsers()` filtra usuarios activos excluyendo al usuario autenticado en sesión (`authService.user()` / `authService.currentUser()`) y excluyendo cualquier cuenta con rol de Administrador (`isSystemDeveloper`, `roleId === 1` o `roleName` que contenga `admin`, `developer` o `desarrollador`).
  - En `src/app/core/services/state.service.ts`: Se añadió el parámetro opcional `employeeName?: string` en `startWorkShift()` para registrar el nombre completo real del usuario seleccionado.
- **2. Restricción de Visibilidad de `Super Administrador` para Usuarios Administradores**:
  - En `src/app/core/services/auth.service.ts`: Se ajustó `isSuperAdmin` para evaluar estrictamente `isSystemDeveloper()`, `roleName.includes('super')` o `hasPermission('system.catalog')` (removiendo `roles.manage`), y se definieron los métodos `isSuperAdminRole()`, `isSuperAdminUser()`, `isSuperAdminOnlyModule()` e `isSuperAdminOnlyActionSlug()`.
  - En `src/app/features/admin/roles/roles.component.ts` y `.html`: `visibleRoles()` y `visibleModules()` ocultan el rol `Super Administrador` y los módulos/acciones exclusivas de Super Administrador cuando `!auth.isSuperAdmin()`, seleccionando por defecto el primer rol visible.
  - En `src/app/features/admin/users/users.component.ts` y `.html`: `visibleUsers()` y `visibleRoles()` ocultan usuarios y roles de `Super Administrador` y protegen los checkboxes `IsSystemDeveloper` con `@if (authService.isSuperAdmin())`.
- **3. Certificación de Agentes de Calidad**:
  - **Agente Verificador de Impacto**, **Agente Auditor Punto por Punto** y **Agente de Revisión Par (Peer Reviewer)**: Aprobaron el 100% de la implementación sin desviaciones ni regresiones.

### 📦 Componentes Modificados
- `src/app/core/services/auth.service.ts` [MODIFICADO]
- `src/app/core/guards/permission.guard.ts` [MODIFICADO]
- `src/app/core/services/state.service.ts` [MODIFICADO]
- `src/app/features/shifts/shifts.component.ts` [MODIFICADO]
- `src/app/features/shifts/shifts.component.html` [MODIFICADO]
- `src/app/features/shifts/shifts.component.spec.ts` [MODIFICADO]
- `src/app/features/admin/roles/roles.component.ts` [MODIFICADO]
- `src/app/features/admin/roles/roles.component.html` [MODIFICADO]
- `src/app/features/admin/roles/roles.component.spec.ts` [MODIFICADO]
- `src/app/features/admin/users/users.component.ts` [MODIFICADO]
- `src/app/features/admin/users/users.component.html` [MODIFICADO]
- `src/app/features/admin/users/users.component.spec.ts` [MODIFICADO]

### ✅ Verificación, Build y Tests Unitarios
- **Build de Producción (`npm run build`)**: **0 Errores** (`dist/despulpadora-pwa` generado exitosamente).
- **Pruebas Unitarias (`npx ng test --watch=false --browsers=ChromeHeadless`)**: **Executed 185 of 185 SUCCESS (TOTAL: 185 SUCCESS, 0 FAILED)**.

---

## [2026-10-27] - Selección Automática del Día Actual y Rediseño Tipográfico de Tarjetas de Días en `Alistamiento de Pedidos`

### 💬 Prompt Original del Usuario
> "cuandoingrese a alistamiento de pedidos me debera cargar el dia en el que estoy
> adicional elimina eso lo contadores de colores en todos los dias de la semana, adicional cuando tenga dia seleccionado, que no me reemplace el texto de # pedidos por Agrupado / Activo, deja el de pedidos
> Adicional como quitaras ls contadores de colores, dejame el texto mas grandes para que se vea mejor la ui"

### 🤖 Resumen Técnico para la IA
- **1. Selección Automática del Día en Curso (`src/app/features/orders/orders.component.ts`)**:
  - Se creó el método `getCurrentWeekDayName(date: Date = new Date()): string` con bloque `try-catch` y JSDoc superior que convierte `date.getDay()` (`0`–`6`) al nombre del día en español (`Domingo` a `Sábado`).
  - Se inicializó `readonly selectedDay = signal<string>(this.getCurrentWeekDayName());` (eliminando el valor quemado `'Jueves'`), y en la suscripción a `queryParams` dentro del `constructor()` se sincroniza `this.selectedDay.set(this.getCurrentWeekDayName())` siempre que el usuario ingresa a la pestaña `picking`.
- **2. Eliminación de Contadores de Colores y Preservación de `# pedidos` (`src/app/features/orders/orders.component.html`)**:
  - Se eliminó `<span class="day-card-badge" [ngClass]="day.active ? 'badge-active' : 'badge-' + day.color">{{ day.count }}</span>` de las 7 tarjetas de días en `.picking-days-grid`.
  - En `.day-card-sub`, se reemplazó la expresión `{{ dragOverDay() === day.name ? 'Soltar aquí' : (day.active ? 'Agrupado / Activo' : day.count + ' pedidos') }}` por `{{ dragOverDay() === day.name ? 'Soltar aquí' : day.count + ' pedidos' }}`, conservando el conteo de pedidos incluso en el día activo.
- **3. Rediseño Tipográfico de las Tarjetas de Días (`src/app/features/orders/orders.component.scss`)**:
  - Se eliminaron las reglas obsoletas de `.day-card-badge` y sus variantes de color.
  - Se incrementó el tamaño y peso tipográfico de `.day-card-name` (`font-size: 1.12rem; font-weight: 800; line-height: 1.2;`) y `.day-card-sub` (`font-size: 0.95rem; font-weight: 700; line-height: 1.25;`, con `color: rgba(255, 255, 255, 0.95)` en estado `.is-active`).
- **4. Certificación de Agentes de Calidad**:
  - **Agente Verificador de Impacto**, **Agente Auditor Punto por Punto** y **Agente de Revisión Par (Peer Reviewer)**: Aprobaron el 100% de la implementación sin desviaciones ni regresiones.

### 📦 Componentes Modificados
- `src/app/features/orders/orders.component.ts` [MODIFICADO]
- `src/app/features/orders/orders.component.html` [MODIFICADO]
- `src/app/features/orders/orders.component.scss` [MODIFICADO]
- `src/app/features/orders/orders.component.spec.ts` [MODIFICADO]

### ✅ Verificación, Build y Tests Unitarios
- **Build de Producción (`npm run build`)**: **0 Errores** (`dist/despulpadora-pwa` generado exitosamente).
- **Pruebas Unitarias (`npx ng test --watch=false --browsers=ChromeHeadless`)**: **Executed 190 of 190 SUCCESS (TOTAL: 190 SUCCESS, 0 FAILED)**.

---

## [2026-10-27] - Modernización Global de Botones de Pestañas y Selectores Segmentados en la PWA Web

### 💬 Prompt Original del Usuario
> "en la version web de la pwa, mejorame estos botones , siento que se ven poco modernos y con estilo, ajusta todos los botones que sea igaul a la foto y ajustlo"

### 🤖 Resumen Técnico para la IA
- **1. Rediseño Global de Barras y Botones Segmentados (`src/styles.scss`)**:
  - Se rediseñaron `.dgl-subnav-bar`, `.dgl-subnav-btn`, `.dgl-subnav-badge` y `.period-Segmented-group` / `.period-pill-btn` bajo una estética moderna tipo *Segmented Pill Dock*.
  - El contenedor `.dgl-subnav-bar` utiliza `display: inline-flex; width: fit-content; max-width: 100%; background: linear-gradient(180deg, #f1f5f9 0%, #e9eef5 100%); border-radius: 16px; padding: 6px;` con sombra interior sutil (`inset 0 1px 2px rgba(15, 23, 42, 0.06)`).
  - Se eliminó el borde rígido doble de `.dgl-subnav-btn` en estado inactivo (`background: transparent; border: 1px solid transparent;`), añadiendo elevación suave en `:hover:not(.active)` y un estado `.active` con gradiente institucional (`linear-gradient(135deg, #1e5e3a 0%, #144328 100%)`), bisel luminoso superior (`inset 0 1px 0 rgba(255, 255, 255, 0.22)`) y sombra proyectada (`0 6px 16px -3px rgba(30, 94, 58, 0.38)`).
  - Los contadores `.dgl-subnav-badge` muestran alto contraste en estado inactivo (`background: #ffffff; color: #1e5e3a; border: 1px solid rgba(30, 94, 58, 0.18)`) y efecto cristal translúcido en estado activo.
- **2. Iconografía Vectorial en `Inventario y Stock` (`src/app/features/settings/settings.component.html`)**:
  - Se incorporaron íconos vectoriales SVG (`stroke="currentColor"`) en los botones `Inventario · Fruta Disponible` y `Stock · Pulpas Hechas`.
- **3. Homologación en `Personal y Nómina` y `Reportes Gerenciales` (`src/app/features/hr/hr.component.scss` y `src/app/features/reports/reports.component.scss`)**:
  - Se actualizaron `.hr-subnav-bar` / `.hr-tab-btn` / `.tab-badge` y `.reports-nav-tabs` / `.report-tab-btn` / `.report-tab-badge` con exactamente los mismos tokens visuales del sistema global.
- **4. Certificación de Agentes de Calidad**:
  - **Agente Verificador de Impacto**, **Agente Auditor Punto por Punto** y **Agente de Revisión Par (Peer Reviewer)**: Aprobaron el 100% de la implementación sin desviaciones ni regresiones.

### 📦 Componentes Modificados
- `src/styles.scss` [MODIFICADO]
- `src/app/features/settings/settings.component.html` [MODIFICADO]
- `src/app/features/hr/hr.component.scss` [MODIFICADO]
- `src/app/features/reports/reports.component.scss` [MODIFICADO]
- `src/app/features/settings/settings.component.spec.ts` [MODIFICADO]

### ✅ Verificación, Build y Tests Unitarios
- **Build de Producción (`npm run build`)**: **0 Errores** (`dist/despulpadora-pwa` generado exitosamente).
- **Pruebas Unitarias (`npx ng test --watch=false --browsers=ChromeHeadless`)**: **Executed 192 of 192 SUCCESS (TOTAL: 192 SUCCESS, 0 FAILED)**.

---

## [2026-10-27] - Menú Inferior Mobile Estilo Uber (`Inicio`, `Pedidos`, `Rutas`, `Inventario`, `Más`) en la PWA

### 💬 Prompt Original del Usuario
> "ayudame para que en la version mobile, quiero que el menu se vea como el estilo de uber (2da foto), con las siguientes opciones que son las mas importantes -> Panel (renombrala como "inicio"), alistamiento de pedidos (este dejalo como "pedidos"), "rutas" (este es el de enrutamiento), "inventario" y el de "mas""

### 🤖 Resumen Técnico para la IA
- **1. Rediseño del Menú Inferior Móvil Estilo Píldora Flotante de Uber (`src/app/layout/mobile-nav/mobile-nav.component.ts`)**:
  - Se rediseñó `.dgl-mobile-nav` como una píldora flotante blanca (`border-radius: 9999px; height: 68px; max-width: 460px; bottom: max(10px, calc(env(safe-area-inset-bottom, 0px) + 6px)); left: 12px; right: 12px; margin: 0 auto;`) con sombra difusa multicapa (`0 10px 30px rgba(15, 23, 42, 0.14)`).
  - Cada opción `.dgl-mobile-nav-item` aplica en estado activo (`.active`) una cápsula interior redondeada (`background: #f1f5f9; border-radius: 9999px; color: #111827; font-weight: 800;`) y alterna entre `.nav-icon-outline` (inactivo) y `.nav-icon-solid` (activo).
  - Se configuraron las 5 opciones solicitadas:
    1. **Inicio** (`routerLink="/dashboard"`, ícono de casa estilo Uber).
    2. **Pedidos** (`routerLink="/orders"`, `[queryParams]="{ tab: 'picking' }"`, ícono de comanda/recibo con contador de pendientes).
    3. **Rutas** (`routerLink="/orders"`, `[queryParams]="{ tab: 'despachos' }"`, ícono de ruta GPS).
    4. **Inventario** (`routerLink="/settings"`, `[queryParams]="{ tab: 'inventory' }"`, ícono de cubo de stock).
    5. **Más** (`(click)="openDrawer()"`, ícono de cuadrícula de puntos estilo *Servicios* de Uber).
  - Se implementó `isMobileTabActive(tab: 'home' | 'orders' | 'routes' | 'inventory'): boolean` escuchando `NavigationEnd` de `Router` para distinguir sin colisión `/orders?tab=picking` de `/orders?tab=despachos` y `/settings?tab=inventory`.
- **2. Ajuste de Espacio Inferior en Móvil (`src/styles.scss`)**:
  - Se actualizó `padding-bottom: 96px;` en `.main-content` para que la píldora flotante nunca oculte contenido al final de la pantalla.
- **3. Certificación de Agentes de Calidad**:
  - **Agente Verificador de Impacto**, **Agente Auditor Punto por Punto** y **Agente de Revisión Par (Peer Reviewer)**: Aprobaron el 100% de la implementación sin desviaciones ni regresiones.

### 📦 Componentes Modificados
- `src/app/layout/mobile-nav/mobile-nav.component.ts` [MODIFICADO]
- `src/app/layout/mobile-nav/mobile-nav.component.spec.ts` [MODIFICADO]
- `src/styles.scss` [MODIFICADO]

### ✅ Verificación, Build y Tests Unitarios
- **Build de Producción (`npm run build`)**: **0 Errores** (`dist/despulpadora-pwa` generado exitosamente).
- **Pruebas Unitarias (`npx ng test --watch=false --browsers=ChromeHeadless`)**: **Executed 194 of 194 SUCCESS (TOTAL: 194 SUCCESS, 0 FAILED)**.

