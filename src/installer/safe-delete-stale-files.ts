import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { confirm } from '@inquirer/prompts';
import { fileExists, logger } from '../utils/index.js';
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

  for (const candidate of candidates) {
    const absolutePath = join(projectRoot, candidate);

    if (!(await fileExists(absolutePath))) {
      continue;
    }

    try {
      const fileEntry: GeneratedFile = { path: candidate, content: '' };
      await backupExistingFiles(projectRoot, [fileEntry]);

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

      await rm(absolutePath);
      logger.info(`Removed stale: ${candidate}`);
    } catch (error) {
      logger.warn(
        `Unexpected error processing stale file ${candidate}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
