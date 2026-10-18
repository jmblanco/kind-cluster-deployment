# SDD Plan: Actualización de Versiones Estables, Auditoría de Seguridad y Despliegue Local

- **Spec Asociada:** SPEC-0002 & Tarea de Modernización de Versiones
- **ADR Asociado:** [docs/decisions/ADR-0003-stable-versions-upgrade-and-kafbat.md](../decisions/ADR-0003-stable-versions-upgrade-and-kafbat.md)
- **Estado:** completed
- **Talla Global:** M

---

## 1. Desglose de Tareas

### Tarea 1: Actualización de Manifiestos y Scripts a Últimas Versiones Estables
- **Owner:** Antigravity Agent
- **Estimate:** S
- **Files:** `init.sh`, `init.ps1`, `templates/kafka-broker.config.yaml`
- **Acciones:**
  - Cambiar repo Kafka UI a `kafbat` (`https://ui.charts.kafbat.io`) y chart `kafbat/kafka-ui`.
  - Cambiar ArgoCD manifest a canal `stable`.
  - Promocionar MongoDB a `mongo:8.0`.

### Tarea 2: Auditoría y Validaciones de Seguridad (Raptor Auditor)
- **Owner:** raptor_security_auditor
- **Estimate:** S
- **Files:** `templates/`, `ingress/`, `init.sh`, `init.ps1`
- **Acciones:**
  - Verificar aislamiento de red (loopback 127.0.0.1).
  - Comprobar flags de contención (`no-new-privileges`, limits).
  - Validar ausencia de secretos hardcodeados o expuestos.

### Tarea 3: Verificación y Despliegue en Local
- **Owner:** Antigravity Agent
- **Estimate:** M
- **Acciones:**
  - Comprobar disponibilidad de Docker y herramientas.
  - Ejecutar `./init.ps1 check` o `./init.sh check`.
  - Intentar creación del clúster y despliegue local paso a paso.
