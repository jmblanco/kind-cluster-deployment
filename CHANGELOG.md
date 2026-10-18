# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2026-10-18

### Added
- **Demo Reference Microservice (`order-service`):**
  - Event-driven microservice implemented in Node.js/Express under `examples/order-service/`.
  - Kafka integration with KafkaJS producing `OrderCreatedEvent` to `orders.incoming` topic and consuming events asynchronously.
  - MongoDB persistence storing orders into `orders_db` with in-memory fallback.
  - Multi-stage non-root `Dockerfile` optimized for local container runtime.
  - Kubernetes manifests (`templates/order-service.deployment.yaml`) and Traefik Ingress routing (`ingress/order-service.ingress.yaml`) at `http://orders.local`.
  - CLI deployment module (`cli/src/modules/demo-service.js`), interactive TUI menu option (`📦 Deploy Demo Order Service`), and direct command `npm start demo`.
- **Spec-Driven Development (SDD) Framework & Governance:**
  - Comprehensive methodology guide in `docs/SDD-GUIDE.md` defining ADR $\rightarrow$ SPEC $\rightarrow$ PLAN workflow and storage conventions.
  - Visual Backlog Status Dashboard in `docs/PANEL-STATUS.md` tracking all 10 platform initiatives (80% implemented).
  - Synchronized master navigation index in `docs/README.md`.

## [1.3.0] - 2026-10-18

### Added
- **Modern Interactive Node.js CLI Orchestrator (`cli/`):**
  - Fully self-contained CLI tool using `@clack/prompts` and `picocolors`.
  - Stylish ASCII banner art and live status badges.
  - Granular multi-select checklist mode for picking individual cluster components.
  - Quick deployment presets: *Full Stack*, *Minimal Web Stack*, and *Event-Driven Stack*.
  - Native *Cluster Doctor & Diagnostics* directly integrated into the TUI.
  - Root `package.json` and `Makefile` target `make cli` for running `npm start`.
  - Comprehensive unit tests with Node test runner (`node:test`) and zero npm audit vulnerabilities.
- **Architectural & Design Records:**
  - Added `ADR-0006-interactive-node-cli.md`.
  - Added `SPEC-0004-interactive-node-cli.md`.
  - Added `PLAN-0005-interactive-node-cli.md`.

### Removed
- **Legacy Shell Scripts (`init.sh`, `init.ps1`):** Completely removed legacy Bash and PowerShell scripts in favor of the unified, multiplatform, and secure Node.js CLI.
- **ShellCheck in CI:** Replaced ShellCheck job with Node.js automated test runner (`npm test`) and security audit (`npm audit`).

## [1.1.0] - 2026-10-17

### Added
- **Traefik Ingress Controller:** Replaced NGINX Ingress with Traefik v3 (`templates/traefik-values.yaml`, namespace `traefik`) operating as `DaemonSet` on `hostPort: 80/443` bound to the Kind ingress-ready node.
- **Apache APISIX API Gateway:** Added Apache APISIX (`templates/apisix-values.yaml`, namespace `ingress-apisix`) as an internal high-performance API Gateway with dynamic plugin routing.
- **Local Agent Skills (.agent/skills):** Added three production-grade skills for AI agent workflows:
  - `cluster-doctor`: Proactive diagnostics, port conflict resolution, OOM/crash analysis, and automated remediation.
  - `microservice-scaffold`: Automated generation and deployment of microservices connected to Kafka, MongoDB, Ingress, and local registry.
  - `kafka-traffic-tester`: Ephemeral event generation, pub/sub testing, and UI validation on Strimzi KRaft broker.
- **Windows PowerShell Native Orchestrator:** Added `init.ps1` script with full parity for Windows developers, supporting interactive menu, non-interactive subcommands (`check`, `cluster`, `registry`, `mongodb`, `ingress`, `traefik`, `apisix`, `kafka`, `argocd`, `all`, `down`), and automated dependency checks.
- **Non-interactive CLI Automation:** Added full CLI subcommand parsing to `init.sh` (`check`, `cluster`, `registry`, `mongodb`, `ingress`, `traefik`, `apisix`, `kafka`, `argocd`, `all`, `up`, `down`, `delete`, `clean`).
- **Prerequisites Validator:** Added `check_prerequisites` function verifying presence of `docker`, `kind`, `kubectl`, `helm`, `yq`, `jq` and Docker daemon status.
- **Developer Productivity:** Added `Makefile` with targets (`check`, `up`, `down`, `cluster`, `registry`, `mongodb`, `ingress`, `traefik`, `apisix`, `kafka`, `argocd`, `help`).
- **CI / Static Quality Pipeline:** Added GitHub Actions workflow (`.github/workflows/ci.yml`) for ShellCheck and YAML linting.
- **Cluster Observability & Resource Exploration (Headlamp):** Added Headlamp Kubernetes Web UI (`templates/headlamp-values.yaml`, namespace `headlamp`) routed via Traefik Ingress at `http://headlamp.local` for visual navigation of pods, logs, web terminals, and CRDs (Strimzi Kafka, ArgoCD).
- **Cluster Metrics (Metrics-Server):** Integrated `metrics-server` in `kube-system` with `--kubelet-insecure-tls` patch (`templates/metrics-server-patch.yaml`), enabling real-time CPU/memory metrics for `kubectl top`.
- **In-Cluster Dashboard Hub:** Built, containerized, and deployed the management dashboard (`localhost:5000/cluster-dashboard:v1.0.3`, `templates/dashboard.deployment.yaml`) routed via Traefik Ingress at `http://dashboard.local`.
- **Zot OCI Registry with Trivy CVE Scanner:** Replaced default Distribution registry with Zot Registry v2.1.22 (`templates/zot-config.json`, `ingress/registry.ingress.yaml`) with Web UI and automated vulnerability scanning at `http://registry.local` and `localhost:5000`.
- **Documentation & Standards:** Added comprehensive `AGENTS.md`, `GEMINI.md`, `CONTRIBUTING.md`, `LICENSE` (Apache-2.0), and `.editorconfig`.
- **Architectural Decision Records & Specs:** Created `ADR-0001` (KRaft migration), `ADR-0002` (Traefik & APISIX), `ADR-0003` (Stable upgrades), `ADR-0004` (Headlamp & Metrics-Server), `ADR-0005` (Zot Registry & Trivy), `SPEC-0001`, `SPEC-0002`, `SPEC-0003`, `PLAN-0001`, `PLAN-0002`, `PLAN-0003`, and `PLAN-0004`.

### Changed
- **Strimzi Kafka to KRaft Mode:** Migrated Apache Kafka from ZooKeeper-dependent topology to KRaft mode (`strimzi.io/kraft: "enabled"`, Kafka 3.8.0, combined broker/controller `KafkaNodePool`), eliminating JVM overhead and ZooKeeper StatefulSet.
- **Kubernetes Ingress Standards:** Updated Ingress specifications (`ingress/argocd.ingress.yaml`, `ingress/kafka-ui.ingress.yaml`) to `ingressClassName: traefik` with Traefik v3 annotations.
- **Local Registry Hosting ConfigMap:** Upgraded `templates/kind-registry.configmap.yaml` to match official Kind KEP-1755 standard (`kube-public/local-registry-hosting`).

### Security
- **Loopback Isolation:** Restricted Ingress host port mappings (80 and 443) in `templates/kind.config.yaml` to `127.0.0.1` (`listenAddress`), preventing unauthorized access from local networks/Wi-Fi (SEC-01).
- **MongoDB Hardening:** Enabled root credentials initialization (`MONGO_INITDB_ROOT_USERNAME` / `MONGO_INITDB_ROOT_PASSWORD`), bounded memory (`--memory="1g"`), and security flag `--security-opt="no-new-privileges:true"`. Pinned image to `mongo:7.0.14` (SEC-02, SEC-07).
- **Registry Hardening:** Pinned container to `registry:2.8.3` with `--security-opt="no-new-privileges:true"` and memory limit.
- **Deterministic Supply Chain:** Pinned immutable versions for remote manifests (NGINX Ingress `controller-v1.12.0`, ArgoCD `v2.13.5`) and Helm charts (Strimzi `0.45.0`, Kafka UI `0.7.2`).
- **Secret Masking:** Eliminated plain-text printing of ArgoCD admin password in `stdout`, providing on-demand extraction command instead.
- **Defensive Scripting:** Implemented robust error propagation (`|| return 1`) across all lifecycle functions in `init.sh`.

---

## [1.0.0] - 2024-06-25

### Added
- Initial Kind cluster deployment setup with local registry, MongoDB, NGINX Ingress, Strimzi Kafka, Kafka UI, and ArgoCD.
- Interactive bash orchestration script (`init.sh`).
