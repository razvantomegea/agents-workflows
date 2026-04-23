import { join } from 'node:path';
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

  try {
    for (const file of files) {
      const fullPath = join(projectRoot, file.path);
      const result: WriteFileResult = await writeFileSafe({
        path: fullPath,
        content: file.content,
        displayPath: file.path,
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
