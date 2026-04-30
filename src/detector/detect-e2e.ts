import { join } from 'node:path';
import { fileExists, readPackageJson, getAllDeps } from '../utils/index.js';
import type { Detection } from './types.js';

/**
 * Detects the end-to-end testing framework used by the project.
 *
 * Inspection order (first match wins):
 * 1. `package.json` dependencies — checks for `@playwright/test` / `playwright`
 *    (→ `"playwright"`), `cypress` (→ `"cypress"`), and `detox` (→ `"detox"`).
 * 2. Filesystem — checks for a `maestro/` or `.maestro/` directory (→ `"maestro"`).
 * 3. Config files — `playwright.config.ts` / `.js` (→ `"playwright"`),
 *    then `cypress.config.ts` / `.js` (→ `"cypress"`).
 *
 * @param projectRoot - Absolute path to the project root directory.
 * @returns A `Detection` with `value` set to the detected E2E framework name
 *   and `confidence` in `[0, 1]`, or `{ value: null, confidence: 0 }` when
 *   nothing is detected.
 * @remarks Reads `package.json` and performs up to six filesystem stat calls.
 *   All read errors are swallowed; the function never rejects.
 */
export async function detectE2e(projectRoot: string): Promise<Detection> {
  const pkg = await readPackageJson(projectRoot);
  if (pkg) {
    const deps = getAllDeps(pkg);

    if (deps['@playwright/test'] || deps['playwright']) {
      return { value: 'playwright', confidence: 0.95 };
    }
    if (deps['cypress']) return { value: 'cypress', confidence: 0.95 };
    if (deps['detox']) return { value: 'detox', confidence: 0.95 };
  }

  if (await fileExists(join(projectRoot, 'maestro')) ||
      await fileExists(join(projectRoot, '.maestro'))) {
    return { value: 'maestro', confidence: 0.9 };
  }

  if (await fileExists(join(projectRoot, 'playwright.config.ts')) ||
      await fileExists(join(projectRoot, 'playwright.config.js'))) {
    return { value: 'playwright', confidence: 0.9 };
  }

  if (await fileExists(join(projectRoot, 'cypress.config.ts')) ||
      await fileExists(join(projectRoot, 'cypress.config.js'))) {
    return { value: 'cypress', confidence: 0.9 };
  }

  return { value: null, confidence: 0 };
}
