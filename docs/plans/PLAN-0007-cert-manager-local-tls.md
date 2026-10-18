# PLAN-0007: Integración de Cert-Manager y TLS Local con HTTPS

- **Estado:** Pendiente / Programado
- **Trazabilidad:** [ADR-0007](../decisions/ADR-0007-advanced-platform-roadmap.md) | [SPEC-0005](../specs/SPEC-0005-advanced-platform-roadmap.md)
- **Talla Estimada:** M

## 1. Objetivo
Desplegar `cert-manager` en el cluster Kind, configurar un `ClusterIssuer` de CA autofirmada y actualizar los Ingress de Traefik para servir HTTPS nativo en los dominios `.local` sin configuraciones manuales.

## 2. Tareas Atómicas de Implementación

### Tarea 1: Plantillas Declarativas de Cert-Manager
- [ ] Crear `templates/cert-manager-issuer.yaml` con `ClusterIssuer` (SelfSigned / Local CA).
- [ ] Configurar certificado raíz y ClusterIssuer que firme solicitudes para `*.local`.

### Tarea 2: Módulo de Orquestación en Node.js (`cli/src/modules/cert-manager.js`)
- [ ] Instalar `cert-manager` vía Helm chart oficial (`jetstack/cert-manager`) con CRDs activados (`--set crds.enabled=true`).
- [ ] Aplicar `templates/cert-manager-issuer.yaml`.
- [ ] Crear tests unitarios en `cli/tests/cert-manager.test.js`.

### Tarea 3: Habilitar TLS en Ingresses
- [ ] Actualizar `ingress/*.ingress.yaml` con anotación `cert-manager.io/cluster-issuer: local-ca-issuer`.
- [ ] Añadir bloque `tls:` con `secretName` para cada dominio.
- [ ] Añadir `cert-manager` a la lista de módulos granulares del menú TUI (`npm start`).
