import { rm, lstat } from 'node:fs/promises';
import { resolve, sep, isAbsolute } from 'node:path';
import { confirm } from '@inquirer/prompts';
import { logger } from '../utils/index.js';
import { backupExistingFiles } from './backup.js';
import type { GeneratedFile } from '../generator/types.js';

export const STALE_IMPLEMENTER_VARIANT_FILES = [
  '.claude/agents/react-ts-senior.md',
  '.codex/skills/react-ts-senior/SKILL.md',
] as const;

export async function safeDeleteStaleFiles(
  params: Readonly<{
    projectRoot: string;
    candidates: readonly string[];
    suppressed: boolean;
  }>,
): Promise<void> {
  const { projectRoot, candidates, suppressed } = params;

  const normalizedRoot = resolve(projectRoot) + sep;

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

    const stat = await lstat(absolutePath).catch(() => null);
    if (!stat) continue;
    if (stat.isSymbolicLink()) {
      logger.warn(`Skipping symlink candidate: ${candidate}`);
      continue;
    }

    try {
      if (!suppressed) {
        const confirmed = await confirm({
          message: `Removing stale file replaced by implementer variant: ${candidate}. Delete?`,
          default: false,
        });

        if (!confirmed) {
          logger.warn(`Skipped stale file: ${candidate} (kept on disk).`);
          continue;
        }
      }

      const fileEntry: GeneratedFile = { path: candidate, content: '' };
      await backupExistingFiles(projectRoot, [fileEntry]);
      await rm(absolutePath);
      logger.info(`Removed stale: ${candidate}`);
    } catch (error) {
      logger.warn(
        `Unexpected error processing stale file ${candidate}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
