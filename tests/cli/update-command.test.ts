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

async function writeManifest(args: {
  projectRoot: string;
  config: AgentsWorkflowsManifest['config'];
  files: GeneratedFile[];
}): Promise<AgentsWorkflowsManifest> {
  const manifest: AgentsWorkflowsManifest = {
    version: '0.1.0',
    generatedAt: '2026-01-01T00:00:00.000Z',
    stackConfigHash: hashConfig(JSON.stringify(args.config)),
    config: args.config,
    files: args.files.map((file: GeneratedFile) => file.path),
  };
  await writeFile(
    join(args.projectRoot, '.agents-workflows.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8',
  );
  return manifest;
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

  it('updates the manifest when non-interactive update defaults to merge and only mergeable files changed', async () => {
    const config = makeStackConfig({
      targets: {
        claudeCode: true,
        codexCli: false,
        cursor: false,
        copilot: false,
        windsurf: false,
      },
      security: {
        nonInteractiveMode: true,
        runsIn: 'docker',
      },
    });
    const files = await generateAll(config);
    await writeGeneratedProjectFiles(projectRoot, files);
    const agentsPath = join(projectRoot, 'AGENTS.md');
    const originalAgentsContent = await readFile(agentsPath, 'utf-8');
    await writeFile(agentsPath, `${originalAgentsContent}\n## Local note\n`, 'utf-8');

    const manifest = await writeManifest({
      projectRoot,
      config,
      files,
    });

    await updateCommand(projectRoot, { nonInteractive: true, isolation: 'docker' });

    const updatedManifestJson = await readFile(join(projectRoot, '.agents-workflows.json'), 'utf-8');
    const updatedManifest = JSON.parse(updatedManifestJson) as AgentsWorkflowsManifest;
    const updatedAgentsContent = await readFile(agentsPath, 'utf-8');

    expect(updatedManifest.generatedAt).not.toBe(manifest.generatedAt);
    expect(updatedManifest.config.security.nonInteractiveMode).toBe(true);
    expect(updatedManifest.config.security.runsIn).toBe('docker');
    expect(updatedManifest.stackConfigHash).toBe(hashConfig(JSON.stringify(updatedManifest.config)));
    expect(updatedAgentsContent).toContain('## Local note');
    const expectedUpdatedAgentsContent = (await generateAll(updatedManifest.config))
      .find((file: GeneratedFile) => file.path === 'AGENTS.md')
      ?.content;
    expect(expectedUpdatedAgentsContent).toBeDefined();
    expect(updatedAgentsContent).toBe(`${expectedUpdatedAgentsContent}\n## Local note\n`);
  });

  it('rejects before writing when non-interactive update defaults to merge and a changed file has no merge function', async () => {
    const config = makeStackConfig({
      security: {
        nonInteractiveMode: true,
        runsIn: 'docker',
      },
    });
    const files = await generateAll(config);
    await writeGeneratedProjectFiles(projectRoot, files);
    const rulesPath = join(projectRoot, '.codex/rules/project.rules');
    const originalRulesContent = await readFile(rulesPath, 'utf-8');
    const editedRulesContent = `${originalRulesContent}\nlocal edit\n`;
    await writeFile(rulesPath, editedRulesContent, 'utf-8');

    const manifest = await writeManifest({
      projectRoot,
      config,
      files,
    });
    const manifestJson = JSON.stringify(manifest, null, 2);

    await expect(
      updateCommand(projectRoot, { nonInteractive: true, isolation: 'docker' }),
    ).rejects.toThrow(/--merge-strategy=overwrite or --yes/);

    await expect(readFile(rulesPath, 'utf-8')).resolves.toBe(editedRulesContent);
    await expect(readFile(join(projectRoot, '.agents-workflows.json'), 'utf-8')).resolves.toBe(manifestJson);
  });

  it('continues to skip unsupported files when merge strategy was explicitly set to merge', async () => {
    const config = makeStackConfig({
      security: {
        nonInteractiveMode: true,
        runsIn: 'docker',
      },
    });
    const files = await generateAll(config);
    await writeGeneratedProjectFiles(projectRoot, files);
    const rulesPath = join(projectRoot, '.codex/rules/project.rules');
    const originalRulesContent = await readFile(rulesPath, 'utf-8');
    const editedRulesContent = `${originalRulesContent}\nlocal edit\n`;
    await writeFile(rulesPath, editedRulesContent, 'utf-8');

    const manifest = await writeManifest({
      projectRoot,
      config,
      files,
    });

    await updateCommand(projectRoot, {
      nonInteractive: true,
      isolation: 'docker',
      mergeStrategy: 'merge',
    });

    const updatedManifestJson = await readFile(join(projectRoot, '.agents-workflows.json'), 'utf-8');
    const updatedManifest = JSON.parse(updatedManifestJson) as AgentsWorkflowsManifest;

    expect(updatedManifest.generatedAt).not.toBe(manifest.generatedAt);
    expect(updatedManifest.stackConfigHash).toBe(hashConfig(JSON.stringify(updatedManifest.config)));
    await expect(readFile(rulesPath, 'utf-8')).resolves.toBe(editedRulesContent);
  });
});
