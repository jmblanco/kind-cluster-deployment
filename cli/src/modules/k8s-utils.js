import { runCommand } from '../executor.js';

const SAFE_NAME_REGEX = /^[a-zA-Z0-9_.-]+$/;
const SAFE_PORT_REGEX = /^\d+$/;

/**
 * Ensures a namespace exists idempotently in the cluster without failing if it already exists.
 * @param {string} namespace 
 */
export async function ensureNamespace(namespace) {
  if (!SAFE_NAME_REGEX.test(namespace)) {
    throw new Error(`Invalid namespace name: "${namespace}"`);
  }
  const check = await runCommand('kubectl', ['get', 'namespace', namespace]);
  if (check.code !== 0) {
    const res = await runCommand('kubectl', ['create', 'namespace', namespace]);
    if (res.code !== 0 && !res.stderr.includes('AlreadyExists')) {
      throw new Error(`Failed to create namespace '${namespace}': ${res.stderr}`);
    }
  }
}

/**
 * Validates identifier names (e.g., container names, cluster names)
 * @param {string} name 
 * @param {string} fallback 
 * @returns {string}
 */
export function sanitizeName(name, fallback) {
  if (name && SAFE_NAME_REGEX.test(name)) {
    return name;
  }
  return fallback;
}

/**
 * Validates and sanitizes network ports
 * @param {string|number} port 
 * @param {string} fallback 
 * @returns {string}
 */
export function sanitizePort(port, fallback) {
  const str = String(port || '').trim();
  if (SAFE_PORT_REGEX.test(str) && Number(str) > 0 && Number(str) <= 65535) {
    return str;
  }
  return fallback;
}
