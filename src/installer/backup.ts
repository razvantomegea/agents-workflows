import { copyFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileExists } from '../utils/file-exists.js';
import type { GeneratedFile } from '../generator/types.js';
import { logger } from '../utils/logger.js';

const BACKUP_DIR = '.agents-workflows-backup';

export async function backupExistingFiles(
  projectRoot: string,
  files: GeneratedFile[],
): Promise<number> {
  let count = 0;

  for (const file of files) {
    const srcPath = join(projectRoot, file.path);
    if (await fileExists(srcPath)) {
      const backupPath = join(projectRoot, BACKUP_DIR, file.path);
      await mkdir(dirname(backupPath), { recursive: true });
      await copyFile(srcPath, backupPath);
      count++;
    }
  }

  if (count > 0) {
    logger.info(`Backed up ${count} existing file(s) to ${BACKUP_DIR}/`);
  }

  return count;
}
