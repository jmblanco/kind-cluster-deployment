import path from 'node:path';
import { runCommand } from '../executor.js';
import { ensureNamespace } from './k8s-utils.js';

export async function deployObservability(repoRoot, onProgress = () => {}) {
  onProgress('Deploying Metrics-Server...');
  await runCommand('kubectl', [
    'apply', '-f',
    'https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml'
  ]);

  const patchFile = path.join(repoRoot, 'templates', 'metrics-server-patch.yaml');
  await runCommand('kubectl', [
    'patch', 'deployment', 'metrics-server',
    '-n', 'kube-system',
    '--patch-file', patchFile
  ]);

  onProgress('Configuring Headlamp Kubernetes Explorer...');
  await ensureNamespace('headlamp');
  await runCommand('helm', ['repo', 'add', 'headlamp', 'https://kubernetes-sigs.github.io/headlamp/']);
  await runCommand('helm', ['repo', 'update', 'headlamp']);

  const headlampValues = path.join(repoRoot, 'templates', 'headlamp-values.yaml');
  await runCommand('helm', [
    'upgrade', '--install', 'headlamp', 'headlamp/headlamp',
    '-n', 'headlamp',
    '-f', headlampValues
  ]);

  const ingPath = path.join(repoRoot, 'ingress', 'headlamp.ingress.yaml');
  await runCommand('kubectl', ['apply', '-f', ingPath]);

  return { success: true, message: 'Headlamp & Metrics-Server ready at http://headlamp.local' };
}
