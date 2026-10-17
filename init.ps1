<#
.SYNOPSIS
    Kind Cluster Deployment & Local Tooling Orchestrator for Windows (PowerShell).
.DESCRIPTION
    Provides non-interactive CLI commands and an interactive menu for provisioning
    and managing a local Kubernetes cluster with Kind, local Docker Registry, MongoDB,
    NGINX Ingress, Apache Kafka (Strimzi KRaft), Kafka UI, and ArgoCD.
.EXAMPLE
    .\init.ps1 all
    .\init.ps1 cluster
    .\init.ps1 check
    .\init.ps1 down
#>

[CmdletBinding()]
param (
    [Parameter(Position = 0, Mandatory = $false)]
    [ValidateSet("check", "cluster", "registry", "mongodb", "ingress", "kafka", "argocd", "all", "up", "down", "delete", "clean", "help")]
    [string]$Command
)

$ErrorActionPreference = "Stop"

# Configuration variables
$KindConfig    = if ($env:KIND_CONFIG)    { $env:KIND_CONFIG }    else { ".\templates\kind.config.yaml" }
$KafkaConfig   = if ($env:KAFKA_CONFIG)   { $env:KAFKA_CONFIG }   else { ".\templates\kafka-broker.config.yaml" }
$RegName       = if ($env:REG_NAME)       { $env:REG_NAME }       else { "kind-registry" }
$RegPort       = if ($env:REG_PORT)       { $env:REG_PORT }       else { "5000" }
$MongodbName   = if ($env:MONGODB_NAME)   { $env:MONGODB_NAME }   else { "kind-mongodb" }
$MongodbPort   = if ($env:MONGODB_PORT)   { $env:MONGODB_PORT }   else { "37017" }
$KafkaNs       = if ($env:KAFKA_NS)       { $env:KAFKA_NS }       else { "kafka" }
$ArgocdNs      = if ($env:ARGOCD_NS)      { $env:ARGOCD_NS }      else { "argocd" }

# Color Output Helpers
function Write-ColorGreen  { param([string]$Message) Write-Host $Message -ForegroundColor Green }
Write-ColorGreen "" | Out-Null
function Write-ColorBlue   { param([string]$Message) Write-Host $Message -ForegroundColor Cyan }
function Write-ColorYellow { param([string]$Message) Write-Host $Message -ForegroundColor Yellow }
function Write-ColorRed    { param([string]$Message) Write-Host $Message -ForegroundColor Red }

function Test-Prerequisites {
    Write-Host "Checking required tools for Windows..." -ForegroundColor Cyan
    $RequiredTools = @("docker", "kind", "kubectl", "helm")
    $MissingTools = @()

    foreach ($tool in $RequiredTools) {
        if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
            $MissingTools += $tool
        }
    }

    if ($MissingTools.Count -gt 0) {
        Write-ColorRed "Error: The following required tools are missing from your PATH:"
        foreach ($missing in $MissingTools) {
            Write-Host "  - $missing" -ForegroundColor Red
        }
        Write-Host "`nPlease install them (e.g. via 'winget install Kubernetes.kind' and 'winget install Helm.Helm') and restart your terminal."
        return $false
    }

    try {
        & docker info >$null 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-ColorRed "Error: Docker daemon is not running. Please start Docker Desktop and try again."
            return $false
        }
    } catch {
        Write-ColorRed "Error: Unable to connect to Docker daemon. Ensure Docker Desktop is running."
        return $false
    }

    Write-ColorGreen "All essential tools (docker, kind, kubectl, helm) are present and Docker daemon is running.`n"
    return $true
}

function Get-ClusterNameFromConfig {
    if (-not (Test-Path $KindConfig)) {
        return "kind-k8s-local"
    }
    $nameLine = Get-Content $KindConfig | Where-Object { $_ -match '^\s*name:\s*(.+)$' } | Select-Object -First 1
    if ($nameLine -match '^\s*name:\s*(.+)$') {
        return $Matches[1].Trim()
    }
    return "kind-k8s-local"
}

function New-KindCluster {
    if (-not (Test-Path $KindConfig)) {
        Write-ColorRed "Error: Kind config file not found at $KindConfig"
        return $false
    }

    $clusterName = Get-ClusterNameFromConfig
    Write-Host "`nCreating cluster '$clusterName' with config '$KindConfig' if not exists..." -ForegroundColor Cyan

    $existingClusters = & kind get clusters 2>$null
    if ($existingClusters -contains $clusterName) {
        Write-ColorYellow "Cluster '$clusterName' already exists. Skipping creation.`n"
        return $true
    }

    & kind create cluster --config="$KindConfig" -n "$clusterName"
    if ($LASTEXITCODE -ne 0) {
        Write-ColorRed "Failed to create Kind cluster '$clusterName'"
        return $false
    }

    Write-ColorGreen "Cluster '$clusterName' created successfully.`n"
    return $true
}

function New-LocalRegistry {
    Write-Host "`nConfiguring local container registry..." -ForegroundColor Cyan

    $isRunning = & docker inspect -f "{{.State.Running}}" "$RegName" 2>$null
    if ($isRunning -ne "true") {
        & docker run -d --restart=always -p "127.0.0.1:${RegPort}:5000" --name "$RegName" `
            --security-opt="no-new-privileges:true" --memory="512m" registry:2.8.3
        if ($LASTEXITCODE -ne 0) {
            Write-ColorRed "Failed to start registry container '$RegName'"
            return $false
        }
    } else {
        Write-ColorYellow "Registry container '$RegName' is already running."
    }

    # Connect to kind network if kind network exists
    & docker network inspect "kind" >$null 2>&1
    if ($LASTEXITCODE -eq 0) {
        $networkCheck = & docker inspect -f "{{json .NetworkSettings.Networks.kind}}" "$RegName" 2>$null
        if ($networkCheck -eq "null" -or -not $networkCheck) {
            Write-Host "Linking registry to Kind network..."
            & docker network connect "kind" "$RegName" 2>$null
        }
    }

    Write-Host "Documenting local registry hosting in cluster..."
    if (Test-Path ".\templates\kind-registry.configmap.yaml") {
        & kubectl apply -f ".\templates\kind-registry.configmap.yaml"
    } elseif (Test-Path ".\templates\kind-registry.service.yaml") {
        & kubectl apply -f ".\templates\kind-registry.service.yaml"
    }

    Write-ColorGreen "Registry '$RegName' configured on localhost:${RegPort}.`n"
    return $true
}

function New-LocalMongoDB {
    Write-Host "`nConfiguring MongoDB instance..." -ForegroundColor Cyan

    $isRunning = & docker inspect -f "{{.State.Running}}" "$MongodbName" 2>$null
    if ($isRunning -ne "true") {
        $rootUser = if ($env:MONGO_ROOT_USER) { $env:MONGO_ROOT_USER } else { "root" }
        $rootPass = if ($env:MONGO_ROOT_PASS) { $env:MONGO_ROOT_PASS } else { "localClusterPass123!" }

        & docker run -d --restart=always -p "127.0.0.1:${MongodbPort}:27017" --name "$MongodbName" `
            -e MONGO_INITDB_ROOT_USERNAME="$rootUser" `
            -e MONGO_INITDB_ROOT_PASSWORD="$rootPass" `
            --security-opt="no-new-privileges:true" --memory="1g" mongo:7.0.14
        if ($LASTEXITCODE -ne 0) {
            Write-ColorRed "Failed to start MongoDB container '$MongodbName'"
            return $false
        }
    } else {
        Write-ColorYellow "MongoDB container '$MongodbName' is already running."
    }

    & docker network inspect "kind" >$null 2>&1
    if ($LASTEXITCODE -eq 0) {
        $networkCheck = & docker inspect -f "{{json .NetworkSettings.Networks.kind}}" "$MongodbName" 2>$null
        if ($networkCheck -eq "null" -or -not $networkCheck) {
            Write-Host "Linking MongoDB to Kind network..."
            & docker network connect "kind" "$MongodbName" 2>$null
        }
    }

    Write-ColorGreen "MongoDB configured on localhost:${MongodbPort}.`n"
    return $true
}

function Install-NginxIngress {
    Write-Host "`nInstalling NGINX Ingress Controller..." -ForegroundColor Cyan
    & kubectl apply -f "https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.12.0/deploy/static/provider/kind/deploy.yaml"
    if ($LASTEXITCODE -ne 0) {
        Write-ColorRed "Failed to apply NGINX Ingress manifests"
        return $false
    }

    Write-Host "Waiting for NGINX Ingress Controller pod to be ready..."
    & kubectl wait --namespace ingress-nginx --for=condition=ready pod --selector=app.kubernetes.io/component=controller --timeout=300s
    if ($LASTEXITCODE -ne 0) {
        Write-ColorRed "Timeout waiting for NGINX Ingress Controller pod"
        return $false
    }

    Write-ColorGreen "NGINX Ingress Controller is ready.`n"
    return $true
}

function Install-KafkaCluster {
    if (-not (Test-Path $KafkaConfig)) {
        Write-ColorRed "Error: Kafka config file not found at $KafkaConfig"
        return $false
    }

    $clusterName = "kafka-cluster"
    Write-Host "`nConfiguring Kafka Ecosystem (KRaft Mode)..." -ForegroundColor Cyan

    Write-Host "Adding/updating Helm repositories (Strimzi & Kafka UI)..."
    & helm repo add strimzi https://strimzi.io/charts/ >$null 2>&1
    & helm repo add kafka-ui https://provectus.github.io/kafka-ui-charts >$null 2>&1
    & helm repo update >$null 2>&1

    Write-Host "Ensuring namespace '$KafkaNs' exists..."
    & kubectl create ns "$KafkaNs" --dry-run=client -o yaml | & kubectl apply -f -

    Write-Host "Installing/Upgrading Strimzi Kafka Operator..."
    & helm upgrade --install strimzi-kafka strimzi/strimzi-kafka-operator -n "$KafkaNs" --version 0.45.0
    if ($LASTEXITCODE -ne 0) {
        Write-ColorRed "Failed to install Strimzi Kafka Operator chart"
        return $false
    }

    Write-Host "Waiting for Strimzi Operator to be ready..."
    & kubectl wait -n "$KafkaNs" --for=condition=ready pod --selector=strimzi.io/kind=cluster-operator --timeout=300s

    Write-Host "Deploying Kafka Cluster (KRaft) '$clusterName'..."
    & kubectl apply -f "$KafkaConfig" -n "$KafkaNs"
    if ($LASTEXITCODE -ne 0) {
        Write-ColorRed "Failed to apply Kafka cluster manifests"
        return $false
    }

    Write-Host "Waiting for Kafka Cluster '$clusterName' to report Ready status..."
    & kubectl wait "kafka/$clusterName" --for=condition=Ready --timeout=300s -n "$KafkaNs"

    $bootstrapServers = "${clusterName}-kafka-bootstrap.${KafkaNs}.svc:9092"
    Write-Host "Installing/Upgrading Kafka UI (Bootstrap: $bootstrapServers)..."
    & helm upgrade --install kafka-ui kafka-ui/kafka-ui -n "$KafkaNs" --version 0.7.2 `
        --set envs.config.KAFKA_CLUSTERS_0_NAME=local `
        --set envs.config.KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS="$bootstrapServers"

    # Verify Ingress controller
    $ingressService = & kubectl get services ingress-nginx-controller -n ingress-nginx -o json 2>$null
    if (-not $ingressService) {
        Install-NginxIngress
    }

    Write-Host "Deploying Kafka UI Ingress..."
    & kubectl apply -f ".\ingress\kafka-ui.ingress.yaml"

    Write-ColorGreen "Kafka Ecosystem deployed. Available at: http://kafka-ui.local (requires hosts file entry)`n"
    return $true
}

function Install-ArgoCD {
    Write-Host "`nInstalling ArgoCD..." -ForegroundColor Cyan
    & kubectl create ns "$ArgocdNs" --dry-run=client -o yaml | & kubectl apply -f -
    & kubectl apply -n "$ArgocdNs" -f "https://raw.githubusercontent.com/argoproj/argo-cd/v2.13.5/manifests/install.yaml"
    if ($LASTEXITCODE -ne 0) {
        Write-ColorRed "Failed to apply ArgoCD manifests"
        return $false
    }

    Write-Host "Waiting for ArgoCD Server to be ready..."
    & kubectl wait -n "$ArgocdNs" --for=condition=ready pod --selector=app.kubernetes.io/name=argocd-server --timeout=300s

    Write-ColorGreen "ArgoCD installed successfully!"
    Write-Host "To retrieve the initial admin password safely on-demand, run:"
    Write-Host "  kubectl -n $ArgocdNs get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String((`$input)))" -ForegroundColor Yellow

    $ingressService = & kubectl get services ingress-nginx-controller -n ingress-nginx -o json 2>$null
    if (-not $ingressService) {
        Install-NginxIngress
    }

    Write-Host "Deploying ArgoCD Ingress..."
    & kubectl apply -f ".\ingress\argocd.ingress.yaml"

    Write-ColorGreen "ArgoCD available at: https://argocd.local (requires hosts file entry)`n"
    return $true
}

function Install-All {
    if (-not (Test-Prerequisites)) { return $false }
    if (-not (New-KindCluster)) { return $false }
    if (-not (New-LocalRegistry)) { return $false }
    if (-not (New-LocalMongoDB)) { return $false }
    if (-not (Install-NginxIngress)) { return $false }
    if (-not (Install-KafkaCluster)) { return $false }
    if (-not (Install-ArgoCD)) { return $false }

    Write-ColorGreen "=== Complete stack successfully deployed! ===`n"
    return $true
}

function Remove-Cluster {
    Write-Host "`nRemoving cluster and related containers..." -ForegroundColor Red
    $clusterName = Get-ClusterNameFromConfig
    & kind delete cluster -n "$clusterName" 2>$null
    & docker rm -f "$RegName" 2>$null
    & docker rm -f "$MongodbName" 2>$null
    Write-ColorGreen "All resources successfully removed.`n"
}

function Show-Help {
    Write-Host "Usage: .\init.ps1 [command]`n"
    Write-Host "Commands:"
    Write-Host "  check         Check system prerequisites (docker, kind, kubectl, helm)"
    Write-Host "  cluster       Create Kind Kubernetes cluster"
    Write-Host "  registry      Deploy local Docker container registry"
    Write-Host "  mongodb       Deploy local MongoDB Docker container"
    Write-Host "  ingress       Install NGINX Ingress Controller"
    Write-Host "  kafka         Install Strimzi Kafka Operator, Broker (KRaft), and Kafka UI"
    Write-Host "  argocd        Install ArgoCD and ingress"
    Write-Host "  all | up      Deploy the complete stack"
    Write-Host "  down | delete Teardown cluster and local containers"
    Write-Host "  help          Show this help message`n"
    Write-Host "If no command is provided, the interactive menu is displayed."
}

function Show-Menu {
    do {
        Write-Host "`n================================================" -ForegroundColor DarkGray
        Write-Host "   Kind Cluster Deployment - Windows Menu" -ForegroundColor Cyan
        Write-Host "================================================" -ForegroundColor DarkGray
        Write-Host " 1) Create K8s Cluster" -ForegroundColor Green
        Write-Host " 2) Create & Link Registry" -ForegroundColor Green
        Write-Host " 3) Create & Link MongoDB Instance" -ForegroundColor Green
        Write-Host " 4) Install NGINX Ingress" -ForegroundColor Green
        Write-Host " 5) Install Kafka Broker (KRaft) & UI" -ForegroundColor Green
        Write-Host " 6) Install ArgoCD" -ForegroundColor Green
        Write-Host " 7) Install all" -ForegroundColor Green
        Write-Host " 8) Remove all (Teardown)" -ForegroundColor Green
        Write-Host " 9) Check Prerequisites" -ForegroundColor Green
        Write-Host " 0) Exit" -ForegroundColor Green
        Write-Host "================================================" -ForegroundColor DarkGray
        $choice = Read-Host "Choose an option"

        switch ($choice) {
            "1" { New-KindCluster }
            "2" { New-LocalRegistry }
            "3" { New-LocalMongoDB }
            "4" { Install-NginxIngress }
            "5" { Install-KafkaCluster }
            "6" { Install-ArgoCD }
            "7" { Install-All }
            "8" { Remove-Cluster }
            "9" { Test-Prerequisites }
            "0" { return }
            Default { Write-ColorRed "Invalid option. Please try again." }
        }
    } while ($choice -ne "0")
}

# CLI Argument handling
if ($Command) {
    switch ($Command.ToLower()) {
        "check"               { $ok = Test-Prerequisites; if (-not $ok) { exit 1 } else { exit 0 } }
        "cluster"             { $ok = New-KindCluster; if (-not $ok) { exit 1 } else { exit 0 } }
        "registry"            { $ok = New-LocalRegistry; if (-not $ok) { exit 1 } else { exit 0 } }
        "mongodb"             { $ok = New-LocalMongoDB; if (-not $ok) { exit 1 } else { exit 0 } }
        "ingress"             { $ok = Install-NginxIngress; if (-not $ok) { exit 1 } else { exit 0 } }
        "kafka"               { $ok = Install-KafkaCluster; if (-not $ok) { exit 1 } else { exit 0 } }
        "argocd"              { $ok = Install-ArgoCD; if (-not $ok) { exit 1 } else { exit 0 } }
        { $_ -in "all","up" } { $ok = Install-All; if (-not $ok) { exit 1 } else { exit 0 } }
        { $_ -in "down","delete","clean" } { Remove-Cluster; exit 0 }
        "help"                { Show-Help; exit 0 }
        Default               { Show-Help; exit 1 }
    }
}

# Interactive Menu fallback
Show-Menu
