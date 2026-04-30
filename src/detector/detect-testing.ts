import { join } from 'node:path';
import { fileExists, readPackageJson, getAllDeps, readPyprojectToml } from '../utils/index.js';
import type { Detection } from './types.js';

/**
 * Detects the test framework used by the project.
 *
 * Inspection order (first match wins):
 * 1. `package.json` dependencies — `vitest` (→ `"vitest"`, 0.95),
 *    `jest` (→ `"jest"`, 0.95), `mocha` (→ `"mocha"`, 0.9), `ava` (→ `"ava"`, 0.9).
 * 2. `pytest.ini` file presence (→ `"pytest"`, 0.9).
 * 3. `pyproject.toml` with a `[tool.pytest]` section (→ `"pytest"`, 0.9).
 * 4. `go.mod` presence (→ `"go-test"`, 0.9).
 *
 * @param projectRoot - Absolute path to the project root directory.
 * @returns A `Detection` with `value` set to the detected test framework name
 *   and `confidence` in `[0, 1]`, or `{ value: null, confidence: 0 }` when
 *   nothing is detected.
 * @remarks Reads `package.json`, `pytest.ini`, `pyproject.toml`, and checks
 *   for `go.mod`. All I/O errors are swallowed; the function never rejects.
 */
export async function detectTestFramework(projectRoot: string): Promise<Detection> {
  const pkg = await readPackageJson(projectRoot);
  if (pkg) {
    const deps = getAllDeps(pkg);

    if (deps['vitest']) return { value: 'vitest', confidence: 0.95 };
    if (deps['jest']) return { value: 'jest', confidence: 0.95 };
    if (deps['mocha']) return { value: 'mocha', confidence: 0.9 };
    if (deps['ava']) return { value: 'ava', confidence: 0.9 };
  }

  const hasPytestIni = await fileExists(join(projectRoot, 'pytest.ini'));
  if (hasPytestIni) {
    return { value: 'pytest', confidence: 0.9 };
  }

  if (await fileExists(join(projectRoot, 'pyproject.toml'))) {
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

/**
 * Detects the test utility library used by the project.
 *
 * Inspects `package.json` dependencies only (first match wins):
 * `@testing-library/react-native` (→ `"react-native-testing-library"`, 0.95),
 * `@testing-library/react` (→ `"react-testing-library"`, 0.95),
 * `@testing-library/vue` (→ `"vue-testing-library"`, 0.95),
 * `enzyme` (→ `"enzyme"`, 0.8).
 *
 * @param projectRoot - Absolute path to the project root directory.
 * @returns A `Detection` with `value` set to the detected library name and
 *   `confidence` in `[0, 1]`, or `{ value: null, confidence: 0 }` when
 *   `package.json` is absent or none of the listed packages are found.
 * @remarks Reads `package.json` once. All I/O errors are swallowed via the
 *   `readPackageJson` utility; the function never rejects.
 */
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
