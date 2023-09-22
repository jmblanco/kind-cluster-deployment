#!/bin/sh
set -o errexit

echo "------------------------------------------------------------------"
echo "Create registry container unless it already exists..."
reg_name='kind-registry'
reg_port='5000'
if [ "$(docker inspect -f '{{.State.Running}}' "${reg_name}" 2>/dev/null || true)" != 'true' ]; then
  docker run \
    -d --restart=always -p "127.0.0.1:${reg_port}:5000" --name "${reg_name}" \
    registry:2
fi

echo "Create mongodb exists..."
mongodb_name='kind-mongodb'
mongodb_port='37017'
if [ "$(docker inspect -f '{{.State.Running}}' "${mongodb_name}" 2>/dev/null || true)" != 'true' ]; then
  docker run \
    -d --restart=always -p "127.0.0.1:${mongodb_port}:27017" --name "${mongodb_name}" \
    mongo
fi

echo "Create a cluster with the local registry enabled in containerd..."
KIND_EXPERIMENTAL_PROVIDER=docker kind create cluster --config=./chars/kind-config.yaml
echo "Connect the registry to the cluster network if not already connected..."
if [ "$(docker inspect -f='{{json .NetworkSettings.Networks.kind}}' "${reg_name}")" = 'null' ]; then
  docker network connect "kind" "${reg_name}"
  docker network connect "kind" "${mongodb_name}"
fi

# Document the local registry
# https://github.com/kubernetes/enhancements/tree/master/keps/sig-cluster-lifecycle/generic/1755-communicating-a-local-registry
echo "Configure registry in kind cluster..."
kubectl apply -f ./chars/kind-registry-service.yaml

echo "Add additional helm repos..."
helm repo add strimzi https://strimzi.io/charts/
helm repo add kafka-ui https://provectus.github.io/kafka-ui-charts

echo
echo "------------------------------------------------------------------"
echo "Configuring Kafka ecosystem..."
kubectl create ns kafka
kubens kafka

echo "Install Strimzi Operator..."
helm install strimzi-kafka strimzi/strimzi-kafka-operator
echo "Install Kafka Broker..."
kubectl apply -f ./chars/kafka-broker.yaml

echo "Install Kafka UI..."
helm install kafka-ui kafka-ui/kafka-ui --set envs.config.KAFKA_CLUSTERS_0_NAME=local \
  --set envs.config.KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS=kafka-cluster-kafka-0.kafka-cluster-kafka-brokers.kafka.svc:9092

# echo
# echo "------------------------------------------------------------------"
# echo "Install NGINX Ingress Controller..."
# kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

echo

echo "Instal External Secret Support"
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets -n external-secrets --create-namespace

echo "Create secret store - Fake"
kubectl apply -f chars/secret-storage.yaml
