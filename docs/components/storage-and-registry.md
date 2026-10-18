# Almacenamiento & Registro OCI: Zot Registry con Trivy & MongoDB

Esta guía describe el funcionamiento de los componentes de almacenamiento de imágenes (registro de contenedores local) y de persistencia de datos (MongoDB) enlazados a la red de Kind.

---

## 1. Visión y Propósito en el Stack

Desarrollar y probar microservicios localmente requiere:
1. **Un registro OCI local:** Para compilar imágenes (`docker build`), etiquetarlas y desplegarlas en Kubernetes sin subirlas a internet ni pagar planes privados en Docker Hub.
2. **Una base de datos NoSQL compartida:** Para persistir el estado de microservicios, tests de integración y pruebas de concepto sin añadir la carga de un operador pesado de base de datos dentro del plano de control de Kind.

---

## 2. Zot OCI Registry con Escaneo Trivy

### 2.1 Arquitectura e Integración con Kind
- **Contenedor:** `kind-registry`
- **Red Docker:** `kind` (misma red bridge donde residen los nodos del clúster).
- **Puertos:** `5000:5000` en `localhost` y `http://registry.local` vía Ingress.
- **Configuración:** [`templates/zot-config.json`](../../templates/zot-config.json)
- **ConfigMap de integración con Kind:** [`templates/kind-registry.configmap.yaml`](../../templates/kind-registry.configmap.yaml)
- **Módulo CLI:** [`cli/src/modules/registry.js`](../../cli/src/modules/registry.js) -> `deployRegistry()`

### 2.2 Flujo de Trabajo para Publicar Imágenes
```bash
# 1. Compila tu imagen de aplicación:
docker build -t mi-app:v1 .

# 2. Etiqueta hacia el registro local:
docker tag mi-app:v1 localhost:5000/mi-app:v1

# 3. Sube la imagen localmente (instantáneo):
docker push localhost:5000/mi-app:v1

# 4. En tu Deployment de Kubernetes usa:
#    image: localhost:5000/mi-app:v1
```
Los nodos de Kind resuelven `localhost:5000` redirigiéndolo internamente al contenedor `kind-registry` gracias al ConfigMap `local-registry-hosting`.

### 2.3 Interfaz Web y Escaneo de Vulnerabilidades (Trivy)
Navega a `http://registry.local` en tu navegador:
- Explora los repositorios e imágenes subidas.
- Zot ejecuta automáticamente un análisis de seguridad con **Trivy** sobre las capas de las imágenes, mostrando un reporte de CVEs (vulnerabilidades) detectadas.

---

## 3. MongoDB (Contenedor Standalone Enlazado)

### 3.1 Arquitectura y Red
- **Contenedor:** `kind-mongodb`
- **Red Docker:** `kind`
- **Puertos:** `37017` en el host (mapeado al `27017` interno del contenedor).
- **Módulo CLI:** [`cli/src/modules/mongodb.js`](../../cli/src/modules/mongodb.js) -> `deployMongoDB()`

### 3.2 Cadenas de Conexión

#### Desde tu máquina Host (Compass, Robo3T, scripts locales):
```text
mongodb://localhost:37017
```

#### Desde Pods dentro de Kubernetes (Kind):
El contenedor está conectado a la red Docker `kind`. Los pods pueden acceder a él utilizando la IP de la gateway del clúster o el nombre del host:
```text
mongodb://kind-mongodb:27017
```

---

## 4. Comandos de Gestión CLI

```bash
# Desplegar Zot Registry:
npm start registry

# Desplegar MongoDB:
npm start mongodb

# Desplegar todo junto:
npm start all
```
