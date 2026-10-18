# SPEC-0005: Roadmap de Capacidades Avanzadas de Plataforma (Cert-Manager TLS, DNS Local, Persistencia y Microservicio E2E)

- **Estado:** Parcialmente Implementada (En Progreso)
- **Fecha:** 2026-10-18
- **Autor:** Principal Cloud & Systems Architect (Agentic Lifecycle)
- **Trazabilidad:** [ADR-0007](../decisions/ADR-0007-advanced-platform-roadmap.md) | [PLAN-0006](../plans/PLAN-0006-dns-assistant.md) | [PLAN-0007](../plans/PLAN-0007-cert-manager-local-tls.md) | [PLAN-0008](../plans/PLAN-0008-persistent-storage.md) | [PLAN-0009](../plans/PLAN-0009-demo-microservice-e2e.md)

## 1. Visión y Objetivos

Evolucionar la plataforma de desarrollo local Kind hacia un entorno completamente autónomo y análogo a producción mediante la incorporación de cuatro capacidades clave:

1. **Gestión Automática de DNS Local (`FEATURE-DNS`):** `[COMPLETADA]`
   - Eliminar la necesidad de editar manualmente el archivo `hosts` en el host.
   - Proveer resolución automática para los dominios `.local` vinculados a Kind.
   - Implementado en [PLAN-0006](../plans/PLAN-0006-dns-assistant.md).
2. **Cert-Manager & TLS Local con HTTPS de Confianza (`FEATURE-TLS`):** `[PENDIENTE]`
   - Integrar `cert-manager` en Kind con un ClusterIssuer de CA local.
   - Habilitar HTTPS automático y seguro en Ingresses (`dashboard.local`, `headlamp.local`, `argocd.local`, `kafka-ui.local`, `registry.local`).
   - Planificado en [PLAN-0007](../plans/PLAN-0007-cert-manager-local-tls.md).
3. **Persistencia Configurable (PVC / Local Storage) (`FEATURE-PERSISTENCE`):** `[PENDIENTE]`
   - Proveer opción de almacenamiento persistente (`--persistent` / checkbox en TUI) para Strimzi Kafka y MongoDB mediante el StorageClass estándar de Kind (`standard` / hostPath).
   - Planificado en [PLAN-0008](../plans/PLAN-0008-persistent-storage.md).
4. **Microservicio Demo E2E de Arquitectura Hexagonal (`FEATURE-DEMO`):** `[COMPLETADA]`
   - Desplegar un microservicio de referencia conectado a Kafka (consumidor/productor) y MongoDB (persistencia) para validar el flujo completo con un solo clic.
   - Implementado en [PLAN-0009](../plans/PLAN-0009-demo-microservice-e2e.md).

---

## 2. Requerimientos Funcionales por Feature

### F-01: Gestión de DNS Local
- La CLI verificará si las entradas de host existen en el archivo `hosts` local o proveerá un subcomando interactivo `dns:sync` con permisos elevados / script de un clic para añadir/eliminar los registros automáticamente.
- Alternativamente, opción de un DNS resolver local en contenedor Docker enlazado a la red Kind.

### F-02: Cert-Manager & TLS Local
- Despliegue de `cert-manager` v1.14+ vía Helm chart en namespace `cert-manager`.
- Generación de un `ClusterIssuer` autofirmado (`local-ca-issuer`) que emita certificados TLS para `*.local`.
- Actualización de los manifiestos de Ingress (`ingress/*.ingress.yaml`) con la anotación `cert-manager.io/cluster-issuer: local-ca-issuer` y sección `tls:`.

### F-03: Almacenamiento Persistente para Kafka y Mongo
- Plantilla configurable para Kafka: soporte de volúmenes persistentes vía `KafkaNodePool` con `storage.type: persistent-claim` (p.ej. 5Gi).
- Configuración para MongoDB: opción de montar volumen host o PVC persistente.
- Flag `--persistent` en la CLI y toggle en el menú interactivo TUI.

### F-04: Microservicio Demo de Referencia
- Servicio Node.js o Go empaquetado y publicado en el Zot Registry local (`localhost:5000/demo-order-service:latest`).
- Produce eventos de órdenes en el tópico Kafka `orders.incoming`.
- Consume eventos y los almacena en la colección MongoDB `orders`.
- Expone un endpoint HTTP REST `/api/orders` y `/health` enlazado a Ingress o APISIX Gateway (`http://orders.local` o `http://apisix.local/orders`).

---

## 3. Criterios de Aceptación Globales

1. Todos los componentes nuevos deben integrarse como módulos nativos en `cli/src/modules/`.
2. El menú interactivo (`npm start`) debe incluir los nuevos módulos en el modo granular (`[x]`).
3. Cobertura de pruebas unitarias en `cli/tests/` con cero regresiones.
4. Documentación y especificaciones actualizadas con diagramas y tablas de referencia.
