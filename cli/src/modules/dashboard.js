import path from 'node:path';
import { runCommand } from '../executor.js';

export async function deployDashboard(repoRoot, onProgress = () => {}) {
  onProgress('Building and updating Kind Cluster Control Panel & Hub image...');
  const dashDir = path.join(repoRoot, 'dashboard');
  const dashYaml = path.join(repoRoot, 'templates', 'dashboard.deployment.yaml');

  // Build and push image to local Zot registry / Kind node
  try {
    await runCommand('docker', ['build', '-t', 'localhost:5000/cluster-dashboard:v2.0.0', dashDir]);
    // Try pushing to local registry if running
    try {
      await runCommand('docker', ['push', 'localhost:5000/cluster-dashboard:v2.0.0']);
    } catch {
      // If push fails or registry not reachable directly on host 5000, load into kind directly
      onProgress('Loading dashboard image directly into Kind cluster nodes...');
      await runCommand('kind', ['load', 'docker-image', 'localhost:5000/cluster-dashboard:v2.0.0', '--name', 'kind-k8s-local']);
    }
  } catch (err) {
    onProgress(`Notice: Docker build warning: ${err.message}. Proceeding to apply manifests...`);
  }

  onProgress('Applying Dashboard Hub manifests and RBAC permissions...');
  await runCommand('kubectl', ['apply', '-f', dashYaml]);

  // Restart deployment to pick up any new local image
  try {
    await runCommand('kubectl', ['rollout', 'restart', 'deployment/cluster-dashboard', '-n', 'default']);
  } catch {
    // Ignore rollout errors if newly created
  }

  return { success: true, message: 'Operational Hub & Developer Portal v2.0 deployed at http://dashboard.local (and http://localhost:8088)' };
}
