import path from 'node:path';
import { runCommand } from '../executor.js';
import { ensureNamespace } from './k8s-utils.js';

export async function deployTraefik(repoRoot, onProgress = () => {}) {
  onProgress('Ensuring namespace traefik...');
  await ensureNamespace('traefik');

  onProgress('Configuring Helm repo for Traefik...');
  await runCommand('helm', ['repo', 'add', 'traefik', 'https://traefik.github.io/charts']);
  await runCommand('helm', ['repo', 'update', 'traefik']);

  onProgress('Deploying Traefik Ingress Controller...');
  const valuesPath = path.join(repoRoot, 'templates', 'traefik-values.yaml');
  const res = await runCommand('helm', [
    'upgrade', '--install', 'traefik', 'traefik/traefik',
    '-n', 'traefik',
    '-f', valuesPath
  ]);

  if (res.code !== 0) {
    throw new Error(`Traefik installation failed: ${res.stderr || res.stdout}`);
  }

  return { success: true, message: 'Traefik Ingress deployed on host ports 80/443.' };
}

export async function deployApisix(repoRoot, onProgress = () => {}) {
  onProgress('Ensuring namespace ingress-apisix...');
  await ensureNamespace('ingress-apisix');

  onProgress('Configuring Helm repo for Apache APISIX...');
  await runCommand('helm', ['repo', 'add', 'apisix', 'https://charts.apiseven.com']);
  await runCommand('helm', ['repo', 'update', 'apisix']);

  onProgress('Deploying Apache APISIX...');
  const valuesPath = path.join(repoRoot, 'templates', 'apisix-values.yaml');
  const res = await runCommand('helm', [
    'upgrade', '--install', 'apisix', 'apisix/apisix',
    '-n', 'ingress-apisix',
    '-f', valuesPath
  ]);

  if (res.code !== 0) {
    throw new Error(`Apache APISIX installation failed: ${res.stderr || res.stdout}`);
  }

  // Apply Ingress for APISIX Dashboard if exists
  const ingPath = path.join(repoRoot, 'ingress', 'apisix.ingress.yaml');
  await runCommand('kubectl', ['apply', '-f', ingPath]);

  return { success: true, message: 'Apache APISIX deployed at http://apisix.local' };
}
