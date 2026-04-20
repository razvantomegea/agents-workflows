import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeGeneratedFiles } from '../../src/installer/write-files.js';
import type { GeneratedFile } from '../../src/generator/types.js';

describe('writeGeneratedFiles', () => {
  it('skips replacing an existing Markdown file when confirmation is denied', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'agents-write-'));
    const files: GeneratedFile[] = [{ path: 'AGENTS.md', content: 'generated' }];

    try {
      await writeFile(join(projectRoot, 'AGENTS.md'), 'custom', 'utf-8');
      const result = await writeGeneratedFiles(projectRoot, files, {
        confirmMarkdownOverwrite: true,
        confirmOverwrite: async (_path: string): Promise<boolean> => false,
      });

      await expect(readFile(join(projectRoot, 'AGENTS.md'), 'utf-8')).resolves.toBe('custom');
      expect(result.writtenPaths).toEqual([]);
      expect(result.skippedPaths).toEqual(['AGENTS.md']);
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });

  it('replaces an existing Markdown file when confirmation is accepted', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'agents-write-'));
    const files: GeneratedFile[] = [{ path: 'CLAUDE.md', content: 'generated' }];

    try {
      await writeFile(join(projectRoot, 'CLAUDE.md'), 'custom', 'utf-8');
      const result = await writeGeneratedFiles(projectRoot, files, {
        confirmMarkdownOverwrite: true,
        confirmOverwrite: async (_path: string): Promise<boolean> => true,
      });

      await expect(readFile(join(projectRoot, 'CLAUDE.md'), 'utf-8')).resolves.toBe('generated');
      expect(result.writtenPaths).toEqual(['CLAUDE.md']);
      expect(result.skippedPaths).toEqual([]);
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });

  it('writes non-Markdown files without a replacement prompt', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'agents-write-'));
    const files: GeneratedFile[] = [{ path: '.agents-workflows.json', content: '{"ok":true}' }];

    try {
      await writeFile(join(projectRoot, '.agents-workflows.json'), '{"ok":false}', 'utf-8');
      const result = await writeGeneratedFiles(projectRoot, files, {
        confirmMarkdownOverwrite: true,
        confirmOverwrite: async (path: string): Promise<boolean> => {
          throw new Error(`Unexpected prompt for ${path}`);
        },
      });

      await expect(readFile(join(projectRoot, '.agents-workflows.json'), 'utf-8'))
        .resolves.toBe('{"ok":true}');
      expect(result.writtenPaths).toEqual(['.agents-workflows.json']);
      expect(result.skippedPaths).toEqual([]);
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });

  it('leaves unchanged existing Markdown files untouched without prompting', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'agents-write-'));
    const files: GeneratedFile[] = [{ path: 'README.md', content: 'same' }];

    try {
      await writeFile(join(projectRoot, 'README.md'), 'same', 'utf-8');
      const result = await writeGeneratedFiles(projectRoot, files, {
        confirmMarkdownOverwrite: true,
        confirmOverwrite: async (path: string): Promise<boolean> => {
          throw new Error(`Unexpected prompt for ${path}`);
        },
      });

      await expect(readFile(join(projectRoot, 'README.md'), 'utf-8')).resolves.toBe('same');
      expect(result.writtenPaths).toEqual([]);
      expect(result.skippedPaths).toEqual(['README.md']);
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });
});
