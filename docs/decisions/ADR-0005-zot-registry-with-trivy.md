# Architecture Decision Record: ADR-0005
# Modern OCI Registry with Zot & Integrated Trivy Vulnerability Scanning

## Status
Accepted

## Context
El clúster local Kind venía utilizando el contenedor básico `registry:2.8.3` (Docker Distribution). Aunque es funcional para subir y descargar imágenes (`localhost:5000`), carece de:
1. Interfaz Web (UI) para explorar repositorios, tags, tamaños de imagen y capas OCI.
2. Escaneo automatizado de vulnerabilidades (CVEs).
3. Capacidades modernas de artefactos OCI 1.1, firmas (Cosign) y SBOMs.

Se evaluó la posibilidad de migrar a **Harbor**. Sin embargo, Harbor requiere desplegar una suite empresarial pesada (PostgreSQL, Redis, Core, Portal, JobService, Trivy) con 7 a 9 pods y un consumo de memoria de 1.5 GB a 2 GB de RAM, lo cual penaliza drásticamente los clústeres locales efímeros.

## Alternativas Evaluadas

1. **Docker Distribution Registry 2.8.3 (Estado actual):**
   - *Pros:* Muy ligero (< 25MB RAM), simple.
   - *Contras:* Sin interfaz gráfica, sin escaneo de seguridad, obsoleto frente a estándares OCI recientes.

2. **VMware Harbor (Enterprise):**
   - *Pros:* El estándar corporativo más completo, portal web avanzado, gestión multi-tenant.
   - *Contras:* Extremadamente pesado (~1.5GB - 2GB RAM, 8 microservicios), arranque lento (2-3 minutos), excesivo para desarrollo y pruebas locales en Kind.

3. **Zot Registry (CNCF) + Trivy Engine:**
   - *Pros:*
     - Binario/contenedor único ultraligero (~60MB - 120MB RAM) sin bases de datos externas (sin Postgres ni Redis).
     - Interfaz Web nativa (Zot Web UI) moderna, reactiva y limpia.
     - Integración nativa con **Trivy** a través de la extensión `extensions.search.cve` para escaneo de vulnerabilidades automático.
     - Soporta inspección de firmas Cosign, SBOMs y metadatos OCI.
     - Mantiene compatibilidad total con Docker CLI (`docker push localhost:5000/...`).
     - Arranque instantáneo (< 5 segundos).
   - *Contras:* Menos funciones multi-tenant y RBAC jerárquico complejo que Harbor (no necesario en local).

## Decisión
Se reemplaza el contenedor Docker de registro básico por **Zot Registry v2.1.x** (imagen completa `ghcr.io/project-zot/zot:v2.1.22`) conectado a la red `kind` en el puerto `5000` (manteniendo paridad con `localhost:5000`), habilitando:
1. Las extensiones nativas `search`, `ui` y `cve` (motor Trivy integrado con actualización de bases de datos de vulnerabilidades).
2. Enrutamiento mediante Ingress de Traefik v3 bajo el dominio **`http://registry.local`** para acceso visual a la consola web y reportes de CVEs.
3. Integración en el panel de control central `http://dashboard.local`.

## Consecuencias y Trade-offs
- Se añade `http://registry.local` al Ingress y al archivo de hosts.
- Toda imagen construida localmente y subida al registro (`docker push localhost:5000/...`) es indexada y escaneada automáticamente.
- El consumo de memoria permanece bajo y controlado (< 150MB).
