# SDD Plan: Migración de Strimzi Kafka a KRaft

- **Spec Asociada:** [docs/specs/SPEC-0001-kafka-kraft-migration.md](../specs/SPEC-0001-kafka-kraft-migration.md)
- **ADR Asociado:** [docs/decisions/ADR-0001-kafka-kraft-mode.md](../decisions/ADR-0001-kafka-kraft-mode.md)
- **Estado:** completed
- **Talla Global:** S

---

## 1. Estrategia & Arquitectura de Implementación

1. **Configuración Declarativa Strimzi KRaft:**
   - En Strimzi moderno (v0.40+), el modo KRaft se activa mediante la anotación `strimzi.io/kraft: "enabled"` en el recurso `Kafka` v1beta2 o vía recurso `KafkaNodePool`.
   - Para un entorno local en Kind de un solo broker, se implementa una configuración unificada donde el nodo asume roles de `broker` y `controller`, suprimiendo la clave `zookeeper`.
2. **Orquestador `./init.sh`:**
   - Mantener el comando `kubectl wait` para la condición `Ready` del recurso Kafka.
   - Ajustar las validaciones si fuese necesario para no esperar pods de ZooKeeper.
3. **Documentación:**
   - Actualizar el diagrama ASCII de [README.md](../../README.md) y las tablas de componentes en [AGENTS.md](../../AGENTS.md).

---

## 2. Desglose de Tareas Atómicas

### Tarea 1: Refactor de Manifiesto Kafka KRaft
- **Owner:** Antigravity Agent
- **Estimate:** S
- **Deps:** Ninguna
- **Covers:** AC-01, AC-02
- **Files:** `templates/kafka-broker.config.yaml`
- **Verify Command:** `yq e '.' templates/kafka-broker.config.yaml`
- **Resultado Esperado:** Manifiesto YAML válido, con `strimzi.io/kraft: "enabled"`, sin sección `zookeeper`.

### Tarea 2: Validación y Ajuste en `init.sh`
- **Owner:** Antigravity Agent
- **Estimate:** S
- **Deps:** Tarea 1
- **Covers:** AC-03, AC-04
- **Files:** `init.sh`
- **Verify Command:** `bash -n init.sh` (sintaxis Bash limpia)
- **Resultado Esperado:** Script libre de errores de sintaxis y timeouts, con despliegue de Kafka UI apuntando al listener KRaft.

### Tarea 3: Actualización de Diagramas y Documentación
- **Owner:** Antigravity Agent
- **Estimate:** S
- **Deps:** Tarea 1, Tarea 2
- **Covers:** AC-01, AC-02, AC-03
- **Files:** `README.md`, `AGENTS.md`
- **Verify Command:** Inspección de diferencias en `README.md`
- **Resultado Esperado:** Diagramas y tabla de arquitectura reflejan Kafka en modo KRaft (sin ZooKeeper).

---

## 3. Matriz de Trazabilidad (Trace Matrix)

| Criterio de Aceptación (AC) | Tarea que lo cubre | Verificación |
| :--- | :--- | :--- |
| **AC-01** (Manifiesto KRaft Válido) | Tarea 1 | `yq` valida sintaxis y ausencia de bloque `zookeeper`. |
| **AC-02** (Pods sin ZooKeeper) | Tarea 1, Tarea 2 | Despliegue en cluster no instancia pods ZK. |
| **AC-03** (Conexión Kafka UI) | Tarea 2 | Configuración de Kafka UI apunta a `kafka-cluster-kafka-bootstrap.kafka.svc:9092`. |
| **AC-04** (Idempotencia en CLI) | Tarea 2 | Ejecución no interactiva de `./init.sh kafka` sin fallos. |

---

## 4. Rollout & Observability
- **Rollout:** N/A — Entorno de desarrollo local Kind efímero (`storage: ephemeral`).
- **Observability:** N/A — La observabilidad local se realiza a través de `kubectl logs` y de la interfaz web [Kafka UI](http://kafka-ui.local).
