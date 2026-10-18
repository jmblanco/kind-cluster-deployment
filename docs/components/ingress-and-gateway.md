# Ingress & API Gateway: Traefik & Apache APISIX

Esta guía documenta en detalle el subsistema de enrutamiento y pasarela de entrada (Ingress y API Gateway) del clúster local Kind.

---

## 1. Visión y Propósito en el Stack

En este entorno local, la capa de entrada está dividida según la responsabilidad del tráfico:
1. **Traefik Ingress Controller (Perimetral / Edge):** Se encarga de recibir el tráfico desde el host en los puertos `80` y `443` y enrutarlo hacia las diferentes UIs y consolas administrativas basándose en el nombre de dominio (`*.local`).
2. **Apache APISIX (API Gateway L7):** Se encarga de actuar como puerta de enlace inteligente para APIs y microservicios de desarrollo, permitiendo políticas avanzadas que un Ingress estándar no soporta.

```
                   [ Navegador / Host (127.0.0.1) ]
                                   │
                Puertos 80 (HTTP) y 443 (HTTPS)
                                   ▼
          ┌──────────────────────────────────────────────────┐
          │            Traefik Ingress Controller            │
          │            (Namespace: traefik)                  │
          └────────┬─────────────────────────┬───────────────┘
                   │                         │
     Host: *.local │           Host: apisix.local / api.*
                   ▼                         ▼
   ┌───────────────────────────┐ ┌───────────────────────────┐
   │ Paneles Web               │ │ Apache APISIX             │
   │ • Dashboard Hub (:8088)   │ │ (Namespace: ingress-apisix│
   │ • Headlamp Explorer (:80) │ └─────────────┬─────────────┘
   │ • ArgoCD Web (:443)       │               │ Plugins: JWT, Rate-limit,
   │ • Kafka UI (:80)          │               │ CORS, Circuit Breaker
   │ • Zot Registry (:5000)    │               ▼
   └───────────────────────────┘    [ Microservicios / Pods ]
```

---

## 2. Traefik Ingress Controller

### 2.1 Despliegue y Configuración
- **Namespace:** `traefik`
- **Valores Helm:** [`templates/traefik-values.yaml`](../../templates/traefik-values.yaml)
- **Módulo CLI:** [`cli/src/modules/ingress.js`](../../cli/src/modules/ingress.js) -> `deployTraefik()`
- **Comando de instalación individual:**
  ```bash
  npm start ingress
  # O bien:
  npm start traefik
  ```

### 2.2 Manifiestos de Ingress Soportados
Todos los ingress están versionados en la carpeta [`ingress/`](../../ingress/):
- `dashboard.ingress.yaml` -> `http://dashboard.local`
- `headlamp.ingress.yaml` -> `http://headlamp.local`
- `registry.ingress.yaml` -> `http://registry.local`
- `kafka-ui.ingress.yaml` -> `http://kafka-ui.local`
- `argocd.ingress.yaml` -> `https://argocd.local` (Con backend HTTPS)
- `apisix.ingress.yaml` -> `http://apisix.local`

---

## 3. Apache APISIX API Gateway

### 3.1 Despliegue y Características
- **Namespace:** `ingress-apisix`
- **Valores Helm:** [`templates/apisix-values.yaml`](../../templates/apisix-values.yaml)
- **Módulo CLI:** [`cli/src/modules/ingress.js`](../../cli/src/modules/ingress.js) -> `deployApisix()`
- **Comando de instalación individual:**
  ```bash
  npm start apisix
  ```

### 3.2 Casos de Uso Prácticos
- **Desarrollo de Microservicios:** En lugar de exponer cada pod mediante un Ingress crudo, las rutas se configuran en APISIX.
- **Plugins Disponibles de Fábrica:**
  - `cors`: Habilitación instantánea de cabeceras CORS para aplicaciones frontend (React, Vue, Flutter Web).
  - `limit-req` / `limit-count`: Pruebas de degradación y límites de peticiones por segundo.
  - `key-auth` / `jwt-auth`: Validación de tokens antes de que la petición toque los pods internos.
  - `proxy-rewrite`: Reescribir prefijos de URI (ej: de `/api/v1/orders` a `/orders`).

---

## 4. Diagnóstico y Troubleshooting

1. **Verificar que Traefik escucha en el nodo Kind:**
   ```bash
   kubectl get pods -n traefik -l app.kubernetes.io/name=traefik
   ```
2. **Inspeccionar rutas activas en Traefik:**
   ```bash
   kubectl logs -n traefik -l app.kubernetes.io/name=traefik --tail=100
   ```
3. **Comprobar estado de APISIX:**
   ```bash
   kubectl get pods -n ingress-apisix
   ```
