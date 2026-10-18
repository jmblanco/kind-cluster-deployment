# PLAN-0008: Almacenamiento Persistente Configurable para Kafka y MongoDB

- **Estado:** Pendiente / Programado
- **Trazabilidad:** [ADR-0007](../decisions/ADR-0007-advanced-platform-roadmap.md) | [SPEC-0005](../specs/SPEC-0005-advanced-platform-roadmap.md)
- **Talla Estimada:** S

## 1. Objetivo
Permitir a los desarrolladores alternar entre almacenamiento efímero (rápido, sin residuos) y almacenamiento persistente (que conserve datos de tópicos Kafka y colecciones MongoDB entre reinicios del cluster).

## 2. Tareas Atómicas de Implementación

### Tarea 1: Plantilla de Persistencia de Strimzi Kafka
- [ ] Crear plantilla `templates/kafka-broker.persistent.yaml` utilizando `type: persistent-claim` con tamaño de 5Gi sobre el StorageClass `standard` de Kind.
- [ ] Mantener compatibilidad con la plantilla efímera existente `templates/kafka-broker.config.yaml`.

### Tarea 2: Persistencia para Contenedor MongoDB
- [ ] Añadir soporte para montar volumen Docker de datos (`-v kind-mongodb-data:/data/db`) cuando se active la persistencia.

### Tarea 3: Parámetro en CLI y Toggle en TUI
- [ ] Soporte de flag `--persistent` en `npm start all` y `npm start kafka`.
- [ ] Checkbox o pregunta interactiva en el menú TUI para elegir modo de almacenamiento.
- [ ] Tests unitarios en `cli/tests/`.
