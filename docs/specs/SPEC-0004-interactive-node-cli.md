# SPEC-0004: CLI Interactiva Autónoma en Node.js

- **Estado:** Cerrada
- **Fecha:** 2026-10-18
- **Trazabilidad:** [ADR-0006](../decisions/ADR-0006-interactive-node-cli.md)

## 1. Visión y Requerimientos

Desarrollar una aplicación de línea de comandos (CLI) moderna, visual, interactiva y modular en el directorio `cli/`, desarrollada en Node.js (ESM), que reemplace la necesidad de interactuar directamente con `init.sh` o `init.ps1` en modo interactivo.

### Requerimientos Funcionales (FR)
- **FR-1 (Banner & Visuales):** Mostrar banner estilizado en ASCII Art ("KIND CLUSTER MANAGER") con colores temáticos e información resumida del entorno.
- **FR-2 (Menú Granular & Modos de Despliegue):**
  - **Quick Presets:**
    - `Full Stack (All-in-one)`: Despliega todo el stack en orden de dependencias.
    - `Minimal Stack`: Cluster Kind + Traefik Ingress + Dashboard.
    - `Event-Driven Stack`: Cluster Kind + Traefik + Strimzi Kafka (KRaft) + Kafka UI.
  - **Granular Custom Selection (Multiselect):** Permite elegir libremente componentes vía checkboxes interactivos (Kind Cluster, Zot Registry, MongoDB, Traefik, APISIX, Strimzi Kafka, ArgoCD, Headlamp/Metrics-Server, Dashboard).
  - **Teardown & Cleanup:** Eliminación controlada de cluster Kind y contenedores Docker asociados.
  - **Cluster Doctor / Status Check:** Diagnóstico instantáneo de herramientas (docker, kind, kubectl, helm) y estado de pods/servicios en el cluster.
- **FR-3 (Autocontenido):** La CLI ejecuta directamente los comandos nativos (`docker`, `kind`, `kubectl`, `helm`) mediante subprocesos controlados, sin llamar a `init.sh` ni `init.ps1`.
- **FR-4 (Spinners & Reportes):** Notificar cada fase con spinners interactivos (`@clack/prompts` spinner) mostrando éxito o fallo claro con mensajes de error capturados.

### Requerimientos No Funcionales (NFR)
- **NFR-1 (Rendimiento y Ligereza):** Utilizar dependencias ultra-ligeras con mínima superficie de ataque (`@clack/prompts`, `picocolors`).
- **NFR-2 (Multiplataforma):** Compatible con Windows (PowerShell/CMD), macOS y Linux.
- **NFR-3 (Seguridad & Calidad):** Cero dependencias con vulnerabilidades conocidas (`npm audit` con 0 vulnerabilidades), validación estricta de argumentos y manejo seguro de comandos sin inyección shell.
- **NFR-4 (Testing & TDD):** Tests unitarios integrados usando el test runner nativo de Node.js (`node --test`).

## 2. Arquitectura de Módulos

```
cli/
├── package.json
├── bin/
│   └── kind-manager.js        # Entrypoint ejecutable
├── src/
│   ├── banner.js              # ASCII banner y estilizado
│   ├── executor.js            # Wrapper seguro de ejecución de procesos
│   ├── menu.js                # Interfaz interactiva TUI (@clack/prompts)
│   ├── modules/
│   │   ├── prerequisites.js   # Verificación de herramientas y Docker
│   │   ├── cluster.js         # Orquestación de Kind Cluster
│   │   ├── registry.js        # Orquestación de Zot Registry
│   │   ├── mongodb.js         # Orquestación de MongoDB container
│   │   ├── ingress.js         # Orquestación de Traefik & APISIX
│   │   ├── kafka.js           # Orquestación de Strimzi & Kafka UI
│   │   ├── argocd.js          # Orquestación de ArgoCD
│   │   ├── observability.js   # Orquestación de Metrics-Server & Headlamp
│   │   └── dashboard.js       # Despliegue de Control Panel
│   └── index.js
└── tests/
    ├── executor.test.js
    └── prerequisites.test.js
```

## 3. Criterios de Aceptación
1. `cd cli && npm install` se instala limpiamente sin vulnerabilidades de seguridad.
2. `npm start` (o `node bin/kind-manager.js`) despliega el banner ASCII y el menú interactivo con navegación por flechas.
3. El modo multiselect permite seleccionar componentes individuales y ejecutarlos en secuencia lógica de dependencias.
4. La ejecución de tests con `npm test` pasa al 100%.
5. El subagente `raptor_security_auditor` y `qa_engineer` aprueban la arquitectura y código generado.
