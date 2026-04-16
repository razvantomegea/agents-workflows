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

export function getAllDeps(pkg: PackageJson): Record<string, string> {
  return { ...pkg.dependencies, ...pkg.devDependencies };
}
