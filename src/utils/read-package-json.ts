import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileExists } from './file-exists.js';

export interface PackageJson {
  name?: string;
  description?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  workspaces?: string[] | { packages: string[] };
}

/**
 * Reads and JSON-parses the `package.json` at the root of a project.
 *
 * @param projectRoot - Absolute path to the project directory. The file
 *   `package.json` is resolved as `<projectRoot>/package.json`.
 * @returns A promise that resolves to the parsed {@link PackageJson} object,
 *   or `null` when:
 *   - No `package.json` exists at `projectRoot`.
 *   - The file cannot be read (e.g. permission error).
 *   - The file content is not valid JSON.
 * @remarks Never throws. File-not-found and parse errors are caught internally
 *   and both cause a `null` return. Uses {@link fileExists} to short-circuit
 *   before attempting to read.
 */
export async function readPackageJson(
  projectRoot: string,
): Promise<PackageJson | null> {
  const filePath = join(projectRoot, 'package.json');
  if (!(await fileExists(filePath))) return null;

  try {
    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content) as PackageJson;
  } catch {
    return null;
  }
}

/**
 * Merges `dependencies` and `devDependencies` from a parsed `package.json`
 * into a single flat record.
 *
 * @param pkg - A {@link PackageJson} object, typically returned by
 *   {@link readPackageJson}.
 * @returns A shallow-merged record of `{ [packageName]: versionRange }`.
 *   When both `dependencies` and `devDependencies` define the same key,
 *   `devDependencies` wins (spread order). Returns an empty object when
 *   both fields are absent or undefined.
 * @remarks Pure function; performs no I/O and has no side effects.
 */
export function getAllDeps(pkg: PackageJson): Record<string, string> {
  return { ...pkg.dependencies, ...pkg.devDependencies };
}
