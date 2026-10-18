# PLAN-0009: Microservicio Demo de Referencia E2E (Event-Driven & Hexagonal)

- **Estado:** Implementado / Completado
- **Trazabilidad:** [ADR-0007](../decisions/ADR-0007-advanced-platform-roadmap.md) | [SPEC-0005](../specs/SPEC-0005-advanced-platform-roadmap.md)
- **Talla Estimada:** M

## 1. Objetivo
Desplegar un microservicio de demostración pre-configurado que valide de punta a punta todo el ecosistema (Kind, Traefik Ingress, APISIX Gateway, Strimzi Kafka y MongoDB) con un solo clic.

## 2. Arquitectura del Microservicio Demo (`order-service`)
- **Arquitectura:** Limpia / Hexagonal (Domain, Ports, Adapters).
- **Productor Kafka:** Publica eventos `OrderCreatedEvent` en el tópico `orders.incoming`.
- **Consumidor Kafka:** Procesa los eventos y guarda la orden en MongoDB (`db: orders_db`, `collection: orders`).
- **REST API:**
  - `POST /api/orders`: Crea una orden y emite evento.
  - `GET /api/orders`: Lista las órdenes almacenadas en MongoDB.
  - `GET /health`: Health-check HTTP (Liveness/Readiness probe).
- **Rutas Ingress & Gateway:**
  - Accesible vía Traefik Ingress en `http://orders.local`.
  - Enrutado a través de Apache APISIX en `http://apisix.local/orders`.

## 3. Tareas Atómicas de Implementación

### Tarea 1: Código del Microservicio Demo (`examples/order-service/`)
- [x] Implementar la aplicación Node.js / Express con `kafkajs` y `mongodb` driver.
- [x] Crear `Dockerfile` optimizado (multi-stage, usuario no-root).

### Tarea 2: Manifiestos de Kubernetes
- [x] Crear `templates/order-service.deployment.yaml` con Deployment, Service, y ConfigMap.
- [x] Crear `ingress/order-service.ingress.yaml` y ruta en APISIX.

### Tarea 3: Módulo de Despliegue en la CLI (`cli/src/modules/demo-service.js`)
- [x] Construir y publicar la imagen localmente al registro Zot (`localhost:5000/order-service:1.0.0`).
- [x] Aplicar manifiestos y verificar que el pod esté `Running`.
- [x] Integrar opción en la TUI: `📦 Deploy Demo Order Service`.
