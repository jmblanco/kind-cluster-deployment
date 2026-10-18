.DEFAULT_GOAL := help
SHELL := /bin/bash

.PHONY: help cli check up down cluster registry mongodb ingress kafka argocd headlamp observability dashboard clean

help: ## Show this help menu
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

cli: ## Launch modern interactive Node.js TUI orchestrator
	@npm start --prefix cli

check: ## Verify prerequisite tools (docker, kind, kubectl, helm)
	@node ./cli/bin/kind-manager.js check

up: ## Provision the entire stack (Cluster, Registry, Mongo, Ingress, Kafka, ArgoCD, Observability, Dashboard)
	@node ./cli/bin/kind-manager.js all

down: ## Delete the Kind cluster and local containers
	@node ./cli/bin/kind-manager.js down

cluster: ## Create only the Kind cluster
	@node ./cli/bin/kind-manager.js cluster

registry: ## Deploy and link local Docker registry
	@node ./cli/bin/kind-manager.js registry

mongodb: ## Deploy and link MongoDB Docker container
	@node ./cli/bin/kind-manager.js mongodb

ingress: ## Install Traefik Ingress Controller
	@node ./cli/bin/kind-manager.js ingress

traefik: ## Install Traefik Ingress Controller
	@node ./cli/bin/kind-manager.js traefik

apisix: ## Install Apache APISIX API Gateway
	@node ./cli/bin/kind-manager.js apisix

kafka: ## Install Strimzi Kafka Operator, Broker (KRaft), and Kafka UI
	@node ./cli/bin/kind-manager.js kafka

argocd: ## Install ArgoCD and configure Ingress
	@node ./cli/bin/kind-manager.js argocd

headlamp: ## Install Headlamp K8s Explorer and Metrics-Server
	@node ./cli/bin/kind-manager.js headlamp

observability: headlamp ## Alias for headlamp

dashboard: ## Deploy Kind Control Panel Dashboard
	@node ./cli/bin/kind-manager.js dashboard

clean: down ## Alias for down
