import { join } from 'node:path';
import { fileExists, readPackageJson, getAllDeps } from '../utils/index.js';
import type { Detection } from './types.js';

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
