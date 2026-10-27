# 📋 Plan de Implementación: Refactorización de la Tabla de Usuarios y Modal de Edición Completa (`AdminUsersComponent`)

> **Estado**: Propuesta pendiente de aprobación del usuario  
> **Fecha**: 2026-10-26  
> **Alcance**: `DespulpadoraPwa` — Módulo de Gestión de Usuarios (`/admin/users`)

---

## 1. 🔍 Resumen de los Requerimientos del Usuario

El usuario solicita las siguientes mejoras en la vista **Gestión de Usuarios del Sistema** (`src/app/features/admin/users`):
1. **Eliminar los "círculos de colores" (badges ovalados)**:
   - En el contador superior (`5 cuentas registradas`), retirar la píldora púrpura (`.badge.badge-purple`) y mostrar un texto plano limpio y sobrio.
   - En la columna **Estado**, retirar la etiqueta píldora (`.badge.badge-success` / `.badge.badge-danger`) y renderizar el texto en tipografía limpia y color semántico directo (`Activo` en verde / `Inactivo` en rojo).
2. **Eliminar la columna "Nivel de Acceso"**:
   - Retirar completamente el encabezado `<th>Nivel de Acceso</th>` y su celda de datos `<td>` correspondiente de la tabla.
3. **Bloquear la edición directa del rol en la tabla**:
   - Reemplazar el `<select>` editable inline de la columna **Rol Asignado** por texto informativo no editable (`user.roleName`), evitando cambios accidentales sin confirmación.
4. **Columna "Acción" mejorada con menú desplegable**:
   - Sustituir los botones sueltos de desactivar y basurero por un botón de menú desplegable elegante (**"Acciones ▾"**).
   - El menú desplegará las opciones:
     - ✏️ **"Editar"**: Abre el diálogo/modal de edición completa del usuario.
     - ⏸️ **"Inactivar" / "Activar"**: Alterna el estado activo/inactivo (bloqueado para Super Administrador).
     - 🗑️ **"Eliminar"**: Elimina la cuenta previa confirmación (bloqueado para Super Administrador).
5. **Modal / Diálogo de Edición Completa de Usuario**:
   - Al seleccionar "Editar", se abre un modal dedicado para actualizar toda la información del usuario:
     - Nombre de Usuario (solo lectura o editable).
     - Nombre Completo.
     - Correo Electrónico.
     - Teléfono y Documento / Cédula.
     - Rol Asignado (selector desplegable con los roles activos de `/api/roles`).
     - Privilegio maestro `IsSystemDeveloper` (checkbox).
     - Estado Activo / Inactivo.
   - Al guardar, invoca el método existente `this.api.updateUser(userId, dto)` (`PUT /api/users/{id}`) y actualiza el estado reactivo local.

---

## 2. 🛡️ Informe del Sub-Agente de Verificación de Impacto

1. **Aislamiento Quirúrgico**:
   - Las modificaciones se encuentran 100% acotadas a `src/app/features/admin/users/users.component.html`, `users.component.ts` y `users.component.spec.ts`.
   - Se utiliza el contrato existente y tipado `UpdateUserDto` de `src/app/core/models/business.models.ts` y el endpoint ya implementado en `ApiService.updateUser()`.
   - No se alteran otras vistas, rutas ni contratos backend.
2. **Cero Datos Quemados**:
   - Todos los roles en el modal de edición provienen de la señal reactiva `roles()`, alimentada por `GET /api/roles`.
   - Los datos prellenados en el modal de edición se leen directamente del objeto `UserAdminDto` seleccionado.
3. **Validación de Tests y Build**:
   - Se actualizarán las pruebas unitarias en `users.component.spec.ts` agregando cobertura para `openEditModal()`, `submitEditUser()` y el menú desplegable de acciones.
   - Se certificarán `npm run build` (0 errores) y `npm test` (100% pass).

---

## 3. 📝 Archivos Afectados

| Archivo | Tipo de Cambio | Descripción |
|---|---|---|
| `src/app/features/admin/users/users.component.html` | Modificación | Eliminar badges ovalados, remover columna Nivel de Acceso, mostrar rol como texto plano, agregar menú desplegable de Acciones y modal de edición de usuario. |
| `src/app/features/admin/users/users.component.ts` | Modificación | Agregar señales de edición (`showEditModal`, `editFullName`, etc.), métodos `openEditModal()`, `submitEditUser()`, `toggleActionMenu()` y cerrar menú en click fuera. |
| `src/app/features/admin/users/users.component.spec.ts` | Modificación | Incorporar `updateUser` en el spy de `ApiService` y pruebas para el modal de edición y menú de acciones. |

---

## 4. 📐 Detalle de la Modificación Quirúrgica

### A. Modificación de la Tabla (`users.component.html`):
- Contador: `<span style="font-size: 0.85rem; font-weight: 700; color: var(--text-muted);">{{ users().length }} cuentas registradas</span>`.
- Encabezados: Columnas `Usuario`, `Nombre Completo`, `Correo Electrónico`, `Rol Asignado`, `Estado`, `Acción` (eliminado `Nivel de Acceso`).
- Rol Asignado: `<td data-label="Rol Asignado" style="font-weight: 600;">{{ user.roleName }}</td>`.
- Estado: `<td data-label="Estado" style="font-size: 0.85rem; font-weight: 700;" [style.color]="user.isActive ? '#1e5e3a' : '#ef4444'">{{ user.isActive ? 'Activo' : 'Inactivo' }}</td>`.
- Columna Acción: Menú desplegable con botón `Acciones ▾` que abre panel flotante con "Editar", "Inactivar/Activar" y "Eliminar".

### B. Modal de Edición de Usuario (`users.component.html`):
- Modal emergente con campos: `fullName`, `email`, `phone`, `documentNumber`, `roleId`, `isSystemDeveloper` y botones "Cancelar" y "Guardar Cambios".

### C. Lógica TypeScript (`users.component.ts`):
- Señales reactivas: `showEditModal`, `editingUserId`, `editFullName`, `editEmail`, `editPhone`, `editDocumentNumber`, `editRoleId`, `editIsSystemDeveloper`, `editIsActive`, `activeActionMenuUserId`.
- Métodos: `openEditModal(user)`, `submitEditUser()`, `toggleActionMenu(userId, event)`.

---

## 5. 🧪 Estrategia de Validación y Certificación

1. **Compilación de Producción**:
   - `npm run build` en `DespulpadoraPwa` con salida exitosa (`0 Errores`).
2. **Pruebas Unitarias**:
   - `npm test` con Karma/Brave Headless sobre `users.component.spec.ts` y la suite global (100% pass).
3. **Auditoría Post-Ejecución**:
   - Agente Auditor Punto por Punto y Agente Revisor Par.
   - Registro en `HISTORIAL_CAMBIOS.md`.
