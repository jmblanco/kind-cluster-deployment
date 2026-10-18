import { describe, it } from 'node:test';
import assert from 'node:assert';
import { checkPrerequisites } from '../src/modules/prerequisites.js';

describe('Prerequisites Module', () => {
  it('should return a validation object with required properties in live environment', async () => {
    const res = await checkPrerequisites();
    assert.strictEqual(typeof res.ok, 'boolean');
    assert.strictEqual(Array.isArray(res.missing), true);
    assert.strictEqual(typeof res.dockerRunning, 'boolean');
    assert.strictEqual(typeof res.details, 'object');
  });

  it('should succeed (ok: true) when all tools exist and docker daemon is running', async () => {
    const fakeRunner = async (cmd, args) => {
      if (cmd === 'where.exe' || cmd === 'which') {
        return { code: 0, stdout: `/usr/bin/${args[0]}`, stderr: '' };
      }
      if (cmd === 'docker' && args[0] === '--version') {
        return { code: 0, stdout: 'Docker version 27.0.3, build 7d4bed1\nextra line', stderr: '' };
      }
      if (cmd === 'kind' && args[0] === 'version') {
        return { code: 0, stdout: 'kind v0.23.0 go1.22.4 darwin/arm64', stderr: '' };
      }
      if (cmd === 'kubectl' && args[0] === 'version') {
        return { code: 0, stdout: 'Client Version: v1.30.2\nKustomize Version: v5.0.4', stderr: '' };
      }
      if (cmd === 'helm' && args[0] === 'version') {
        return { code: 0, stdout: 'v3.15.2+g1a500d5', stderr: '' };
      }
      if (cmd === 'docker' && args[0] === 'info') {
        return { code: 0, stdout: 'Containers: 10\nServer Version: 27.0.3', stderr: '' };
      }
      return { code: 0, stdout: '', stderr: '' };
    };

    const res = await checkPrerequisites(fakeRunner);
    assert.strictEqual(res.ok, true);
    assert.deepStrictEqual(res.missing, []);
    assert.strictEqual(res.dockerRunning, true);
    assert.strictEqual(res.details.docker, 'Docker version 27.0.3, build 7d4bed1');
    assert.strictEqual(res.details.kind, 'kind v0.23.0 go1.22.4 darwin/arm64');
    assert.strictEqual(res.details.kubectl, 'Client Version: v1.30.2');
    assert.strictEqual(res.details.helm, 'v3.15.2+g1a500d5');
  });

  it('should detect when specific tools are missing', async () => {
    const fakeRunner = async (cmd, args) => {
      if (cmd === 'where.exe' || cmd === 'which') {
        const tool = args[0];
        if (tool === 'helm' || tool === 'kind') {
          return { code: 1, stdout: '', stderr: 'not found' };
        }
        return { code: 0, stdout: `/bin/${tool}`, stderr: '' };
      }
      if (cmd === 'docker' && args[0] === 'info') {
        return { code: 0, stdout: '', stderr: '' };
      }
      return { code: 0, stdout: 'version 1.0.0', stderr: '' };
    };

    const res = await checkPrerequisites(fakeRunner);
    assert.strictEqual(res.ok, false);
    assert.deepStrictEqual(res.missing, ['kind', 'helm']);
    assert.strictEqual(res.dockerRunning, true);
    assert.strictEqual(res.details.docker, 'version 1.0.0');
    assert.strictEqual(res.details.kubectl, 'version 1.0.0');
    assert.strictEqual(res.details.helm, undefined);
  });

  it('should not check docker daemon when docker CLI is missing', async () => {
    let dockerInfoCalled = false;
    const fakeRunner = async (cmd, args) => {
      if (cmd === 'where.exe' || cmd === 'which') {
        if (args[0] === 'docker') {
          return { code: 1, stdout: '', stderr: 'not found' };
        }
        return { code: 0, stdout: '/bin/tool', stderr: '' };
      }
      if (cmd === 'docker' && args[0] === 'info') {
        dockerInfoCalled = true;
        return { code: 0, stdout: '', stderr: '' };
      }
      return { code: 0, stdout: 'v1.0.0', stderr: '' };
    };

    const res = await checkPrerequisites(fakeRunner);
    assert.strictEqual(res.ok, false);
    assert.ok(res.missing.includes('docker'));
    assert.strictEqual(res.dockerRunning, false);
    assert.strictEqual(dockerInfoCalled, false, 'docker info should never be invoked when docker is missing');
  });

  it('should mark dockerRunning as false when docker daemon is stopped (docker info non-zero)', async () => {
    const fakeRunner = async (cmd, args) => {
      if (cmd === 'where.exe' || cmd === 'which') {
        return { code: 0, stdout: '/bin/tool', stderr: '' };
      }
      if (cmd === 'docker' && args[0] === 'info') {
        return { code: 1, stdout: '', stderr: 'Cannot connect to the Docker daemon' };
      }
      return { code: 0, stdout: 'v1.0.0', stderr: '' };
    };

    const res = await checkPrerequisites(fakeRunner);
    assert.strictEqual(res.ok, false);
    assert.deepStrictEqual(res.missing, []);
    assert.strictEqual(res.dockerRunning, false);
  });

  it('should handle thrown errors during tool check gracefully', async () => {
    const fakeRunner = async (cmd, args) => {
      if (cmd === 'where.exe' || cmd === 'which') {
        if (args[0] === 'kubectl') {
          throw new Error('EACCES: permission denied');
        }
        return { code: 0, stdout: '/bin/tool', stderr: '' };
      }
      if (cmd === 'docker' && args[0] === 'info') {
        return { code: 0, stdout: '', stderr: '' };
      }
      return { code: 0, stdout: 'v1.0.0', stderr: '' };
    };

    const res = await checkPrerequisites(fakeRunner);
    assert.strictEqual(res.ok, false);
    assert.ok(res.missing.includes('kubectl'));
  });

  it('should handle thrown errors during docker info gracefully', async () => {
    const fakeRunner = async (cmd, args) => {
      if (cmd === 'where.exe' || cmd === 'which') {
        return { code: 0, stdout: '/bin/tool', stderr: '' };
      }
      if (cmd === 'docker' && args[0] === 'info') {
        throw new Error('Docker daemon socket timed out');
      }
      return { code: 0, stdout: 'v1.0.0', stderr: '' };
    };

    const res = await checkPrerequisites(fakeRunner);
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.dockerRunning, false);
  });
});
