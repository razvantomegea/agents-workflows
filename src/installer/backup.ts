import { copyFile, mkdir, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileExists } from '../utils/file-exists.js';
import type { GeneratedFile } from '../generator/types.js';
import { logger } from '../utils/logger.js';

const BACKUP_DIR = '.agents-workflows-backup';

export interface BackupState {
  backedUpPaths: string[];
  newPaths: string[];
}

export async function backupExistingFiles(
  projectRoot: string,
  files: GeneratedFile[],
): Promise<BackupState> {
  const backedUpPaths: string[] = [];
  const newPaths: string[] = [];

  for (const file of files) {
    const srcPath = join(projectRoot, file.path);
    if (await fileExists(srcPath)) {
      const backupPath = join(projectRoot, BACKUP_DIR, file.path);
      await mkdir(dirname(backupPath), { recursive: true });
      await copyFile(srcPath, backupPath);
      backedUpPaths.push(file.path);
    } else {
      newPaths.push(file.path);
    }
  }

  if (backedUpPaths.length > 0) {
    logger.info(`Backed up ${backedUpPaths.length} existing file(s) to ${BACKUP_DIR}/`);
  }

  return { backedUpPaths, newPaths };
}

export async function restoreBackupFiles(
  projectRoot: string,
  backup: BackupState,
): Promise<void> {
  for (const path of backup.backedUpPaths) {
    const backupPath = join(projectRoot, BACKUP_DIR, path);
    const targetPath = join(projectRoot, path);
    await mkdir(dirname(targetPath), { recursive: true });
    await copyFile(backupPath, targetPath);
  }

  for (const path of backup.newPaths) {
    await rm(join(projectRoot, path), { force: true });
  }

  if (backup.backedUpPaths.length > 0 || backup.newPaths.length > 0) {
    logger.warn('Restored files from backup after generation failed.');
  }
}
