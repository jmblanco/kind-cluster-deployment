#!/bin/bash

##
# Color  Variables
##
green='\e[32m'
blue='\e[34m'
cian='\e[36m'
red='\e[31m'
clear='\e[0m\n'

ColorGreen(){
	echo -ne $green$1$clear
}
ColorBlue(){
	echo -ne $blue$1$clear
}

## Global variables
kind_config='./templates/kind.config.yaml'
kafka_config='./templates/kafka-broker.config.yaml'
reg_name='kind-registry'
reg_port='5000'
mongodb_name='kind-mongodb'
mongodb_port='37017'
kafka_ns='kafka'
argocd_ns='argocd'

##
# Main functions
##
function create_cluster() {
	cluster_name=$(cat "$kind_config" | yq -r .name)
    echo ""
	echo -ne $cian"Create a cluster ${cluster_name} with config ${kind_config} if not exists ..."$clear
	if [ "$(kind get clusters | grep "${cluster_name}")" = "" ]; then
		KIND_EXPERIMENTAL_PROVIDER=docker kind create cluster --config=${kind_config} -n "${cluster_name}"
	fi
	echo ""
}
function create_registry() {
    echo ""
	echo -ne $cian"Create registry container ..."$clear
	if [ "$(docker inspect -f '{{.State.Running}}' "${reg_name}" 2>/dev/null || true)" != 'true' ]; then
		docker run \
		-d --restart=always -p "127.0.0.1:${reg_port}:5000" --name "${reg_name}" \
		registry:2
	fi
	if [ "$(docker inspect -f='{{json .NetworkSettings.Networks.kind}}' "${reg_name}")" = 'null' ]; then
		echo "Link the registry to the cluster network ..."
		docker network connect "kind" "${reg_name}"
	fi
	echo "Configure registry in kind cluster ..."
	kubectl apply -f ./templates/kind-registry.service.yaml
    echo ""
}
function create_mongodb() {
	echo -ne $cian"Create mongodb instance ..."$clear
	if [ "$(docker inspect -f '{{.State.Running}}' "${mongodb_name}" 2>/dev/null || true)" != 'true' ]; then
		docker run \
		-d --restart=always -p "127.0.0.1:${mongodb_port}:27017" --name "${mongodb_name}" \
		mongo
	fi
	if [ "$(docker inspect -f='{{json .NetworkSettings.Networks.kind}}' "${mongodb_name}")" = 'null' ]; then
		echo "Link the mongodb to the cluster network ..."
		docker network connect "kind" "${mongodb_name}"
	fi
	echo ""
}
function install_nginx_ingress() {
	echo ""
	echo -ne $cian"Install NGINX Ingress Controller ..."$clear
	kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
	kubectl wait --namespace ingress-nginx --for=condition=ready pod --selector=app.kubernetes.io/component=controller --timeout=300s
	echo ""
}
function install_kafka_cluster() {
	cluster_name=$(cat "$kafka_config" | yq -r .metadata.name)

	echo ""
	echo -ne $cian"Configuring Kafka Ecosystem ..."$clear
	
	echo "Add additional helm repos - Strimzi and Kafka UI -"
	helm repo add strimzi https://strimzi.io/charts/
	helm repo add kafka-ui https://provectus.github.io/kafka-ui-charts
	
	echo "Create namespace $kafka_ns"
	kubectl create ns ${kafka_ns}
	
	echo "Install Kafka Strimzi Operator ..."
	helm install strimzi-kafka strimzi/strimzi-kafka-operator -n ${kafka_ns}
	strimzi_operator_pod=$(kubectl get pods -n ${kafka_ns} | grep strimzi-cluster-operator | awk '{print $1}')
	kubectl wait -n ${kafka_ns} --for=condition=ready pod --selector=strimzi.io/kind=cluster-operator --timeout=300s
	
	echo "Install Kafka Broker ${cluster_name} ..."
	kubectl apply -f ${kafka_config} -n ${kafka_ns}
	kubectl wait kafka/${cluster_name} --for=condition=Ready --timeout=300s -n ${kafka_ns} 
	bootstrapservers=$(kubectl get kafka ${cluster_name} -ojson | jq -r '.status.listeners[0].bootstrapServers')

	echo "Install Kafka UI over bootstrap servers ${bootstrapservers} ..."
	helm install kafka-ui kafka-ui/kafka-ui -n ${kafka_ns} \
		--set envs.config.KAFKA_CLUSTERS_0_NAME=local \
		--set envs.config.KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS=${bootstrapservers}
	echo "Deploy ingress for Kafka UI ..."
	if [ "$(kubectl get services ingress-nginx-controller -n ingress-nginx -ojson 2> /dev/null)" = "" ]; then
		install_nginx_ingress
	fi
	kubectl apply -f ./ingress/kafka-ui.ingress.yaml
}
function install_argocd () {
	echo ""
	echo -ne $cian"Install ArgoCD ..."$clear
	kubectl create ns ${argocd_ns}
	kubectl apply -n ${argocd_ns} -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
	kubectl wait -n ${argocd_ns} --for=condition=ready pod --selector=app.kubernetes.io/name=argocd-server --timeout=300s
	admin_pass=$(kubectl -n ${argocd_ns} get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)
	echo "ArgoCD admin password: $admin_pass ... enjoy!"
	echo "Deploy ingress for ArgoCD Server ..."
	if [ "$(kubectl get services ingress-nginx-controller -n ingress-nginx -ojson 2> /dev/null)" = "" ]; then
		install_nginx_ingress
	fi
	kubectl apply -f ./ingress/argocd.ingress.yaml
}
function install_all () {
	create_cluster
	create_registry
	create_mongodb
	install_nginx_ingress
	install_kafka_cluster
	install_argocd
}
function delete_cluster() {
	echo ""
	echo -ne $red"Remove all cluster elements ..."$clear
	cluster_name=$(cat "$kind_config" | yq -r .name)
	kind delete cluster -n ${cluster_name}
	docker rm -f ${reg_name}
	docker rm -f ${mongodb_name}
	echo ""
}

menu(){
echo -ne "
$(ColorGreen '1)') Create K8s Cluster
$(ColorGreen '2)') Create & Link Registry
$(ColorGreen '3)') Create & Link Create MongoDB Instance
$(ColorGreen '4)') Install NGINX Ingress
$(ColorGreen '5)') Install Kafka Broker & UI
$(ColorGreen '6)') Install ArgoCD
$(ColorGreen '7)') Install all
$(ColorGreen '8)') Remove all
$(ColorGreen '0)') Exit
$(ColorBlue 'Choose an option:') "
        read a
        case $a in
	        1) create_cluster ; menu ;;
	        2) create_registry ; menu ;;
	        3) create_mongodb ; menu ;;
	        4) install_nginx_ingress ; menu ;;
	        5) install_kafka_cluster ; menu ;;
	        6) install_argocd ; menu ;;
	        7) install_all ; menu ;;
			8) delete_cluster ; menu ;;
		0) exit 0 ;;
		*) echo -e $red"Wrong option."$clear; WrongCommand;;
        esac
}
# Call the menu function
clear
menu