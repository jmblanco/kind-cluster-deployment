import { describe, it } from 'node:test';
import assert from 'node:assert';
import { sanitizeName, sanitizePort, ensureNamespace } from '../src/modules/k8s-utils.js';

describe('K8s Utils Module', () => {
  describe('sanitizeName()', () => {
    it('should allow valid alphanumeric and dash/dot/underscore names', () => {
      assert.strictEqual(sanitizeName('valid-name_123.test', 'fallback'), 'valid-name_123.test');
      assert.strictEqual(sanitizeName('kind-cluster', 'fallback'), 'kind-cluster');
    });

    it('should reject names containing injection characters or spaces and use fallback', () => {
      assert.strictEqual(sanitizeName('bad name with spaces', 'fallback'), 'fallback');
      assert.strictEqual(sanitizeName('name;rm -rf /', 'fallback'), 'fallback');
      assert.strictEqual(sanitizeName('name&calc.exe', 'fallback'), 'fallback');
      assert.strictEqual(sanitizeName('$(whoami)', 'fallback'), 'fallback');
      assert.strictEqual(sanitizeName('', 'fallback'), 'fallback');
      assert.strictEqual(sanitizeName(null, 'fallback'), 'fallback');
    });
  });

  describe('sanitizePort()', () => {
    it('should accept valid network port numbers in range 1-65535', () => {
      assert.strictEqual(sanitizePort('5000', '80'), '5000');
      assert.strictEqual(sanitizePort(8080, '80'), '8080');
      assert.strictEqual(sanitizePort('1', '80'), '1');
      assert.strictEqual(sanitizePort('65535', '80'), '65535');
    });

    it('should reject out-of-range ports, letters, or injection payloads and use fallback', () => {
      assert.strictEqual(sanitizePort('0', '5000'), '5000');
      assert.strictEqual(sanitizePort('65536', '5000'), '5000');
      assert.strictEqual(sanitizePort('-80', '5000'), '5000');
      assert.strictEqual(sanitizePort('5000;evil', '5000'), '5000');
      assert.strictEqual(sanitizePort('abc', '5000'), '5000');
      assert.strictEqual(sanitizePort('', '5000'), '5000');
    });
  });

  describe('ensureNamespace()', () => {
    it('should reject invalid namespace names before executing any command', async () => {
      await assert.rejects(
        async () => {
          await ensureNamespace('invalid namespace!&');
        },
        /Invalid namespace name/
      );
    });
  });
});
