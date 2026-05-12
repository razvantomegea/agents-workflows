import { join } from 'node:path';
import { fileExists, readPackageJson } from '../utils/index.js';
import type { Detection } from './types.js';

/**
 * Detects the package manager used by the project.
 *
 * Inspection order (first match wins):
 * 1. `package.json` present → lockfile precedence:
 *    `bun.lockb` / `bun.lock` (→ `"bun"`, 0.95),
 *    `pnpm-lock.yaml` (→ `"pnpm"`, 0.95),
 *    `yarn.lock` (→ `"yarn"`, 0.95),
 *    `package-lock.json` (→ `"npm"`, 0.95),
 *    no lockfile (→ `"npm"`, 0.5 fallback).
 * 2. No `package.json` → Python/Go lockfiles:
 *    `uv.lock` (→ `"uv"`, 0.95), `poetry.lock` (→ `"poetry"`, 0.95),
 *    `Pipfile.lock` (→ `"pipenv"`, 0.9), `requirements.txt` (→ `"pip"`, 0.7),
 *    `go.mod` (→ `"go-mod"`, 0.95).
 *
 * @param projectRoot - Absolute path to the project root directory.
 * @returns A `Detection` with `value` set to the detected package manager name
 *   and `confidence` in `[0, 1]`, or `{ value: null, confidence: 0 }` when
 *   nothing is detected.
 * @remarks Reads `package.json` and performs up to five additional filesystem
 *   stat calls. All I/O errors are swallowed; the function never rejects.
 */
export async function detectPackageManager(projectRoot: string): Promise<Detection> {
  const pkg = await readPackageJson(projectRoot);

  if (pkg) {
    if (await fileExists(join(projectRoot, 'bun.lockb')) ||
        await fileExists(join(projectRoot, 'bun.lock'))) {
      return { value: 'bun', confidence: 0.95 };
    }
    if (await fileExists(join(projectRoot, 'pnpm-lock.yaml'))) {
      return { value: 'pnpm', confidence: 0.95 };
    }
    if (await fileExists(join(projectRoot, 'yarn.lock'))) {
      return { value: 'yarn', confidence: 0.95 };
    }
    if (await fileExists(join(projectRoot, 'package-lock.json'))) {
      return { value: 'npm', confidence: 0.95 };
    }
    return { value: 'npm', confidence: 0.5 };
  }

  if (await fileExists(join(projectRoot, 'uv.lock'))) {
    return { value: 'uv', confidence: 0.95 };
  }
  if (await fileExists(join(projectRoot, 'poetry.lock'))) {
    return { value: 'poetry', confidence: 0.95 };
  }
  if (await fileExists(join(projectRoot, 'Pipfile.lock'))) {
    return { value: 'pipenv', confidence: 0.9 };
  }
  if (await fileExists(join(projectRoot, 'requirements.txt'))) {
    return { value: 'pip', confidence: 0.7 };
  }
  if (await fileExists(join(projectRoot, 'go.mod'))) {
    return { value: 'go-mod', confidence: 0.95 };
  }

  return { value: null, confidence: 0 };
}
