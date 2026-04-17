import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
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
});
