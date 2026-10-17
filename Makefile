.DEFAULT_GOAL := help
SHELL := /bin/bash

.PHONY: help check up down cluster registry mongodb ingress kafka argocd clean

help: ## Show this help menu
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

check: ## Verify prerequisite tools (docker, kind, kubectl, helm, yq, jq)
	@./init.sh check

up: ## Provision the entire stack (Cluster, Registry, Mongo, Ingress, Kafka, ArgoCD)
	@./init.sh all

down: ## Delete the Kind cluster and local containers
	@./init.sh down

cluster: ## Create only the Kind cluster
	@./init.sh cluster

registry: ## Deploy and link local Docker registry
	@./init.sh registry

mongodb: ## Deploy and link MongoDB Docker container
	@./init.sh mongodb

ingress: ## Install NGINX Ingress Controller
	@./init.sh ingress

kafka: ## Install Strimzi Kafka Operator, Broker, and Kafka UI
	@./init.sh kafka

argocd: ## Install ArgoCD and configure Ingress
	@./init.sh argocd

clean: down ## Alias for down
