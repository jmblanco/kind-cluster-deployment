# PLAN-0005: Implementación de la CLI Interactiva Autónoma en Node.js

- **Estado:** Completado
- **Trazabilidad:** [ADR-0006](../decisions/ADR-0006-interactive-node-cli.md) | [SPEC-0004](../specs/SPEC-0004-interactive-node-cli.md)

## Tareas Atómicas de Implementación

### Tarea 1: Estructura del Proyecto & Package Setup
- [x] Crear directorio `cli/`.
- [x] Inicializar `package.json` en `cli/` con dependencias mínimas seguras (`@clack/prompts`, `picocolors`).
- [x] Configurar scripts en `package.json` (`start`, `test`, `audit`).

### Tarea 2: Capa Base de Ejecución Segura & TDD
- [x] Crear `cli/src/executor.js` para ejecutar subprocesos (`execFile` / `spawn`) con control de errores y buffers sin inyección de shell.
- [x] Crear tests unitarios en `cli/tests/executor.test.js` usando `node:test`.

### Tarea 3: Módulo de Verificación de Requisitos (Prerequisites)
- [x] Crear `cli/src/modules/prerequisites.js` para chequear `docker`, `kind`, `kubectl`, `helm` y el estado del daemon Docker.
- [x] Crear tests en `cli/tests/prerequisites.test.js`.

### Tarea 4: Módulos de Orquestación del Cluster
- [x] Crear `cli/src/modules/cluster.js` (Kind create/delete, parsing de `kind.config.yaml`).
- [x] Crear `cli/src/modules/registry.js` (Zot OCI registry + Trivy).
- [x] Crear `cli/src/modules/mongodb.js` (MongoDB container en red kind).
- [x] Crear `cli/src/modules/ingress.js` (Traefik Ingress Controller & Apache APISIX Gateway).
- [x] Crear `cli/src/modules/kafka.js` (Strimzi Kafka KRaft + Kafbat/Kafka UI).
- [x] Crear `cli/src/modules/argocd.js` (ArgoCD + Ingress).
- [x] Crear `cli/src/modules/observability.js` (Metrics-Server + Headlamp Explorer).
- [x] Crear `cli/src/modules/dashboard.js` (Panel de Control local).

### Tarea 5: Visuales & Experiencia TUI
- [x] Diseñar el banner ASCII art en `cli/src/banner.js` con paleta de colores.
- [x] Implementar el menú interactivo en `cli/src/menu.js` utilizando `@clack/prompts` (Presets, Granular Multiselect, Status, Teardown).
- [x] Crear entrypoint `cli/bin/kind-manager.js`.
- [x] Incorporar soporte de subcomandos CLI no interactivos (`npm start <cmd>`).

### Tarea 6: Auditoría de QA y Seguridad
- [x] Ejecutar suite completa de tests de Node.js (`npm test`, 27 tests pasando, 100% éxito).
- [x] Auditoría de seguridad OWASP/SCA (`raptor_security_auditor` con veredicto PASS).
- [x] Eliminar scripts heredados (`init.sh`, `init.ps1`).
- [x] Actualizar documentación (README.md, AGENTS.md, GEMINI.md, CONTRIBUTING.md, CHANGELOG.md, CI workflow).
