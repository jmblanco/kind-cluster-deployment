---
name: cluster-doctor
description: >-
  Diagnóstico integral y solución de problemas del cluster local Kind, Docker y Kubernetes.
  Úsala cuando fallen pods, haya problemas de conectividad (Ingress, Ingress Controller), puertos en conflicto,
  pods en CrashLoopBackOff/OOMKilled, o servicios de Kafka, ArgoCD o MongoDB inaccesibles.
argument-hint: "[recurso o namespace opcional]"
triggers:
  - user
  - model
---

# Cluster Doctor

Herramienta de diagnóstico proactivo y resolución de incidencias para entornos locales basados en Kind (`kind-k8s-local`), Docker y Kubernetes.

## Cuándo Usar Esta Skill
- Fallos al arrancar `./init.sh` o `.\init.ps1` (conflicto de puertos 80, 443, 5000, 37017).
- Pods en estado `CrashLoopBackOff`, `OOMKilled`, `Pending` o `ImagePullBackOff` (especialmente en namespaces `kafka`, `argocd`, `ingress-nginx`).
- Servicios web locales no accesibles (`http://kafka-ui.local`, `https://argocd.local`).
- Sospecha de agotamiento de memoria/recursos en Docker Desktop / WSL2.

---

## Procedimiento de Diagnóstico

### 1. Detección de Conflictos de Puertos y Docker Daemon
Verificar que el motor de Docker responde y qué proceso del host tiene ocupados los puertos:
- **Windows (PowerShell):**
  ```powershell
  Get-NetTCPConnection -LocalPort 80,443,5000,37017 -ErrorAction SilentlyContinue | Select-Object LocalAddress, LocalPort, OwningProcess, State
  ```
- **Linux / Git Bash:**
  ```bash
  netstat -tuln | grep -E ':(80|443|5000|37017) ' || lsof -i :80 -i :443 -i :5000 -i :37017
  ```
- **Comprobación de Contenedores Huérfanos:**
  ```bash
  docker ps --filter "name=kind-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
  ```

### 2. Inspección del Estado de Nodos y Recursos
1. **Salud del Nodo Kind:**
   ```bash
   kubectl get nodes -o wide
   kubectl describe node kind-k8s-local-control-plane | grep -A 8 "Conditions:"
   ```
2. **Presión de Recursos (MemoryPressure / DiskPressure):**
   Si el nodo reporta `MemoryPressure=True`, Kafka o Strimzi abortarán por OOMKilled. Instruir al usuario aumentar la memoria en Docker Desktop (mínimo recomendado: 6 GB - 8 GB).

### 3. Detección Rápida de Pods Anómalos
Ejecutar inspección global en todos los namespaces:
```bash
kubectl get pods -A --field-selector=status.phase!=Running,status.phase!=Succeeded
```
Para cualquier pod que no esté en `Running`:
```bash
# 1. Eventos recientes del Pod
kubectl describe pod <pod-name> -n <namespace> | tail -n 25

# 2. Logs actuales o de la instancia previa que crasheó (--previous)
kubectl logs <pod-name> -n <namespace> --tail=100
kubectl logs <pod-name> -n <namespace> --previous --tail=100
```

### 4. Diagnóstico Específico por Componente

#### A. Ingress & Enrutamiento DNS
- **Verificar Pod de Ingress Controller:**
  `kubectl get pods -n ingress-nginx -l app.kubernetes.io/component=controller`
- **Verificar archivo hosts:**
  Confirmar que `127.0.0.1` apunta a `argocd.local` y `kafka-ui.local`.
- **Probar resolución HTTP directa:**
  ```bash
  curl -I -H "Host: kafka-ui.local" http://127.0.0.1
  curl -k -I -H "Host: argocd.local" https://127.0.0.1
  ```

#### B. Apache Kafka (KRaft) & Strimzi
- **Inspección de Custom Resources de Strimzi:**
  ```bash
  kubectl get kafka -n kafka
  kubectl describe kafka kafka-cluster -n kafka
  kubectl get kafkanodepool -n kafka
  ```
- **Logs del Operador Strimzi:**
  `kubectl logs -n kafka -l strimzi.io/kind=cluster-operator --tail=100`

#### C. ArgoCD
- **Estado de pods de ArgoCD:**
  `kubectl get pods -n argocd`
- **Extracción segura de contraseña inicial de admin:**
  - Bash: `kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d && echo ""`
  - PowerShell: `kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | % { [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($_)) }`

---

## Acciones de Auto-remediación

1. **Reinicio de Controladores Bloqueados:**
   ```bash
   kubectl rollout restart deployment -n ingress-nginx ingress-nginx-controller
   kubectl rollout restart deployment -n kafka kafka-ui
   ```
2. **Re-enlace a la red `kind` de contenedores huérfanos:**
   ```bash
   docker network connect kind kind-registry 2>/dev/null || true
   docker network connect kind kind-mongodb 2>/dev/null || true
   ```
3. **Reseteo Limpio Completo si el estado es irrecuperable:**
   Proponer al usuario ejecutar:
   - `./init.sh down && ./init.sh up` (Bash/Linux/Mac)
   - `.\init.ps1 down; .\init.ps1 up` (Windows PowerShell)
