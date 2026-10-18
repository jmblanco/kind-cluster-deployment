# SDD Plan: Implementación de Traefik Ingress y Apache APISIX Gateway

- **Spec Asociada:** [docs/specs/SPEC-0002-traefik-apisix-migration.md](../specs/SPEC-0002-traefik-apisix-migration.md)
- **ADR Asociado:** [docs/decisions/ADR-0002-traefik-ingress-and-apisix-gateway.md](../decisions/ADR-0002-traefik-ingress-and-apisix-gateway.md)
- **Estado:** completed
- **Talla Global:** M

---

## 1. Estrategia & Decisiones Técnicas

1. **Traefik Ingress Controller:**
   - Helm chart oficial: `traefik/traefik` (repo: `https://traefik.github.io/charts`).
   - Archivo de valores: `templates/traefik-values.yaml`.
   - Vinculación: Modo `DaemonSet` o deployment anclado al nodo `ingress-ready=true` con `hostPort: 80` y `hostPort: 443`, servicio `ClusterIP`.
2. **Ingress Manifests:**
   - Eliminar anotaciones específicas de Nginx (`nginx.ingress.kubernetes.io/*`).
   - Configurar `ingressClassName: traefik`.
   - Para ArgoCD, configurar `traefik.ingress.kubernetes.io/router.entrypoints: websecure` y `traefik.ingress.kubernetes.io/router.tls: "true"` o `traefik.ingress.kubernetes.io/service.serversscheme: https`.
3. **Apache APISIX Gateway:**
   - Helm chart oficial: `apisix/apisix` (repo: `https://apache.github.io/apisix-helm-chart`).
   - Archivo de valores: `templates/apisix-values.yaml` configurado en modo ligero para Kind.
4. **Orquestación (`init.sh`, `init.ps1`, `Makefile`):**
   - Actualizar comandos CLI: `traefik` (alias `ingress`), `apisix`, y flujo global `all`.
5. **Verificación & Calidad:**
   - Validar sintaxis de archivos YAML con linters.
   - Validar sintaxis de scripts Bash y PowerShell.

---

## 2. Desglose de Tareas Atómicas

### Tarea 1: Plantillas de Valores Helm para Traefik y APISIX
- **Owner:** Antigravity Agent
- **Estimate:** S
- **Deps:** Ninguna
- **Covers:** AC-01, AC-03
- **Files:** `templates/traefik-values.yaml`, `templates/apisix-values.yaml`
- **Verify Command:** `yq e '.' templates/traefik-values.yaml`, `yq e '.' templates/apisix-values.yaml`
- **Resultado Esperado:** Manifiestos YAML válidos y bien formados.

### Tarea 2: Adaptación de Ingress Manifests para Traefik
- **Owner:** Antigravity Agent
- **Estimate:** S
- **Deps:** Tarea 1
- **Covers:** AC-02
- **Files:** `ingress/argocd.ingress.yaml`, `ingress/kafka-ui.ingress.yaml`
- **Verify Command:** `yq e '.' ingress/kafka-ui.ingress.yaml`, `yq e '.' ingress/argocd.ingress.yaml`
- **Resultado Esperado:** Ingress resources con `ingressClassName: traefik` sin anotaciones obsoletas de Nginx.

### Tarea 3: Actualización de Orquestadores (`init.sh`, `init.ps1`, `Makefile`)
- **Owner:** Antigravity Agent
- **Estimate:** M
- **Deps:** Tarea 1, Tarea 2
- **Covers:** AC-01, AC-03, AC-04
- **Files:** `init.sh`, `init.ps1`, `Makefile`
- **Verify Command:** `pwsh -Command "& { & .\init.ps1 -Help }"` y validación estática de sintaxis.
- **Resultado Esperado:** Funciones `install_traefik` / `Install-Traefik` y `install_apisix` / `Install-Apisix` operativas e integradas en `all`.

### Tarea 4: Actualización de Documentación y Directrices
- **Owner:** Antigravity Agent
- **Estimate:** S
- **Deps:** Tarea 3
- **Covers:** AC-01, AC-02, AC-03, AC-04
- **Files:** `README.md`, `AGENTS.md`, `CHANGELOG.md`
- **Verify Command:** Revisión visual y diff de documentación.
- **Resultado Esperado:** Diagramas ASCII, tablas de endpoints y puertos reflejando Traefik y APISIX.

---

## 3. Matriz de Trazabilidad

| Criterio de Aceptación (AC) | Tareas | Verificación |
| :--- | :--- | :--- |
| **AC-01** (Traefik en 80/443 de Kind) | Tarea 1, Tarea 3 | Configuración `hostPort` en `templates/traefik-values.yaml` y llamada en scripts. |
| **AC-02** (Rutas Kafka UI y ArgoCD) | Tarea 2 | Manifiestos con `ingressClassName: traefik` compatibles con Traefik v3. |
| **AC-03** (Apache APISIX Gateway) | Tarea 1, Tarea 3 | Configuración y función de despliegue en `ingress-apisix`. |
| **AC-04** (Idempotencia y CLI) | Tarea 3 | Subcomandos ejecutables sin errores interactivos. |

---

## 4. Rollout & Observability
- **Rollout:** N/A — Entorno local de desarrollo.
- **Observability:** Traefik Dashboard expuesto opcionalmente vía port-forward (`http://localhost:9000/dashboard/`) o Ingress local.
