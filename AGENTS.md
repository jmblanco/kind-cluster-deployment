# AGENTS.md — AI Agent Guidelines & Architecture Reference

This document provides context, technical constraints, architectural standards, and execution workflows for AI coding agents (Antigravity, Cursor, Copilot, Claude Code, etc.) interacting with this repository.

---

## 1. Project Overview

- **Name:** `kind-cluster-deployment`
- **Purpose:** Fast, automated provisioning of local Kubernetes clusters using [Kind (Kubernetes in Docker)](https://kind.sigs.k8s.io/) bundled with a local container registry, NGINX Ingress, Apache Kafka (via Strimzi), Kafka UI, MongoDB, and ArgoCD.
- **Target Audience:** Cloud-native developers, DevOps/Platform engineers, QA, and local microservices testing.
- **Primary Interface:** `npm start` (Interactive TUI Menu & CLI subcommands), `node ./cli/bin/kind-manager.js` and `Makefile`.

---

## 2. Directory Structure & Conventions

```
kind-cluster-deployment/
├── .agent/                    # Antigravity Agent skills
│   └── skills/
│       ├── cluster-doctor/    # Diagnostics & auto-remediation skill
│       ├── kafka-traffic-tester/ # Kafka KRaft pub/sub testing skill
│       └── microservice-scaffold/ # Microservice generator & deployer skill
├── .github/
│   └── workflows/
│       └── ci.yml             # GitHub Actions CI for linting and validation
├── cli/                       # Modern interactive Node.js TUI orchestrator
│   ├── bin/kind-manager.js    # Entrypoint CLI executable
│   ├── src/                   # Lifecycle controllers, menus & banner
│   └── tests/                 # Node test runner suite
├── docs/                      # Architectural Decisions & Specifications (MANDATORY)
│   ├── decisions/             # Architecture Decision Records (ADR-XXXX-slug.md)
│   ├── plans/                 # SDD Implementation Plans (PLAN-XXXX-slug.md)
│   └── specs/                 # Technical Specifications (SPEC-XXXX-slug.md)
├── images/                    # Visual assets for documentation
├── ingress/                   # Ingress resource definitions
│   ├── argocd.ingress.yaml    # Ingress for ArgoCD Server (argocd.local)
│   └── kafka-ui.ingress.yaml  # Ingress for Kafka UI (kafka-ui.local)
├── templates/                 # Kubernetes and Kind configuration templates
│   ├── kafka-broker.config.yaml       # Strimzi Kafka CR (ephemeral storage)
│   ├── kind-registry.configmap.yaml   # ConfigMap for Kind local registry hosting
│   ├── kind-registry.service.yaml     # (Backwards compatibility) ConfigMap
│   ├── kind.config.yaml               # Kind multi-port cluster definition
│   └── secret.storage.yaml            # External Secrets Operator template (addon)
├── .editorconfig              # Uniform code formatting
├── .gitignore                 # Ignored files (OS, IDEs)
├── AGENTS.md                  # This file (Agent instructions & guidelines)
├── CHANGELOG.md               # Semantic versioning changelog
├── CONTRIBUTING.md             # Contributor guidelines
├── GEMINI.md                  # Context for Gemini / Antigravity agents
├── LICENSE                    # Apache 2.0 License
├── Makefile                   # Developer shortcuts (make up, make down, etc.)
├── package.json               # Root scripts (npm start, npm test)
└── README.md                  # Human-facing project documentation
```

### Conventions:
- **Architectural & Design Traceability (MUST):** All architectural choices, technical contracts, and structural changes MUST be documented as ADRs under `docs/decisions/` (`ADR-{NNNN}-{slug}.md`) and specs under `docs/specs/` (`SPEC-{NNNN}-{slug}.md`).
- **Manifests:** Stored under `templates/` (for configurations applied to the cluster) or `ingress/` (for domain routing).
- **Naming:** K8s resources should use `<name>.<resource-kind>.yaml` or descriptive names.
- **Line Endings:** All YAML and code files MUST maintain Unix line endings (`LF`). Avoid converting to `CRLF`.

---

## 3. Technology Stack & Required Tools

Agents must assume the following CLI dependencies exist on the host or in CI:
- **`node`** (v18+) & **`npm`**: Runs the modern self-contained TUI and automation CLI.
- **`docker`** (Engine 20.10+): Needed for running container nodes, local registry, and MongoDB.
- **`kind`** (v0.20+): Creates and manages local Kubernetes in Docker clusters.
- **`kubectl`** (v1.27+): Communicates with the K8s API server.
- **`helm`** (v3.10+): Deploys Helm charts (Strimzi Operator, Kafka UI).

---

## 4. Execution Protocols & Commands

### Non-Interactive Automation (Recommended for Agents & CI)
Agents should avoid running interactive scripts. Use the CLI argument modes provided by `npm start <cmd>`, `node ./cli/bin/kind-manager.js <cmd>` and `Makefile`:

```bash
# Verify prerequisites
npm start check
# OR
make check

# Provision complete stack
npm start all
# OR
make up

# Provision modular components
npm start cluster       # Kind cluster only
npm start registry      # Zot OCI Container registry
npm start mongodb       # MongoDB container linked to kind network
npm start ingress       # Traefik Ingress controller
npm start apisix        # Apache APISIX Gateway
npm start kafka         # Strimzi Operator + Kafka Broker + Kafka UI
npm start argocd        # ArgoCD + Ingress
npm start headlamp      # Headlamp Explorer & Metrics-Server
npm start dashboard     # Control Panel Hub
npm start dns           # DNS Assistant & Hosts resolution check

# Teardown / Cleanup
npm start down
# OR
make down
```

### Interactive Mode (Human users only)
Running `npm start` (or `make cli`) without arguments launches an interactive visual TUI menu with checkboxes and presets.

---

## 5. Architectural Components & Ingress Routing

| Component | Namespace / Host | Internal Port | Host Port / URL | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Kind Control Plane** | host | 6443 | Dynamic (Kubeconfig) | Node labeled `ingress-ready=true` |
| **Traefik Ingress** | `traefik` | 80, 443 | `80`, `443` | Ingress Controller perimetral en Kind (`hostPort`) |
| **Apache APISIX** | `ingress-apisix` | 9080, 9443 | `http://apisix.local` | API Gateway para microservicios y plugins avanzados |
| **Cluster Dashboard Hub** | `default` | 8088 | `http://dashboard.local` | Panel de control frontal desplegado en Kind |
| **Headlamp K8s Explorer** | `headlamp` | 80 | `http://headlamp.local` | Explorador visual de recursos, CRDs, logs y shell web |
| **Metrics-Server** | `kube-system` | 10250 | Cluster internal | Servidor de métricas para `kubectl top` y UI |
| **Zot OCI Registry (Trivy)** | Docker network `kind` | 5000 | `http://registry.local` / `localhost:5000` | Registro OCI con Web UI nativa y escaneo de vulnerabilidades Trivy |
| **MongoDB** | Docker network `kind` | 27017 | `localhost:37017` | Standalone Docker container linked to Kind |
| **Kafka Broker** | `kafka` | 9092, 9093 | Internal service | Managed by Strimzi (KRaft mode, ephemeral) |
| **Kafka UI** | `kafka` | 80 | `http://kafka-ui.local` | Ingress routed via Traefik |
| **ArgoCD Server** | `argocd` | 443 | `https://argocd.local` | Ingress with HTTPS backend via Traefik |

> **Host DNS Requirement:**
> To access `http://dashboard.local`, `http://headlamp.local`, `http://registry.local`, `http://kafka-ui.local`, `https://argocd.local` or `http://apisix.local`, the host machine's `/etc/hosts` (or `C:\Windows\System32\drivers\etc\hosts`) must contain:
> ```
> 127.0.0.1 dashboard.local headlamp.local registry.local kafka-ui.local argocd.local apisix.local
> ```

---

## 6. Safety, Idempotency & Quality Rules for Agents

When editing or proposing changes:

1. **Idempotency is Mandatory:**
   - Always use `helm upgrade --install` instead of `helm install` so rerunning scripts does not error.
   - Always check `if [ "$(kind get clusters | grep ...)" = "" ]` or equivalent before creating clusters.
   - Use `kubectl apply -f ...` instead of `kubectl create -f ...`.
   - Use `kubectl wait` with reasonable timeouts (e.g., 300s) to guarantee readiness before dependent steps.

2. **Error Handling:**
   - Use defensive Bash practices: error checking, descriptive color-coded outputs, and non-zero exit codes upon failure in CLI mode.

3. **No Secret Leaks:**
   - Never commit sensitive tokens, plaintext keys, or external cloud credentials into `templates/` or scripts.

4. **Preserve Compatibility:**
   - The project supports both interactive human users and automated pipelines/agents. Never remove CLI flag parsing support.

5. **Kubernetes Version Standards:**
   - Avoid deprecated Ingress annotations. Use `networking.k8s.io/v1`.
   - Prefer modern Kafka configurations (e.g. KRaft mode in future Strimzi releases) over legacy ZooKeeper topologies when updating Strimzi manifests.

---

## 7. Troubleshooting Playbook for Agents

- **Port Conflict (80/443/5000):**
  - Symptom: `kind create cluster` fails or Docker port binding errors.
  - Solution: Check if another service (Apache, IIS, another Kind cluster, Docker container) is using host port 80, 443, or 5000 (`netstat -ano` on Windows, `lsof -i :80` on Unix).
- **Strimzi CRD Wait Timeout:**
  - Symptom: `kubectl wait kafka/kafka-cluster --for=condition=Ready` times out.
  - Solution: Check operator logs with `kubectl logs -n kafka -l strimzi.io/kind=cluster-operator`. Check node memory allocation (Kafka requires sufficient RAM in Docker Desktop/colima).
- **ArgoCD Login Issue:**
  - Password extraction command:
    ```bash
    kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
    ```

---

## 8. Antigravity Agent Skills Reference

Agents working on this repository should leverage the local specialized skills located in [`.agent/skills/`](./.agent/skills/):

- **[`cluster-doctor`](./.agent/skills/cluster-doctor/SKILL.md):** Trigger when diagnosing pod crashes, memory pressure on Docker, port conflicts, or unreachable Ingress endpoints.
- **[`microservice-scaffold`](./.agent/skills/microservice-scaffold/SKILL.md):** Trigger when requested to create, containerize, and deploy a new microservice or mock on the Kind cluster linked to Kafka, MongoDB, Ingress, and the local registry.
- **[`kafka-traffic-tester`](./.agent/skills/kafka-traffic-tester/SKILL.md):** Trigger when verifying KRaft Kafka event ingestion, generating ephemeral test messages, or validating Kafka UI live stream feeds.
- **[`doc-sync`](./.agent/skills/doc-sync/SKILL.md):** Trigger whenever code, CLI commands, templates, or SDD plans change, to audit and synchronize all architecture guides and user manuals.

Refer to [`.agent/skills/README.md`](./.agent/skills/README.md) for full instructions and trigger conditions.
