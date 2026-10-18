import path from 'node:path';
import { runCommand } from '../executor.js';
import { sanitizeName, sanitizePort } from './k8s-utils.js';

export async function deployRegistry(repoRoot, onProgress = () => {}) {
  const regName = sanitizeName(process.env.REG_NAME, 'kind-registry');
  const regPort = sanitizePort(process.env.REG_PORT, '5000');

  onProgress(`Checking container ${regName}...`);
  const psRes = await runCommand('docker', ['ps', '-a', '--filter', `name=^/${regName}$`, '--format', '{{.Names}}']);
  const running = psRes.stdout.trim() === regName;

  if (!running) {
    onProgress(`Deploying Zot OCI Registry (${regName}) on port ${regPort}...`);
    const runRes = await runCommand('docker', [
      'run', '-d',
      '--restart=always',
      '-p', `127.0.0.1:${regPort}:5000`,
      '--name', regName,
      'ghcr.io/project-zot/zot-linux-amd64:v2.1.2'
    ]);
    if (runRes.code !== 0) {
      throw new Error(`Failed to start Zot registry container: ${runRes.stderr}`);
    }
  }

  // Connect to kind network if kind exists
  const netRes = await runCommand('docker', ['network', 'inspect', 'kind', '-f', `{{range .Containers}}{{.Name}} {{end}}`]);
  if (netRes.code === 0 && !netRes.stdout.includes(regName)) {
    onProgress(`Connecting registry to 'kind' network...`);
    await runCommand('docker', ['network', 'connect', 'kind', regName]);
  }

  // Apply ConfigMap in Cluster if cluster is reachable
  const cmPath = path.join(repoRoot, 'templates', 'kind-registry.configmap.yaml');
  await runCommand('kubectl', ['apply', '-f', cmPath]);

  // Apply Ingress if exists
  const ingPath = path.join(repoRoot, 'ingress', 'registry.ingress.yaml');
  await runCommand('kubectl', ['apply', '-f', ingPath]);

  return { success: true, message: `Registry ready at http://localhost:${regPort} & http://registry.local` };
}

export async function deleteRegistry() {
  const regName = sanitizeName(process.env.REG_NAME, 'kind-registry');
  await runCommand('docker', ['rm', '-f', regName]);
  return { success: true, message: `Registry ${regName} removed.` };
}
