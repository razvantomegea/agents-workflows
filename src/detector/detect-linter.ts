import { join } from 'node:path';
import { fileExists, readPackageJson, getAllDeps } from '../utils/index.js';
import type { Detection } from './types.js';

export async function detectLinter(projectRoot: string): Promise<Detection> {
  const pkg = await readPackageJson(projectRoot);
  if (pkg) {
    const deps = getAllDeps(pkg);

    if (deps['oxlint']) return { value: 'oxlint', confidence: 0.95 };
    if (deps['@biomejs/biome']) return { value: 'biome', confidence: 0.95 };
    if (deps['eslint']) return { value: 'eslint', confidence: 0.9 };
  }

  if (await fileExists(join(projectRoot, 'biome.json'))) {
    return { value: 'biome', confidence: 0.9 };
  }

  if (await fileExists(join(projectRoot, '.eslintrc.json')) ||
      await fileExists(join(projectRoot, '.eslintrc.js')) ||
      await fileExists(join(projectRoot, 'eslint.config.js')) ||
      await fileExists(join(projectRoot, 'eslint.config.mjs'))) {
    return { value: 'eslint', confidence: 0.85 };
  }

  if (await fileExists(join(projectRoot, 'ruff.toml')) ||
      await fileExists(join(projectRoot, '.ruff.toml'))) {
    return { value: 'ruff', confidence: 0.9 };
  }

  return { value: null, confidence: 0 };
}

export async function detectFormatter(projectRoot: string): Promise<Detection> {
  const pkg = await readPackageJson(projectRoot);
  if (pkg) {
    const deps = getAllDeps(pkg);

    if (deps['prettier']) return { value: 'prettier', confidence: 0.9 };
    if (deps['@biomejs/biome']) return { value: 'biome', confidence: 0.85 };
  }

  if (await fileExists(join(projectRoot, '.prettierrc')) ||
      await fileExists(join(projectRoot, '.prettierrc.json')) ||
      await fileExists(join(projectRoot, 'prettier.config.js'))) {
    return { value: 'prettier', confidence: 0.85 };
  }

  return { value: null, confidence: 0 };
}
