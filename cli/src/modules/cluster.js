import fs from 'node:fs';
import path from 'node:path';
import { runCommand } from '../executor.js';

export function getClusterName(repoRoot) {
  const configPath = path.join(repoRoot, 'templates', 'kind.config.yaml');
  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, 'utf8');
    const match = content.match(/^\s*name:\s*(.+)$/m);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return 'kind-k8s-local';
}

export async function createKindCluster(repoRoot, onProgress = () => {}, runner = runCommand) {
  const clusterName = getClusterName(repoRoot);
  const configPath = path.join(repoRoot, 'templates', 'kind.config.yaml');

  // Check if cluster already exists
  const listRes = await runner('kind', ['get', 'clusters']);
  const existingClusters = listRes.stdout.split('\n').map(c => c.trim()).filter(Boolean);

  if (existingClusters.includes(clusterName)) {
    return { success: true, message: `Cluster '${clusterName}' already exists. Skipping.` };
  }

  onProgress(`Creating Kind cluster '${clusterName}'...`);
  const createRes = await runner('kind', ['create', 'cluster', '--config', configPath]);
  if (createRes.code !== 0) {
    throw new Error(`Failed to create Kind cluster: ${createRes.stderr || createRes.stdout}`);
  }

  return { success: true, message: `Cluster '${clusterName}' created successfully.` };
}

export async function deleteKindCluster(repoRoot, onProgress = () => {}, runner = runCommand) {
  const clusterName = getClusterName(repoRoot);
  onProgress(`Deleting Kind cluster '${clusterName}'...`);
  await runner('kind', ['delete', 'cluster', '--name', clusterName]);
  return { success: true, message: `Cluster '${clusterName}' deleted.` };
}
