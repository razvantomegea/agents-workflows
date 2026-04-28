import { readFile } from 'node:fs/promises';

/**
 * Returns true when `text` contains at least one of the given `needles`.
 */
export function containsAny(text: string, needles: readonly string[]): boolean {
  return needles.some((needle: string) => text.includes(needle));
}

/**
 * Reads a file as UTF-8 text. Returns null on any read or permission error.
 */
export async function tryReadFile(absolutePath: string): Promise<string | null> {
  try {
    return await readFile(absolutePath, 'utf8');
  } catch {
    // reason: ENOENT and other read failures are silently skipped per spec
    return null;
  }
}
