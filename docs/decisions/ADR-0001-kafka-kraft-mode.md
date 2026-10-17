# ADR-0001: Migración a Apache Kafka en modo KRaft (Strimzi)

- **Estado:** accepted
- **Fecha:** 2026-10-17
- **Decisores:** Antigravity Agent, Jose Miguel
- **Categoría:** Arquitectura de Datos / Contenedores

---

## 1. Contexto y Problema

En el despliegue local actual del repositorio sobre Kind, Apache Kafka se ejecuta con Strimzi v1beta2 dependiendo de ZooKeeper para la gestión de metadatos de cluster y consensos (`templates/kafka-broker.config.yaml`). 

Esto ocasiona los siguientes problemas:
1. **Sobrecarga de recursos locales:** Despliega dos conjuntos de pods basados en JVM (ZooKeeper + Kafka Broker), consumiendo entre 400MB y 600MB adicionales de memoria RAM en el motor de Docker.
2. **Obsolescencia tecnológica:** Apache Kafka deprecó formalmente ZooKeeper a través de KIP-500. Strimzi (en versiones >= 0.40) ha priorizado el modo KRaft (Kafka Raft Metadata) y en futuras versiones el soporte de ZooKeeper será eliminado.

---

## 2. Decisión

Adoptar **KRaft (Kafka Raft Metadata mode)** usando Strimzi con rol combinado (`broker` y `controller`) en un único nodo efímero para desarrollo local en Kind.

Específicamente:
- Habilitar la anotación/flag KRaft en el recurso `Kafka` de Strimzi (`strimzi.io/kraft: "enabled"`).
- Emplear `KafkaNodePool` con roles `[broker, controller]` o la especificación directa KRaft v1beta2 sin la sección `zookeeper`.
- Eliminar la dependencia y espera de pods ZooKeeper en `init.sh`.

---

## 3. Alternativas Evaluadas

### Opción 1: Mantener ZooKeeper (Estado Actual)
- **Pros:** Sin cambios inmediatos requeridos en los templates existentes.
- **Contras:** 
  - Mayor consumo de recursos en local.
  - Deuda técnica acumulada.
  - Incompatibilidad con las directrices de `AGENTS.md` ("Prefer modern Kafka configurations (e.g. KRaft mode in future Strimzi releases) over legacy ZooKeeper topologies").

### Opción 2: KRaft con rol combinado Broker + Controller (Elegida)
- **Pros:**
  - Reduce significativamente la huella de memoria y CPU en Docker Desktop / colima.
  - Elimina el StatefulSet de ZooKeeper.
  - Alineado con las mejores prácticas oficiales de Apache Kafka y Strimzi.
- **Contras:**
  - Requiere asegurar que el operador Strimzi instalado por Helm sea v0.40 o superior.

---

## 4. Consecuencias

### Positivas:
- Menor tiempo de arranque del stack Kafka en `./init.sh kafka` o `./init.sh all`.
- Ahorro de memoria para otros componentes locales (ArgoCD, MongoDB, Ingress).
- Alineación 100% con los estándares de la comunidad Kubernetes / Cloud Native.

### Negativas / Mitigaciones:
- El operador Strimzi debe tener activada la feature gate de KRaft si se usan versiones donde todavía no sea GA por defecto (en versiones recientes de Strimzi ya es el estándar).

---

## 5. Trazabilidad

- **Especificación asociada:** `docs/specs/SPEC-0001-kafka-kraft-migration.md`
- **Archivos impactados:**
  - `templates/kafka-broker.config.yaml`
  - `init.sh`
  - `README.md`
  - `AGENTS.md`
