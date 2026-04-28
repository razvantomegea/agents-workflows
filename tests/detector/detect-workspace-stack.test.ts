/**
 * Tests for detectWorkspaceStack — verifies that per-workspace language, packageManager,
 * and commands are correctly resolved from a real workspace directory.
 *
 * Strategy: create minimal temp directories that trigger language/package-manager detection.
 * No mocks — the unit under test IS detectWorkspaceStack and all its sub-detectors.
 */
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { detectWorkspaceStack } from '../../src/detector/detect-workspace-stack.js';
import { makeRoot } from './test-helpers.js';

describe('detectWorkspaceStack', () => {
  const created: string[] = [];

  afterEach(async () => {
    while (created.length) {
      const path = created.pop();
      if (path) await rm(path, { recursive: true, force: true });
    }
  });

  it('returns language typescript and pnpm packageManager for a TS workspace with pnpm-lock.yaml', async () => {
    // Arrange
    const root = await makeRoot({ prefix: 'aw-ws-ts-', created });
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({ name: 'web', devDependencies: { typescript: '^5.0.0' } }),
      'utf-8',
    );
    await writeFile(join(root, 'pnpm-lock.yaml'), '', 'utf-8');

    // Act
    const result = await detectWorkspaceStack({ workspacePath: root, relativePath: 'apps/web' });

    // Assert
    expect(result.path).toBe('apps/web');
    expect(result.language).toBe('typescript');
    expect(result.packageManager).toBe('pnpm');
    expect(result.commands.test).toBeTruthy();
  });

  it('returns language typescript and npm packageManager for a TS workspace with package-lock.json', async () => {
    // Arrange
    const root = await makeRoot({ prefix: 'aw-ws-npm-', created });
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({ name: 'api', devDependencies: { typescript: '^5.0.0' } }),
      'utf-8',
    );
    await writeFile(join(root, 'package-lock.json'), '{}', 'utf-8');

    // Act
    const result = await detectWorkspaceStack({ workspacePath: root, relativePath: 'apps/api' });

    // Assert
    expect(result.language).toBe('typescript');
    expect(result.packageManager).toBe('npm');
  });

  it('returns language rust and cargo test command for a Rust workspace', async () => {
    // Arrange — Cargo.toml triggers rust language detection; no package.json means
    // packageManager = null, so LANGUAGE_DEFAULT_COMMANDS['rust'] is used.
    const root = await makeRoot({ prefix: 'aw-ws-rust-', created });
    await mkdir(join(root, 'src'));
    await writeFile(join(root, 'Cargo.toml'), '[package]\nname = "core"\nversion = "0.1.0"\n', 'utf-8');
    await writeFile(join(root, 'src', 'lib.rs'), '', 'utf-8');

    // Act
    const result = await detectWorkspaceStack({ workspacePath: root, relativePath: 'crates/core' });

    // Assert
    expect(result.path).toBe('crates/core');
    expect(result.language).toBe('rust');
    expect(result.commands.test).toBe('cargo test');
    expect(result.commands.build).toBe('cargo build');
  });

  it('returns language python and pytest test command for a Python workspace', async () => {
    // Arrange — pyproject.toml triggers python language detection; no package.json means
    // packageManager = null, so LANGUAGE_DEFAULT_COMMANDS['python'] is used.
    const root = await makeRoot({ prefix: 'aw-ws-py-', created });
    await writeFile(join(root, 'pyproject.toml'), '[project]\nname = "svc"\nversion = "0.1.0"\n', 'utf-8');

    // Act
    const result = await detectWorkspaceStack({ workspacePath: root, relativePath: 'services/api' });

    // Assert
    expect(result.path).toBe('services/api');
    expect(result.language).toBe('python');
    expect(result.commands.test).toBe('pytest');
  });
});
