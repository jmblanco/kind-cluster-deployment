# Observabilidad: Headlamp Explorer, Metrics-Server & Dashboard Hub

Esta guía describe el funcionamiento de los componentes de observabilidad y consolas de usuario del stack: **Headlamp Explorer**, **Metrics-Server** y el **Control Panel Dashboard Hub**.

---

## 1. Visión y Propósito en el Stack

Desarrollar localmente requiere visibilidad inmediata sin necesidad de recordar comandos extensos de `kubectl`:
- **Metrics-Server:** Proporciona telemetría de CPU y memoria de nodos y pods.
- **Headlamp:** Ofrece una interfaz gráfica moderna, extensible y de código abierto para ver el estado de todos los recursos de Kubernetes, inspeccionar logs en vivo y abrir terminales dentro de los contenedores.
- **Dashboard Hub:** Funciona como portal de bienvenida (`http://dashboard.local`) con enlaces directos e información del clúster.

---

## 2. Metrics-Server

### 2.1 Despliegue y Ajuste para Kind
- **Namespace:** `kube-system`
- **Particularidad en Kind:** Kind utiliza certificados TLS autofirmados para el kubelet interno en cada nodo. Por ello, Metrics-Server requiere el flag `--kubelet-insecure-tls` para poder raspar las métricas.
- **Parche aplicado:** [`templates/metrics-server-patch.yaml`](../../templates/metrics-server-patch.yaml).

### 2.2 Comandos Disponibles
Una vez desplegado:
```bash
# Ver consumo de CPU y RAM del nodo Kind:
kubectl top nodes

# Ver consumo por pod en todos los namespaces:
kubectl top pods -A
```

---

## 3. Headlamp K8s Explorer

### 3.1 Despliegue y Configuración
- **Namespace:** `headlamp`
- **Valores Helm:** [`templates/headlamp-values.yaml`](../../templates/headlamp-values.yaml)
- **Ingress:** [`ingress/headlamp.ingress.yaml`](../../ingress/headlamp.ingress.yaml)
- **URL de Acceso:** [`http://headlamp.local`](http://headlamp.local)
- **Comando de despliegue:**
  ```bash
  npm start headlamp
  ```

### 3.2 Autenticación y Token
Al abrir `http://headlamp.local`, la pantalla de bienvenida muestra un asistente de autenticación mediante ServiceAccount token. Puedes generar un token de administrador con el comando:

```bash
kubectl create token headlamp-admin -n headlamp
```
(O usar el botón de autenticación por defecto preconfigurado en el clúster).

---

---

## 4. Control Panel Dashboard Hub (IDP Ops v2.0)

### 4.1 Despliegue y Funcionamiento
- **Namespace:** `default`
- **Manifiesto:** [`templates/dashboard.deployment.yaml`](../../templates/dashboard.deployment.yaml)
- **URL de Acceso:** [`http://dashboard.local`](http://dashboard.local)
- **Comando de despliegue:**
  ```bash
  npm start dashboard
  ```

### 4.2 Capacidades Operativas (v2.0)
El Dashboard ha evolucionado de un mero portal estático de enlaces a un **Centro de Servicios Operativos e Internal Developer Portal (IDP) ligero**:
- **Servicios & Plataforma con Latencia Activa:** Monitoreo en tiempo real con badges de estado (ONLINE/OFFLINE) y latencia RTT de respuesta en milisegundos.
- **Telemetría y Métricas del Clúster:** Consumo en vivo de CPU y Memoria del nodo Kind y visualización de los top pods que más recursos demandan (integrado con `metrics-server`).
- **Developer Hub (Cheat Sheet 1-Click Copy):** Asistente con snippets de conexión, variables de entorno (`.env`) y comandos listos para copiar:
  - MongoDB (`mongodb://localhost:37017` / interna `mongodb://kind-mongodb:27017`)
  - Kafka Bootstrap (`kafka-cluster-kafka-bootstrap.kafka.svc.cluster.local:9092`)
  - Zot OCI Registry (`localhost:5000` con snippets `docker tag` y `push`)
  - ArgoCD (usuario `admin` y comando de extracción de secret)
  - DNS local (`/etc/hosts`)
- **Explorador de Pods & Visor de Logs:** Búsqueda en vivo por nombre, filtrado por Namespace y visor emergente (modal) de los logs recientes de cualquier contenedor sin salir del navegador.
- **Eventos del Clúster:** Feed de eventos de Kubernetes clasificados por severidad (`Normal` vs `Warning`) para auditar `CrashLoopBackOff`, `OOMKilled` o fallos de scheduling al instante.

