# Event-Driven Architecture: Strimzi Kafka (KRaft) & Kafka UI

Esta guía describe el funcionamiento, la arquitectura interna y la operativa del clúster de mensajería y eventos Apache Kafka integrado en el entorno local Kind.

---

## 1. Visión y Función en el Stack

Apache Kafka actúa como el **bus de eventos asíncrono y reactivo** del stack, permitiendo desacoplar microservicios, diseñar arquitecturas orientadas a eventos (Event-Driven), pipelines de datos y colas pub/sub.

Para optimizar recursos en tu equipo local, el broker opera en **modo KRaft (Kafka Raft Metadata mode)** gestionado de forma declarativa mediante el **Strimzi Cluster Operator**:
- **Sin ZooKeeper:** Elimina pods de ZooKeeper, ahorrando entre 1 y 2 GB de memoria RAM.
- **Rápido arranque:** El ciclo de inicio del broker es casi instantáneo.
- **Declarativo:** La creación de brokers y tópicos se realiza mediante Custom Resource Definitions (CRDs) de Kubernetes (`Kafka`, `KafkaTopic`).

---

## 2. Componentes Desplegados

| Componente | Namespace | Recurso Kubernetes | Función |
| :--- | :--- | :--- | :--- |
| **Strimzi Cluster Operator** | `kafka` | Deployment `strimzi-cluster-operator` | Vigila los CRDs `Kafka` y concilia el estado de los brokers. |
| **Kafka Broker (KRaft)** | `kafka` | Pod `kafka-cluster-dual-role-0` | Broker con rol dual (Controller + Broker). Almacenamiento efímero en memoria/disco del nodo. |
| **Kafka UI (Kafbat)** | `kafka` | Deployment `kafka-ui` | Consola visual para inspeccionar tópicos, mensajes, esquemas y consumidores. |
| **Kafka UI Ingress** | `kafka` | Ingress `kafka-ui` | Enruta el tráfico desde `http://kafka-ui.local` vía Traefik. |

---

## 3. Despliegue y Comandos

### Despliegue vía CLI
```bash
npm start kafka
```

El script [`cli/src/modules/kafka.js`](../../cli/src/modules/kafka.js):
1. Asegura el namespace `kafka`.
2. Instala el operador Strimzi mediante su Helm Chart oficial.
3. Aplica la definición del broker [`templates/kafka-broker.config.yaml`](../../templates/kafka-broker.config.yaml).
4. Espera a que la condición `Ready` del recurso `Kafka` sea verdadera (`kubectl wait kafka/kafka-cluster --for=condition=Ready`).
5. Despliega Kafka UI y aplica su Ingress [`ingress/kafka-ui.ingress.yaml`](../../ingress/kafka-ui.ingress.yaml).

---

## 4. Cómo Conectarse desde tus Microservicios

### 4.1 Conexión Interna (Desde Pods dentro de Kubernetes)
Los microservicios desplegados en el clúster deben usar la siguiente cadena de bootstrap:

```text
kafka-cluster-kafka-bootstrap.kafka.svc:9092
```

### 4.2 Conexión Externa (Desde tu máquina Host fuera de Kind)
Si ejecutas una aplicación localmente en tu IDE o terminal (Node.js, Java, Python, Go):
```bash
kubectl port-forward -n kafka svc/kafka-cluster-kafka-bootstrap 9092:9092
```
Cadena de conexión: `localhost:9092`.

---

## 5. Pruebas y Skill Automatizada (`kafka-traffic-tester`)

El repositorio incluye una skill especializada para inyectar tráfico y validar el broker sin instalar binarios de Kafka en tu máquina host:

```bash
# Consulta las instrucciones en:
.agent/skills/kafka-traffic-tester/SKILL.md
```

### Producir y consumir mensajes manualmente con pods efímeros:
```bash
# Producir un mensaje de prueba:
kubectl run kafka-producer -n kafka -i --rm --image=quay.io/strimzi/kafka:0.41.0-kafka-3.7.0 --restart=Never \
  -- bin/kafka-console-producer.sh --bootstrap-server kafka-cluster-kafka-bootstrap:9092 --topic test-topic

# Consumir el mensaje:
kubectl run kafka-consumer -n kafka -i --rm --image=quay.io/strimzi/kafka:0.41.0-kafka-3.7.0 --restart=Never \
  -- bin/kafka-console-consumer.sh --bootstrap-server kafka-cluster-kafka-bootstrap:9092 --topic test-topic --from-beginning
```
Luego visita `http://kafka-ui.local` para verificar el mensaje en la interfaz gráfica.
