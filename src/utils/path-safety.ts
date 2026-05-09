import { lstat, realpath } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { hasNodeErrorCode } from './fs-error.js';

function isInsidePath(rootPath: string, targetPath: string): boolean {
  return targetPath === rootPath || targetPath.startsWith(`${rootPath}${sep}`);
}

async function findExistingPath(startPath: string): Promise<string> {
  let currentPath = startPath;

  while (true) {
    try {
      await lstat(currentPath);
      return currentPath;
    } catch (error) {
      if (!hasNodeErrorCode(error, 'ENOENT')) {
        throw error;
      }
    }

    const parentPath = dirname(currentPath);
    if (parentPath === currentPath) {
      throw new Error(`No existing ancestor found for ${startPath}`);
    }
    currentPath = parentPath;
  }
}

/**
 * Verifies that targetPath and its nearest existing ancestor resolve inside
 * projectRoot before path-based filesystem calls that follow symlinks.
 *
 * This check is not atomic with the subsequent I/O. A concurrent process with
 * write access to the project can still swap a checked directory for a symlink
 * between this call and the following filesystem operation.
 */
export async function assertPathInsideProject(params: {
  projectRoot: string;
  targetPath: string;
  displayPath: string;
  operation: string;
}): Promise<void> {
  const { projectRoot, targetPath, displayPath, operation } = params;
  const resolvedRoot = resolve(projectRoot);
  const resolvedTarget = resolve(targetPath);

  if (!isInsidePath(resolvedRoot, resolvedTarget)) {
    throw new Error(`Refusing to ${operation} outside project root: ${displayPath}`);
  }

  const realRoot = await realpath(resolvedRoot);
  const existingPath = await findExistingPath(resolvedTarget);
  const realExistingPath = await realpath(existingPath);

  if (!isInsidePath(realRoot, realExistingPath)) {
    throw new Error(`Refusing to ${operation} through path outside project root: ${displayPath}`);
  }
}
