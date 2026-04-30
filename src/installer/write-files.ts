import { join, resolve, sep } from 'node:path';
import type { GeneratedFile } from '../generator/types.js';
import { writeFileSafe, _setPromptFn, _restoreDefaultPromptFn } from '../generator/write-file.js';
import type { WriteFileResult, PromptFn, PromptAnswer } from '../generator/write-file.js';
import { logger } from '../utils/logger.js';

export interface WriteGeneratedFilesOptions {
  confirmOverwrite?: (path: string) => Promise<boolean>;
}

export interface WriteGeneratedFilesResult {
  writtenPaths: string[];
  skippedPaths: string[];
  mergedPaths: string[];
}

/**
 * Writes a set of generated files into `projectRoot`, delegating per-file conflict resolution
 * to `writeFileSafe` (merge, overwrite, or skip based on session strategy).
 *
 * @param projectRoot - Absolute path to the project root directory used to resolve and
 *   path-guard each output file.
 * @param files - Generated files to write.  Each entry's `path` must be relative to
 *   `projectRoot`; absolute paths or traversals are rejected.
 * @param options - Optional behaviour overrides.
 *   - `options.confirmOverwrite` — async callback invoked when `writeFileSafe` needs a
 *     user decision for a conflicting file.  When omitted the default prompt function
 *     configured on the `write-file` module is used instead.
 * @returns Categorised outcome paths:
 *   - `writtenPaths` — files freshly written or overwritten.
 *   - `mergedPaths` — files whose content was merged with the existing on-disk version.
 *   - `skippedPaths` — files where the user (or session strategy) chose not to overwrite.
 *
 * @throws {Error} If any `file.path` resolves outside `projectRoot` (path-traversal guard).
 *
 * @remarks
 * When `options.confirmOverwrite` is provided this function temporarily mutates the
 * module-level prompt function in `write-file.ts` via `_setPromptFn`, restoring the
 * default in a `finally` block to prevent state leakage between calls.
 */
export async function writeGeneratedFiles(
  projectRoot: string,
  files: GeneratedFile[],
  options: WriteGeneratedFilesOptions = {},
): Promise<WriteGeneratedFilesResult> {
  const writtenPaths: string[] = [];
  const skippedPaths: string[] = [];
  const mergedPaths: string[] = [];

  const promptAdapter = buildPromptAdapter(options);
  if (promptAdapter != null) {
    _setPromptFn(promptAdapter);
  }

  const rootResolved = resolve(projectRoot);

  try {
    for (const file of files) {
      const fullPath = join(projectRoot, file.path);
      const resolvedPath = resolve(fullPath);
      if (resolvedPath !== rootResolved && !resolvedPath.startsWith(rootResolved + sep)) {
        throw new Error(`Refusing to write outside project root: ${file.path}`);
      }
      const result: WriteFileResult = await writeFileSafe({
        path: fullPath,
        content: file.content,
        displayPath: file.path,
        merge: file.merge,
      });

      if (result.status === 'written') {
        writtenPaths.push(file.path);
        logger.file(file.path);
      } else if (result.status === 'merged') {
        mergedPaths.push(file.path);
        logger.file(file.path);
      } else if (result.status === 'skipped') {
        skippedPaths.push(file.path);
        logger.warn(`  skipped ${file.path}`);
      }
    }
  } finally {
    if (promptAdapter != null) {
      _restoreDefaultPromptFn();
    }
  }

  return { writtenPaths, skippedPaths, mergedPaths };
}

function buildPromptAdapter(options: WriteGeneratedFilesOptions): PromptFn | null {
  if (options.confirmOverwrite == null) return null;
  const confirmOverwrite = options.confirmOverwrite;
  return async ({ path }: { path: string; canMerge: boolean }): Promise<PromptAnswer> => {
    const result = await confirmOverwrite(path);
    return result ? 'y' : 'n';
  };
}
