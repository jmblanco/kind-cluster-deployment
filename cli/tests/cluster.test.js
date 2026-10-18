import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { getClusterName, createKindCluster, deleteKindCluster } from '../src/modules/cluster.js';

describe('Cluster Module', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kind-test-'));
  });

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  function setupConfig(content) {
    const templatesDir = path.join(tempDir, 'templates');
    fs.mkdirSync(templatesDir, { recursive: true });
    fs.writeFileSync(path.join(templatesDir, 'kind.config.yaml'), content);
  }

  describe('getClusterName()', () => {
    it('should return cluster name specified in kind.config.yaml', () => {
      setupConfig('kind: Cluster\napiVersion: kind.x-k8s.io/v1alpha4\nname: test-cluster-prod\nnodes:\n  - role: control-plane\n');
      const name = getClusterName(tempDir);
      assert.strictEqual(name, 'test-cluster-prod');
    });

    it('should trim leading and trailing whitespace around cluster name', () => {
      setupConfig('kind: Cluster\napiVersion: kind.x-k8s.io/v1alpha4\n  name:   spaced-cluster-name   \n');
      const name = getClusterName(tempDir);
      assert.strictEqual(name, 'spaced-cluster-name');
    });

    it('should fallback to default "kind-k8s-local" when kind.config.yaml lacks name property', () => {
      setupConfig('kind: Cluster\napiVersion: kind.x-k8s.io/v1alpha4\n');
      const name = getClusterName(tempDir);
      assert.strictEqual(name, 'kind-k8s-local');
    });

    it('should fallback to default "kind-k8s-local" when config file does not exist', () => {
      const emptyDir = path.join(tempDir, 'non_existent_folder');
      const name = getClusterName(emptyDir);
      assert.strictEqual(name, 'kind-k8s-local');
    });
  });

  describe('createKindCluster()', () => {
    it('should skip creation if cluster already exists in kind get clusters', async () => {
      setupConfig('kind: Cluster\nname: existing-cluster\n');
      const commandsRun = [];
      const fakeRunner = async (cmd, args) => {
        commandsRun.push({ cmd, args });
        if (cmd === 'kind' && args[0] === 'get' && args[1] === 'clusters') {
          return { code: 0, stdout: 'other-cluster\nexisting-cluster\nanother-one', stderr: '' };
        }
        return { code: 0, stdout: '', stderr: '' };
      };

      const res = await createKindCluster(tempDir, () => {}, fakeRunner);
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.message, "Cluster 'existing-cluster' already exists. Skipping.");
      assert.strictEqual(commandsRun.some(c => c.args.includes('create')), false, 'Should not have run kind create');
    });

    it('should create cluster when not existing and report progress', async () => {
      setupConfig('kind: Cluster\nname: new-cluster\n');
      const commandsRun = [];
      const progressMessages = [];
      const fakeRunner = async (cmd, args) => {
        commandsRun.push({ cmd, args });
        if (cmd === 'kind' && args[0] === 'get' && args[1] === 'clusters') {
          return { code: 0, stdout: 'existing-other-cluster', stderr: '' };
        }
        if (cmd === 'kind' && args[0] === 'create') {
          return { code: 0, stdout: 'Cluster created successfully', stderr: '' };
        }
        return { code: 0, stdout: '', stderr: '' };
      };

      const res = await createKindCluster(tempDir, (msg) => progressMessages.push(msg), fakeRunner);
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.message, "Cluster 'new-cluster' created successfully.");
      assert.ok(progressMessages.length > 0);
      assert.ok(progressMessages[0].includes("Creating Kind cluster 'new-cluster'"));

      const createCall = commandsRun.find(c => c.args.includes('create'));
      assert.ok(createCall);
      assert.strictEqual(createCall.cmd, 'kind');
      assert.deepStrictEqual(createCall.args.slice(0, 3), ['create', 'cluster', '--config']);
    });

    it('should throw error when kind create cluster fails', async () => {
      setupConfig('kind: Cluster\nname: failing-cluster\n');
      const fakeRunner = async (cmd, args) => {
        if (cmd === 'kind' && args[0] === 'get') {
          return { code: 0, stdout: '', stderr: '' };
        }
        if (cmd === 'kind' && args[0] === 'create') {
          return { code: 1, stdout: '', stderr: 'ERROR: failed to create cluster: port 80 already allocated' };
        }
        return { code: 0, stdout: '', stderr: '' };
      };

      await assert.rejects(
        async () => {
          await createKindCluster(tempDir, () => {}, fakeRunner);
        },
        /port 80 already allocated/
      );
    });
  });

  describe('deleteKindCluster()', () => {
    it('should invoke kind delete cluster with cluster name and report progress', async () => {
      setupConfig('kind: Cluster\nname: cluster-to-delete\n');
      const commandsRun = [];
      const progressMessages = [];
      const fakeRunner = async (cmd, args) => {
        commandsRun.push({ cmd, args });
        return { code: 0, stdout: 'Deleted clusters: ["cluster-to-delete"]', stderr: '' };
      };

      const res = await deleteKindCluster(tempDir, (msg) => progressMessages.push(msg), fakeRunner);
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.message, "Cluster 'cluster-to-delete' deleted.");
      assert.ok(progressMessages.some(m => m.includes("Deleting Kind cluster 'cluster-to-delete'")));

      const deleteCall = commandsRun.find(c => c.args.includes('delete'));
      assert.ok(deleteCall);
      assert.deepStrictEqual(deleteCall.args, ['delete', 'cluster', '--name', 'cluster-to-delete']);
    });
  });
});
