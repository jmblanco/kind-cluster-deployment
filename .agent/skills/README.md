# Antigravity Local Agent Skills Reference

This directory contains specialized Antigravity Agent skills located in `.agent/skills/`. AI coding agents (Antigravity, Cursor, Claude Code, Copilot, etc.) can discover and execute these skills directly when diagnosing issues, deploying new applications, or running tests.

---

## Skills Catalog

| Skill Name | Location | Primary Role & Capabilities | Trigger Scenarios |
| :--- | :--- | :--- | :--- |
| **`cluster-doctor`** | [`.agent/skills/cluster-doctor/SKILL.md`](./cluster-doctor/SKILL.md) | Local health audits, port collision detection (80, 443, 5000, 37017), Docker Desktop resource pressure, crash analysis, and automated remediation. | Broken cluster, pods in `CrashLoopBackOff`, `OOMKilled`, `Pending`, failed start of deployment, unreachable local domains. |
| **`microservice-scaffold`** | [`.agent/skills/microservice-scaffold/SKILL.md`](./microservice-scaffold/SKILL.md) | Standardized generation and deployment of microservices connected to Strimzi Kafka, MongoDB, Ingress, and the Kind local registry (`localhost:5000`). | Creating or deploying new apps, mocks, producers, consumers, or REST APIs on the Kind cluster. |
| **`kafka-traffic-tester`** | [`.agent/skills/kafka-traffic-tester/SKILL.md`](./kafka-traffic-tester/SKILL.md) | Ephemeral Kafka KRaft pub/sub testing: automated creation of `KafkaTopic` CRDs, console producer injection, consumer polling, and Kafka UI validation. | Validating Kafka broker health, simulating event streams, or testing real-time event arrival in Kafka UI. |
| **`doc-sync`** | [`.agent/skills/doc-sync/SKILL.md`](./doc-sync/SKILL.md) | Automated audit and continuous synchronization of technical guides, README, AGENTS.md, ADRs, and plans against codebase changes. | Modifications in CLI modules, new services, completed SDD plans, or requests to reorganize documentation. |

---

## Detailed Skill Instructions

### 1. `cluster-doctor`
- **When to activate:** Whenever deployment fails during creation, or when pods fail to report `Ready` status.
- **Workflow:**
  1. Inspect host port bindings for `80`, `443`, `5000`, `37017`.
  2. Query Docker daemon state and orphan Kind containers.
  3. Inspect node conditions: `kubectl describe node kind-k8s-local-control-plane` to rule out `MemoryPressure` or `DiskPressure`.
  4. Query non-running pods with `kubectl get pods -A --field-selector=status.phase!=Running`.
  5. Check pod termination cause with `kubectl logs <pod> --previous` or describe events.
  6. Apply automatic rollouts or guide the developer to allocate adequate memory in Docker Desktop (>= 6 GB).

### 2. `microservice-scaffold`
- **When to activate:** Whenever the user asks to add a new service, backend API, mock server, or worker pod.
- **Conventions enforced:**
  - Build and push targets `localhost:5000/<app-name>:<tag>` (via Kind local registry hosting).
  - Internal Kafka connection: `kafka-cluster-kafka-bootstrap.kafka.svc:9092`.
  - Internal MongoDB connection: `kind-mongodb:27017`.
  - Standard Ingress with `spec.ingressClassName: nginx` and HTTP security headers (`X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`).
  - DNS notice: prompt to add entry in `/etc/hosts` or `C:\Windows\System32\drivers\etc\hosts`.

### 3. `kafka-traffic-tester`
- **When to activate:** Whenever testing event broker communication or validating Kafka UI without installing JVM tools on the host.
- **Workflow:**
  1. Generate declarative `KafkaTopic` CRD with 3 partitions and 1 replica.
  2. Launch an ephemeral pod (`kubectl run --rm -i ... quay.io/strimzi/kafka`) to produce structured JSON events.
  3. Launch an ephemeral consumer pod to read from beginning.
  4. Instruct the developer to verify the messages live at `http://kafka-ui.local`.
  5. Clean up temporary topics and test resources.

---

## Adding New Skills

When adding a new skill to this project:
1. Create a dedicated folder: `.agent/skills/<skill-name>/`.
2. Provide a valid `SKILL.md` containing YAML frontmatter (`name`, `description`, `argument-hint`, `triggers: [user, model]`).
3. Document actionable workflows, commands, and expected outputs.
4. Update this `README.md` and the master [AGENTS.md](../../AGENTS.md) reference.
