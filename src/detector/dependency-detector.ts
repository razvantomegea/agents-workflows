import { readPackageJson, getAllDeps } from '../utils/index.js';
import type { Detection } from './types.js';

export interface DependencyDetectorRule {
  packages: string[];
  value: string;
  confidence: number;
}

/**
 * Creates a detector function that inspects `package.json` (all dependency fields)
 * and returns the first rule whose package list has at least one match.
 *
 * @param rules - Ordered list of detection rules; the first matching rule wins.
 *   Each rule specifies `packages` (npm package names to look for), the `value`
 *   to return on match, and a `confidence` score in `[0, 1]`.
 * @returns An async detector `(projectRoot: string) => Promise<Detection>` that
 *   reads `package.json` at `projectRoot`, scans all dependency fields via
 *   `getAllDeps`, and returns `{ value: rule.value, confidence: rule.confidence }`
 *   on the first matching rule, or `{ value: null, confidence: 0 }` when no rule
 *   matches or `package.json` is absent.
 * @remarks Performs one filesystem read per invocation (`package.json`). No errors
 *   are surfaced — a missing or unreadable `package.json` yields `{ value: null,
 *   confidence: 0 }`.
 */
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
