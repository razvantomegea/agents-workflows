import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type { GeneratedFile } from '../generator/types.js';
import { logger } from '../utils/logger.js';

export async function writeGeneratedFiles(
  projectRoot: string,
  files: GeneratedFile[],
): Promise<void> {
  for (const file of files) {
    const fullPath = join(projectRoot, file.path);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, file.content, 'utf-8');
    logger.file(file.path);
  }
}
