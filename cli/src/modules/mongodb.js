import { runCommand } from '../executor.js';
import { sanitizeName, sanitizePort } from './k8s-utils.js';

export async function deployMongoDB(onProgress = () => {}) {
  const mongoName = sanitizeName(process.env.MONGODB_NAME, 'kind-mongodb');
  const mongoPort = sanitizePort(process.env.MONGODB_PORT, '37017');

  onProgress(`Checking container ${mongoName}...`);
  const psRes = await runCommand('docker', ['ps', '-a', '--filter', `name=^/${mongoName}$`, '--format', '{{.Names}}']);
  const running = psRes.stdout.trim() === mongoName;

  if (!running) {
    onProgress(`Deploying MongoDB (${mongoName}) on port ${mongoPort}...`);
    const runRes = await runCommand('docker', [
      'run', '-d',
      '--restart=always',
      '-p', `127.0.0.1:${mongoPort}:27017`,
      '--name', mongoName,
      'mongo:7.0'
    ]);
    if (runRes.code !== 0) {
      throw new Error(`Failed to start MongoDB container: ${runRes.stderr}`);
    }
  }

  // Connect to kind network if kind exists
  const netRes = await runCommand('docker', ['network', 'inspect', 'kind', '-f', `{{range .Containers}}{{.Name}} {{end}}`]);
  if (netRes.code === 0 && !netRes.stdout.includes(mongoName)) {
    onProgress(`Connecting MongoDB to 'kind' network...`);
    await runCommand('docker', ['network', 'connect', 'kind', mongoName]);
  }

  return { success: true, message: `MongoDB ready on localhost:${mongoPort}` };
}

export async function deleteMongoDB() {
  const mongoName = sanitizeName(process.env.MONGODB_NAME, 'kind-mongodb');
  await runCommand('docker', ['rm', '-f', mongoName]);
  return { success: true, message: `MongoDB ${mongoName} removed.` };
}
