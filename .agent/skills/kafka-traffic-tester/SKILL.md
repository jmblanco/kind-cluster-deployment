---
name: kafka-traffic-tester
description: >-
  Pruebas de conectividad e inyección de eventos en Apache Kafka (Strimzi KRaft mode).
  Crea tópicos efímeros, envía mensajes con un productor de prueba y verifica su recepción
  con un consumidor o en la interfaz web de Kafka UI (http://kafka-ui.local).
argument-hint: "[nombre-topico] [mensaje]"
triggers:
  - user
  - model
---

# Kafka Traffic Tester

Herramienta para validar rápidamente el ciclo de vida de eventos, topics y flujos pub/sub sobre el broker de Apache Kafka (Strimzi KRaft) desplegado en el cluster local.

## Cuándo Usar Esta Skill
- Verificar que el broker de Kafka está listo para aceptar lecturas y escrituras.
- Probar un topic de mensajería sin tener instaladas las utilidades de consola de Kafka (`kafka-console-producer.sh`) en el host.
- Generar datos sintéticos para validar visualmente la llegada de eventos en [Kafka UI](http://kafka-ui.local).
- Validar conectividad de red interna entre namespaces (`default` -> `kafka`).

---

## Procedimiento de Pruebas

### 1. Creación Declarativa de Tópicos (Vía CRD Strimzi)
Para crear un nuevo topic de forma idempotente en el cluster:

```bash
cat <<EOF | kubectl apply -f -
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: test-events
  namespace: kafka
  labels:
    strimzi.io/cluster: kafka-cluster
spec:
  partitions: 3
  replicas: 1
  config:
    retention.ms: 7200000
    segment.bytes: 1073741824
EOF
```

Verificar que el operador ha reconciliado el topic:
```bash
kubectl get kafkatopics -n kafka
```

### 2. Envío de Mensajes de Prueba (Producer Efímero)
Inyectar uno o varios mensajes JSON en el topic utilizando una imagen ligera de Kafka dentro del cluster:

```bash
kubectl run kafka-test-producer --rm -i --restart='Never' \
  --image=quay.io/strimzi/kafka:0.45.0-kafka-3.8.0 \
  --namespace=kafka \
  -- bin/kafka-console-producer.sh \
  --bootstrap-server kafka-cluster-kafka-bootstrap.kafka.svc:9092 \
  --topic test-events <<EOF
{"eventId": "evt-001", "type": "ORDER_CREATED", "amount": 100.50, "timestamp": "2026-10-17T14:00:00Z"}
{"eventId": "evt-002", "type": "ORDER_PAID", "amount": 100.50, "timestamp": "2026-10-17T14:00:05Z"}
EOF
```

### 3. Consumo y Validación de Mensajes (Consumer Efímero)
Leer los mensajes desde el principio (`--from-beginning`) para confirmar la persistencia y orden en las particiones:

```bash
kubectl run kafka-test-consumer --rm -i --restart='Never' \
  --image=quay.io/strimzi/kafka:0.45.0-kafka-3.8.0 \
  --namespace=kafka \
  -- bin/kafka-console-consumer.sh \
  --bootstrap-server kafka-cluster-kafka-bootstrap.kafka.svc:9092 \
  --topic test-events \
  --from-beginning \
  --max-messages 2 \
  --timeout-ms 10000
```

### 4. Verificación en Kafka UI
1. Abrir en el navegador del host:
   [http://kafka-ui.local](http://kafka-ui.local)
2. Navegar a:
   `Dashboard` -> `Topics` -> `test-events` -> pestaña `Messages`.
3. Confirmar que los payloads y las marcas de tiempo coinciden exactamente con los generados en el paso 2.

### 5. Limpieza de Recursos de Prueba
```bash
kubectl delete kafkatopic test-events -n kafka 2>/dev/null || true
```
