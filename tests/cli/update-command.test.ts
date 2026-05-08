import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { updateCommand } from '../../src/cli/update-command.js';
import type { AgentsWorkflowsManifest } from '../../src/schema/manifest.js';
import { createTempDir } from '../generator/write-file-helpers.js';
import { makeStackConfig } from '../generator/fixtures.js';

describe('updateCommand', () => {
  let tmpDir: string | null = null;

  afterEach(async () => {
    if (tmpDir !== null) {
      await rm(tmpDir, { recursive: true, force: true });
      tmpDir = null;
    }
  });

  it('persists the manifest during the default non-interactive merge update', async () => {
    tmpDir = await createTempDir();
    const config = makeStackConfig({
      targets: { claudeCode: true, codexCli: false, cursor: false, copilot: false, windsurf: false },
    });
    const manifestPath = join(tmpDir, '.agents-workflows.json');
    const existingManifest: AgentsWorkflowsManifest = {
      version: '0.1.0',
      generatedAt: '2026-01-01T00:00:00.000Z',
      stackConfigHash: 'stale',
      config,
      files: [],
    };
    await writeFile(manifestPath, JSON.stringify(existingManifest, null, 2), 'utf-8');

    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(
      (code?: string | number | null | undefined): never => {
        throw new Error(`process.exit(${String(code)})`);
      },
    );

    try {
      await updateCommand(tmpDir, { nonInteractive: true, isolation: 'docker' });
    } finally {
      exitSpy.mockRestore();
    }

    const updatedManifest = JSON.parse(
      await readFile(manifestPath, 'utf-8'),
    ) as AgentsWorkflowsManifest;
    expect(updatedManifest.files).toContain('AGENTS_REFINE.md');
    expect(updatedManifest.config.security.nonInteractiveMode).toBe(true);
    expect(updatedManifest.generatedAt).not.toBe(existingManifest.generatedAt);
  });
});
