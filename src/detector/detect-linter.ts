import { join } from 'node:path';
import { fileExists, readPackageJson, getAllDeps } from '../utils/index.js';
import type { Detection } from './types.js';

/**
 * Detects the linter used by the project.
 *
 * Inspection order (first match wins):
 * 1. `package.json` dependencies — `oxlint` (→ `"oxlint"`, 0.95),
 *    `@biomejs/biome` (→ `"biome"`, 0.95), `eslint` (→ `"eslint"`, 0.9).
 * 2. Config files — `biome.json` (→ `"biome"`, 0.9), ESLint config files
 *    (`.eslintrc.json`, `.eslintrc.js`, `eslint.config.js`, `eslint.config.mjs`
 *    → `"eslint"`, 0.85), Ruff config (`ruff.toml`, `.ruff.toml` → `"ruff"`, 0.9).
 *
 * @param projectRoot - Absolute path to the project root directory.
 * @returns A `Detection` with `value` set to the detected linter name and
 *   `confidence` in `[0, 1]`, or `{ value: null, confidence: 0 }` when
 *   nothing is detected.
 * @remarks Reads `package.json` and performs up to six filesystem stat calls.
 *   All I/O errors are swallowed; the function never rejects.
 */
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

/**
 * Detects the code formatter used by the project.
 *
 * Inspection order (first match wins):
 * 1. `package.json` dependencies — `prettier` (→ `"prettier"`, 0.9),
 *    `@biomejs/biome` (→ `"biome"`, 0.85).
 * 2. Prettier config files — `.prettierrc`, `.prettierrc.json`,
 *    `prettier.config.js` (→ `"prettier"`, 0.85).
 *
 * @param projectRoot - Absolute path to the project root directory.
 * @returns A `Detection` with `value` set to the detected formatter name and
 *   `confidence` in `[0, 1]`, or `{ value: null, confidence: 0 }` when
 *   nothing is detected.
 * @remarks Reads `package.json` and performs up to three filesystem stat calls.
 *   All I/O errors are swallowed; the function never rejects.
 */
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
