#!/usr/bin/env python3
import http.server
import socketserver
import subprocess
import json
import urllib.request
import urllib.parse
import ssl
import sys
import os
import time

PORT = 8088
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

def get_k8s_api(path, timeout=5):
    """Query Kubernetes API server directly using serviceaccount token when inside cluster."""
    sa_token_path = "/var/run/secrets/kubernetes.io/serviceaccount/token"
    sa_ca_path = "/var/run/secrets/kubernetes.io/serviceaccount/ca.crt"
    
    if os.path.exists(sa_token_path):
        with open(sa_token_path, "r") as f:
            token = f.read().strip()
        
        ctx = ssl.create_default_context(cafile=sa_ca_path)
        ctx.check_hostname = False
        api_url = f"https://kubernetes.default.svc{path}"
        req = urllib.request.Request(api_url, headers={"Authorization": f"Bearer {token}"})
        with urllib.request.urlopen(req, context=ctx, timeout=timeout) as resp:
            content = resp.read().decode("utf-8")
            try:
                return json.loads(content)
            except Exception:
                return content
    else:
        # Fallback to local subprocess if run from host
        cmd = ["kubectl", "get", "--raw", path]
        if os.name == "nt":
            cmd = ["wsl", "-d", "Ubuntu", "--"] + cmd
        out = subprocess.check_output(cmd, stderr=subprocess.DEVNULL, timeout=timeout)
        content = out.decode("utf-8")
        try:
            return json.loads(content)
        except Exception:
            return content

def check_tcp_port(host, port, timeout=1.5):
    import socket
    start = time.time()
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(timeout)
        s.connect((host, port))
        s.close()
        rtt_ms = round((time.time() - start) * 1000, 1)
        return True, rtt_ms
    except Exception:
        return False, None

def get_cluster_status():
    status = {
        "cluster": "kind-k8s-local",
        "kubernetes": "v1.31.0",
        "nodes": [],
        "pods": [],
        "services": [
            {
                "id": "dashboard",
                "name": "Cluster Hub Dashboard",
                "category": "Management",
                "url": "http://dashboard.local",
                "internalPort": "8088",
                "description": "Centro de Servicios Operativos e IDP local con métricas, eventos y developer hub",
                "docs": "Panel de control general del cluster"
            },
            {
                "id": "headlamp",
                "name": "Headlamp (K8s Lens)",
                "category": "Cluster Observability",
                "url": "http://headlamp.local",
                "internalPort": "80",
                "description": "Explorador web de recursos K8s, CRDs (Kafka, Argo), logs y terminal en vivo",
                "docs": "Visor nativo de Kubernetes para inspeccionar CRDs y ejecutar shells en pods"
            },
            {
                "id": "argocd",
                "name": "ArgoCD GitOps",
                "category": "GitOps & CI/CD",
                "url": "https://argocd.local",
                "internalPort": "443",
                "description": "Servidor de despliegue continuo declarativo con Traefik Ingress",
                "docs": "Usuario: admin. Contraseña disponible en pestaña Developer Hub"
            },
            {
                "id": "kafka-ui",
                "name": "Kafbat UI (Kafka)",
                "category": "Event Streaming",
                "url": "http://kafka-ui.local",
                "internalPort": "80",
                "description": "Consola web de Apache Kafka KRaft broker, esquemas y gestión de tópicos",
                "docs": "Permite inspeccionar mensajes, partitions, consumer groups y crear tópicos"
            },
            {
                "id": "traefik",
                "name": "Traefik Ingress",
                "category": "Ingress Controller",
                "url": "http://127.0.0.1:80",
                "internalPort": "80 / 443",
                "description": "Ingress Controller perimetral en Kind con cabeceras de seguridad",
                "docs": "Enruta el tráfico entrante a todos los servicios .local mediante host headers"
            },
            {
                "id": "apisix",
                "name": "Apache APISIX",
                "category": "API Gateway",
                "url": "http://apisix.local",
                "internalPort": "9080 / 9443",
                "description": "API Gateway dinámico de alto rendimiento para microservicios",
                "docs": "Orquestación de microservicios con plugins de autenticación, rate-limiting y métricas"
            },
            {
                "id": "mongodb",
                "name": "MongoDB 8.0",
                "category": "Database",
                "url": "localhost:37017",
                "internalPort": "27017",
                "description": "Instancia MongoDB LTS con no-new-privileges y memory-limits",
                "docs": "Base de datos NoSQL accesible externamente en puerto 37017 o interna en kind-mongodb:27017"
            },
            {
                "id": "registry",
                "name": "Zot OCI Registry (Trivy)",
                "category": "Container Registry",
                "url": "http://registry.local",
                "internalPort": "5000",
                "description": "Registro OCI con Web UI nativa y escaneo de vulnerabilidades Trivy",
                "docs": "Repositorio local para compilar e inyectar imágenes docker al clúster sin internet"
            }
        ]
    }

    try:
        k8s_data = get_k8s_api("/api/v1/pods")
        for item in k8s_data.get("items", []):
            ns = item["metadata"]["namespace"]
            name = item["metadata"]["name"]
            phase = item["status"].get("phase", "Unknown")
            statuses = item["status"].get("containerStatuses", [])
            ready_count = sum(1 for c in statuses if c.get("ready", False))
            total_count = len(statuses)
            ready = f"{ready_count}/{total_count}"
            restarts = sum(c.get("restartCount", 0) for c in statuses)
            status["pods"].append({
                "namespace": ns,
                "name": name,
                "phase": phase,
                "ready": ready,
                "restarts": restarts
            })
    except Exception as e:
        status["error"] = str(e)

    # Health checks & latency
    for svc in status["services"]:
        svc_id = svc["id"]
        svc["healthy"] = False
        svc["latencyMs"] = None
        try:
            if svc_id == "dashboard":
                svc["healthy"] = True
                svc["latencyMs"] = 1.0
            elif svc_id == "headlamp":
                svc["healthy"] = any(p["namespace"] == "headlamp" and p["phase"] == "Running" for p in status["pods"])
                ok, lat = check_tcp_port("headlamp.headlamp.svc.cluster.local", 80)
                if ok: svc["latencyMs"] = lat
            elif svc_id == "argocd":
                svc["healthy"] = any(p["name"].startswith("argocd-server") and p["phase"] == "Running" for p in status["pods"])
                ok, lat = check_tcp_port("argocd-server.argocd.svc.cluster.local", 443)
                if ok: svc["latencyMs"] = lat
            elif svc_id == "kafka-ui":
                svc["healthy"] = any(p["name"].startswith("kafka-ui") and p["phase"] == "Running" for p in status["pods"])
                ok, lat = check_tcp_port("kafka-ui.kafka.svc.cluster.local", 80)
                if ok: svc["latencyMs"] = lat
            elif svc_id == "traefik":
                svc["healthy"] = any(p["name"].startswith("traefik") and p["phase"] == "Running" for p in status["pods"])
                ok, lat = check_tcp_port("traefik.traefik.svc.cluster.local", 80)
                if ok: svc["latencyMs"] = lat
            elif svc_id == "apisix":
                svc["healthy"] = any(p["name"].startswith("apisix-") and "gateway" not in p["name"] and p["phase"] == "Running" for p in status["pods"])
                ok, lat = check_tcp_port("apisix-gateway.ingress-apisix.svc.cluster.local", 80)
                if ok: svc["latencyMs"] = lat
            elif svc_id == "registry":
                ok, lat = check_tcp_port("kind-registry", 5000)
                if not ok: ok, lat = check_tcp_port("172.18.0.3", 5000)
                if not ok: ok, lat = check_tcp_port("127.0.0.1", 5000)
                svc["healthy"] = ok
                svc["latencyMs"] = lat
            elif svc_id == "mongodb":
                ok, lat = check_tcp_port("kind-mongodb", 27017)
                if not ok: ok, lat = check_tcp_port("172.18.0.4", 27017)
                if not ok: ok, lat = check_tcp_port("127.0.0.1", 37017)
                svc["healthy"] = ok
                svc["latencyMs"] = lat
        except Exception:
            svc["healthy"] = False

    return status

def get_cluster_metrics():
    metrics = {
        "node": {"cpuPercent": 0, "cpuUsed": "0m", "cpuTotal": "N/A", "memPercent": 0, "memUsed": "0Mi", "memTotal": "N/A"},
        "topPods": [],
        "available": False
    }
    try:
        node_raw = get_k8s_api("/apis/metrics.k8s.io/v1beta1/nodes")
        pod_raw = get_k8s_api("/apis/metrics.k8s.io/v1beta1/pods")
        
        # Node metrics
        if "items" in node_raw and len(node_raw["items"]) > 0:
            metrics["available"] = True
            node_item = node_raw["items"][0]
            usage = node_item.get("usage", {})
            cpu_raw = usage.get("cpu", "0n")
            mem_raw = usage.get("memory", "0Ki")
            
            # Convert CPU nano to millicores
            cpu_m = round(int(cpu_raw.replace("n", "")) / 1_000_000) if "n" in cpu_raw else 0
            # Convert Mem Ki to MiB
            mem_mi = round(int(mem_raw.replace("Ki", "")) / 1024) if "Ki" in mem_raw else 0
            
            metrics["node"]["cpuUsed"] = f"{cpu_m}m"
            metrics["node"]["memUsed"] = f"{mem_mi} MiB"
            # Kind node typically runs on host capacity; report used values cleanly
            metrics["node"]["cpuPercent"] = min(100, round((cpu_m / 4000) * 100)) # based on 4-core alloc
            metrics["node"]["memPercent"] = min(100, round((mem_mi / 8192) * 100)) # based on 8GB alloc

        # Pod metrics
        if "items" in pod_raw:
            items = []
            for p in pod_raw["items"]:
                p_name = p["metadata"]["name"]
                p_ns = p["metadata"]["namespace"]
                c_cpu = 0
                c_mem = 0
                for c in p.get("containers", []):
                    c_usage = c.get("usage", {})
                    c_cpu += round(int(c_usage.get("cpu", "0n").replace("n", "")) / 1_000_000) if "n" in c_usage.get("cpu", "") else 0
                    c_mem += round(int(c_usage.get("memory", "0Ki").replace("Ki", "")) / 1024) if "Ki" in c_usage.get("memory", "") else 0
                items.append({
                    "namespace": p_ns,
                    "name": p_name,
                    "cpu_m": c_cpu,
                    "mem_mi": c_mem
                })
            items.sort(key=lambda x: x["mem_mi"], reverse=True)
            metrics["topPods"] = items[:8]
    except Exception as e:
        metrics["error"] = str(e)
    return metrics

def get_cluster_events():
    events = []
    try:
        events_raw = get_k8s_api("/api/v1/events")
        items = events_raw.get("items", [])
        for it in items:
            inv = it.get("involvedObject", {})
            events.append({
                "type": it.get("type", "Normal"),
                "reason": it.get("reason", "Unknown"),
                "message": it.get("message", ""),
                "object": f"{inv.get('kind', '')}/{inv.get('name', '')}",
                "namespace": inv.get('namespace', 'default'),
                "count": it.get("count", 1),
                "lastTimestamp": it.get("lastTimestamp") or it.get("eventTime") or ""
            })
        events.sort(key=lambda x: x["lastTimestamp"], reverse=True)
    except Exception as e:
        events.append({"type": "Warning", "reason": "FetchError", "message": str(e), "object": "Kubernetes/API", "namespace": "default", "count": 1, "lastTimestamp": ""})
    return events[:25]

def get_pod_logs(namespace, pod_name, lines=50):
    try:
        path = f"/api/v1/namespaces/{namespace}/pods/{pod_name}/log?tailLines={lines}"
        content = get_k8s_api(path, timeout=6)
        if isinstance(content, dict):
            return content.get("message", json.dumps(content))
        return str(content)
    except Exception as e:
        return f"Error al consultar logs: {str(e)}"

def get_developer_snippets():
    return {
        "mongodb": {
            "title": "MongoDB Database",
            "connectionHost": "mongodb://localhost:37017",
            "connectionInternal": "mongodb://kind-mongodb:27017/app_db",
            "envVar": "MONGO_URI=mongodb://localhost:37017/app_db",
            "cliSnippet": "mongosh mongodb://localhost:37017/test"
        },
        "kafka": {
            "title": "Apache Kafka (KRaft Mode)",
            "bootstrapInternal": "kafka-cluster-kafka-bootstrap.kafka.svc.cluster.local:9092",
            "bootstrapHost": "localhost:9092",
            "envVar": "KAFKA_BROKERS=kafka-cluster-kafka-bootstrap.kafka.svc.cluster.local:9092",
            "testTopic": "orders.events"
        },
        "registry": {
            "title": "Zot OCI Registry (Trivy)",
            "pushHost": "localhost:5000",
            "tagSnippet": "docker tag mi-servicio:latest localhost:5000/mi-servicio:v1",
            "pushSnippet": "docker push localhost:5000/mi-servicio:v1",
            "webUI": "http://registry.local"
        },
        "argocd": {
            "title": "ArgoCD GitOps Engine",
            "url": "https://argocd.local",
            "username": "admin",
            "pwdExtractionCmd": "kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath=\"{.data.password}\""
        },
        "hosts": {
            "title": "Host DNS Configuration (/etc/hosts)",
            "entry": "127.0.0.1 dashboard.local headlamp.local registry.local kafka-ui.local argocd.local apisix.local"
        }
    }

class DashboardHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        qs = urllib.parse.parse_qs(parsed.query)

        if parsed.path == "/api/status":
            self.send_json_response(get_cluster_status())
        elif parsed.path == "/api/metrics":
            self.send_json_response(get_cluster_metrics())
        elif parsed.path == "/api/events":
            self.send_json_response(get_cluster_events())
        elif parsed.path == "/api/snippets":
            self.send_json_response(get_developer_snippets())
        elif parsed.path == "/api/logs":
            ns = qs.get("namespace", ["default"])[0]
            pod = qs.get("pod", [""])[0]
            if not pod:
                self.send_json_response({"error": "Parámetro 'pod' requerido"}, status=400)
            else:
                logs = get_pod_logs(ns, pod)
                self.send_json_response({"namespace": ns, "pod": pod, "logs": logs})
        else:
            super().do_GET()

    def send_json_response(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))

if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), DashboardHandler) as httpd:
        print(f"Panel de control operativo iniciado en http://localhost:{PORT}")
        sys.stdout.flush()
        httpd.serve_forever()
