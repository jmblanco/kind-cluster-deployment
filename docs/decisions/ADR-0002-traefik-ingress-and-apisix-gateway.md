# ADR-0002: Reemplazo de NGINX Ingress por Traefik y Adopción de Apache APISIX como API Gateway

- **Estado:** accepted
- **Fecha:** 2026-10-17
- **Decisores:** Antigravity Agent, Jose Miguel
- **Categoría:** Networking / API Management / Ingress

---

## 1. Contexto y Problema

Actualmente, el clúster local Kind utiliza **NGINX Ingress Controller** (`ingress-nginx`) mapeado a los puertos 80 y 443 del nodo `control-plane` para resolver las rutas de `argocd.local` y `kafka-ui.local`.

Se requiere:
1. Reemplazar el Ingress Controller perimetral por **Traefik**, aprovechando su soporte nativo de configuración dinámica, observabilidad, métricas y CRDs (`IngressRoute`).
2. Introducir **Apache APISIX** como API Gateway interno/secundario para gestionar microservicios, routing avanzado, políticas de plugins (rate-limiting, auth, transformaciones), en lugar de soluciones como Kong.

---

## 2. Decisión

Se adopta una arquitectura en dos capas complementarias:
1. **Perímetro del clúster (Ingress Controller): Traefik v3**
   - Se despliega vía Helm o manifiestos en el namespace `traefik`.
   - Se vincula directamente a los puertos `80` y `443` del nodo Kind (`nodeSelector: ingress-ready: "true"`, `hostPort: 80/443`).
   - Atiende los recursos estándar de Kubernetes `networking.k8s.io/v1` con `ingressClassName: traefik` para ArgoCD y Kafka UI.
2. **Capa de Aplicación y API Management (API Gateway): Apache APISIX**
   - Se despliega en el namespace `ingress-apisix` (o `apisix`) usando su Helm chart oficial.
   - Actúa como puerta de enlace para microservicios y APIs internas (expuesto a través de Traefik o NodePort interno para pruebas de servicios).

---

## 3. Alternativas Evaluadas

### Opción 1: NGINX Ingress + Kong Gateway
- **Pros:** Conocido históricamente en entornos Kubernetes.
- **Contras:** NGINX Ingress carece de soporte nativo avanzado de API Gateway sin plugins de terceros pesados. Kong requiere dependencias adicionales complejas o licencias empresariales para ciertas capacidades.

### Opción 2: Traefik (Perímetro) + Apache APISIX (API Gateway) (Elegida)
- **Pros:**
  - Traefik es ligero, rápido, con dashboard embebido opcional y soporte excelente para Kind vía `hostPort`.
  - Apache APISIX ofrece el ecosistema de plugins más dinámico y de mayor rendimiento (basado en Nginx/OpenResty + LuaJIT / Wasm) con configuración en caliente sin reinicios.
  - Clara separación de responsabilidades: Traefik gestiona el tráfico norte-sur de la plataforma (ArgoCD, Kafka UI); APISIX gestiona el tráfico este-oeste o API routing de microservicios.
- **Contras:**
  - Se añade un componente adicional (APISIX + etcd opcional/standalone) que requiere asignación moderada de memoria en Kind.

---

## 4. Consecuencias

### Positivas:
- Retiro completo de las dependencias y manifiestos de NGINX Ingress.
- Unificación de los manifiestos Ingress bajo la clase `ingressClassName: traefik` y eliminación de anotaciones específicas `nginx.ingress.kubernetes.io/*`.
- Plataforma lista para hospedar microservicios gobernados por APISIX.

### Mitigaciones / Operación:
- Mantener compatibilidad CLI en `init.sh` e `init.ps1` con subcomandos `traefik`, `apisix` y `ingress`.

---

## 5. Trazabilidad
- **Especificación asociada:** `docs/specs/SPEC-0002-traefik-apisix-migration.md`
- **Plan de implementación:** `docs/plans/PLAN-0002-traefik-apisix-migration.md`
- **Archivos impactados:**
  - `init.sh`
  - `init.ps1`
  - `ingress/argocd.ingress.yaml`
  - `ingress/kafka-ui.ingress.yaml`
  - `templates/traefik-values.yaml`
  - `templates/apisix-values.yaml`
  - `README.md`
  - `AGENTS.md`
