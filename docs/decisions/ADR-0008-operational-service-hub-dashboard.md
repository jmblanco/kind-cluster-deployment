# Architecture Decision Record: ADR-0008
# Local Operational Service Hub & Developer Portal (Cluster Dashboard Evolution)

## Status
Accepted

## Context
El clúster Kind local integra servicios clave de plataforma (Strimzi Kafka, Traefik, APISIX, ArgoCD, Headlamp, MongoDB y Zot Registry).
Sin embargo, el panel de control inicial (`dashboard.local`) funcionaba meramente como un visualizador de enlaces estáticos con un listado plano de pods.
Para responder a las necesidades de desarrolladores de microservicios y DevOps en entornos locales, el dashboard debe transformarse en un **Centro de Servicios Operativos e Internal Developer Portal (IDP) ligero**:
1. Inspección y telemetría de recursos en tiempo real (CPU, RAM, cuotas) aprovechando `metrics-server`.
2. Developer Connection & Credentials Hub (snippets instantáneos de conexión para bases de datos, brokers Kafka y registros OCI).
3. Monitoreo de salud activa con latencia HTTP/TCP (RTT) para cada endpoint de la plataforma.
4. Introspección y auditoría de eventos de Kubernetes (`Warning`, `CrashLoop`, `OOMKilled`) y logs flash sin salir del navegador.

## Alternativas Evaluadas

1. **Desplegar Backstage (Spotify CNCF):**
   - *Pros:* Ecosistema completo de plugins y software catalog.
   - *Contras:* Excesivamente pesado para un clúster local de desarrollo (requiere Node.js + backend Postgres, consumiendo > 1.2 GB RAM y tardando varios minutos en inicializar).

2. **Desplegar Homepage / Dashy / Glance pre-empaquetados:**
   - *Pros:* Visualmente atractivos, configuración declarativa en YAML.
   - *Contras:* Requieren dependencias adicionales, no exponen directamente las acciones personalizadas del ecosistema del repo (Zot, MongoDB, Kafka KRaft, APISIX) ni se integran de forma nativa con los scripts del CLI local y la extracción de credenciales de ArgoCD/Kind.

3. **Evolucionar el Cluster Dashboard Nativo (Python 3.12 Alpine + Vanilla Modern Web):**
   - *Pros:*
     - Huella de memoria mínima (< 30 MB de RAM y < 2% de CPU).
     - Sin dependencias complejas (cero paquetes pesados de Node o bases de datos extra).
     - Integración directa con el Kubernetes API Server mediante ServiceAccount interno (`/apis/metrics.k8s.io`, `/api/v1/events`, `/api/v1/pods/logs`).
     - Personalización total para incluir Developer Hub, latency checks y acciones operativas.
   - *Contras:* Requiere mantener el frontend nativo y los endpoints en `server.py`.

## Decisión
Se decide evolucionar el **Cluster Dashboard nativo** a la versión **`v2.0.0`**, dotándolo de:
1. **Telemetría de Recursos:** Consumo de CPU y Memoria del nodo Kind y Top Consumers mediante `metrics.k8s.io`.
2. **Developer Hub (Quick Connect & Snippets):** Panel interactivo con variables de entorno, cadenas de conexión (MongoDB, Kafka, Zot Registry, ArgoCD) y botón de copiado al portapapeles.
3. **Active Health & Latency:** Sondeo en vivo de tiempo de respuesta (ms) y códigos HTTP para cada servicio.
4. **Ops & Troubleshooting Console:** Visor de eventos del clúster (`k8s Events`) con clasificación por severidad, buscador de pods con filtro por Namespace/Estado, y visor flash de logs recientes.
5. **UI Tabbed Ergonomía Cloud:** Navegación por pestañas: `[Servicios & Plataforma]`, `[Métricas & Telemetría]`, `[Developer Hub]`, `[Eventos & Logs]`.

## Consecuencias y Trade-offs
- Se actualiza el `ClusterRoleBinding` del ServiceAccount `cluster-dashboard` para otorgar acceso a `metrics.k8s.io` y `events`.
- Se reconstruye la imagen local del dashboard bajo la etiqueta `localhost:5000/cluster-dashboard:v2.0.0`.
- El desarrollador dispone de un centro de mandos unificado donde copiar credenciales y diagnosticar fallos sin necesidad de ejecutar múltiples comandos `kubectl` en la terminal.
