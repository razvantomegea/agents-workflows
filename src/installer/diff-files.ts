import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createTwoFilesPatch } from 'diff';
import { fileExists } from '../utils/file-exists.js';
import type { GeneratedFile } from '../generator/types.js';

export interface FileDiff {
  path: string;
  isNew: boolean;
  patch: string;
  hasChanges: boolean;
}

/**
 * Computes a unified-diff patch for each generated file against what is currently on disk.
 *
 * @param projectRoot - Absolute path to the project root directory.
 * @param files - The generated files to compare against their on-disk counterparts.
 * @returns One `FileDiff` per input file with the following semantics:
 *   - `isNew: true` — the file does not yet exist on disk; `patch` is empty, `hasChanges` is always `true`.
 *   - `isNew: false, hasChanges: false` — file content is identical; `patch` is empty.
 *   - `isNew: false, hasChanges: true` — file differs; `patch` contains a unified-diff string
 *     produced by `diff.createTwoFilesPatch` (labels `current` / `updated`).
 *
 * @remarks
 * This function is a pure read operation and produces no on-disk side effects.
 */
export async function diffFiles(
  projectRoot: string,
  files: GeneratedFile[],
): Promise<FileDiff[]> {
  const diffs: FileDiff[] = [];

  for (const file of files) {
    const fullPath = join(projectRoot, file.path);
    const exists = await fileExists(fullPath);

    if (!exists) {
      diffs.push({
        path: file.path,
        isNew: true,
        patch: '',
        hasChanges: true,
      });
      continue;
    }

    const existing = await readFile(fullPath, 'utf-8');
    if (existing === file.content) {
      diffs.push({ path: file.path, isNew: false, patch: '', hasChanges: false });
      continue;
    }

    const patch = createTwoFilesPatch(
      file.path, file.path,
      existing, file.content,
      'current', 'updated',
    );

    diffs.push({ path: file.path, isNew: false, patch, hasChanges: true });
  }

  return diffs;
}
