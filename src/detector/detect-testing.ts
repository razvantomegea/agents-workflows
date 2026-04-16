import { join } from 'node:path';
import { fileExists, readPackageJson, getAllDeps, readPyprojectToml } from '../utils/index.js';
import type { Detection } from './types.js';

export async function detectTestFramework(projectRoot: string): Promise<Detection> {
  const pkg = await readPackageJson(projectRoot);
  if (pkg) {
    const deps = getAllDeps(pkg);

    if (deps['vitest']) return { value: 'vitest', confidence: 0.95 };
    if (deps['jest']) return { value: 'jest', confidence: 0.95 };
    if (deps['mocha']) return { value: 'mocha', confidence: 0.9 };
    if (deps['ava']) return { value: 'ava', confidence: 0.9 };
  }

  if (await fileExists(join(projectRoot, 'pytest.ini')) ||
      await fileExists(join(projectRoot, 'pyproject.toml'))) {
    const pyproject = await readPyprojectToml(projectRoot);
    if (pyproject?.tool && 'pytest' in pyproject.tool) {
      return { value: 'pytest', confidence: 0.9 };
    }
  }

  if (await fileExists(join(projectRoot, 'go.mod'))) {
    return { value: 'go-test', confidence: 0.9 };
  }

  return { value: null, confidence: 0 };
}

export async function detectTestLibrary(projectRoot: string): Promise<Detection> {
  const pkg = await readPackageJson(projectRoot);
  if (!pkg) return { value: null, confidence: 0 };

  const deps = getAllDeps(pkg);

  if (deps['@testing-library/react-native']) {
    return { value: 'react-native-testing-library', confidence: 0.95 };
  }
  if (deps['@testing-library/react']) {
    return { value: 'react-testing-library', confidence: 0.95 };
  }
  if (deps['@testing-library/vue']) {
    return { value: 'vue-testing-library', confidence: 0.95 };
  }
  if (deps['enzyme']) return { value: 'enzyme', confidence: 0.8 };

  return { value: null, confidence: 0 };
}
