# SDD Spec: Migración de Strimzi Kafka a Modo KRaft (Sin ZooKeeper)

- **ID:** `SPEC-0001-kafka-kraft-migration`
- **Estado:** `closed`
- **Talla Estimada:** `S`
- **Fecha:** 2026-10-17
- **ADR Relacionado:** [ADR-0001: Migración a Apache Kafka en modo KRaft](../decisions/ADR-0001-kafka-kraft-mode.md)

---

## 1. Contexto y Problema

Actualmente, [templates/kafka-broker.config.yaml](../../templates/kafka-broker.config.yaml) despliega Apache Kafka en modo dependiente de ZooKeeper (`zookeeper.replicas: 1`).
Apache Kafka ha marcado ZooKeeper como deprecado (KIP-500) y en las versiones modernas de Strimzi la arquitectura estándar es **KRaft (Kafka Raft Metadata mode)** con roles combinados (`broker` y `controller`).

### Objetivos:
1. Eliminar la dependencia del pod y StatefulSet de ZooKeeper.
2. Adoptar la especificación moderna de Strimzi con KRaft habilitado.
3. Mantener compatibilidad transparente con Kafka UI (`http://kafka-ui.local`) y la automatización en `./init.sh kafka`.

---

## 2. Alcance

### Scope IN
- Actualizar `templates/kafka-broker.config.yaml` (y `KafkaNodePool` si aplica a la versión de Strimzi) para habilitar modo KRaft (1 réplica efímera con roles `broker` y `controller`).
- Validar y asegurar que `init.sh` gestiona adecuadamente la espera y verificación de Kafka KRaft antes de arrancar Kafka UI.
- Actualizar documentación de arquitectura en `README.md` y directrices en `AGENTS.md`.

### Scope OUT
- Migración de datos persistentes o tópicos existentes (el cluster local está explícitamente configurado con `storage: ephemeral`).
- Topologías multi-nodo o HA para producción.

---

## 3. Criterios de Aceptación (Given / When / Then)

- **AC-01: Manifiesto Kafka KRaft Válido**
  - **Given** un cluster Kind con el operador Strimzi instalado,
  - **When** se aplica el manifiesto `templates/kafka-broker.config.yaml`,
  - **Then** el recurso Custom Resource `Kafka` se crea con la metadata KRaft habilitada y sin sección `zookeeper`.

- **AC-02: Disponibilidad y Pods sin ZooKeeper**
  - **Given** el despliegue de Kafka en el namespace `kafka`,
  - **When** se inspeccionan los pods en ejecución (`kubectl get pods -n kafka`),
  - **Then** existe el pod del broker (`kafka-cluster-dual-role-0` o `kafka-cluster-kafka-0`), reporta estado `Ready`, y no existe ningún pod con prefijo `*-zookeeper-*`.

- **AC-03: Conectividad con Kafka UI**
  - **Given** el cluster Kafka en modo KRaft en estado `Ready`,
  - **When** Kafka UI se despliega mediante `init.sh kafka`,
  - **Then** Kafka UI se conecta con éxito al bootstrap server `kafka-cluster-kafka-bootstrap.kafka.svc:9092` y la interfaz web responde por Ingress sin errores de cluster.

- **AC-04: Idempotencia y Cleanup en CLI**
  - **Given** `./init.sh kafka` o `./init.sh all`,
  - **When** se ejecuta el script en un entorno limpio o ya aprovisionado,
  - **Then** no se producen errores de espera ni conflictos de manifiestos obsoletos de ZooKeeper.

---

## 4. Matriz de Trazabilidad

| ID AC | Requisito / Fuente | Componentes Afectados |
| :--- | :--- | :--- |
| **AC-01** | Directriz AGENTS.md §6 ("Prefer modern Kafka configurations (KRaft)") | `templates/kafka-broker.config.yaml` |
| **AC-02** | Reducción de huella Kind y KIP-500 | Operador Strimzi, pods `kafka` |
| **AC-03** | Endpoints de desarrollo local (`AGENTS.md` §5) | `init.sh`, `ingress/kafka-ui.ingress.yaml` |
| **AC-04** | Idempotencia y scripts CLI | `init.sh` |

---

## 5. Non-Functional Requirements (NFRs)
- **Consumo de Recursos:** Reducción de ~300MB a 500MB de RAM en Docker al suprimir el proceso y JVM de ZooKeeper.
- **Seguridad:** Mantener listeners internos protegidos (`plain` y `tls`) sin exposición externa innecesaria fuera del cluster Kind.
- **Compatibilidad:** Strimzi Operator v0.40+.
