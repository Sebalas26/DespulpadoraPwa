---
description: Regla estricta de Git - Prohibición absoluta de commits y push automáticos
globs: ["**/*"]
always_on: true
---

# Regla Estricta: Prohibición de Commit y Push Automático

Está terminantemente PROHIBIDO que el asistente o agente ejecute comandos para crear commits o enviar cambios al repositorio remoto (`git commit`, `git push`), a menos que el usuario lo solicite de manera explícita y directa en su mensaje.

## Directrices de Obligatorio Cumplimiento:
1. **NO ejecutar `git commit`**:
   - Bajo ninguna circunstancia se debe hacer commit automático, ni siquiera para corregir errores de build o pruebas.
2. **NO ejecutar `git push`**:
   - Nunca enviar ramas locales a GitHub u otro remoto (`git push`, `git push origin <rama>`, `--force`, etc.).
3. **Flujo de Trabajo Requerido**:
   - Realizar modificaciones de código directamente en los archivos del proyecto.
   - Validar que el código compila localmente (`npm run build`, `npm start`, etc.).
   - Indicar al usuario qué archivos fueron modificados y qué se resolvió.
   - Dejar el control total de los commits y despliegues al usuario.
