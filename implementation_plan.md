# 📋 PLAN DE IMPLEMENTACIÓN: ALINEACIÓN DE TÍTULOS EN TOPBAR WEB (DESKTOP) Y AJUSTE FLOTANTE CON AUTO-OCULTADO EN MOBILE NAV

> **Estado**: Esperando aprobación del usuario para proceder con la ejecución en código (Fase 2 - `AGENTS.md`).  
> **Archivos a modificar**: 6 archivos (`header.component.ts`, `styles.scss`, `settings.component.scss`, `dashboard.component.scss`, `orders.component.scss`, `mobile-nav.component.ts`) y sus respectivos `.spec.ts`.  
> **Aislamiento**: Quirúrgico, sin regresiones visuales ni de negocio.

---

## 🎯 1. OBJETIVOS DEL REQUERIMIENTO

1. **Alineación de Títulos de Módulos al Top en Versión Web Desktop (`media_1793236223758_e9455503.png`)**:
   - Renderizar el título dinámico del módulo activo (`currentRouteTitle()`) en la barra superior (`header.component.ts`, sección `.topbar-left.no-mobile`), exactamente donde el usuario delimitó el recuadro rojo alineado horizontalmente con `• En línea`, el botón de notificaciones y `+ Nuevo pedido`.
   - Ajustar el padding superior de `.page-container` en `src/styles.scss` (de `28px` a `12px 28px 28px 28px`) para que todo el contenido de los módulos (tarjetas, tabs de navegación, tablas, formularios) suba verticalmente y aproveche de inmediato el espacio sin desperdicio de scroll vertical.
   - Ocultar/optimizar en desktop (`@media (min-width: 1024px)`) los bloques de títulos redundantes en el cuerpo de las páginas (como en `settings.component.html`, `dashboard.component.html`, `orders.component.html`), permitiendo que los subtabs (ej: General, Usuarios, Roles, Parámetros) y los KPIs comiencen directamente arriba.

2. **Ajuste de Altura y Auto-Ocultado con Scroll en Barra Móvil (`media_1793236353005_5af9cf1d.png`)**:
   - Elevar ligeramente la barra flotante de navegación móvil (`mobile-nav.component.ts`), cambiando su posición de `bottom: max(10px, calc(env(safe-area-inset-bottom, 0px) + 6px))` a `bottom: max(22px, calc(env(safe-area-inset-bottom, 0px) + 16px))` para que no quede pegada al borde inferior ni a la barra de inicio del sistema operativo.
   - Implementar la animación fluida de auto-ocultado (`isNavHidden`) al hacer scroll hacia abajo con la misma curva de transición que la barra superior (`cubic-bezier(0.16, 1, 0.3, 1)` con desplazamiento `translateY(calc(100% + 40px))` y opacidad 0).
   - Reaparecer de inmediato al hacer scroll hacia arriba o encontrarse en el tope (`scrollY <= 25`).
   - Incorporar temporizador de inactividad de scroll (idle timer de ~700ms) para que, tal como solicitó el usuario (*"pero que cuando se quede quieto aparezca"*), la barra reaparezca suavemente cuando el usuario detiene el scroll.
   - Mantener la barra siempre visible cuando el cajón de menú (`showMoreDrawer()`) se encuentra abierto.

---

## 🔍 2. ANÁLISIS DE IMPACTO Y VERIFICACIÓN PREVIA (FASE 1)

| Archivo / Componente | Elemento Afectado | Análisis de Impacto y Mitigación |
| :--- | :--- | :--- |
| `src/app/layout/header/header.component.ts` | `.topbar-left.no-mobile` y cálculo reactivo `currentRouteTitle` | Actualmente `.topbar-left` queda en blanco en desktop cuando el sidebar está expandido. Se renderiza `<h1 class="topbar-module-title">{{ currentRouteTitle() }}</h1>`. Se enriquecen las rutas para mapear fielmente: `/dashboard` -> `Dashboard general`, `/settings` -> `Configuración de la Planta & Sistema`, `/orders` (por subtabs) -> `Alistamiento de Pedidos` / `Facturación & POS` / `Despachos & Rutas`, etc. Se respeta el estado colapsado agregando divisor `/`. Cero impacto en responsive móvil. |
| `src/styles.scss` | `.page-container` | Se ajusta padding de `28px` a `12px 28px 28px 28px` en desktop y `14px 16px 88px 16px` en móvil (asegurando margen inferior para la barra flotante elevada). |
| `src/app/features/settings/settings.component.scss` | Cabecera `.desktop-config-header-nav` | En `@media (min-width: 1024px)`, se oculta la fila del título redundantemente duplicada para que la botonera de subtabs (`dgl-subnav-bar`) suba al tope, logrando exactamente el efecto ilustrado en la captura del usuario. |
| `src/app/features/dashboard/dashboard.component.scss` | Cabecera `.dashboard-top-section` | En `@media (min-width: 1024px)`, se oculta el título duplicado permitiendo que el grid de KPIs rápidos (`quick-kpis-grid`) quede posicionado arriba. En móvil (`< 1024px`) se mantiene intacto. |
| `src/app/features/orders/orders.component.scss` | `.picking-page-header`, `.separated-view-header` | En desktop se ocultan los bloques de título duplicados; la tira de días de picking, el mapa de despachos o los selectores de IVA suben verticalmente de inmediato. |
| `src/app/layout/mobile-nav/mobile-nav.component.ts` | `.dgl-mobile-nav`, listeners de scroll e idle timer | Se actualiza el `bottom` flotante, se añade señal `isNavHidden = signal<boolean>(false)`, `@HostListener('window:scroll')`, detección de delta y temporizador de 700ms para reaparición estática. Se agrega `OnDestroy` para limpiar el temporizador. |

---

## 🛠️ 3. PLAN PASO A PASO DE EJECUCIÓN (POST-APROBACIÓN)

### Paso 1: Topbar con Título de Módulo Dinámico en Desktop (`header.component.ts`)
1. En `header.component.ts`:
   - Incorporar en el template dentro de `.topbar-left.no-mobile`:
     ```html
     <h1 class="topbar-module-title">{{ currentRouteTitle() }}</h1>
     ```
   - Si `stateService.isSidebarCollapsed()` está activo, renderizar el botón toggle, logo y separador `<span class="topbar-title-divider">/</span>` antes del título.
   - Extender la señal computada `currentRouteTitle` para mapear los nombres completos de cada módulo y subtab:
     - `/dashboard` -> `Dashboard general`
     - `/orders` (tab picking) -> `Alistamiento de Pedidos`
     - `/orders` (tab facturacion) -> `Facturación & POS`
     - `/orders` (tab despachos) -> `Despachos & Rutas`
     - `/settings` (tab inventory/variants/fruits/cava) -> `Inventario y Stock de Pulpas`
     - `/settings` -> `Configuración de la Planta & Sistema`
     - `/shifts` -> `Control de Turnos & Marcación`
     - `/hr` -> `Gestión de Personal & Talento Humano`
     - `/accounting` -> `Clientes & Facturación`
     - `/reports` -> `Centro de Reportes & Analítica`
     - `/portal-admin` -> `Admin Catálogo · Portal Clientes`
     - `/admin/users` -> `Usuarios del Sistema`
     - `/admin/roles` -> `Roles & Matriz de Privilegios`
     - `/admin/catalog` -> `Catálogo del Sistema`
     - `/admin/backups` -> `Copias de Seguridad`
   - Agregar estilos SCSS para `.topbar-module-title` (`font-size: 1.35rem; font-weight: 800; color: #111827; letter-spacing: -0.025em; margin: 0; line-height: 1.2;`).

### Paso 2: Optimización de Espacios Globales y Subida de Contenido (`styles.scss` y Component SCSS)
1. En `src/styles.scss`:
   - Modificar `.page-container`:
     ```scss
     .page-container {
       padding: 12px 28px 28px 28px;
       max-width: 1600px;
       margin: 0 auto;
       width: 100%;
     }
     ```
   - En media query responsive móvil (`@media (max-width: 1023px)`):
     ```scss
     .page-container {
       padding: 14px 16px 92px 16px;
     }
     ```
2. En `src/app/features/settings/settings.component.scss` (o bloque de estilos):
   - Agregar regla para ocultar la cabecera repetitiva de configuración en desktop:
     ```scss
     @media (min-width: 1024px) {
       .desktop-config-header-nav > div:first-child {
         display: none !important;
       }
       .desktop-config-header-nav .dgl-subnav-bar {
         margin-top: 0 !important;
       }
     }
     ```
3. En `src/app/features/dashboard/dashboard.component.scss`:
   - En desktop (`min-width: 1024px`), ocultar `.dashboard-top-section` para que los KPIs comiencen directamente en la parte superior.
4. En `src/app/features/orders/orders.component.scss`:
   - En desktop (`min-width: 1024px`), ocultar `.picking-title-block` y el contenedor de título de `.separated-view-header`, permitiendo que la grilla de días, el POS y el mapa de rutas suban inmediatamente.

### Paso 3: Ajuste de Altura y Scroll Auto-Hide en Mobile Nav (`mobile-nav.component.ts`)
1. En `mobile-nav.component.ts`:
   - Elevar la posición en CSS:
     ```scss
     bottom: max(22px, calc(env(safe-area-inset-bottom, 0px) + 16px));
     will-change: transform, opacity;
     transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1),
                 opacity 0.28s ease,
                 visibility 0.28s ease;
     ```
   - Añadir clase para ocultamiento suave hacia abajo:
     ```scss
     &.nav-hidden {
       transform: translateY(calc(100% + 40px));
       opacity: 0;
       visibility: hidden;
       pointer-events: none;
     }
     ```
   - En el componente TypeScript:
     - Implementar `OnDestroy`.
     - Señal `readonly isNavHidden = signal<boolean>(false);`.
     - Manejador `@HostListener('window:scroll')` con detección de dirección de scroll:
       - Scroll abajo (`delta > 0 && currentScrollY > 40`): `isNavHidden.set(true);`.
       - Scroll arriba (`delta < 0`) o tope (`currentScrollY <= 25`): `isNavHidden.set(false);`.
       - Detección de quietud (idle timer ~700ms): al dispararse cualquier scroll, se refresca un `setTimeout` que ejecuta `this.isNavHidden.set(false)` para que cuando el usuario se quede quieto, la barra reaparezca.
       - En `ngOnDestroy()`: limpiar el `scrollIdleTimeout`.
   - En el template aplicar:
     ```html
     <nav class="dgl-mobile-nav" [class.nav-hidden]="isNavHidden() && !showMoreDrawer()">
     ```

### Paso 4: Actualización y Cobertura de Pruebas Unitarias (`.spec.ts`)
1. En `header.component.spec.ts`:
   - Validar que `.topbar-module-title` renderiza el título computado en desktop.
   - Validar que `currentRouteTitle()` retorna `Configuración de la Planta & Sistema` para `/settings` y `Dashboard general` para `/dashboard`.
2. En `mobile-nav.component.spec.ts`:
   - Validar que `isNavHidden()` cambia a `true` al simular scroll descendente.
   - Validar que `isNavHidden()` regresa a `false` al simular scroll ascendente o al cumplirse el temporizador de quietud.
   - Validar que el drawer abierto mantiene la barra visible.

### Paso 5: Verificación de Calidad y Registro Histórico
1. Ejecutar la suite completa de pruebas: `ng test --watch=false` (exigido 100% de pruebas aprobadas sin fallos).
2. Ejecutar build de producción: `npm run build` (0 errores).
3. Registrar en `./HISTORIAL_CAMBIOS.md`.
4. Desplegar los sub-agentes requeridos por `AGENTS.md` (Agente Auditor Punto por Punto y Agente de Revisión Par).
5. **Cero `git commit` y cero `git push`** (cumplimiento estricto de la Regla 5).

---

## ❓ 4. DECISIÓN REQUERIDA DEL USUARIO
¿Apruebas este plan de implementación para proceder de inmediato con la edición quirúrgica del código y la suite de validación?
