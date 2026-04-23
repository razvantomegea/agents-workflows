import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { writeGeneratedFiles } from '../../src/installer/write-files.js';
import { resetWriteSession } from '../../src/generator/write-file.js';
import { makePrompt, restorePrompt } from '../generator/write-file-helpers.js';
import type { GeneratedFile } from '../../src/generator/types.js';

describe('writeGeneratedFiles', () => {
  let projectRoot: string;

  beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), 'agents-write-'));
    resetWriteSession();
  });

  afterEach(async () => {
    restorePrompt();
    await rm(projectRoot, { recursive: true, force: true });
  });

  it('skips replacing an existing Markdown file when prompt returns n', async () => {
    const prompt = makePrompt('n');
    const files: GeneratedFile[] = [{ path: 'AGENTS.md', content: 'generated' }];
    await writeFile(join(projectRoot, 'AGENTS.md'), 'custom', 'utf-8');

    const result = await writeGeneratedFiles(projectRoot, files);

    await expect(readFile(join(projectRoot, 'AGENTS.md'), 'utf-8')).resolves.toBe('custom');
    expect(result.writtenPaths).toEqual([]);
    expect(result.skippedPaths).toEqual(['AGENTS.md']);
    expect(prompt).toHaveBeenCalledTimes(1);
  });

  it('replaces an existing Markdown file when prompt returns y', async () => {
    const prompt = makePrompt('y');
    const files: GeneratedFile[] = [{ path: 'CLAUDE.md', content: 'generated' }];
    await writeFile(join(projectRoot, 'CLAUDE.md'), 'custom', 'utf-8');

    const result = await writeGeneratedFiles(projectRoot, files);

    await expect(readFile(join(projectRoot, 'CLAUDE.md'), 'utf-8')).resolves.toBe('generated');
    expect(result.writtenPaths).toEqual(['CLAUDE.md']);
    expect(result.skippedPaths).toEqual([]);
    expect(prompt).toHaveBeenCalledTimes(1);
  });

  it('writes a non-existent file without prompting', async () => {
    const prompt = makePrompt('n');
    const files: GeneratedFile[] = [{ path: '.agents-workflows.json', content: '{"ok":true}' }];

    const result = await writeGeneratedFiles(projectRoot, files);

    await expect(readFile(join(projectRoot, '.agents-workflows.json'), 'utf-8'))
      .resolves.toBe('{"ok":true}');
    expect(result.writtenPaths).toEqual(['.agents-workflows.json']);
    expect(result.skippedPaths).toEqual([]);
    expect(prompt).not.toHaveBeenCalled();
  });

  it('leaves unchanged existing files untouched without prompting', async () => {
    const prompt = makePrompt('n');
    const files: GeneratedFile[] = [{ path: 'README.md', content: 'same' }];
    await writeFile(join(projectRoot, 'README.md'), 'same', 'utf-8');

    const result = await writeGeneratedFiles(projectRoot, files);

    await expect(readFile(join(projectRoot, 'README.md'), 'utf-8')).resolves.toBe('same');
    expect(result.writtenPaths).toEqual([]);
    expect(result.skippedPaths).toEqual([]);
    expect(prompt).not.toHaveBeenCalled();
  });

  it('existing non-Markdown file with different content triggers prompt', async () => {
    const prompt = makePrompt('y');
    const files: GeneratedFile[] = [{ path: '.agents-workflows.json', content: '{"ok":true}' }];
    await writeFile(join(projectRoot, '.agents-workflows.json'), '{"ok":false}', 'utf-8');

    const result = await writeGeneratedFiles(projectRoot, files);

    await expect(readFile(join(projectRoot, '.agents-workflows.json'), 'utf-8'))
      .resolves.toBe('{"ok":true}');
    expect(result.writtenPaths).toEqual(['.agents-workflows.json']);
    expect(prompt).toHaveBeenCalledTimes(1);
  });
});
