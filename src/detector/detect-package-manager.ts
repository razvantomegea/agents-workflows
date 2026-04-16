import { join } from 'node:path';
import { fileExists, readPackageJson } from '../utils/index.js';
import type { Detection } from './types.js';

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
