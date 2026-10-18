# Technical Specification: SPEC-0003
# Cluster Observability, Headlamp Resource Explorer and In-Cluster Dashboard

- **Status:** Closed / Implemented
- **Associated ADR:** [docs/decisions/ADR-0004-headlamp-and-metrics-server.md](../decisions/ADR-0004-headlamp-and-metrics-server.md)
- **Author:** Antigravity Agent & Pair Programmer
- **Date:** 2026-10-17

---

## 1. Context & Business Need
Tras la modernización del clúster con Traefik v3, Apache APISIX, Apache Kafka (KRaft), MongoDB y ArgoCD, se detectó la necesidad de:
1. Inspeccionar en profundidad los recursos nativos de Kubernetes (Pods, Namespaces, Deployments) y Custom Resource Definitions (CRDs de Strimzi, ArgoCD, Traefik).
2. Facilitar el acceso a logs en tiempo real y terminal interactiva de pods sin dependencia de CLI compleja.
3. Habilitar la recolección de métricas de CPU y memoria en vivo mediante `metrics-server` (`kubectl top`).
4. Proveer un Hub Dashboard frontal centralizado accesible en `dashboard.local` ejecutándose como pod nativo dentro del clúster.

---

## 2. Technical Contracts & Artifacts

### 2.1 Headlamp Resource Explorer
- **Namespace:** `headlamp`
- **Helm Repository:** `https://kubernetes-sigs.github.io/headlamp/` (Chart: `headlamp/headlamp` v0.46.0+)
- **Values Config:** `templates/headlamp-values.yaml`
  - `config.inCluster: true`
  - `config.unsafeUseServiceAccountToken: true` (auto-autenticación con `cluster-admin` para entorno local).
- **Ingress:** `ingress/headlamp.ingress.yaml`
  - Host: `headlamp.local`
  - Class: `traefik`
  - Middleware: `traefik-security-headers@kubernetescrd`

### 2.2 Metrics-Server
- **Namespace:** `kube-system`
- **Manifest:** Componentes oficiales de `kubernetes-sigs/metrics-server`.
- **Patch Config:** `templates/metrics-server-patch.yaml`
  - Argumentos obligatorios para Kind: `--kubelet-insecure-tls`, `--kubelet-preferred-address-types=InternalIP,ExternalIP,Hostname`.

### 2.3 Cluster Dashboard Hub
- **Namespace:** `default`
- **Container Image:** `localhost:5000/cluster-dashboard:v1.0.2`
- **K8s Manifest:** `templates/dashboard.deployment.yaml` (`Deployment`, `ServiceAccount`, `ClusterRoleBinding view`, `Service`, `Ingress`).
- **Endpoint Ingress:** `http://dashboard.local`

---

## 3. Acceptance Criteria & Verification

- [x] **AC-01:** `kubectl top nodes` y `kubectl top pods -A` retornan métricas válidas de consumo de CPU y memoria.
- [x] **AC-02:** Headlamp responde con código HTTP 200 en `http://headlamp.local` a través de Traefik Ingress.
- [x] **AC-03:** Headlamp permite explorar CRDs (`Kafka`, `KafkaNodePool`, `Applications`) sin requerir login manual.
- [x] **AC-04:** El panel frontal `http://dashboard.local` corre como pod nativo y detecta el estado saludable de los 7 componentes del stack.
- [x] **AC-05:** Paridad total de comandos en `init.sh` (`./init.sh headlamp`) y `init.ps1` (`.\init.ps1 headlamp`).
