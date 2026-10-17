# Contributing to kind-cluster-deployment

Thank you for your interest in contributing to `kind-cluster-deployment`! We welcome contributions from the cloud-native and Kubernetes community.

---

## 1. Code of Conduct
Please be respectful, constructive, and collaborative in all issues, pull requests, and discussions.

---

## 2. How to Contribute

### Reporting Issues
- Use GitHub Issues to report bugs or request features.
- Provide your OS version, Docker version, Kind version, and the full error output.

### Submitting Pull Requests
1. **Fork** the repository and create your feature branch:
   ```bash
   git checkout -b feat/my-new-addon
   ```
2. **Follow Conventions:**
   - Keep scripts modular and POSIX-compliant.
   - Use `LF` (Unix) line endings for all files.
   - Indent YAML by 2 spaces.
   - Ensure all scripts and Helm operations are **idempotent** (use `helm upgrade --install`, check before creating resources).
3. **Verify Locally:**
   - Run prerequisite checks:
     ```bash
     ./init.sh check
     ```
   - Test your deployment end-to-end:
     ```bash
     ./init.sh up
     ```
   - Test teardown:
     ```bash
     ./init.sh down
     ```
4. **Commit & Push:**
   - Use conventional commit messages (`feat:`, `fix:`, `docs:`, `refactor:`).
   - Open a Pull Request against the `main` branch.

---

## 3. Adding New Addons or Tools

When contributing a new ecosystem component (e.g. Prometheus, Vault, Cert-Manager):
1. Place Kubernetes manifests under `templates/<tool-name>.yaml`.
2. If the tool exposes a Web UI or API, add an Ingress under `ingress/<tool-name>.ingress.yaml`.
3. Add a dedicated function in `init.sh` and wire it up to both the CLI argument parser and the interactive menu.
4. Add a target to the `Makefile`.
5. Update `README.md` and `AGENTS.md` with ingress URLs and credentials.
