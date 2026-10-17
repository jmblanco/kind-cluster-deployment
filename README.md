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
- [Folder Structure](#folder-structure)
- [Quick Start](#quick-start)
  - [Interactive Mode](#interactive-mode)
  - [CLI Mode / Non-Interactive](#cli-mode--non-interactive)
  - [Using Make](#using-make)
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
> ./init.sh check
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
│  │     NGINX Ingress Controller       │  │   │  │ kind-registry (:5000)│ │
│  └──────┬──────────────────────┬──────┘  │   │  └──────────────────────┘ │
│         │                      │         │   │                           │
│         ▼                      ▼         │   │  ┌──────────────────────┐ │
│  ┌──────────────┐       ┌─────────────┐  │   │  │ kind-mongodb (:37017)│ │
│  │ Kafka UI     │       │ ArgoCD      │  │   │  └──────────────────────┘ │
│  │ (:80)        │       │ Server(:443)│  │   └─────────────┬─────────────┘
│  └──────┬───────┘       └─────────────┘  │                 │
│         │                                │                 │
│         ▼                                │                 │
│  ┌──────────────┐                        │   Docker Network│ (kind)
│  │ Strimzi Kafka│                        │◄────────────────┘
│  │ (KRaft Mode) │                        │
│  └──────────────┘                        │
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
├── Makefile                # Developer build and run shortcuts
├── README.md               # Project documentation
└── init.sh                 # Unified deployment script (CLI + Interactive)
```

---

## 🚀 Quick Start

### 1. DNS Resolution (Hosts File)
Add the following line to your `/etc/hosts` (macOS/Linux) or `C:\Windows\System32\drivers\etc\hosts` (Windows):

```text
127.0.0.1 argocd.local kafka-ui.local
```

### 2. Deploy the Stack

#### Interactive Mode (Default)
Run the interactive menu and select `7) Install all`:
```bash
./init.sh
```

#### CLI Mode (Automation & CI/CD)
Deploy or manage specific components non-interactively:

**Linux / macOS / Git Bash:**
```bash
# Provision everything in one command
./init.sh all

# Or deploy step-by-step:
./init.sh cluster     # Spin up Kind cluster
./init.sh registry    # Start local image registry
./init.sh mongodb     # Start MongoDB container
./init.sh ingress     # Deploy NGINX Ingress controller
./init.sh kafka       # Deploy Strimzi Kafka & Kafka UI
./init.sh argocd      # Deploy ArgoCD
```

**Windows (PowerShell Nativo):**
```powershell
# Interactive menu:
.\init.ps1

# Non-interactive CLI:
.\init.ps1 all         # Provision complete stack
.\init.ps1 cluster     # Kind cluster only
.\init.ps1 check       # Verify prerequisites
.\init.ps1 down        # Cleanup & teardown
```

#### Using Make
```bash
make check   # Verify dependencies
make up      # Deploy everything
make down    # Destroy cluster and containers
```

---

## 🌐 Local Endpoints & Access

| Service | Access URL | Default Credentials / Info |
| :--- | :--- | :--- |
| **ArgoCD** | [https://argocd.local](https://argocd.local) | **User:** `admin`<br>**Password:** printed during installation or retrieved via:<br>`kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" \| base64 -d` |
| **Kafka UI** | [http://kafka-ui.local](http://kafka-ui.local) | No authentication required (Local development) |
| **Container Registry**| `localhost:5000` | Push: `docker tag <img-name> localhost:5000/<img-name>`<br>`docker push localhost:5000/<img-name>` |
| **MongoDB** | `localhost:37017` | Standard connection string:<br>`mongodb://localhost:37017` |

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