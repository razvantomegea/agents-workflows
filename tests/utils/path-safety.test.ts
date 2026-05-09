import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, it, expect } from '@jest/globals';
import { assertPathInsideProject } from '../../src/utils/path-safety.js';

describe('assertPathInsideProject', () => {
  async function createProjectRoot(): Promise<string> {
    return mkdtemp(join(tmpdir(), 'path-safety-project-'));
  }

  async function createOutsideRoot(): Promise<string> {
    return mkdtemp(join(tmpdir(), 'path-safety-outside-'));
  }

  it('allows a new path under the project root', async () => {
    const projectRoot = await createProjectRoot();
    const targetPath = join(projectRoot, '.claude', 'settings.json');

    try {
      await expect(
        assertPathInsideProject({
          projectRoot,
          targetPath,
          displayPath: '.claude/settings.json',
          operation: 'write',
        }),
      ).resolves.toBeUndefined();
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });

  it('rejects a first-level directory symlink outside the project root', async () => {
    const projectRoot = await createProjectRoot();
    const outsideRoot = await createOutsideRoot();
    const targetPath = join(projectRoot, '.claude', 'settings.json');

    try {
      await symlink(outsideRoot, join(projectRoot, '.claude'), 'dir');

      await expect(
        assertPathInsideProject({
          projectRoot,
          targetPath,
          displayPath: '.claude/settings.json',
          operation: 'write',
        }),
      ).rejects.toThrow(/outside project root/);
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
      await rm(outsideRoot, { recursive: true, force: true });
    }
  });

  it('rejects an intermediate directory symlink outside the project root', async () => {
    const projectRoot = await createProjectRoot();
    const outsideRoot = await createOutsideRoot();
    const symlinkPath = join(projectRoot, '.claude', 'nested');
    const targetPath = join(symlinkPath, 'settings.json');

    try {
      await mkdir(dirname(symlinkPath), { recursive: true });
      await symlink(outsideRoot, symlinkPath, 'dir');

      await expect(
        assertPathInsideProject({
          projectRoot,
          targetPath,
          displayPath: '.claude/nested/settings.json',
          operation: 'write',
        }),
      ).rejects.toThrow(/outside project root/);
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
      await rm(outsideRoot, { recursive: true, force: true });
    }
  });

  it('rejects a file symlink outside the project root', async () => {
    const projectRoot = await createProjectRoot();
    const outsideRoot = await createOutsideRoot();
    const outsideFile = join(outsideRoot, 'settings.json');
    const targetPath = join(projectRoot, '.claude', 'settings.json');

    try {
      await mkdir(dirname(targetPath), { recursive: true });
      await writeFile(outsideFile, '{}', 'utf-8');
      await symlink(outsideFile, targetPath, 'file');

      await expect(
        assertPathInsideProject({
          projectRoot,
          targetPath,
          displayPath: '.claude/settings.json',
          operation: 'write',
        }),
      ).rejects.toThrow(/outside project root/);
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
      await rm(outsideRoot, { recursive: true, force: true });
    }
  });

  it('fails clearly when a path component is not a directory', async () => {
    const projectRoot = await createProjectRoot();
    const regularFile = join(projectRoot, 'regular-file');

    try {
      await writeFile(regularFile, 'content', 'utf-8');

      await expect(
        assertPathInsideProject({
          projectRoot,
          targetPath: join(regularFile, 'child.txt'),
          displayPath: 'regular-file/child.txt',
          operation: 'write',
        }),
      ).rejects.toThrow(/not a directory/);
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });
});
