#!/bin/bash

# ==============================================================================
# Kind Cluster Deployment & Local Tooling Orchestrator
# Supports both interactive menu mode and non-interactive CLI arguments.
# ==============================================================================

set -o pipefail

##
# Color Variables
##
green='\e[32m'
blue='\e[34m'
cian='\e[36m'
red='\e[31m'
yellow='\e[33m'
clear='\e[0m\n'

ColorGreen(){
	echo -ne "${green}$1${clear}"
}
ColorBlue(){
	echo -ne "${blue}$1${clear}"
}
ColorYellow(){
	echo -ne "${yellow}$1${clear}"
}
ColorRed(){
	echo -ne "${red}$1${clear}"
}

## Global variables
kind_config="${KIND_CONFIG:-./templates/kind.config.yaml}"
kafka_config="${KAFKA_CONFIG:-./templates/kafka-broker.config.yaml}"
reg_name="${REG_NAME:-kind-registry}"
reg_port="${REG_PORT:-5000}"
mongodb_name="${MONGODB_NAME:-kind-mongodb}"
mongodb_port="${MONGODB_PORT:-37017}"
kafka_ns="${KAFKA_NS:-kafka}"
argocd_ns="${ARGOCD_NS:-argocd}"

##
# Prerequisite Verification
##
function check_prerequisites() {
	echo -ne "${cian}Checking required tools...${clear}"
	local missing_tools=()
	local required_tools=("docker" "kind" "kubectl" "helm" "yq" "jq")

	for tool in "${required_tools[@]}"; do
		if ! command -v "$tool" >/dev/null 2>&1; then
			missing_tools+=("$tool")
		fi
	done

	if [ ${#missing_tools[@]} -ne 0 ]; then
		ColorRed "Error: The following required tools are missing from PATH:"
		for missing in "${missing_tools[@]}"; do
			echo "  - $missing"
		done
		echo ""
		echo "Please install the missing tools and try again."
		return 1
	fi

	if ! docker info >/dev/null 2>&1; then
		ColorRed "Error: Docker daemon is not running. Please start Docker and try again."
		return 1
	fi

	ColorGreen "All required tools are installed and Docker daemon is running."
	echo ""
	return 0
}

##
# Main functions
##
function create_cluster() {
	if [ ! -f "$kind_config" ]; then
		ColorRed "Error: Kind config file not found at $kind_config"
		return 1
	fi

	local cluster_name
	cluster_name=$(yq -r .name "$kind_config")
	echo ""
	echo -ne "${cian}Creating cluster '${cluster_name}' with config '${kind_config}' if not exists ...${clear}"

	if kind get clusters 2>/dev/null | grep -q "^${cluster_name}$"; then
		ColorYellow "Cluster '${cluster_name}' already exists. Skipping creation."
	else
		kind create cluster --config="${kind_config}" -n "${cluster_name}" || {
			ColorRed "Failed to create Kind cluster '${cluster_name}'"
			return 1
		}
		ColorGreen "Cluster '${cluster_name}' created successfully."
	fi
	echo ""
}

function create_registry() {
	echo ""
	echo -ne "${cian}Configuring local container registry ...${clear}"

	# Run registry container if not already running
	if [ "$(docker inspect -f '{{.State.Running}}' "${reg_name}" 2>/dev/null || true)" != 'true' ]; then
		docker run \
			-d --restart=always -p "127.0.0.1:${reg_port}:5000" --name "${reg_name}" \
			--security-opt="no-new-privileges:true" --memory="512m" \
			registry:2.8.3 || {
				ColorRed "Failed to start registry container '${reg_name}'"
				return 1
			}
	else
		ColorYellow "Registry container '${reg_name}' is already running."
	fi

	# Connect registry to the kind network if not connected
	if docker network inspect "kind" >/dev/null 2>&1; then
		if [ "$(docker inspect -f='{{json .NetworkSettings.Networks.kind}}' "${reg_name}")" = 'null' ]; then
			echo "Linking registry to Kind network..."
			docker network connect "kind" "${reg_name}" || true
		fi
	fi

	echo "Documenting local registry hosting in cluster..."
	if [ -f "./templates/kind-registry.configmap.yaml" ]; then
		kubectl apply -f ./templates/kind-registry.configmap.yaml || return 1
	elif [ -f "./templates/kind-registry.service.yaml" ]; then
		kubectl apply -f ./templates/kind-registry.service.yaml || return 1
	fi

	ColorGreen "Registry '${reg_name}' configured on localhost:${reg_port}."
	echo ""
}

function create_mongodb() {
	echo ""
	echo -ne "${cian}Configuring MongoDB instance ...${clear}"

	if [ "$(docker inspect -f '{{.State.Running}}' "${mongodb_name}" 2>/dev/null || true)" != 'true' ]; then
		docker run \
			-d --restart=always -p "127.0.0.1:${mongodb_port}:27017" --name "${mongodb_name}" \
			-e MONGO_INITDB_ROOT_USERNAME="${MONGO_ROOT_USER:-root}" \
			-e MONGO_INITDB_ROOT_PASSWORD="${MONGO_ROOT_PASS:-localClusterPass123!}" \
			--security-opt="no-new-privileges:true" --memory="1g" \
			mongo:7.0.14 || {
				ColorRed "Failed to start MongoDB container '${mongodb_name}'"
				return 1
			}
	else
		ColorYellow "MongoDB container '${mongodb_name}' is already running."
	fi

	if docker network inspect "kind" >/dev/null 2>&1; then
		if [ "$(docker inspect -f='{{json .NetworkSettings.Networks.kind}}' "${mongodb_name}")" = 'null' ]; then
			echo "Linking MongoDB to Kind network..."
			docker network connect "kind" "${mongodb_name}" || true
		fi
	fi

	ColorGreen "MongoDB configured on localhost:${mongodb_port}."
	echo ""
}

function install_nginx_ingress() {
	echo ""
	echo -ne "${cian}Installing NGINX Ingress Controller ...${clear}"
	kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.12.0/deploy/static/provider/kind/deploy.yaml || {
		ColorRed "Failed to apply NGINX Ingress manifests"
		return 1
	}
	echo "Waiting for NGINX Ingress Controller pod to be ready..."
	kubectl wait --namespace ingress-nginx --for=condition=ready pod --selector=app.kubernetes.io/component=controller --timeout=300s || {
		ColorRed "Timeout waiting for NGINX Ingress Controller pod"
		return 1
	}
	ColorGreen "NGINX Ingress Controller is ready."
	echo ""
}

function install_kafka_cluster() {
	if [ ! -f "$kafka_config" ]; then
		ColorRed "Error: Kafka config file not found at $kafka_config"
		return 1
	fi

	local cluster_name
	cluster_name=$(yq -r 'select(.kind=="Kafka") | .metadata.name' "$kafka_config")
	if [ -z "$cluster_name" ] || [ "$cluster_name" = "null" ]; then
		cluster_name="kafka-cluster"
	fi

	echo ""
	echo -ne "${cian}Configuring Kafka Ecosystem ...${clear}"

	echo "Adding/updating Helm repositories (Strimzi & Kafka UI)..."
	helm repo add strimzi https://strimzi.io/charts/ >/dev/null 2>&1 || true
	helm repo add kafka-ui https://provectus.github.io/kafka-ui-charts >/dev/null 2>&1 || true
	helm repo update >/dev/null 2>&1 || true

	echo "Ensuring namespace '${kafka_ns}' exists..."
	kubectl create ns "${kafka_ns}" --dry-run=client -o yaml | kubectl apply -f - || return 1

	echo "Installing/Upgrading Strimzi Kafka Operator..."
	helm upgrade --install strimzi-kafka strimzi/strimzi-kafka-operator -n "${kafka_ns}" --version 0.45.0 || {
		ColorRed "Failed to install Strimzi Kafka Operator chart"
		return 1
	}
	echo "Waiting for Strimzi Operator to be ready..."
	kubectl wait -n "${kafka_ns}" --for=condition=ready pod --selector=strimzi.io/kind=cluster-operator --timeout=300s || {
		ColorRed "Timeout waiting for Strimzi Operator pod"
		return 1
	}

	echo "Deploying Kafka Cluster '${cluster_name}'..."
	kubectl apply -f "${kafka_config}" -n "${kafka_ns}" || {
		ColorRed "Failed to apply Kafka cluster manifests"
		return 1
	}
	echo "Waiting for Kafka Cluster '${cluster_name}' to report Ready status..."
	kubectl wait "kafka/${cluster_name}" --for=condition=Ready --timeout=300s -n "${kafka_ns}" || {
		ColorRed "Timeout waiting for Kafka cluster '${cluster_name}' to become Ready"
		return 1
	}

	local bootstrapservers
	bootstrapservers=$(kubectl get kafka "${cluster_name}" -n "${kafka_ns}" -o json 2>/dev/null | jq -r '.status.listeners[]? | select(.name=="plain") | .bootstrapServers // empty')
	if [ -z "$bootstrapservers" ]; then
		bootstrapservers="${cluster_name}-kafka-bootstrap.${kafka_ns}.svc:9092"
	fi

	echo "Installing/Upgrading Kafka UI (Bootstrap: ${bootstrapservers})..."
	helm upgrade --install kafka-ui kafka-ui/kafka-ui -n "${kafka_ns}" --version 0.7.2 \
		--set envs.config.KAFKA_CLUSTERS_0_NAME=local \
		--set envs.config.KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS="${bootstrapservers}" || {
			ColorRed "Failed to install Kafka UI chart"
			return 1
		}

	echo "Verifying NGINX Ingress Controller..."
	if [ "$(kubectl get services ingress-nginx-controller -n ingress-nginx -o json 2>/dev/null)" = "" ]; then
		install_nginx_ingress || return 1
	fi

	echo "Deploying Kafka UI Ingress..."
	kubectl apply -f ./ingress/kafka-ui.ingress.yaml || return 1
	ColorGreen "Kafka Ecosystem deployed. Available at: http://kafka-ui.local (requires /etc/hosts entry)"
	echo ""
}

function install_argocd() {
	echo ""
	echo -ne "${cian}Installing ArgoCD ...${clear}"
	kubectl create ns "${argocd_ns}" --dry-run=client -o yaml | kubectl apply -f - || return 1
	kubectl apply -n "${argocd_ns}" -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.13.5/manifests/install.yaml || {
		ColorRed "Failed to apply ArgoCD manifests"
		return 1
	}

	echo "Waiting for ArgoCD Server to be ready..."
	kubectl wait -n "${argocd_ns}" --for=condition=ready pod --selector=app.kubernetes.io/name=argocd-server --timeout=300s || {
		ColorRed "Timeout waiting for ArgoCD server pod"
		return 1
	}

	echo ""
	ColorGreen "ArgoCD installed successfully!"
	echo "To retrieve the initial admin password safely on-demand, run:"
	echo -e "${yellow}  kubectl -n ${argocd_ns} get secret argocd-initial-admin-secret -o jsonpath=\"{.data.password}\" | base64 -d && echo${clear}"

	echo "Verifying NGINX Ingress Controller..."
	if [ "$(kubectl get services ingress-nginx-controller -n ingress-nginx -o json 2>/dev/null)" = "" ]; then
		install_nginx_ingress || return 1
	fi

	echo "Deploying ArgoCD Ingress..."
	kubectl apply -f ./ingress/argocd.ingress.yaml || return 1
	ColorGreen "ArgoCD available at: https://argocd.local (requires /etc/hosts entry)"
	echo ""
}

function install_all() {
	check_prerequisites || return 1
	create_cluster || return 1
	create_registry || return 1
	create_mongodb || return 1
	install_nginx_ingress || return 1
	install_kafka_cluster || return 1
	install_argocd || return 1
	echo ""
	ColorGreen "=== Complete stack successfully deployed! ==="
}

function delete_cluster() {
	echo ""
	echo -ne "${red}Removing cluster and related containers ...${clear}"
	if [ -f "$kind_config" ]; then
		cluster_name=$(yq -r .name "$kind_config")
		kind delete cluster -n "${cluster_name}" 2>/dev/null || true
	fi
	docker rm -f "${reg_name}" 2>/dev/null || true
	docker rm -f "${mongodb_name}" 2>/dev/null || true
	ColorGreen "All resources successfully removed."
	echo ""
}

function print_usage() {
	echo "Usage: ./init.sh [command]"
	echo ""
	echo "Commands:"
	echo "  check         Check system prerequisites"
	echo "  cluster       Create Kind Kubernetes cluster"
	echo "  registry      Deploy local Docker container registry"
	echo "  mongodb       Deploy local MongoDB Docker container"
	echo "  ingress       Install NGINX Ingress Controller"
	echo "  kafka         Install Strimzi Kafka Operator, Broker, and Kafka UI"
	echo "  argocd        Install ArgoCD and ingress"
	echo "  all | up      Deploy the complete stack"
	echo "  down | delete Teardown cluster and local containers"
	echo "  help | -h     Show this help message"
	echo ""
	echo "If no command is provided, the interactive menu is displayed."
}

menu(){
	echo -ne "
$(ColorGreen '1)') Create K8s Cluster
$(ColorGreen '2)') Create & Link Registry
$(ColorGreen '3)') Create & Link MongoDB Instance
$(ColorGreen '4)') Install NGINX Ingress
$(ColorGreen '5)') Install Kafka Broker & UI
$(ColorGreen '6)') Install ArgoCD
$(ColorGreen '7)') Install all
$(ColorGreen '8)') Remove all
$(ColorGreen '9)') Check Prerequisites
$(ColorGreen '0)') Exit
$(ColorBlue 'Choose an option:') "
	read -r a
	case $a in
		1) create_cluster ; menu ;;
		2) create_registry ; menu ;;
		3) create_mongodb ; menu ;;
		4) install_nginx_ingress ; menu ;;
		5) install_kafka_cluster ; menu ;;
		6) install_argocd ; menu ;;
		7) install_all ; menu ;;
		8) delete_cluster ; menu ;;
		9) check_prerequisites ; menu ;;
		0) exit 0 ;;
		*) ColorRed "Invalid option. Please try again."; menu ;;
	esac
}

# CLI Argument parsing
if [ $# -gt 0 ]; then
	case "$1" in
		check)
			check_prerequisites
			;;
		cluster)
			create_cluster
			;;
		registry)
			create_registry
			;;
		mongodb)
			create_mongodb
			;;
		ingress)
			install_nginx_ingress
			;;
		kafka)
			install_kafka_cluster
			;;
		argocd)
			install_argocd
			;;
		all|up)
			install_all
			;;
		down|delete|clean)
			delete_cluster
			;;
		help|-h|--help)
			print_usage
			;;
		*)
			ColorRed "Unknown command: $1"
			print_usage
			exit 1
			;;
	esac
	exit $?
fi

# Fallback to interactive menu
clear
menu