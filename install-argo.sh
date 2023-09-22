#!/bin/bash

echo "Installing ArgoCD in the cluster..."
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

ADMIN_PASS=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)
echo "ArgoCD admin password: $ADMIN_PASS"

echo "Installing Argo Rollouts..."
kubectl apply -n argo-rollouts -f https://raw.githubusercontent.com/argoproj/argo-rollouts/stable/manifests/install.yaml

echo "Port-forwarding ArgoCD server..."
kubectl port-forward svc/argocd-server -n argocd 8080:443 &
