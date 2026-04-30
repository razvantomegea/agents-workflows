import { access } from 'node:fs/promises';

/**
 * Checks whether a file or directory exists at the given path.
 *
 * @param filePath - Absolute or relative path to test. Resolved by the Node.js
 *   `fs.access` API against the current working directory when relative.
 * @returns A promise that resolves to `true` if the path is accessible, or
 *   `false` if it does not exist or is not accessible.
 * @remarks Never throws. The underlying `fs.access` rejection is caught
 *   internally and converted to `false`. Symlinks are followed; a broken
 *   symlink resolves to `false`.
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
