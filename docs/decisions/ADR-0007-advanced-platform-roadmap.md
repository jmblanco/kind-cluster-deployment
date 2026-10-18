# ADR-0007: Adopción de Cert-Manager TLS, Asistente DNS y Microservicio Demo E2E

- **Estado:** Aceptado
- **Fecha:** 2026-10-18
- **Autor:** Principal Cloud & Systems Architect (Agentic Lifecycle)

## Contexto y Problema

El cluster local Kind cuenta con una base sólida (Traefik v3, APISIX, Strimzi Kafka KRaft, Zot OCI Registry, ArgoCD, Headlamp y Dashboard). Sin embargo, para completar una experiencia de nivel de producción ("production-like"), existen 4 necesidades:
1. Las conexiones HTTP locales (`http://*.local`) carecen de certificados TLS válidos, provocando advertencias de seguridad en navegadores.
2. Los desarrolladores deben manipular manualmente el archivo `hosts` del sistema operativo.
3. Los datos de Kafka y MongoDB se reinician tras recrear contenedores por usar almacenamiento efímero.
4. Falta un flujo end-to-end funcional pre-cargado que demuestre la interacción real entre API Gateway, Ingress, Kafka, MongoDB y el registro local.

## Opciones Evaluadas

### Opción 1: Certificados manuales con OpenSSL
- **Pros:** No requiere pods adicionales en el cluster.
- **Contras:** Gestión compleja, expiraciones no automatizadas y sin integración declarativa con Ingress.

### Opción 2: Cert-Manager con ClusterIssuer de CA local
- **Pros:** Estándar de facto en la industria cloud-native. Emite secretos `kubernetes.io/tls` automáticamente anotando los Ingress con `cert-manager.io/cluster-issuer`. Compatible con Traefik.
- **Contras:** Requiere recursos adicionales en el cluster (CRDs y pods del controller/webhook/cainjector).

### Opción 3: Gestión de DNS asistida por CLI
- **Pros:** La CLI en Node puede detectar si faltan dominios en `hosts` y ofrecer sincronizarlos de forma segura y transparente, o verificar la resolución antes de arrancar.
- **Contras:** Requiere permisos de administrador para escribir en `hosts`.

## Decisión Final

Se aprueba la implementación secuencial de los 4 planes de trabajo:
1. **PLAN-0006 (DNS Assistant):** Verificación y sincronización asistida de dominios locales en la CLI.
2. **PLAN-0007 (Cert-Manager & TLS Local):** Despliegue de cert-manager con CA local autofirmada y TLS en Ingresses.
3. **PLAN-0008 (Almacenamiento Persistente):** Soporte opcional de PVCs persistentes para Kafka y MongoDB.
4. **PLAN-0009 (Microservicio Demo E2E):** Despliegue de un microservicio de demostración conectado a Kafka y MongoDB a través de Traefik y APISIX.

## Consecuencias y Mitigaciones
- Mayor realismo en el desarrollo de microservicios locales con HTTPS y eventos persistidos.
- Se mantienen todas las opciones como configurables en la CLI para no saturar máquinas con recursos limitados.
