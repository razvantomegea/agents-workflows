import { lstat, realpath } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';

function hasErrorCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

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
      if (!hasErrorCode(error, 'ENOENT')) {
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
