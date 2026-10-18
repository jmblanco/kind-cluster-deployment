import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  REQUIRED_DOMAINS,
  TARGET_IP,
  getHostsFilePath,
  parseHostsFile,
  checkDnsEntries,
  generateHostsSnippet,
  getSyncInstructions
} from '../src/modules/dns.js';

describe('DNS Module', () => {
  describe('getHostsFilePath()', () => {
    it('should return Windows hosts path when platform is win32', () => {
      const p = getHostsFilePath('win32');
      assert.match(p, /System32[/\\]drivers[/\\]etc[/\\]hosts/i);
    });

    it('should return /etc/hosts for unix platforms (linux, darwin)', () => {
      assert.strictEqual(getHostsFilePath('linux'), '/etc/hosts');
      assert.strictEqual(getHostsFilePath('darwin'), '/etc/hosts');
    });
  });

  describe('parseHostsFile()', () => {
    it('should extract domains correctly from hosts content', () => {
      const mockContent = `
# Sample comment
127.0.0.1 localhost
127.0.0.1 dashboard.local headlamp.local
::1 localhost
192.168.1.5 other.host
127.0.0.1 registry.local # inline comment
`;
      const domains = parseHostsFile(mockContent);
      assert.strictEqual(domains.has('localhost'), true);
      assert.strictEqual(domains.has('dashboard.local'), true);
      assert.strictEqual(domains.has('headlamp.local'), true);
      assert.strictEqual(domains.has('registry.local'), true);
      assert.strictEqual(domains.has('other.host'), false);
    });

    it('should ignore comments and empty lines', () => {
      const mockContent = `
# 127.0.0.1 fake.local
  # another comment
`;
      const domains = parseHostsFile(mockContent);
      assert.strictEqual(domains.size, 0);
    });
  });

  describe('checkDnsEntries()', () => {
    it('should return ok: true when all required domains exist in content', () => {
      const mockContent = `127.0.0.1 ${REQUIRED_DOMAINS.join(' ')}`;
      const result = checkDnsEntries({ content: mockContent });
      assert.strictEqual(result.ok, true);
      assert.strictEqual(result.missing.length, 0);
      assert.strictEqual(result.configured.length, REQUIRED_DOMAINS.length);
    });

    it('should return ok: false and list missing domains when some are missing', () => {
      const mockContent = `127.0.0.1 dashboard.local headlamp.local`;
      const result = checkDnsEntries({ content: mockContent });
      assert.strictEqual(result.ok, false);
      assert.deepStrictEqual(result.configured, ['dashboard.local', 'headlamp.local']);
      assert.strictEqual(result.missing.includes('registry.local'), true);
      assert.strictEqual(result.missing.includes('argocd.local'), true);
      assert.strictEqual(result.missing.includes('kafka-ui.local'), true);
      assert.strictEqual(result.missing.includes('apisix.local'), true);
    });

    it('should inspect actual host file without crashing in live environment', () => {
      const result = checkDnsEntries();
      assert.strictEqual(typeof result.ok, 'boolean');
      assert.strictEqual(Array.isArray(result.configured), true);
      assert.strictEqual(Array.isArray(result.missing), true);
      assert.strictEqual(typeof result.hostsPath, 'string');
    });
  });

  describe('generateHostsSnippet()', () => {
    it('should return empty string if no missing domains', () => {
      assert.strictEqual(generateHostsSnippet([]), '');
    });

    it('should return formatted IP and domains string', () => {
      const snippet = generateHostsSnippet(['a.local', 'b.local']);
      assert.strictEqual(snippet, '127.0.0.1 a.local b.local');
    });
  });

  describe('getSyncInstructions()', () => {
    it('should return powershell command on win32', () => {
      const instructions = getSyncInstructions(['app.local'], 'win32');
      assert.strictEqual(typeof instructions.command, 'string');
      assert.strictEqual(instructions.command.includes('Add-Content'), true);
      assert.strictEqual(instructions.snippet, '127.0.0.1 app.local');
    });

    it('should return sudo tee command on unix', () => {
      const instructions = getSyncInstructions(['app.local'], 'linux');
      assert.strictEqual(typeof instructions.command, 'string');
      assert.strictEqual(instructions.command.includes('sudo tee -a /etc/hosts'), true);
    });
  });
});
