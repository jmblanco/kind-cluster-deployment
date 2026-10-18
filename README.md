<p align="center"> 
  <img src="images/kind.png" alt="Kind Logo" width="250px" height="150px">
</p>
<h1 align="center"> Kubernetes Cluster with Kind </h1>
<h3 align="center"> Production-like local Kubernetes environment powered by Kind, Ingress, Kafka, and ArgoCD </h3>  

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg" alt="License"></a>
  <a href="https://kind.sigs.k8s.io/"><img src="https://img.shields.io/badge/Kind-v0.20+-blue?logo=kubernetes" alt="Kind"></a>
  <a href="https://kubernetes.io/"><img src="https://img.shields.io/badge/Kubernetes-v1.27+-326ce5?logo=kubernetes" alt="K8s"></a>
  <a href="https://github.com/ludeeus/action-shellcheck"><img src="https://img.shields.io/badge/ShellCheck-Passing-green?logo=gnubash" alt="ShellCheck"></a>
  <a href="AGENTS.md"><img src="https://img.shields.io/badge/AI%20Agents-Ready-brightgreen?logo=openai" alt="Agents Ready"></a>
</p>

<p align="center"> 
  <img src="images/kubernetes.jpg" alt="Sample signal" width="90%">
</p>

---

## 📖 Table of Contents

- [About](#about)
- [Prerequisites](#prerequisites)
- [Architecture & Stack](#architecture--stack)
  - [Component Architecture & Role Guide](docs/ARCHITECTURE.md)
  - [DNS Assistant & Resolution Guide](docs/DNS-GUIDE.md)
- [Folder Structure](#folder-structure)
- [Quick Start](#quick-start)
  - [1. DNS Assistant (Automatic & Manual)](#1-dns-resolution-hosts-file)
  - [2. Deploy the Stack](#2-deploy-the-stack)
- [Local Endpoints & Access](#local-endpoints--access)
- [AI Agent Integration](#ai-agent-integration)
- [Contributing](#contributing)
- [License](#license)

---

## ✏️ About

**`kind-cluster-deployment`** is a turnkey solution designed to provision a complete, production-like Kubernetes cluster on your local machine using **Kind (Kubernetes in Docker)** in minutes.

Ideal for cloud-native developers, QA engineers, and DevOps practitioners who want to test event-driven architectures, GitOps workflows, and microservices without the overhead of cloud expenses.

---

## 💊 Prerequisites

Ensure the following tools are installed and present in your system's `PATH`:

| Tool | Minimum Version | Purpose |
| :--- | :--- | :--- |
| [**Docker**](https://docs.docker.com/get-docker/) | 20.10+ | Container runtime for Kind nodes and services |
| [**Kind**](https://kind.sigs.k8s.io/) | v0.20+ | Multi-node/Ingress-ready local Kubernetes clusters |
| [**kubectl**](https://kubernetes.io/docs/tasks/tools/) | v1.27+ | Kubernetes CLI client |
| [**Helm**](https://helm.sh/) | v3.10+ | Package manager for Kubernetes (Strimzi, Kafka UI) |
| [**yq**](https://github.com/mikefarah/yq) | v4.0+ | YAML processor for config manipulation |
| [**jq**](https://stedolan.github.io/jq/) | v1.6+ | Command-line JSON processor |

> 💡 **Tip:** Verify that all required dependencies are ready by running:
> ```bash
> npm start check
> # OR
> make check
> ```

---

## 🏛️ Architecture & Stack

The repository configures an ingress-ready Kind cluster interconnected with a local Docker bridge network:

```
                      ┌───────────────────────────────────────┐
                      │              Local Host               │
                      │ 127.0.0.1 argocd.local kafka-ui.local │
                      └───────┬──────────────────────┬────────┘
                              │ :80 / :443           │ :5000 / :37017
                              ▼                      ▼
┌──────────────────────────────────────────┐   ┌───────────────────────────┐
│        Kind Cluster (kind-k8s-local)     │   │ Standalone Containers     │
│                                          │   │                           │
│  ┌────────────────────────────────────┐  │   │  ┌──────────────────────┐ │
│  │     Traefik Ingress Controller     │  │   │  │ kind-registry (:5000)│ │
│  └──────┬──────────────┬──────────────┘  │   │  └──────────────────────┘ │
│         │              │                 │   │                           │
│         ▼              ▼                 │   │  ┌──────────────────────┐ │
│  ┌──────────────┐┌─────────────┐         │   │  │ kind-mongodb (:37017)│ │
│  │ Kafka UI     ││ ArgoCD      │         │   │  └──────────────────────┘ │
│  │ (:80)        ││ Server(:443)│         │   └─────────────┬─────────────┘
│  └──────┬───────┘└─────────────┘         │                 │
│         │                                │                 │
│         ▼                                │                 │
│  ┌──────────────┐  ┌──────────────────┐  │   Docker Network│ (kind)
│  │ Strimzi Kafka│  │ Apache APISIX    │  │◄────────────────┘
│  │ (KRaft Mode) │  │ (API Gateway)    │  │
│  └──────────────┘  └──────────────────┘  │
└──────────────────────────────────────────┘
```

---

## 📂 Folder Structure

```
.
├── .github/workflows/      # Automated CI pipelines (linting & validation)
├── images/                 # Diagram and brand assets
├── ingress/                # Ingress routing manifests
│   ├── argocd.ingress.yaml
│   └── kafka-ui.ingress.yaml
├── templates/              # Cluster and application manifests
│   ├── kafka-broker.config.yaml
│   ├── kind-registry.configmap.yaml
│   ├── kind.config.yaml
│   └── secret.storage.yaml
├── AGENTS.md               # Architecture and guidelines for AI agents
├── CONTRIBUTING.md          # Community contribution guidelines
├── GEMINI.md               # Agent bootstrap instructions
├── cli/                    # Modern interactive Node.js TUI orchestrator
│   ├── bin/kind-manager.js # CLI entrypoint
│   ├── src/                # Modular lifecycle controllers & TUI
│   └── tests/              # Unit & regression test suite
├── Makefile                # Developer build and run shortcuts
├── package.json            # Root scripts (npm start, npm test)
└── README.md               # Project documentation
```

---

## 🚀 Quick Start

### 1. DNS Resolution & Assistant (Hosts File)

The stack exposes services via clean local domains (`*.local`). You can verify and synchronize your system `hosts` file automatically using the built-in DNS Assistant:

```bash
npm start dns
# OR run the full diagnostic:
npm start doctor
```

> 📖 **Full Guide:** For detailed cross-platform instructions and troubleshooting, see [docs/DNS-GUIDE.md](docs/DNS-GUIDE.md).

Alternatively, you can manually add the following line to your `/etc/hosts` (macOS/Linux) or `C:\Windows\System32\drivers\etc\hosts` (Windows):

```text
127.0.0.1 dashboard.local headlamp.local registry.local argocd.local kafka-ui.local apisix.local
```

### 2. Deploy the Stack

#### Modern Interactive TUI (Recommended)
Run the visual interactive CLI in Node.js (with ASCII banner, checkboxes, presets, and live spinners):
```bash
npm start
# OR using make
make cli
# OR directly from cli/
cd cli && npm start
```

#### Non-Interactive CLI / CI/CD Automation
Deploy, verify, or manage specific components non-interactively via npm or Make:

```bash
# Verify prerequisites:
npm start check
# OR: make check

# Provision the complete stack in order of dependencies:
npm start all
# OR: make up

# Provision modular components:
npm start cluster       # Spin up Kind cluster only
npm start registry      # Start local Zot OCI image registry
npm start mongodb       # Start MongoDB container
npm start ingress       # Deploy Traefik Ingress controller
npm start apisix        # Deploy Apache APISIX Gateway
npm start kafka         # Deploy Strimzi Kafka (KRaft) & Kafka UI
npm start argocd        # Deploy ArgoCD & Ingress
npm start headlamp      # Deploy Headlamp Explorer & Metrics-Server
npm start dashboard     # Deploy Kind Control Panel Dashboard

# Cleanup & Teardown:
npm start down
# OR: make down
```

---

## 🌐 Local Endpoints & Access

> 📖 **Architecture & Roles:** For a deep dive into what each piece does, how they interact, and internal ports, see the [Architecture & Component Role Guide](docs/ARCHITECTURE.md).

| Service | Access URL | Default Credentials / Info | Role in the Stack |
| :--- | :--- | :--- | :--- |
| **Cluster Dashboard Hub** | [http://dashboard.local](http://dashboard.local) | No auth required | Landing page & service status catalog |
| **Headlamp Explorer** | [http://headlamp.local](http://headlamp.local) | Token generation button on screen | Visual K8s console, logs & pod shell |
| **ArgoCD Server** | [https://argocd.local](https://argocd.local) | **User:** `admin`<br>**Password:** printed during installation or retrieved via:<br>`kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" \| base64 -d` | GitOps continuous delivery & sync |
| **Kafka UI** | [http://kafka-ui.local](http://kafka-ui.local) | No auth required | Management UI for Strimzi Kafka topics & consumers |
| **Apache APISIX Gateway** | [http://apisix.local](http://apisix.local) | API Gateway endpoint | L7 routing, plugins & microservices gateway |
| **Zot OCI Registry (UI)** | [http://registry.local](http://registry.local) / `localhost:5000` | No auth required | Local Docker registry with Trivy security scans |
| **MongoDB** | `localhost:37017` | `mongodb://localhost:37017` | Standalone NoSQL database for testing/mocks |
| **Kafka Broker (KRaft)** | Internal: `kafka-cluster-kafka-bootstrap.kafka.svc:9092` | KRaft mode (ephemeral/lightweight) | Event-driven pub/sub messaging backbone |

---

## 🤖 AI Agent Integration

This repository is optimized for autonomous development with AI coding agents (Antigravity, Cursor, Copilot, Gemini CLI, Claude Code).

- **Full agent specifications:** See [AGENTS.md](AGENTS.md).
- **Agent guidelines:** Agents should utilize non-interactive CLI flags (`./init.sh all`, `make up`) and enforce idempotency using `helm upgrade --install`.

---

## 🤝 Contributing

Contributions from the community are warmly welcome! Whether it's adding new add-ons (Prometheus, Cert-Manager, Vault, LocalStack), improving scripts, or expanding documentation, check out [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

---

## 📄 License

Distributed under the **Apache 2.0 License**. See [LICENSE](LICENSE) for more information.