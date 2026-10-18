# SDD Plan: Implementación de Observabilidad (Headlamp + Metrics-Server) y Dashboard Nativo K8s

- **Spec Asociada:** [docs/specs/SPEC-0003-observability-headlamp-metrics-server.md](../specs/SPEC-0003-observability-headlamp-metrics-server.md)
- **ADR Asociado:** [docs/decisions/ADR-0004-headlamp-and-metrics-server.md](../decisions/ADR-0004-headlamp-and-metrics-server.md)
- **Estado:** completed
- **Talla Global:** S

---

## 1. Tareas Implementadas

### Tarea 1: Despliegue de Metrics-Server con Parche Kind
- **Status:** COMPLETED
- **Acciones:**
  - Aplicados componentes de `kubernetes-sigs/metrics-server`.
  - Creado y aplicado `templates/metrics-server-patch.yaml` con `--kubelet-insecure-tls`.
  - Verificado: `kubectl top nodes` y `kubectl top pods -A` respondiendo activamente.

### Tarea 2: Despliegue de Headlamp Kubernetes Explorer
- **Status:** COMPLETED
- **Acciones:**
  - Añadido repositorio Helm oficial `kubernetes-sigs/headlamp`.
  - Configurado `templates/headlamp-values.yaml` con `unsafeUseServiceAccountToken: true` para sesión local `cluster-admin`.
  - Creado `ingress/headlamp.ingress.yaml` y desplegado en namespace `headlamp`.
  - Verificado: HTTP 200 en `http://headlamp.local`.

### Tarea 3: Empaquetado y Despliegue Nativo del Hub Dashboard
- **Status:** COMPLETED
- **Acciones:**
  - Creado `dashboard/Dockerfile` sobre `python:3.12-alpine`.
  - Construida y publicada la imagen `localhost:5000/cluster-dashboard:v1.0.2` en el Docker Registry local.
  - Creado `templates/dashboard.deployment.yaml` con Ingress bajo `dashboard.local`.
  - Actualizado `dashboard/server.py` para usar ServiceAccount token en llamadas directas a la API de K8s y health-checks de Headlamp.

### Tarea 4: Orquestación e Idempotencia
- **Status:** COMPLETED
- **Acciones:**
  - Añadida función `install_observability` / `Install-Observability` en `init.sh` e `init.ps1`.
  - Añadido comando CLI `headlamp` / `observability` e integrado en `install_all`.
