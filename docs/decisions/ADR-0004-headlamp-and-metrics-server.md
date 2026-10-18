# Architecture Decision Record: ADR-0004
# Cluster Observability & Resource Exploration with Headlamp & Metrics-Server

## Status
Accepted

## Context
El clúster local Kind cuenta con múltiples componentes complejos: Strimzi Kafka (KRaft), Apache APISIX, Traefik v3, ArgoCD, MongoDB y un panel de control frontal propio.
Para monitorizar el estado operativo interno, diagnosticar pods, seguir eventos de Kubernetes, inspeccionar CRDs (Custom Resource Definitions) y observar el consumo de CPU y memoria en tiempo real, se requiere una solución de exploración de recursos dentro del clúster con interfaz web accesible mediante Traefik Ingress.

## Alternativas Evaluadas

1. **kube-prometheus-stack (Prometheus + Grafana + Alertmanager):**
   - *Pros:* Estándar industrial, métricas de series temporales históricas y alertas.
   - *Contras:* Alto consumo de memoria (~600MB - 1GB RAM) y CPU para un clúster local de desarrollo efímero. No ofrece terminal interactiva nativa de pods ni inspección visual de CRDs y eventos.

2. **Kubernetes Dashboard Oficial:**
   - *Pros:* Oficial del proyecto Kubernetes.
   - *Contras:* Proceso de autenticación engorroso en entornos locales (creación constante de tokens efímeros), interfaz menos ágil para explorar y filtrar CRDs de terceros (Strimzi, ArgoCD).

3. **Headlamp (CNCF) + Metrics-Server:**
   - *Pros:*
     - Interfaz moderna, reactiva y limpia, diseñada para Kubernetes.
     - Navegación y renderizado nativo de CRDs (Kafka, ArgoCD, APISIX, Traefik).
     - Visor de logs en streaming y consola interactiva (shell) para contenedores.
     - Posibilidad de modo `unsafeUseServiceAccountToken: true` para acceso local transparente sin logins manuales.
     - Integración con `metrics-server` para métricas vivas de CPU (mcores) y RAM (MiB) por nodo y pod.
     - Consumo total mínimo (< 200MB RAM combinando Headlamp y Metrics-Server).
   - *Contras:* No almacena series temporales históricas de largo plazo (diseñado para observabilidad operativa en tiempo real).

## Decisión
Se implementa **Headlamp** mediante su Helm chart oficial en el namespace `headlamp`, acompañado del componente oficial **`metrics-server`** (con la flag `--kubelet-insecure-tls` para compatibilidad con certificados auto-firmados de Kind).
Headlamp se enruta a través de Traefik v3 mediante Ingress bajo el host `headlamp.local`.

## Consecuencias y Trade-offs
- Se añade `http://headlamp.local` al Ingress y al archivo de hosts.
- `kubectl top nodes` y `kubectl top pods` quedan operativos en el clúster.
- El panel de control frontal `dashboard.local` incorpora el acceso directo y health-check de Headlamp.
