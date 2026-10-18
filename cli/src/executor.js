import { spawn } from 'node:child_process';

/**
 * Execute a command safely returning standard output and exit codes.
 * Spawns executables directly with argument arrays to prevent command injection vulnerabilities.
 * 
 * @param {string} command - The executable binary
 * @param {string[]} args - Command line arguments
 * @param {object} options - Spawn options (cwd, env, input, etc.)
 * @returns {Promise<{stdout: string, stderr: string, code: number}>}
 */
export function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    let settled = false;

    // Use shell only if explicitly requested, otherwise execute directly
    const child = spawn(command, args, {
      shell: Boolean(options.shell),
      ...options
    });

    let stdout = '';
    let stderr = '';

    // Handle standard input if provided
    if (child.stdin) {
      child.stdin.on('error', () => {});
      if (options.input) {
        child.stdin.write(options.input);
        child.stdin.end();
      }
    }

    if (child.stdout) {
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
    }

    child.on('error', (err) => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    });

    child.on('close', (code) => {
      if (!settled) {
        settled = true;
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          code: code ?? 0
        });
      }
    });
  });
}
