import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { generateAll } from '../../src/generator/index.js';
import { hashConfig } from '../../src/cli/hash-config.js';
import { logger } from '../../src/utils/index.js';
import type { AgentsWorkflowsManifest } from '../../src/schema/manifest.js';
import type { GeneratedFile } from '../../src/generator/types.js';
import { makeStackConfig } from '../generator/fixtures.js';

jest.unstable_mockModule('@inquirer/prompts', () => ({
  confirm: jest.fn<() => Promise<boolean>>(),
  select: jest.fn<() => Promise<string>>(),
  checkbox: jest.fn<() => Promise<string[]>>(),
  input: jest.fn<() => Promise<string>>(),
}));

const { updateCommand } = await import('../../src/cli/update-command.js');

async function writeGeneratedProjectFiles(projectRoot: string, files: GeneratedFile[]): Promise<void> {
  for (const file of files) {
    const destination = join(projectRoot, file.path);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, file.content, 'utf-8');
  }
}

describe('updateCommand', () => {
  let projectRoot: string;
  let loggerSpies: Array<ReturnType<typeof jest.spyOn>>;

  beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), 'agents-workflows-update-'));
    loggerSpies = [
      jest.spyOn(logger, 'heading').mockImplementation(() => undefined),
      jest.spyOn(logger, 'info').mockImplementation(() => undefined),
      jest.spyOn(logger, 'success').mockImplementation(() => undefined),
      jest.spyOn(logger, 'warn').mockImplementation(() => undefined),
      jest.spyOn(logger, 'error').mockImplementation(() => undefined),
      jest.spyOn(logger, 'blank').mockImplementation(() => undefined),
      jest.spyOn(logger, 'file').mockImplementation(() => undefined),
    ];
  });

  afterEach(async () => {
    for (const loggerSpy of loggerSpies) {
      loggerSpy.mockRestore();
    }
    await rm(projectRoot, { recursive: true, force: true });
  });

  it('updates the manifest when non-interactive update defaults to merge', async () => {
    const config = makeStackConfig();
    const files = await generateAll(config);
    await writeGeneratedProjectFiles(projectRoot, files);
    const agentPath = join(projectRoot, '.claude/agents/architect.md');
    const originalAgentContent = await readFile(agentPath, 'utf-8');
    await writeFile(agentPath, `${originalAgentContent}\nlocal edit\n`, 'utf-8');

    const manifest: AgentsWorkflowsManifest = {
      version: '0.1.0',
      generatedAt: '2026-01-01T00:00:00.000Z',
      stackConfigHash: hashConfig(JSON.stringify(config)),
      config,
      files: files.map((file: GeneratedFile) => file.path),
    };
    await writeFile(
      join(projectRoot, '.agents-workflows.json'),
      JSON.stringify(manifest, null, 2),
      'utf-8',
    );

    await updateCommand(projectRoot, { nonInteractive: true, isolation: 'docker' });

    const updatedManifestJson = await readFile(join(projectRoot, '.agents-workflows.json'), 'utf-8');
    const updatedManifest = JSON.parse(updatedManifestJson) as AgentsWorkflowsManifest;

    expect(updatedManifest.generatedAt).not.toBe(manifest.generatedAt);
    expect(updatedManifest.config.security.nonInteractiveMode).toBe(true);
    expect(updatedManifest.config.security.runsIn).toBe('docker');
    expect(updatedManifest.stackConfigHash).toBe(hashConfig(JSON.stringify(updatedManifest.config)));
  });
});
