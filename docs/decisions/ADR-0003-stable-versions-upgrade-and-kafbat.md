# ADR-0003: Actualización a Últimas Versiones Estables y Migración a Kafbat UI

- **Estado:** accepted
- **Fecha:** 2026-10-17
- **Decisores:** Antigravity Agent, Jose Miguel
- **Categoría:** Gestión de Versiones / Seguridad / Dependencias

---

## 1. Contexto y Problema
El ecosistema cloud-native evoluciona rápidamente. Diversos componentes configurados en el repositorio se encontraban fijados a versiones desfasadas o repositorios abandonados:
1. **Kafka UI (Provectus):** El repositorio Helm `provectus.github.io/kafka-ui-charts` se encuentra deprecado y sin mantenimiento activo por la comunidad. Los mantenedores principales continuaron el desarrollo bajo la organización **Kafbat** (`https://ui.charts.kafbat.io`).
2. **ArgoCD:** La versión `v2.13.5` debe actualizarse a la rama `stable` (ArgoCD v3.x) para incorporar parches de seguridad recientes de la API y UI.
3. **MongoDB:** La versión `mongo:7.0.14` puede ser promocionada a la nueva LTS `mongo:8.0` manteniendo compatibilidad de comandos e inicialización.
4. **Apache Kafka en Strimzi:** Elevación de versión de broker a `3.8.2`/`3.9.0` sobre KRaft.

---

## 2. Decisión
1. Cambiar el Helm repository de Kafka UI a `https://ui.charts.kafbat.io` instalando `kafbat/kafka-ui`.
2. Actualizar el manifiesto de instalación remota de ArgoCD al canal oficial `stable` (`https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml`).
3. Promocionar la imagen Docker de MongoDB a `mongo:8.0` manteniendo las directivas de seguridad `--security-opt="no-new-privileges:true"` y límites de memoria.
4. Mantener listeners restringidos en `127.0.0.1` y verificar la seguridad de los pods con el rol de seguridad antes del despliegue.

---

## 3. Consecuencias
- Eliminación de deuda técnica y dependencias abandonadas.
- Mayor estabilidad y parches contra CVEs recientes.
