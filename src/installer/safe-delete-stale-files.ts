import { lstat, realpath, mkdir, rename } from 'node:fs/promises';
import { resolve, sep, isAbsolute, relative, normalize } from 'node:path';
import { createHash } from 'node:crypto';
import { confirm } from '@inquirer/prompts';
import { logger } from '../utils/index.js';

const BACKUP_DIR = '.agents-workflows-backup';
export const STALE_IMPLEMENTER_VARIANT_FILES = [
  '.claude/agents/react-ts-senior.md',
  '.codex/skills/react-ts-senior/SKILL.md',
] as const;

function hasErrorCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

function buildBackupFileName(relativePath: string): string {
  const safeName = relativePath.replace(/[^A-Za-z0-9_.-]/g, '_');
  const digest = createHash('sha256').update(relativePath).digest('hex').slice(0, 12);
  return `${digest}-${safeName}`;
}

async function ensureBackupDirectory(params: Readonly<{
  projectRoot: string;
  realProjectRoot: string;
  normalizedRealRoot: string;
}>): Promise<string | null> {
  const { projectRoot, realProjectRoot, normalizedRealRoot } = params;
  const backupRoot = resolve(projectRoot, BACKUP_DIR);

  const backupStat = await lstat(backupRoot).catch((error: unknown) => {
    if (hasErrorCode(error, 'ENOENT')) {
      return null;
    }
    throw error;
  });

  if (backupStat?.isSymbolicLink()) {
    logger.warn(`Skipping stale delete because ${BACKUP_DIR} is a symlink.`);
    return null;
  }

  if (backupStat && !backupStat.isDirectory()) {
    logger.warn(`Skipping stale delete because ${BACKUP_DIR} is not a directory.`);
    return null;
  }

  await mkdir(backupRoot, { recursive: true });
  const realBackupRoot = await realpath(backupRoot);
  if (realBackupRoot !== realProjectRoot && !realBackupRoot.startsWith(normalizedRealRoot)) {
    logger.warn(`Skipping stale delete because ${BACKUP_DIR} resolves outside projectRoot.`);
    return null;
  }

  return realBackupRoot;
}

export async function safeDeleteStaleFiles(
  params: Readonly<{
    projectRoot: string;
    candidates: readonly string[];
    suppressed: boolean;
  }>,
): Promise<void> {
  const { projectRoot, candidates, suppressed } = params;

  const canonicalRoot = resolve(projectRoot);
  const normalizedRoot = `${canonicalRoot}${sep}`;
  const realProjectRoot = await realpath(projectRoot);
  const normalizedRealRoot = `${realProjectRoot}${sep}`;

  for (const candidate of candidates) {
    if (isAbsolute(candidate)) {
      logger.warn(`Skipping absolute candidate path: ${candidate}`);
      continue;
    }

    const absolutePath = resolve(projectRoot, candidate);
    if (!absolutePath.startsWith(normalizedRoot)) {
      logger.warn(`Skipping candidate outside projectRoot: ${candidate}`);
      continue;
    }

    const relativePath = normalize(relative(projectRoot, absolutePath)).replace(/^(\.\.(\/|\\|$))+/, '').replace(/^[/\\]+/, '');

    try {
      const stat = await lstat(absolutePath).catch((error: unknown) => {
        if (hasErrorCode(error, 'ENOENT')) {
          return null;
        }
        throw error;
      });
      if (!stat) continue;

      if (stat.isSymbolicLink()) {
        logger.warn(`Skipping symlink candidate: ${relativePath}`);
        continue;
      }

      const realCandidatePath = await realpath(absolutePath);
      if (realCandidatePath !== realProjectRoot && !realCandidatePath.startsWith(normalizedRealRoot)) {
        logger.warn(`Skipping candidate outside projectRoot: ${relativePath}`);
        continue;
      }

      if (!suppressed) {
        const confirmed = await confirm({
          message: `Removing stale file replaced by implementer variant: ${relativePath}. Delete?`,
          default: false,
        });

        if (!confirmed) {
          logger.warn(`Skipped stale file: ${relativePath} (kept on disk).`);
          continue;
        }
      }

      const realBackupRoot = await ensureBackupDirectory({ projectRoot, realProjectRoot, normalizedRealRoot });
      if (!realBackupRoot) continue;

      const backupPath = resolve(realBackupRoot, buildBackupFileName(relativePath));
      await rename(absolutePath, backupPath);
      logger.info(`Backed up 1 existing file(s) to ${BACKUP_DIR}/`);
      logger.info(`Removed stale: ${relativePath}`);
    } catch (error) {
      logger.warn(
        `Unexpected error processing stale file ${relativePath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
