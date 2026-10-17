# GEMINI.md — Gemini Agent Context & Execution Instructions

Welcome, Gemini agent. This project automates local Kubernetes infrastructure using Kind.

## Core Rules for Gemini
1. **Reference Document:** Review [AGENTS.md](file:///C:/Users/Jose%20Miguel/Desktop/Chemy/Proyectos/kind-cluster-deployment/AGENTS.md) for architecture, manifests, ports, and operational specifications.
2. **Execution Strategy:** Always use non-interactive commands (e.g. `./init.sh <subcommand>` or `make <target>`). Never trigger interactive blocking prompts (`read`) when running automated scripts in tool calls.
3. **Idempotency:** When editing scripts or helm commands, use `helm upgrade --install` and safe check-and-create statements.
4. **Environment Awareness:** The host OS may be Windows with PowerShell, WSL2, or Linux/macOS. Ensure shell scripts use standard POSIX syntax and Unix line endings (`LF`).
