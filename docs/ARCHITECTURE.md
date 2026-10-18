# Guía de Arquitectura del Stack y Funcionamiento de Componentes

Este documento detalla la arquitectura completa de **kind-cluster-deployment**, explicando el propósito específico, la función y la interacción de cada una de las piezas que componen el entorno de desarrollo local.

---

## 1. Visión General del Stack

El objetivo de esta infraestructura es proporcionar un entorno de Kubernetes local idéntico conceptualmente a un clúster de producción en la nube (AWS EKS, GCP GKE o Azure AKS), sin incurrir en costes de infraestructura ni latencias de despliegue remoto.

```
                                 [ HOST (Tu Máquina) ]
                         127.0.0.1 *.local / localhost:ports
                                          │
                 ┌────────────────────────┴────────────────────────┐
                 │                                                 │
        [ Puertos 80 / 443 ]                            [ Puertos Directos Docker ]
                 │                                                 │
                 ▼                                                 ▼
    ┌───────────────────────────┐                     ┌──────────────────────────┐
    │  Traefik Ingress (Kind)   │                     │ Docker Network ("kind")  │
    └────────────┬──────────────┘                     ├──────────────────────────┤
                 │                                    │ • Zot OCI Registry :5000 │
                 ├─────────────────────────┐          │ • MongoDB :37017 / 27017 │
                 ▼                         ▼          └──────────────────────────┘
    ┌──────────────────────────┐ ┌──────────────────┐
    │     Apache APISIX        │ │ Aplicaciones Web │
    │   (API Gateway L7)       │ │ y Paneles        │
    └────────────┬─────────────┘ ├──────────────────┤
                 │               │ • Dashboard Hub  │
                 ▼               │ • Headlamp K8s   │
     [ Microservicios / APIs ]   │ • ArgoCD Web UI  │
                 │               │ • Kafka UI       │
                 ▼               └──────────────────┘
    ┌──────────────────────────┐
    │  Strimzi Kafka (KRaft)   │
    │  (Bus de Eventos Async)  │
    └──────────────────────────┘
```

---

## 2. Detalle de Piezas y Función en el Stack

> 📖 **Guías Monográficas:** Para configuraciones avanzadas, troubleshooting paso a paso y ejemplos de código por componente, consulta las guías dedicadas en [`docs/components/`](components/):
> - [Traefik Ingress & Apache APISIX Gateway](components/ingress-and-gateway.md)
> - [Strimzi Kafka KRaft & Kafka UI](components/kafka-event-stream.md)
> - [ArgoCD GitOps Continuous Delivery](components/argocd-gitops.md)
> - [Headlamp Explorer, Metrics-Server & Dashboard Hub](components/observability-and-dashboard.md)
> - [Zot OCI Registry con Trivy & MongoDB](components/storage-and-registry.md)
> - [Asistente DNS Local & Hosts Resolution](DNS-GUIDE.md)

### 2.1 Kind (Kubernetes in Docker) & `kind.config.yaml`
- **¿Qué es?**: Un orquestador que ejecuta nodos de Kubernetes como contenedores Docker independientes.
- **Función en el stack**: Es el núcleo sobre el que corre todo. Actúa como plano de control (Control Plane) y worker.
- **Configuración clave**:
  - Etiqueta `ingress-ready=true` en el nodo para programar los controladores Ingress.
  - Mapeo de `extraPortMappings` para exponer directamente los puertos `80` (HTTP) y `443` (HTTPS) del contenedor del nodo hacia `127.0.0.1` de tu máquina host.

### 2.2 Traefik Ingress Controller
- **Namespace**: `traefik`
- **¿Qué es?**: Proxy inverso de borde (Edge Ingress) moderno, ligero y nativo de Kubernetes.
- **Función en el stack**:
  - Escucha en los puertos del host `80` y `443` mediante `hostPort`.
  - Recibe todo el tráfico entrante hacia los dominios `*.local` e inspecciona la cabecera `Host` HTTP.
  - Enruta cada petición al servicio interno de Kubernetes correspondiente (Dashboard, Headlamp, Kafka UI, ArgoCD, Zot Registry o APISIX).
  - Aplica middlewares de seguridad como cabeceras HTTPS y saneamiento básico.

### 2.3 Apache APISIX (API Gateway)
- **Namespace**: `ingress-apisix`
- **¿Qué es?**: Un API Gateway cloud-native de ultra alto rendimiento basado en NGINX y LuaJIT.
- **Función en el stack**:
  - Actúa como puerta de enlace interna/L7 para APIs y microservicios que despliegues en el clúster.
  - Ofrece capacidades avanzadas de enrutamiento que un Ingress estándar no provee: rate limiting, autenticación JWT/OAuth, reescritura de URLs, canary releases, circuit breaking y observabilidad por ruta.
  - Accesible en `http://apisix.local`.

### 2.4 Strimzi Kafka (KRaft Mode) & Kafka UI
- **Namespace**: `kafka`
- **¿Qué es?**: El operador de Kubernetes estándar para desplegar y gestionar Apache Kafka de forma nativa declarativa.
- **Función en el stack**:
  - **Apache Kafka en modo KRaft**: Funciona sin dependencias externas de Apache ZooKeeper, lo que reduce drásticamente el consumo de memoria RAM y CPU en tu equipo local.
  - **Backbone de mensajería**: Permite desarrollar, probar e integrar microservicios basados en eventos (Event-Driven Architecture), pub/sub o streaming reactivo.
  - **Kafka UI**: Panel de administración visual accesible en `http://kafka-ui.local`. Permite inspeccionar tópicos, producir mensajes manuales, visualizar consumidores y monitorizar particiones.

### 2.5 Zot OCI Registry con Escaneo Trivy
- **Red Docker**: `kind` | **Puerto host**: `localhost:5000` | **Host Ingress**: `http://registry.local`
- **¿Qué es?**: Un registro de imágenes OCI conforme con las especificaciones de Open Containers, con interfaz web integrada y motor de seguridad.
- **Función en el stack**:
  - Permite hacer `docker push localhost:5000/tu-servicio:v1` sin necesidad de subir imágenes a Docker Hub o registros remotos.
  - Los nodos de Kind descargan directamente desde este registro local con latencia cero y sin consumir ancho de banda de internet.
  - Incorpora interfaz gráfica moderna y escaneo de vulnerabilidades en tiempo real para tus imágenes mediante Trivy.

### 2.6 ArgoCD (GitOps Controller)
- **Namespace**: `argocd` | **Host Ingress**: `https://argocd.local`
- **¿Qué es?**: La herramienta líder declarativa para entrega continua basada en GitOps sobre Kubernetes.
- **Función en el stack**:
  - Permite conectar repositorios Git locales o remotos y sincronizar de forma autónoma manifiestos y Helm charts en el clúster.
  - Facilita probar flujos de CI/CD reales donde el clúster converge automáticamente con el estado deseado en Git.

### 2.7 Observabilidad: Headlamp K8s Explorer & Metrics-Server
- **Namespaces**: `headlamp` y `kube-system` | **Host Ingress**: `http://headlamp.local`
- **¿Qué es?**: Un explorador de clúster Kubernetes moderno con UI limpia junto con el recolector de métricas de CPU/RAM.
- **Función en el stack**:
  - **Metrics-Server**: Habilita comandos como `kubectl top nodes` y `kubectl top pods`, necesarios también para el autoescalado horizontal (HPA).
  - **Headlamp**: Proporciona visualización en tiempo real de Pods, Deployments, StatefulSets, Custom Resources (CRDs de Strimzi/APISIX), visor de logs en vivo y terminal web interactiva en cada contenedor.

### 2.8 Control Panel Dashboard Hub
- **Namespace**: `default` | **Host Ingress**: `http://dashboard.local`
- **¿Qué es?**: Landing page centralizada desplegada en el clúster que reúne todos los servicios y accesos directos.
- **Función en el stack**:
  - Punto de entrada unificado para el desarrollador: muestra enlaces directos con un solo clic a ArgoCD, Headlamp, Kafka UI, Zot Registry y APISIX.
  - Consulta dinámicamente el estado del clúster e informa de las URLs y comandos de conexión rápidos.

### 2.9 MongoDB (Contenedor Standalone Enlazado)
- **Red Docker**: `kind` | **Puerto host**: `localhost:37017` (interno `27017`)
- **¿Qué es?**: Base de datos documental NoSQL.
- **Función en el stack**:
  - Ejecutada en la misma red Docker (`kind`) para permitir persistencia de datos rápida para microservicios y mocks sin sobrecargar el etcd interno del clúster.
  - Accesible desde pods de Kubernetes mediante el host o alias DNS de red y desde tu entorno local (Compass, mongosh, VSCode) en `mongodb://localhost:37017`.

---

## 3. Matriz de Conectividad y Redes

| Pieza | Acceso Externo (Host) | Acceso Interno (Kubernetes) | Protocolo / Propósito |
| :--- | :--- | :--- | :--- |
| **Traefik Ingress** | `http://<dominio>.local` (:80, :443) | `traefik.traefik.svc:80` | Proxy Inverso L4/L7 |
| **APISIX Gateway** | `http://apisix.local` | `apisix-gateway.ingress-apisix.svc:9080` | API Gateway para microservicios |
| **Kafka Broker** | (Vía Ingress o port-forward) | `kafka-cluster-kafka-bootstrap.kafka.svc:9092` | Broker Kafka (KRaft sin ZooKeeper) |
| **Kafka UI** | `http://kafka-ui.local` | `kafka-ui.kafka.svc:80` | Dashboard web de gestión Kafka |
| **ArgoCD Server** | `https://argocd.local` | `argocd-server.argocd.svc:443` | GitOps UI y API |
| **Headlamp Explorer** | `http://headlamp.local` | `headlamp.headlamp.svc:80` | Consola visual de recursos K8s |
| **Zot Registry** | `http://registry.local` / `localhost:5000` | Red Docker `kind` (`kind-registry:5000`) | Registro de imágenes Docker local |
| **MongoDB** | `localhost:37017` | Red Docker `kind` (`kind-mongodb:27017`) | Almacén NoSQL persistente |
| **Dashboard Hub** | `http://dashboard.local` | `cluster-dashboard.default.svc:8088` | Hub de bienvenida y accesos directos |
