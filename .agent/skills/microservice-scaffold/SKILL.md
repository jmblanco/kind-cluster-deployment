---
name: microservice-scaffold
description: >-
  Genera y despliega manifiestos para un nuevo microservicio o mock en el cluster Kind local,
  conectado a Kafka, MongoDB, Ingress y el Docker Registry local (localhost:5000).
  Úsala cuando se pida crear una app, servicio o pod nuevo para desplegar en el cluster.
argument-hint: "<nombre-del-microservicio> [opciones: kafka, mongodb, ingress]"
triggers:
  - user
  - model
---

# Microservice Scaffold

Guía estructurada para la creación, parametrización y despliegue rápido de microservicios en el entorno local de Kubernetes provisto por este cluster Kind.

## Convenciones de Arquitectura del Repositorio
Al crear cualquier microservicio nuevo, se DEBEN aplicar los siguientes estándares verificados:
1. **Registry Local:**
   - La imagen de contenedor debe construirse y etiquetarse como `localhost:5000/<nombre-app>:<tag>`.
   - Dentro del manifiesto K8s se referencia como `localhost:5000/<nombre-app>:<tag>` (gracias al ConfigMap `local-registry-hosting` en `kube-public`).
2. **Endpoints de Conectividad Interna:**
   - **Kafka Broker (KRaft):** `kafka-cluster-kafka-bootstrap.kafka.svc:9092`
   - **MongoDB:** `kind-mongodb:27017` (a través de la red compartida de Docker `kind` o mediante ExternalService).
3. **Estándares de Ingress:**
   - `apiVersion: networking.k8s.io/v1`
   - `spec.ingressClassName: nginx`
   - Cabeceras de seguridad vía annotations:
     ```yaml
     nginx.ingress.kubernetes.io/configuration-snippet: |
       more_set_headers "X-Frame-Options: SAMEORIGIN";
       more_set_headers "X-Content-Type-Options: nosniff";
     ```
   - Dominio local: `<app-name>.local` (recordar al usuario añadir entrada en archivo `hosts`).

---

## Flujo de Trabajo

### Paso 1: Generar Manifiesto de Despliegue (`Deployment` + `Service`)
Plantilla canónica para ubicar en `templates/apps/<app-name>.yaml` o en directorio propio:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: <app-name>
  namespace: default
  labels:
    app: <app-name>
spec:
  replicas: 1
  selector:
    matchLabels:
      app: <app-name>
  template:
    metadata:
      labels:
        app: <app-name>
    spec:
      containers:
        - name: <app-name>
          image: localhost:5000/<app-name>:latest
          imagePullPolicy: Always
          ports:
            - containerPort: 8080
          env:
            - name: KAFKA_BOOTSTRAP_SERVERS
              value: "kafka-cluster-kafka-bootstrap.kafka.svc:9092"
            - name: MONGO_URI
              value: "mongodb://root:localClusterPass123!@kind-mongodb:27017"
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
---
apiVersion: v1
kind: Service
metadata:
  name: <app-name>
  namespace: default
spec:
  type: ClusterIP
  ports:
    - port: 8080
      targetPort: 8080
      protocol: TCP
      name: http
  selector:
    app: <app-name>
```

### Paso 2: Generar Ingress (Si la app expone HTTP)
Plantilla para `ingress/<app-name>.ingress.yaml`:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: <app-name>-ingress
  namespace: default
  annotations:
    nginx.ingress.kubernetes.io/configuration-snippet: |
      more_set_headers "X-Frame-Options: SAMEORIGIN";
      more_set_headers "X-Content-Type-Options: nosniff";
spec:
  ingressClassName: nginx
  rules:
    - host: <app-name>.local
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: <app-name>
                port:
                  number: 8080
```

### Paso 3: Workflow de Build & Push a Registry Local
1. Construir la imagen local:
   `docker build -t localhost:5000/<app-name>:latest .`
2. Empujar al registro local de Kind:
   `docker push localhost:5000/<app-name>:latest`
3. Aplicar en Kubernetes:
   `kubectl apply -f templates/apps/<app-name>.yaml`
   `kubectl apply -f ingress/<app-name>.ingress.yaml`
4. Avisar al usuario para registrar en hosts:
   `127.0.0.1 <app-name>.local`
