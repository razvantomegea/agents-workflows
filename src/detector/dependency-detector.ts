import { readPackageJson, getAllDeps } from '../utils/index.js';
import type { Detection } from './types.js';

export interface DependencyDetectorRule {
  packages: string[];
  value: string;
  confidence: number;
}

export function createDependencyDetector(
  rules: DependencyDetectorRule[],
): (projectRoot: string) => Promise<Detection> {
  return async (projectRoot: string): Promise<Detection> => {
    const pkg = await readPackageJson(projectRoot);
    if (!pkg) return { value: null, confidence: 0 };

    const deps = getAllDeps(pkg);
    const match = rules.find((rule) =>
      rule.packages.some((packageName) => deps[packageName]),
    );

    return match
      ? { value: match.value, confidence: match.confidence }
      : { value: null, confidence: 0 };
  };
}
