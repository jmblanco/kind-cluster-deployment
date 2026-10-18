import { runCommand } from '../executor.js';

/**
 * Checks system prerequisites for running Kind clusters and deployments.
 * Checks for: docker, kind, kubectl, helm, and active docker daemon.
 * 
 * @returns {Promise<{ok: boolean, missing: string[], dockerRunning: boolean, details: Record<string, string>}>}
 */
export async function checkPrerequisites(runner = runCommand) {
  const tools = ['docker', 'kind', 'kubectl', 'helm'];
  const missing = [];
  const details = {};

  for (const tool of tools) {
    try {
      const isWindows = process.platform === 'win32';
      const checkCmd = isWindows ? 'where.exe' : 'which';
      const res = await runner(checkCmd, [tool]);
      if (res.code === 0) {
        // Fetch version info
        let verRes = { stdout: 'detected' };
        if (tool === 'docker') verRes = await runner('docker', ['--version']);
        if (tool === 'kind') verRes = await runner('kind', ['version']);
        if (tool === 'kubectl') verRes = await runner('kubectl', ['version', '--client=true']);
        if (tool === 'helm') verRes = await runner('helm', ['version', '--short']);
        details[tool] = verRes.stdout.split('\n')[0].trim();
      } else {
        missing.push(tool);
      }
    } catch {
      missing.push(tool);
    }
  }

  let dockerRunning = false;
  if (!missing.includes('docker')) {
    try {
      const infoRes = await runner('docker', ['info']);
      dockerRunning = infoRes.code === 0;
    } catch {
      dockerRunning = false;
    }
  }

  return {
    ok: missing.length === 0 && dockerRunning,
    missing,
    dockerRunning,
    details
  };
}
