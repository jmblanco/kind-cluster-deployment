# Índice Maestro de Documentación Técnica

Bienvenido al repositorio documental de **kind-cluster-deployment**. Este índice organiza toda la documentación del proyecto según su audiencia, ciclo de vida arquitectónico y objetivos operativos.

---

## 🗂️ Mapa de Documentación

```
docs/
├── README.md               # 📌 Índice Maestro y mapa de navegación del clúster
├── PANEL-STATUS.md         # 📊 Panel interactivo de estado de iniciativas y backlog
├── SDD-GUIDE.md            # 📐 Guía metodológica SDD (Specs, Planes, ADRs y Almacenamiento)
├── ARCHITECTURE.md         # 🏛️ Guía canónica: arquitectura global y matriz de conectividad
├── DNS-GUIDE.md            # 🌐 Manual del asistente DNS y resolución de dominios .local
├── components/             # 🧩 Guías técnicas dedicadas por subsistema / pieza
│   ├── ingress-and-gateway.md      # Traefik Ingress y Apache APISIX Gateway
│   ├── kafka-event-stream.md       # Strimzi Kafka (KRaft), Kafka UI y mensajería
│   ├── argocd-gitops.md            # GitOps Continuous Delivery y sincronización
│   ├── observability-and-dashboard.md # Headlamp Explorer, Metrics-Server y Hub
│   └── storage-and-registry.md     # Zot OCI Registry con Trivy y MongoDB
├── decisions/              # 📋 Architecture Decision Records (ADRs)
│   ├── ADR-0001-...        # Migración de Kafka a KRaft (sin ZooKeeper)
│   ├── ADR-0002-...        # Adopción de Traefik Ingress y Apache APISIX
│   ├── ADR-0003-...        # Actualización a versiones estables y Kafbat UI
│   ├── ADR-0004-...        # Integración de Headlamp y Metrics-Server
│   ├── ADR-0005-...        # Adopción de Zot OCI Registry con escaneo Trivy
│   ├── ADR-0006-...        # Modernización a CLI interactiva TUI en Node.js
│   ├── ADR-0007-...        # Roadmap de capacidades avanzadas
│   └── ADR-0008-...        # Portal Dashboard v2.0 (Developer Hub)
├── specs/                  # 📐 Especificaciones Técnicas (SDDs)
│   ├── SPEC-0001-...       # Contrato técnico: Kafka KRaft
│   ├── SPEC-0002-...       # Contrato técnico: Ingress perimetral y APISIX
│   ├── SPEC-0003-...       # Contrato técnico: Observabilidad & Métricas
│   ├── SPEC-0004-...       # Contrato técnico: Orquestador CLI en Node.js
│   └── SPEC-0005-...       # Contrato técnico: Roadmap de plataforma avanzada
└── plans/                  # 🛠️ Planes de Implementación Atómica
    ├── PLAN-0001-...       # Tareas: Kafka KRaft (Completado)
    ├── PLAN-0002-...       # Tareas: Traefik & APISIX (Completado)
    ├── PLAN-0003-...       # Tareas: Versiones y despliegues seguros (Completado)
    ├── PLAN-0004-...       # Tareas: Observabilidad (Completado)
    ├── PLAN-0005-...       # Tareas: TUI interactiva (Completado)
    ├── PLAN-0006-...       # Tareas: Asistente DNS local (Completado)
    ├── PLAN-0007-...       # Tareas: cert-manager y TLS local (Pendiente)
    ├── PLAN-0008-...       # Tareas: Storage persistente (Pendiente)
    ├── PLAN-0009-...       # Tareas: Microservicio Demo E2E (Completado)
    └── PLAN-0010-...       # Tareas: Portal Hub v2.0 (Completado)
```

---

## 🧭 Guías Dedicadas por Componente del Stack

Para entender en profundidad para qué sirve cada componente, cómo está desplegado, cómo se conecta y cómo operarlo:

| Subsistema / Pieza | Guía Dedicada | Qué Resuelve / Qué Función Cumple |
| :--- | :--- | :--- |
| **Ingress & Gateway** | [`components/ingress-and-gateway.md`](components/ingress-and-gateway.md) | Enrutamiento perimetral con Traefik (`*.local`) y políticas L7 avanzadas con Apache APISIX (CORS, JWT, rate-limit). |
| **Kafka & Event-Driven** | [`components/kafka-event-stream.md`](components/kafka-event-stream.md) | Backbone de mensajería asíncrona Strimzi en modo KRaft (sin ZooKeeper) y consola web Kafka UI. |
| **GitOps Delivery** | [`components/argocd-gitops.md`](components/argocd-gitops.md) | Control continuo y autónomo de despliegues declarativos desde repositorios Git con ArgoCD. |
| **Observabilidad & Hub** | [`components/observability-and-dashboard.md`](components/observability-and-dashboard.md) | Telemetría con Metrics-Server, explorador de recursos/logs Headlamp y portal unificado Dashboard Hub. |
| **Almacenamiento & OCI** | [`components/storage-and-registry.md`](components/storage-and-registry.md) | Registro de contenedores local Zot con escaneo Trivy y base de datos MongoDB enlazada a la red Kind. |
| **Capa 0: DNS Local** | [`DNS-GUIDE.md`](DNS-GUIDE.md) | Asistente multiplataforma para resolver dominios `.local` en `127.0.0.1` en el archivo `hosts` del host. |

---

## 🚀 Guías de Lectura según tu Rol o Necesidad

### 1. Desarrollador / QA usando el Clúster
- **¿Qué hace cada componente y cómo me conecto?** 👉 Consulta [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) y las guías en [`docs/components/`](components/).
- **¿No me resuelven las URLs `.local`?** 👉 Consulta el [`docs/DNS-GUIDE.md`](DNS-GUIDE.md) o ejecuta `npm start dns`.
- **¿Cómo interactúo con Kafka?** 👉 Utiliza la skill local [`.agent/skills/kafka-traffic-tester/`](../.agent/skills/kafka-traffic-tester/SKILL.md) o accede a `http://kafka-ui.local`.
- **¿Cómo creo y despliego mi propio microservicio?** 👉 Utiliza la skill local [`.agent/skills/microservice-scaffold/`](../.agent/skills/microservice-scaffold/SKILL.md).

### 2. DevOps / Platform Engineer
- **¿Por qué se eligió Traefik + APISIX en vez de NGINX Ingress clásico?** 👉 Ver [`docs/decisions/ADR-0002-traefik-ingress-and-apisix-gateway.md`](decisions/ADR-0002-traefik-ingress-and-apisix-gateway.md).
- **¿Por qué Zot Registry en vez de la imagen Docker registry v2?** 👉 Ver [`docs/decisions/ADR-0005-zot-registry-with-trivy.md`](decisions/ADR-0005-zot-registry-with-trivy.md).
- **¿Cómo monitorear el consumo de recursos?** 👉 Ver [`docs/decisions/ADR-0004-headlamp-and-metrics-server.md`](decisions/ADR-0004-headlamp-and-metrics-server.md) y accede a `http://headlamp.local`.

### 3. Agentes de Inteligencia Artificial (AI Coding Agents)
- **Directrices y Restricciones:** Lee rigurosamente [`AGENTS.md`](../AGENTS.md).
- **Catálogo de Habilidades:** Consulta [`.agent/skills/README.md`](../.agent/skills/README.md).
- **Sincronización Continua de Documentación:** Ejecuta la skill [`.agent/skills/doc-sync/SKILL.md`](../.agent/skills/doc-sync/SKILL.md).
