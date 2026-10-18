# GitOps Continuous Delivery: ArgoCD

Esta guía documenta la arquitectura, el funcionamiento y el uso operativo del controlador GitOps **ArgoCD** dentro del entorno Kind.

---

## 1. Visión y Función en el Stack

ArgoCD implementa el patrón **GitOps** para el clúster local:
- El estado deseado de la infraestructura y aplicaciones reside en un repositorio Git.
- ArgoCD monitoriza continuamente el clúster y el repositorio Git, reconciliando cualquier discrepancia automáticamente (declarativo y autónomo).
- Permite probar flujos de despliegue continuo (Continuous Deployment) idénticos a los utilizados en entornos productivos en la nube.

---

## 2. Despliegue y Configuración

- **Namespace:** `argocd`
- **Módulo CLI:** [`cli/src/modules/argocd.js`](../../cli/src/modules/argocd.js) -> `deployArgoCD()`
- **Manifiesto Ingress:** [`ingress/argocd.ingress.yaml`](../../ingress/argocd.ingress.yaml)
- **URL de Acceso:** [`https://argocd.local`](https://argocd.local)

### Despliegue mediante CLI
```bash
npm start argocd
```

### Particularidad de Ingress (Backend HTTPS)
El servidor de la API de ArgoCD se ejecuta internamente con cifrado TLS. El Ingress [`ingress/argocd.ingress.yaml`](../../ingress/argocd.ingress.yaml) está configurado con la anotación de Traefik para conectarse a un backend HTTPS:

```yaml
traefik.ingress.kubernetes.io/router.entrypoints: websecure
traefik.ingress.kubernetes.io/service.serversscheme: https
```

---

## 3. Credenciales y Acceso

1. **Usuario predeterminado:** `admin`
2. **Obtención de la contraseña inicial:**
   La contraseña se genera aleatoriamente durante la instalación en un Secret de Kubernetes. Puedes recuperarla con el siguiente comando:

   **Linux / macOS / Git Bash:**
   ```bash
   kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
   ```

   **Windows PowerShell:**
   ```powershell
   [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String((kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}")))
   ```

3. Navega a `https://argocd.local` e inicia sesión. (Acepta la advertencia de certificado autofirmado en el navegador).

---

## 4. Desplegar una Aplicación de Ejemplo con GitOps

Puedes registrar una aplicación conectada a un repositorio público o privado de GitHub/GitLab:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: guestbook-demo
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/argoproj/argocd-example-apps.git
    targetRevision: HEAD
    path: guestbook
  destination:
    server: https://kubernetes.default.svc
    namespace: default
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```
Aplica este manifiesto con `kubectl apply -f app.yaml` y observa en `https://argocd.local` cómo los pods se despliegan automáticamente.
