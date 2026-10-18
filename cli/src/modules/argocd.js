import path from 'node:path';
import { runCommand } from '../executor.js';
import { ensureNamespace, sanitizeName } from './k8s-utils.js';

export async function deployArgoCD(repoRoot, onProgress = () => {}) {
  const rawArgocdNs = process.env.ARGOCD_NS || 'argocd';
  const argocdNs = sanitizeName(rawArgocdNs, 'argocd');

  onProgress(`Ensuring namespace '${argocdNs}'...`);
  await ensureNamespace(argocdNs);

  onProgress('Deploying ArgoCD manifests...');
  await runCommand('kubectl', [
    'apply', '-n', argocdNs,
    '-f', 'https://raw.githubusercontent.com/argoproj/argo-cd/v2.10.4/manifests/install.yaml'
  ]);

  onProgress('Applying ArgoCD Ingress configuration...');
  const ingPath = path.join(repoRoot, 'ingress', 'argocd.ingress.yaml');
  await runCommand('kubectl', ['apply', '-f', ingPath]);

  return { success: true, message: 'ArgoCD deployed at https://argocd.local' };
}
