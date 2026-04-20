import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { confirm } from '@inquirer/prompts';
import type { GeneratedFile } from '../generator/types.js';
import { logger } from '../utils/logger.js';
import { fileExists } from '../utils/file-exists.js';

export interface WriteGeneratedFilesOptions {
  confirmMarkdownOverwrite?: boolean;
  confirmOverwrite?: (path: string) => Promise<boolean>;
}

export interface WriteGeneratedFilesResult {
  writtenPaths: string[];
  skippedPaths: string[];
}

export async function writeGeneratedFiles(
  projectRoot: string,
  files: GeneratedFile[],
  options: WriteGeneratedFilesOptions = {},
): Promise<WriteGeneratedFilesResult> {
  const writtenPaths: string[] = [];
  const skippedPaths: string[] = [];

  for (const file of files) {
    const fullPath = join(projectRoot, file.path);
    if (!(await shouldWriteFile(fullPath, file, options))) {
      skippedPaths.push(file.path);
      logger.warn(`  skipped ${file.path}`);
      continue;
    }

    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, file.content, 'utf-8');
    writtenPaths.push(file.path);
    logger.file(file.path);
  }

  return { writtenPaths, skippedPaths };
}

async function shouldWriteFile(
  fullPath: string,
  file: GeneratedFile,
  options: WriteGeneratedFilesOptions,
): Promise<boolean> {
  if (!options.confirmMarkdownOverwrite || !file.path.endsWith('.md')) {
    return true;
  }

  if (!(await fileExists(fullPath))) {
    return true;
  }

  const existing = await readFile(fullPath, 'utf-8');
  if (existing === file.content) {
    return false;
  }

  const ask = options.confirmOverwrite ?? ((path: string): Promise<boolean> =>
    confirm({
      message: `Replace existing Markdown file ${path}?`,
      default: false,
    }));

  return ask(file.path);
}
