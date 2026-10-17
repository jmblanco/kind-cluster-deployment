# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-10-17

### Added
- **Local Agent Skills (.agent/skills):** Added three production-grade skills for AI agent workflows:
  - `cluster-doctor`: Proactive diagnostics, port conflict resolution, OOM/crash analysis, and automated remediation.
  - `microservice-scaffold`: Automated generation and deployment of microservices connected to Kafka, MongoDB, Ingress, and local registry.
  - `kafka-traffic-tester`: Ephemeral event generation, pub/sub testing, and UI validation on Strimzi KRaft broker.
- **Windows PowerShell Native Orchestrator:** Added `init.ps1` script with full parity for Windows developers, supporting interactive menu, non-interactive subcommands (`check`, `cluster`, `registry`, `mongodb`, `ingress`, `kafka`, `argocd`, `all`, `down`), and automated dependency checks.
- **Non-interactive CLI Automation:** Added full CLI subcommand parsing to `init.sh` (`check`, `cluster`, `registry`, `mongodb`, `ingress`, `kafka`, `argocd`, `all`, `up`, `down`, `delete`, `clean`).
- **Prerequisites Validator:** Added `check_prerequisites` function verifying presence of `docker`, `kind`, `kubectl`, `helm`, `yq`, `jq` and Docker daemon status.
- **Developer Productivity:** Added `Makefile` with targets (`check`, `up`, `down`, `cluster`, `registry`, `mongodb`, `ingress`, `kafka`, `argocd`, `help`).
- **CI / Static Quality Pipeline:** Added GitHub Actions workflow (`.github/workflows/ci.yml`) for ShellCheck and YAML linting.
- **Documentation & Standards:** Added comprehensive `AGENTS.md`, `GEMINI.md`, `CONTRIBUTING.md`, `LICENSE` (Apache-2.0), and `.editorconfig`.
- **Architectural Decision Records & Specs:** Created `ADR-0001` (KRaft migration), `SPEC-0001`, and `PLAN-0001`.

### Changed
- **Strimzi Kafka to KRaft Mode:** Migrated Apache Kafka from ZooKeeper-dependent topology to KRaft mode (`strimzi.io/kraft: "enabled"`, Kafka 3.8.0, combined broker/controller `KafkaNodePool`), eliminating JVM overhead and ZooKeeper StatefulSet.
- **Kubernetes Ingress Standards:** Updated Ingress specifications (`ingress/argocd.ingress.yaml`, `ingress/kafka-ui.ingress.yaml`) with explicit `ingressClassName: nginx` and HTTP security headers (`X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`).
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
