# Implementation Plan: PLAN-0010
# Centro de Servicios Operativo & Developer Hub (Dashboard v2.0)

- **Estado:** Implementado / Completado
- **Trazabilidad:** [ADR-0008](../decisions/ADR-0008-operational-service-hub-dashboard.md)
- **Talla Estimada:** M

## 1. Objetivos y Alcance
Transformar el dashboard frontal (`dashboard.local`) en un Centro de Servicios Operativos e Internal Developer Portal (IDP) ligero, con capacidades de diagnóstico, métricas vivas y auto-servicio de credenciales.

## 2. Componentes a Modificar

### 2.1 Backend (`dashboard/server.py`)
- Agregar endpoints REST:
  - `GET /api/status`: Extender el status actual con latencias activas en milisegundos, estado de conexión a MongoDB, Zot y Kafka.
  - `GET /api/metrics`: Consultar `/apis/metrics.k8s.io/v1beta1/nodes` y `/apis/metrics.k8s.io/v1beta1/pods` para retornar consumo de CPU (cores/mcores) y Memoria (MiB/GiB).
  - `GET /api/events`: Consultar `/api/v1/events` (Warning vs Normal) para alerta temprana de pods en CrashLoop o fallos de scheduling.
  - `GET /api/logs?namespace={ns}&pod={pod}`: Retornar las últimas 50 líneas de log del contenedor.
  - `GET /api/config-snippets`: Retornar cadenas de conexión, variables de entorno y comandos útiles para desarrolladores.

### 2.2 Frontend (`dashboard/index.html`)
- Estructurar navegación por pestañas ergonómicas:
  1. **Servicios & Plataforma:** Tarjetas con badges de latencia viva (ms), estado HTTP y accesos directos.
  2. **Métricas de Recursos:** Gráficos/barras de uso de CPU y RAM del clúster + tabla de Top Consumers.
  3. **Developer Hub (Cheat Sheet):** Credenciales (MongoDB, Kafka bootstrap, Zot OCI Registry, ArgoCD admin) con 1-click copy al portapapeles.
  4. **Explorador de Pods & Logs:** Tabla con filtro interactivo por namespace y estado, modal visor de logs en tiempo real.
  5. **Eventos del Clúster:** Feed de eventos de Kubernetes con indicador de severidad (Normal / Warning).

### 2.3 Plantilla Kubernetes (`templates/dashboard.deployment.yaml`)
- Asignar permisos necesarios a `cluster-dashboard` (ClusterRole para `metrics.k8s.io`, `events` y lectura de `pods/log`).
- Actualizar tag de imagen a `localhost:5000/cluster-dashboard:v2.0.0`.

### 2.4 Módulo CLI (`cli/src/modules/dashboard.js`)
- Añadir paso de build y push a Zot Registry local si la imagen no existe o se ejecuta en modo actualización.

## 3. Plan de Pruebas y Validación
1. Validación de sintaxis Python y prueba local de endpoints con `python3 server.py`.
2. Validación de frontend en navegador o mediante tests HTTP.
3. Despliegue en clúster y comprobación de Ingress en `http://dashboard.local`.
