import { describe, it } from 'node:test';
import assert from 'node:assert';
import os from 'node:os';
import { runCommand } from '../src/executor.js';

describe('Executor Module', () => {
  it('should execute node -v successfully', async () => {
    const result = await runCommand('node', ['-v']);
    assert.strictEqual(result.code, 0);
    assert.match(result.stdout, /^v\d+\.\d+\.\d+/);
  });

  it('should pass stdin to child process and capture output', async () => {
    const inputData = 'hello from stdin';
    const result = await runCommand('node', ['-e', 'process.stdin.pipe(process.stdout)'], { input: inputData });
    assert.strictEqual(result.code, 0);
    assert.strictEqual(result.stdout, inputData);
  });

  it('should capture failure return code for invalid command arguments', async () => {
    const result = await runCommand('node', ['-e', 'process.exit(42)']);
    assert.strictEqual(result.code, 42);
  });

  it('should capture stderr output when command writes to stderr', async () => {
    const result = await runCommand('node', ['-e', 'console.error("error occurred"); process.exit(1);']);
    assert.strictEqual(result.code, 1);
    assert.strictEqual(result.stderr, 'error occurred');
  });

  it('should accept custom environment variables via options.env', async () => {
    const result = await runCommand('node', ['-e', 'console.log(process.env.TEST_CUSTOM_VAR)'], {
      env: { ...process.env, TEST_CUSTOM_VAR: 'antigravity-qa' }
    });
    assert.strictEqual(result.code, 0);
    assert.strictEqual(result.stdout, 'antigravity-qa');
  });

  it('should accept custom cwd via options.cwd', async () => {
    const tmpDir = os.tmpdir();
    const result = await runCommand('node', ['-e', 'console.log(process.cwd())'], {
      cwd: tmpDir
    });
    assert.strictEqual(result.code, 0);
    // Compare lowercased on windows for drive letter case insensitivity
    assert.strictEqual(result.stdout.toLowerCase(), tmpDir.toLowerCase());
  });

  it('should reject when an invalid executable is called without shell', async () => {
    await assert.rejects(
      async () => {
        await runCommand('non_existent_executable_binary_never_exists_12345', [], { shell: false });
      },
      (err) => {
        assert.ok(err instanceof Error);
        return true;
      }
    );
  });
});
