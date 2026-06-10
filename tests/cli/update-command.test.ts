import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { generateAll } from '../../src/generator/index.js';
import { hashConfig } from '../../src/cli/hash-config.js';
import { logger, fileExists } from '../../src/utils/index.js';
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

  it('does not delete stale files when noPrompt is true', async () => {
    // Arrange: write all generated files, create a diff (modify architect.md),
    // place the stale react-ts-senior.md with custom content, and write the manifest.
    const config = makeStackConfig();
    const files = await generateAll(config);
    await writeGeneratedProjectFiles(projectRoot, files);

    const agentPath = join(projectRoot, '.claude/agents/architect.md');
    const originalAgentContent = await readFile(agentPath, 'utf-8');
    await writeFile(agentPath, `${originalAgentContent}\nlocal edit\n`, 'utf-8');

    const staleFilePath = join(projectRoot, '.claude/agents/react-ts-senior.md');
    await writeFile(staleFilePath, 'custom user-edited content', 'utf-8');

    const manifest: AgentsWorkflowsManifest = {
      version: '0.1.0',
      generatedAt: '2026-01-01T00:00:00.000Z',
      stackConfigHash: hashConfig(JSON.stringify(config)),
      config,
      files: files.map((generatedFile: GeneratedFile) => generatedFile.path),
    };
    await writeFile(
      join(projectRoot, '.agents-workflows.json'),
      JSON.stringify(manifest, null, 2),
      'utf-8',
    );

    // Act: run update with --no-prompt.
    await updateCommand(projectRoot, { noPrompt: true });

    // Assert: stale file must remain at its original path with content intact.
    const staleContent = await readFile(staleFilePath, 'utf-8');
    expect(staleContent).toBe('custom user-edited content');
  });

  it('removes stale files when yes is true', async () => {
    // Arrange: same setup as the noPrompt test, but without the noPrompt flag.
    const config = makeStackConfig();
    const files = await generateAll(config);
    await writeGeneratedProjectFiles(projectRoot, files);

    const agentPath = join(projectRoot, '.claude/agents/architect.md');
    const originalAgentContent = await readFile(agentPath, 'utf-8');
    await writeFile(agentPath, `${originalAgentContent}\nlocal edit\n`, 'utf-8');

    const staleFilePath = join(projectRoot, '.claude/agents/react-ts-senior.md');
    await writeFile(staleFilePath, 'custom user-edited content', 'utf-8');

    const manifest: AgentsWorkflowsManifest = {
      version: '0.1.0',
      generatedAt: '2026-01-01T00:00:00.000Z',
      stackConfigHash: hashConfig(JSON.stringify(config)),
      config,
      files: files.map((generatedFile: GeneratedFile) => generatedFile.path),
    };
    await writeFile(
      join(projectRoot, '.agents-workflows.json'),
      JSON.stringify(manifest, null, 2),
      'utf-8',
    );

    // Act: run update with --yes; stale-file deletion is auto-confirmed.
    await updateCommand(projectRoot, { yes: true });

    // Assert: stale file must have been moved to backup (no longer at original path).
    expect(await fileExists(staleFilePath)).toBe(false);
  });

  it('does not delete stale files when nonInteractive + docker + mergeStrategy=keep', async () => {
    // Regression: auto-deleting stale files contradicts an explicit keep strategy.
    // Arrange: write generated files, create a diff, place stale react-ts-senior.md
    // with custom content, and write the manifest.
    const config = makeStackConfig();
    const files = await generateAll(config);
    await writeGeneratedProjectFiles(projectRoot, files);

    const agentPath = join(projectRoot, '.claude/agents/architect.md');
    const originalAgentContent = await readFile(agentPath, 'utf-8');
    await writeFile(agentPath, `${originalAgentContent}\nlocal edit\n`, 'utf-8');

    const staleFilePath = join(projectRoot, '.claude/agents/react-ts-senior.md');
    const staleContent = 'custom user-edited content preserved by keep strategy';
    await writeFile(staleFilePath, staleContent, 'utf-8');

    const manifest: AgentsWorkflowsManifest = {
      version: '0.1.0',
      generatedAt: '2026-01-01T00:00:00.000Z',
      stackConfigHash: hashConfig(JSON.stringify(config)),
      config,
      files: files.map((generatedFile: GeneratedFile) => generatedFile.path),
    };
    await writeFile(
      join(projectRoot, '.agents-workflows.json'),
      JSON.stringify(manifest, null, 2),
      'utf-8',
    );

    // Act: run with the exact combination that previously violated the keep contract.
    await updateCommand(projectRoot, {
      nonInteractive: true,
      isolation: 'docker',
      mergeStrategy: 'keep',
    });

    // Assert: stale file must remain untouched.
    expect(await fileExists(staleFilePath)).toBe(true);
    const preserved = await readFile(staleFilePath, 'utf-8');
    expect(preserved).toBe(staleContent);
  });
});
