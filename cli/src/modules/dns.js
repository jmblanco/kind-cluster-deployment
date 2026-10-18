import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export const REQUIRED_DOMAINS = [
  'dashboard.local',
  'headlamp.local',
  'registry.local',
  'argocd.local',
  'kafka-ui.local',
  'apisix.local',
  'orders.local'
];

export const TARGET_IP = '127.0.0.1';

/**
 * Returns the default hosts file path according to the operating system.
 * @param {string} [platformOverride]
 * @returns {string}
 */
export function getHostsFilePath(platformOverride = process.platform) {
  if (platformOverride === 'win32') {
    const systemRoot = process.env.SystemRoot || process.env.windir || 'C:\\Windows';
    return path.join(systemRoot, 'System32', 'drivers', 'etc', 'hosts');
  }
  return '/etc/hosts';
}

/**
 * Parses hosts file content and extracts set of domains mapped to 127.0.0.1 or localhost equivalent.
 * @param {string} content
 * @returns {Set<string>}
 */
export function parseHostsFile(content) {
  const configured = new Set();
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    // Ignore empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // Split on whitespace
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      const ip = parts[0];
      // Only check mappings pointing to 127.0.0.1 (or IPv4 loopback)
      if (ip === TARGET_IP || ip === '127.0.1.1') {
        for (let i = 1; i < parts.length; i++) {
          const domain = parts[i].trim().toLowerCase();
          // Stop if comment starts within the line
          if (domain.startsWith('#')) break;
          if (domain) {
            configured.add(domain);
          }
        }
      }
    }
  }

  return configured;
}

/**
 * Inspects system hosts file and checks status of required local domains.
 * @param {object} [options]
 * @param {string} [options.hostsPath]
 * @param {string} [options.content]
 * @param {string[]} [options.domains]
 * @returns {{ ok: boolean, hostsPath: string, configured: string[], missing: string[], total: number }}
 */
export function checkDnsEntries(options = {}) {
  const domains = options.domains || REQUIRED_DOMAINS;
  const hostsPath = options.hostsPath || getHostsFilePath();

  let content = '';
  if (typeof options.content === 'string') {
    content = options.content;
  } else {
    try {
      if (fs.existsSync(hostsPath)) {
        content = fs.readFileSync(hostsPath, 'utf8');
      }
    } catch (err) {
      // If unable to read due to permissions or missing file
      return {
        ok: false,
        hostsPath,
        configured: [],
        missing: [...domains],
        total: domains.length,
        error: err.message
      };
    }
  }

  const configuredSet = parseHostsFile(content);
  const configured = [];
  const missing = [];

  for (const domain of domains) {
    if (configuredSet.has(domain.toLowerCase())) {
      configured.push(domain);
    } else {
      missing.push(domain);
    }
  }

  return {
    ok: missing.length === 0,
    hostsPath,
    configured,
    missing,
    total: domains.length
  };
}

/**
 * Generates the hosts file snippet for missing domains.
 * @param {string[]} missingDomains
 * @param {string} [targetIp]
 * @returns {string}
 */
export function generateHostsSnippet(missingDomains, targetIp = TARGET_IP) {
  if (!missingDomains || missingDomains.length === 0) {
    return '';
  }
  return `${targetIp} ${missingDomains.join(' ')}`;
}

/**
 * Returns instructions on how the user can apply the hosts update with elevated privileges.
 * @param {string[]} missingDomains
 * @param {string} [platformOverride]
 * @returns {{ command: string, hostsPath: string, snippet: string }}
 */
export function getSyncInstructions(missingDomains, platformOverride = process.platform) {
  const hostsPath = getHostsFilePath(platformOverride);
  const snippet = generateHostsSnippet(missingDomains);

  if (platformOverride === 'win32') {
    return {
      hostsPath,
      snippet,
      command: `Add-Content -Path "${hostsPath}" -Value "${snippet}"`
    };
  }

  return {
    hostsPath,
    snippet,
    command: `echo "${snippet}" | sudo tee -a ${hostsPath}`
  };
}
