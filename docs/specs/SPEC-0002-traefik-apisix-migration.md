# SDD Spec: Sustitución de NGINX Ingress por Traefik e Incorporación de Apache APISIX

- **ID:** `SPEC-0002-traefik-apisix-migration`
- **Estado:** `closed`
- **Talla Estimada:** `M` (Medium - Adición de 2 componentes Helm, refactor de Ingress manifests y actualización de scripts Bash/PowerShell)
- **Fecha:** 2026-10-17
- **ADR Relacionado:** [ADR-0002: Reemplazo de NGINX Ingress por Traefik y Adopción de Apache APISIX](../decisions/ADR-0002-traefik-ingress-and-apisix-gateway.md)

---

## 1. Contexto y Objetivos

El clúster local Kind requiere modernizar su capa de conectividad:
1. Reemplazar NGINX Ingress Controller por **Traefik Proxy (v3)** como Ingress Controller perimetral primario escuchando en los puertos `80` y `443` vinculados al host.
2. Incorporar **Apache APISIX** como API Gateway secundario para gestión de APIs de microservicios con soporte para plugins avanzados y proxy dinámico.
3. Actualizar los recursos Ingress existentes (`kafka-ui-ingress` y `argocd-server-ingress`) para usar `ingressClassName: traefik` y las anotaciones/configuraciones correspondientes de Traefik (reemplazando anotaciones de Nginx).
4. Proveer soporte no interactivo e interactivo en `init.sh` e `init.ps1`, además del `Makefile`.

---

## 2. Alcance

### Scope IN
- Creación de plantillas de configuración Helm:
  - `templates/traefik-values.yaml`: Configuración para Kind con `hostPort: 80/443`, `nodeSelector: ingress-ready: "true"`, tolerations para el control-plane.
  - `templates/apisix-values.yaml`: Configuración ligera para Kind (modo standalone o etcd interno acotado).
- Actualización de los manifiestos Ingress:
  - `ingress/kafka-ui.ingress.yaml` (usando `ingressClassName: traefik`).
  - `ingress/argocd.ingress.yaml` (usando `ingressClassName: traefik` y esquema backend HTTPS).
- Refactorización de orquestadores:
  - `init.sh`: Reemplazo de `install_nginx_ingress` por `install_traefik` e incorporación de `install_apisix`.
  - `init.ps1`: Reemplazo de `Install-NginxIngress` por `Install-Traefik` e incorporación de `Install-Apisix`.
  - `Makefile`: Actualización de targets (`make ingress`, `make traefik`, `make apisix`).
- Documentación y diagramas:
  - Actualización de `README.md`, `AGENTS.md` y `CHANGELOG.md`.

### Scope OUT
- Certificados TLS con Let's Encrypt o producción (entorno local Kind con certificados self-signed/HTTP local).
- Clúster multi-nodo de etcd para APISIX (se mantendrá huella reducida para pruebas locales).

---

## 3. Criterios de Aceptación (Given / When / Then)

- **AC-01: Despliegue de Traefik en puertos 80/443 de Kind**
  - **Given** un cluster Kind creado con la etiqueta `ingress-ready=true`,
  - **When** se ejecuta `./init.sh traefik` o `./init.ps1 traefik`,
  - **Then** el pod de Traefik arranca en el namespace `traefik`, entra en estado `Ready` y escucha en los puertos `80` y `443` mapeados al host.

- **AC-02: Acceso a Kafka UI y ArgoCD mediante Traefik**
  - **Given** Traefik en ejecución y los recursos Ingress aplicados,
  - **When** se envían peticiones a `http://kafka-ui.local` y `https://argocd.local`,
  - **Then** Traefik enruta correctamente el tráfico a los servicios de backend correspondientes.

- **AC-03: Despliegue de Apache APISIX Gateway**
  - **Given** el cluster Kind activo,
  - **When** se ejecuta `./init.sh apisix` o `./init.ps1 apisix`,
  - **Then** los pods de Apache APISIX (y su controlador/etcd si aplica) se despliegan en el namespace `ingress-apisix` y quedan en estado `Ready`.

- **AC-04: Idempotencia y CLI Unificado**
  - **Given** `init.sh` e `init.ps1`,
  - **When** se invocan los subcomandos (`all`, `ingress`, `traefik`, `apisix`),
  - **Then** el comando finaliza con código de salida `0` y no genera conflictos con configuraciones previas de NGINX.

---

## 4. Matriz de Trazabilidad

| ID AC | Requisito / Fuente | Componentes Afectados |
| :--- | :--- | :--- |
| **AC-01** | User Request (Traefik Ingress) | `templates/traefik-values.yaml`, `init.sh`, `init.ps1` |
| **AC-02** | User Request & Endpoints de Aplicaciones | `ingress/kafka-ui.ingress.yaml`, `ingress/argocd.ingress.yaml` |
| **AC-03** | User Request (APISIX Gateway) | `templates/apisix-values.yaml`, `init.sh`, `init.ps1` |
| **AC-04** | Idempotencia en CLI y Multiplataforma | `init.sh`, `init.ps1`, `Makefile` |

---

## 5. Requisitos No Funcionales (NFRs)
- **Consumo de Memoria:** Traefik debe operar con un consumo menor o igual que NGINX Ingress (~150MB). APISIX en modo ligero no debe superar los 250MB de memoria en Docker.
- **Seguridad:** Mantener vinculación de puertos 80/443 en `127.0.0.1` en Kind.
