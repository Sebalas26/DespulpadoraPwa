# 📋 PLAN DE IMPLEMENTACIÓN: PANTALLA COMPLETA EN MAPA BLOQUEADO Y ROL DOMICILIARIO DINÁMICO EN ENTREGAS

> **Estado**: Esperando aprobación del usuario para proceder con la ejecución en código (Fase 2 - `AGENTS.md`).  
> **Archivos a modificar**: 6 archivos (Componentes, Modelos, Servicios y Specs).  
> **Aislamiento**: Quirúrgico, sin regresiones visuales ni de negocio.

---

## 🎯 1. OBJETIVOS DEL REQUERIMIENTO

1. **Botón de Pantalla Completa en Mapa Bloqueado (`media_1793224339327_0b4b5aeb.png`)**:
   - En la vista del Mapa de Entregas (`/orders` -> subtab Mapa), cuando el mapa se encuentra en estado inicial o bloqueado (`mapViewMode() === 'locked'`) mostrando los botones centrales `• En Vivo` y `Ver Todas las Entregas`, mostrar de forma permanente el botón flotante circular de pantalla completa `[ ⤢ ]` en la esquina inferior izquierda.
   - Al hacer clic, activar la vista maximizada del canvas (`isMapFullscreen`), ajustando el tamaño de Leaflet mediante `invalidateSize()`.

2. **Checkbox "Domiciliario" en Creación y Edición de Roles (`media_1793224528561_bd9bd3a1.png`)**:
   - En `/settings` -> Roles & Matriz de Privilegios, en el modal de "Crear Nuevo Rol de Usuario" y "Modificar Nombre del Rol", incorporar un checkbox explícito:
     `[✓] Rol de Domiciliario (permite asignar entregas y rutas en el mapa)` (`isCourier`).
   - Al marcarlo, el rol queda tipado con `isCourier: true` y se persiste tanto en el payload enviado al API (`POST /api/roles`, `PUT /api/roles/{id}`) como en el almacenamiento local seguro (`dgl_roles_v2`).
   - Mostrar un badge visual identificador `DOMICILIARIO` en la lista lateral de roles para los perfiles que cuenten con esta cualidad activa.

3. **Carga Dinámica de Usuarios Domiciliarios en el Selector de Entregas del Mapa (`media_1793224559802_e75cda58.png`)**:
   - Todo usuario del sistema (`UserAdminDto`) cuyo rol asignado (`roleId` / `roleName`) esté configurado como `isCourier === true` será reconocido automáticamente por la plataforma como un repartidor / domiciliario activo.
   - En el drawer lateral de entregas del mapa (`Sin mensajero`), en los filtros por mensajero, en el modal de asignación por zonas poligonales y en la tabla de despacho de pedidos (`orders.component.ts`), la lista desplegable de mensajeros cargará automáticamente a dichos usuarios disponibles.

---

## 🔍 2. ANÁLISIS DE IMPACTO Y VERIFICACIÓN PREVIA (FASE 1)

| Archivo / Componente | Elemento Afectado | Análisis de Impacto y Mitigación |
| :--- | :--- | :--- |
| `src/app/features/orders/delivery-map.component.ts` | Contenedor `.map-left-controls-container` y botón `.map-fullscreen-fab` | Actualmente envuelto en `@if (mapViewMode() !== 'locked')`. Al retirar esa restricción en el contenedor padre y conservarla únicamente en el stack vertical de mensajeros `@if (mapViewMode() === 'live')`, el botón FAB se posiciona automáticamente en `bottom: 16px; left: 16px; z-index: 1250;`, flotando sobre el overlay (`z-index: 1200`) sin interferir con los botones centrales. Cero impacto negativo en otras vistas. |
| `src/app/features/orders/delivery-map.component.ts` | Método `syncCouriersFromEmployees()` y señal `couriers` | Se extiende para consultar `stateService.users()` y roles con `isCourier: true`, fusionándolos con empleados de `DOMICILIOS`. Esto garantiza que los usuarios del rol aparezcan en `<select class="drawer-stop-courier-select">` (`Sin mensajero`). |
| `src/app/core/models/business.models.ts` | `UserRoleDto` y `CreateRoleDto` | Se añade la propiedad tipada opcional `isCourier?: boolean`. Cero ruptura de compatibilidad hacia atrás. |
| `src/app/core/services/api.service.ts` | `createRole`, `updateRole`, `mapRoleFromApi` | Se añade `isCourier` al payload de creación/actualización y al mapeo desde el backend o caché local. |
| `src/app/core/services/state.service.ts` | Señales `users` y `roles`, método `loadInitialData()` | Añade señales reactivas para sincronizar los usuarios y roles registrados, exponiéndolos al mapa y a despachos. |
| `src/app/features/admin/roles/roles.component.html` y `.ts` | Modales `showCreateRoleModal` y `showEditRoleModal` | Se añade el checkbox con bind bidireccional a señales `newRoleIsCourier` y `editingRoleIsCourier`. |
| `src/app/features/orders/orders.component.ts` | Getter `COURIER_CATALOG` | Sincroniza el catálogo de repartidores en la tabla y asignación de despachos para incluir los usuarios con rol de domiciliario. |

---

## 🛠️ 3. PLAN PASO A PASO DE EJECUCIÓN (POST-APROBACIÓN)

### Paso 1: Actualizar Modelos y API Service (`business.models.ts` y `api.service.ts`)
1. En `src/app/core/models/business.models.ts`:
   - Añadir `isCourier?: boolean;` a `UserRoleDto`.
   - Añadir `isCourier?: boolean;` a `CreateRoleDto`.
2. En `src/app/core/services/api.service.ts`:
   - Enviar `isCourier: dto.isCourier ?? false` en `createRole` y `updateRole`.
   - Mapear `isCourier` en `mapRoleFromApi(item)`.

### Paso 2: Checkbox en Módulo de Roles (`roles.component.ts` y `roles.component.html`)
1. En `roles.component.ts`:
   - Definir `readonly newRoleIsCourier = signal<boolean>(false);`
   - Definir `readonly editingRoleIsCourier = signal<boolean>(false);`
   - Enviar `isCourier` en `submitNewRole()` y `saveRoleName()`.
   - Restablecer y sincronizar valores al abrir/cerrar modales.
2. En `roles.component.html`:
   - Incorporar el checkbox estilizado en el modal de creación y en el modal de edición.
   - Añadir badge sutil `DOMICILIARIO` en los ítems de rol activos con esta marca.

### Paso 3: Sincronización en `StateService` (`state.service.ts`)
1. Exponer señales `users = signal<UserAdminDto[]>(...)` y `roles = signal<UserRoleDto[]>(...)`.
2. En `loadInitialData()` consultar en paralelo `this.api.getUsers()` y `this.api.getRoles()` con fallback a `localStorage`.

### Paso 4: Botón Pantalla Completa y Carga de Domiciliarios en el Mapa (`delivery-map.component.ts`)
1. En el template de `delivery-map.component.ts`:
   - Mover `<div class="map-left-controls-container" [class.is-fullscreen]="isMapFullscreen()">` fuera del `@if (mapViewMode() !== 'locked')` para que el botón de pantalla completa esté siempre disponible en la esquina inferior izquierda.
   - Conservar `@if (mapViewMode() === 'live')` exclusivamente dentro del contenedor para la botonera vertical de mensajeros.
2. En la lógica de `delivery-map.component.ts`:
   - Actualizar `syncCouriersFromEmployees()` para incorporar usuarios cuyo rol tenga `isCourier: true`.
   - Garantizar que el dropdown `<option value="">Sin mensajero</option>` del drawer de entregas liste a los domiciliarios detectados.
3. En `orders.component.ts`:
   - Actualizar `COURIER_CATALOG` para reflejar los mismos domiciliarios activos derivados de los roles.

### Paso 5: Actualización y Cobertura de Pruebas Unitarias (`.spec.ts`)
1. Actualizar `delivery-map.component.spec.ts`:
   - Prueba 1: Verificar que el botón de pantalla completa `.map-fullscreen-fab` se renderiza cuando `mapViewMode() === 'locked'`.
   - Prueba 2: Verificar que usuarios con rol `isCourier: true` se incorporan al listado de mensajeros (`couriers()`).
2. Actualizar `roles.component.spec.ts`:
   - Prueba 1: Verificar que al crear un rol con `newRoleIsCourier = true`, se propaga `isCourier: true` a `api.createRole`.
   - Prueba 2: Verificar que al modificar un rol, `editingRoleIsCourier` se propaga a `api.updateRole`.
3. Actualizar `api.service.spec.ts` y `state.service.spec.ts` si corresponde.

### Paso 6: Verificación de Calidad y Registro Histórico
1. Ejecutar la suite completa de pruebas: `ng test --watch=false` (exigido 100% de pruebas aprobadas sin fallos).
2. Ejecutar build de producción: `npm run build` (0 errores).
3. Registrar en `./HISTORIAL_CAMBIOS.md`.
4. Desplegar los sub-agentes requeridos por `AGENTS.md` (Agente Auditor Punto por Punto y Agente de Revisión Par).
5. **Cero `git commit` y cero `git push`** (cumplimiento estricto de la Regla 5).

---

## ❓ 4. DECISIÓN REQUERIDA DEL USUARIO
¿Apruebas este plan de implementación para proceder de inmediato con la edición quirúrgica del código y la suite de validación?
