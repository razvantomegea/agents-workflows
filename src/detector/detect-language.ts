import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileExists, readPackageJson } from '../utils/index.js';
import type { Detection } from './types.js';

export async function detectLanguage(projectRoot: string): Promise<Detection> {
  const pkg = await readPackageJson(projectRoot);
  if (pkg) {
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (allDeps['typescript'] || await fileExists(join(projectRoot, 'tsconfig.json'))) {
      return { value: 'typescript', confidence: 0.95 };
    }
    return { value: 'javascript', confidence: 0.8 };
  }

  if (await fileExists(join(projectRoot, 'pyproject.toml')) ||
      await fileExists(join(projectRoot, 'setup.py')) ||
      await fileExists(join(projectRoot, 'requirements.txt'))) {
    return { value: 'python', confidence: 0.9 };
  }

  if (await fileExists(join(projectRoot, 'go.mod'))) {
    return { value: 'go', confidence: 0.95 };
  }

  if (await fileExists(join(projectRoot, 'Cargo.toml'))) {
    return { value: 'rust', confidence: 0.95 };
  }

  if (await fileExists(join(projectRoot, 'pom.xml')) ||
      await fileExists(join(projectRoot, 'build.gradle'))) {
    return { value: 'java', confidence: 0.9 };
  }

  if (await fileExists(join(projectRoot, 'Directory.Build.props')) ||
      await fileExists(join(projectRoot, 'global.json')) ||
      await fileExists(join(projectRoot, 'NuGet.config')) ||
      await hasDotnetProjectFile(projectRoot)) {
    return { value: 'csharp', confidence: 0.85 };
  }

  return { value: null, confidence: 0 };
}

async function hasDotnetProjectFile(projectRoot: string): Promise<boolean> {
  try {
    const entries = await readdir(projectRoot);
    return entries.some((entry) => entry.endsWith('.csproj') || entry.endsWith('.sln'));
  } catch {
    return false;
  }
}
