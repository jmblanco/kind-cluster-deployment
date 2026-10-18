# ADR-0006: CLI Interactiva Autónoma en Node.js para Orquestación del Cluster

- **Estado:** Aceptado
- **Fecha:** 2026-10-18
- **Autor:** Principal Cloud & Systems Architect (Agentic Lifecycle)

## Contexto y Problema

El repositorio gestionaba el ciclo de vida del cluster Kind y sus componentes (Zot OCI, Traefik, APISIX, Strimzi Kafka KRaft, ArgoCD, Headlamp y Dashboard) mediante dos scripts paralelos: `init.sh` (Bash) e `init.ps1` (PowerShell).

Aunque los scripts proporcionan compatibilidad básica, presentan limitaciones clave en la experiencia de desarrollador (DX):
1. **Falta de interactividad moderna**: Los menús basados en prompts secuenciales y números de consola no permiten selección múltiple granular (multiselect con checkboxes) ni navegación interactiva por flechas.
2. **Duplicidad de mantenimiento**: Cualquier cambio en templates, banderas de Helm o verificaciones requería actualizar código en Bash y PowerShell por separado.
3. **Visibilidad pobre**: La salida estándar en consola satura el terminal sin una gestión limpia de spinners de progreso, banners ASCII estilizados ni badges en vivo del estado del entorno.

El usuario solicita crear una solución bajo el directorio `cli/`, autocontenida en Node.js, interactiva, muy visual (ASCII art, feedback de estado), granular y modular, sin invocar los scripts `.sh` ni `.ps1` existentes.

## Opciones Evaluadas

### Opción 1: Envoltura (Wrapper) en Node.js invocando `init.sh` / `init.ps1`
- **Pros:** Reutiliza la lógica actual.
- **Contras:** Depende de shells del host (PowerShell o Bash/WSL), propenso a problemas de encoding y salida no estructurada. Descartado explícitamente por el usuario ("nada de invocar a los sh o ps1").

### Opción 2: CLI en Node.js con `@clack/prompts` + `picocolors` + Ejecución Nativa de Comandos (`execa` / `child_process`)
- **Pros:**
  - `@clack/prompts` ofrece una experiencia visual similar a Astro/Vite/SvelteKit (limpia, moderna, spinners nativos, selección múltiple y mensajes de estado).
  - Paquetes ligeros, cero dependencias pesadas, alta seguridad (cero CVEs conocidos).
  - 100% autocontenido en la carpeta `cli/`.
  - Módulos desacoplados en TypeScript/JavaScript moderno (ESM) para orquestar `kind`, `docker`, `kubectl` y `helm`.
- **Contras:** Requiere Node.js 18+ en la máquina anfitriona (el entorno verificado cuenta con Node.js v22.16.0 y npm 10.9.2).

### Opción 3: CLI tradicional con `commander` + `inquirer` + `chalk` + `ora`
- **Pros:** Muy popular y extendido.
- **Contras:** Mayor número de dependencias transitivas y huella más pesada que `@clack/prompts`.

## Decisión Final

Se implementa la **Opción 2**: Una CLI nativa y autocontenida en el directorio `cli/` estructurada en Node.js ESM con:
- `@clack/prompts` y `picocolors` para la TUI, banner ASCII, navegación por flechas, multiselect y spinners.
- Capa modular de orquestación (`cli/src/modules/`) con controladores específicos para:
  - `prerequisites`: Chequeo de binarios (`docker`, `kind`, `kubectl`, `helm`) y Docker daemon.
  - `cluster`: Creación y destrucción de cluster Kind mediante plantillas YAML.
  - `registry`: Despliegue de Zot OCI con Trivy.
  - `mongodb`: Despliegue de MongoDB en red Kind.
  - `traefik`: Ingress controller hostPort 80/443.
  - `apisix`: Gateway Apache APISIX.
  - `kafka`: Operador Strimzi + Kafka KRaft + Kafka UI.
  - `argocd`: ArgoCD GitOps con Traefik Ingress.
  - `observability`: Metrics-server y Headlamp.
  - `dashboard`: Panel web local.
- Menú interactivo con modos preconfigurados (Full Stack, Minimal, Kafka-only, Granular Custom Selection, Teardown, Doctor/Health Check).
- Tests unitarios y suites de integración ejecutables con Node test runner (`node:test`).
- Auditoría de seguridad y análisis de dependencias (SCA, SonarQube Clean Code y OWASP).

## Consecuencias y Trade-offs
- **Positivas:**
  - Experiencia de usuario (DX) moderna, fluida y visual.
  - Lógica autocontenida, unificada y consistente en Windows, macOS y Linux.
  - `init.sh` e `init.ps1` se conservan para entornos headless o CI mínimos, o se redirigen opcionalmente.
- **Riesgos & Mitigaciones:**
  - Requiere Node.js instalado en el host: Se incluye verificación previa con mensajes amigables y de ayuda para instalación si faltara.
