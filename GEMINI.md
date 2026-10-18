# GEMINI.md — Gemini Agent Context & Execution Instructions

Welcome, Gemini agent. This project automates local Kubernetes infrastructure using Kind.

## Core Rules for Gemini
1. **Reference Document:** Review [AGENTS.md](file:///C:/Users/Jose%20Miguel/Desktop/Chemy/Proyectos/kind-cluster-deployment/AGENTS.md) for architecture, manifests, ports, and operational specifications.
2. **Execution Strategy:** Always use non-interactive commands (e.g. `npm start <subcommand>`, `node ./cli/bin/kind-manager.js <subcommand>` or `make <target>`). Never trigger interactive blocking prompts when running automated scripts in tool calls.
3. **Idempotency:** When editing scripts, manifests or helm commands, use `helm upgrade --install` and safe check-and-create statements.
4. **Environment Awareness:** The host OS may be Windows with PowerShell, WSL2, or Linux/macOS. Ensure the Node.js CLI remains portable across all platforms.
