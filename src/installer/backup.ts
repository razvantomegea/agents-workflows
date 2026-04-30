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

/**
 * Copies any files that already exist on disk into the `.agents-workflows-backup/` directory
 * before a generation run so they can be restored on failure.
 *
 * @param projectRoot - Absolute path to the project root directory.
 * @param files - List of files about to be written; each entry's `path` is checked for existence.
 * @returns A `BackupState` describing which files were backed up and which are net-new.
 *
 * @remarks
 * Backup files are written to `<projectRoot>/.agents-workflows-backup/<file.path>`.
 * Re-running on the same set of files overwrites any previous backup content at that path —
 * the backup directory is not version-preserving.
 * Parent directories inside the backup tree are created with `mkdir({ recursive: true })`.
 * `mkdir` and `copyFile` errors propagate to the caller without swallowing.
 */
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

/**
 * Rolls back a failed generation run by restoring previously backed-up files and
 * deleting any files that were newly created (did not exist before the run).
 *
 * @param projectRoot - Absolute path to the project root directory.
 * @param backup - The `BackupState` returned by a prior call to `backupExistingFiles`.
 *   - `backup.backedUpPaths` — relative paths to restore from the backup directory.
 *   - `backup.newPaths` — relative paths to remove (`rm` with `force: true`; missing files are tolerated).
 *
 * @remarks
 * Restoration reads from `<projectRoot>/.agents-workflows-backup/<path>` and writes to
 * `<projectRoot>/<path>`, creating parent directories as needed.
 * After the restore, a `WARN`-level log entry is emitted for observability.
 */
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
