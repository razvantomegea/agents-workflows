import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from '@jest/globals';
import { backupExistingFiles, restoreBackupFiles } from '../../src/installer/backup.js';
import type { GeneratedFile } from '../../src/generator/types.js';

describe('backupExistingFiles and restoreBackupFiles', () => {
  it('restores overwritten files and removes generated new files', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'agents-backup-'));
    const files: GeneratedFile[] = [
      { path: 'existing.txt', content: 'new' },
      { path: 'nested/new.txt', content: 'created' },
    ];

    try {
      await writeFile(join(projectRoot, 'existing.txt'), 'original', 'utf-8');
      const backup = await backupExistingFiles(projectRoot, files);

      for (const file of files) {
        const target = join(projectRoot, file.path);
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, file.content, 'utf-8');
      }

      await restoreBackupFiles(projectRoot, backup);

      await expect(readFile(join(projectRoot, 'existing.txt'), 'utf-8')).resolves.toBe('original');
      await expect(readFile(join(projectRoot, 'nested/new.txt'), 'utf-8')).rejects.toThrow();
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });

  it('refuses to back up paths that resolve outside the project', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'agents-backup-'));
    const outsideRoot = await mkdtemp(join(tmpdir(), 'agents-backup-outside-'));
    const files: GeneratedFile[] = [{ path: '.claude/settings.json', content: '{}' }];

    try {
      await symlink(outsideRoot, join(projectRoot, '.claude'), 'dir');

      await expect(backupExistingFiles(projectRoot, files)).rejects.toThrow(/outside project root/);
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
      await rm(outsideRoot, { recursive: true, force: true });
    }
  });

  it('refuses to restore by removing a symlink-escaped new path', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'agents-backup-'));
    const outsideRoot = await mkdtemp(join(tmpdir(), 'agents-backup-outside-'));
    const outsideFile = join(outsideRoot, 'settings.json');

    try {
      await writeFile(outsideFile, 'external', 'utf-8');
      await symlink(outsideRoot, join(projectRoot, '.claude'), 'dir');

      await expect(
        restoreBackupFiles(projectRoot, {
          backedUpPaths: [],
          newPaths: ['.claude/settings.json'],
        }),
      ).rejects.toThrow(/outside project root/);
      await expect(readFile(outsideFile, 'utf-8')).resolves.toBe('external');
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
      await rm(outsideRoot, { recursive: true, force: true });
    }
  });

  it('refuses to restore to a symlink-escaped destination', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'agents-backup-'));
    const outsideRoot = await mkdtemp(join(tmpdir(), 'agents-backup-outside-'));
    const backupFile = join(projectRoot, '.agents-workflows-backup', '.claude', 'settings.json');
    const outsideFile = join(outsideRoot, 'settings.json');

    try {
      await mkdir(dirname(backupFile), { recursive: true });
      await writeFile(backupFile, 'backup', 'utf-8');
      await writeFile(outsideFile, 'external', 'utf-8');
      await symlink(outsideRoot, join(projectRoot, '.claude'), 'dir');

      await expect(
        restoreBackupFiles(projectRoot, {
          backedUpPaths: ['.claude/settings.json'],
          newPaths: [],
        }),
      ).rejects.toThrow(/outside project root/);
      await expect(readFile(outsideFile, 'utf-8')).resolves.toBe('external');
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
      await rm(outsideRoot, { recursive: true, force: true });
    }
  });

  it('refuses to restore from a symlink-escaped backup directory', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'agents-backup-'));
    const outsideRoot = await mkdtemp(join(tmpdir(), 'agents-backup-outside-'));
    const outsideFile = join(outsideRoot, '.claude', 'settings.json');

    try {
      await mkdir(dirname(outsideFile), { recursive: true });
      await writeFile(outsideFile, 'outside-backup', 'utf-8');
      await symlink(outsideRoot, join(projectRoot, '.agents-workflows-backup'), 'dir');

      await expect(
        restoreBackupFiles(projectRoot, {
          backedUpPaths: ['.claude/settings.json'],
          newPaths: [],
        }),
      ).rejects.toThrow(/outside project root/);
      await expect(readFile(outsideFile, 'utf-8')).resolves.toBe('outside-backup');
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
      await rm(outsideRoot, { recursive: true, force: true });
    }
  });
});
