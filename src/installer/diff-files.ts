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
