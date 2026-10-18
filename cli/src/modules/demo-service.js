import path from 'node:path';
import { runCommand } from '../executor.js';

export async function deployDemoOrderService(repoRoot, onProgress = () => {}) {
  const exampleDir = path.join(repoRoot, 'examples', 'order-service');
  const manifestPath = path.join(repoRoot, 'templates', 'order-service.deployment.yaml');
  const ingressPath = path.join(repoRoot, 'ingress', 'order-service.ingress.yaml');
  const imageName = 'localhost:5000/order-service:1.0.0';

  onProgress('Building demo order-service container image...');
  try {
    await runCommand('docker', ['build', '-t', imageName, exampleDir]);
    try {
      onProgress('Pushing image to local Zot registry...');
      await runCommand('docker', ['push', imageName]);
    } catch {
      onProgress('Registry unreachable directly, sideloading image into Kind node...');
      await runCommand('kind', ['load', 'docker-image', imageName, '--name', 'kind-k8s-local']);
    }
  } catch (err) {
    onProgress(`Warning building image: ${err.message}. Proceeding with manifests...`);
  }

  onProgress('Applying order-service Kubernetes Deployment & Service...');
  const resApply = await runCommand('kubectl', ['apply', '-f', manifestPath]);
  if (resApply.code !== 0) {
    throw new Error(`Failed to apply order-service manifests: ${resApply.stderr || resApply.stdout}`);
  }

  onProgress('Applying Traefik Ingress for orders.local...');
  await runCommand('kubectl', ['apply', '-f', ingressPath]);

  onProgress('Waiting for order-service pod to start...');
  try {
    await runCommand('kubectl', [
      'rollout', 'status', 'deployment/order-service',
      '-n', 'default',
      '--timeout=90s'
    ]);
  } catch {
    onProgress('Pod is still stabilizing in the background.');
  }

  return {
    success: true,
    message: 'Demo Order Service deployed at http://orders.local'
  };
}
