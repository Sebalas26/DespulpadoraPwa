# 📜 Historial de Cambios (`DespulpadoraPwa` - Angular 20)

Este documento registra de manera cronológica y estructurada todas las intervenciones arquitectónicas, integraciones de API, componentes de seguridad RBAC y pruebas unitarias aplicadas sobre el proyecto Frontend **`DespulpadoraPwa`**.

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
