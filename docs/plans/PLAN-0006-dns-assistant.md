# PLAN-0006: Asistente y Sincronización Automática de DNS Local

- **Estado:** Completado
- **Trazabilidad:** [ADR-0007](../decisions/ADR-0007-advanced-platform-roadmap.md) | [SPEC-0005](../specs/SPEC-0005-advanced-platform-roadmap.md)
- **Talla Estimada:** S

## 1. Objetivo
Implementar en la CLI de Node.js un comprobador y asistente automático de resolución de nombres DNS para los dominios `.local` (`dashboard.local`, `headlamp.local`, `registry.local`, `argocd.local`, `kafka-ui.local`, `apisix.local`).

## 2. Tareas Atómicas de Implementación

### Tarea 1: Módulo de Inspección de DNS (`cli/src/modules/dns.js`)
- [x] Función `checkDnsEntries()`: Lee el archivo `hosts` según la plataforma:
  - Windows: `C:\Windows\System32\drivers\etc\hosts`
  - Linux/macOS: `/etc/hosts`
- [x] Detectar qué dominios faltan por asociar a `127.0.0.1`.
- [x] Crear tests unitarios en `cli/tests/dns.test.js`.

### Tarea 2: Sincronización Asistida de Registros
- [x] Añadir subcomando en la CLI: `npm start dns` o `npm start dns:check`.
- [x] Notificar al usuario con el comando o instrucción precisa si se requieren privilegios de administrador para sincronizar.
- [x] Integrar el chequeo dentro del comando `npm start doctor` para alertar al desarrollador si no puede resolver las URLs locales.
