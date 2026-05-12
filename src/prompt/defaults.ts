import type { PackageJson } from '../utils/index.js';
import { safeProjectDescription } from '../schema/stack-config.js';

/**
 * Returns the default project name derived from `package.json`, or `"my-project"` as a fallback.
 *
 * @param pkg - Parsed `package.json` content, or `null` when unavailable.
 *
 * @returns The trimmed `pkg.name` value, or `"my-project"` when absent or blank.
 */
export function resolveDefaultProjectName(pkg: PackageJson | null): string {
  const name = pkg?.name?.trim();
  return name || 'my-project';
}

/**
 * Returns a safe default project description, falling back to a framework- or language-based string.
 *
 * @param pkg - Parsed `package.json` content, or `null` when unavailable.
 * @param framework - Detected framework name (e.g., `"react"`, `"nextjs"`), or `null`.
 * @param language - Primary language name used as the ultimate fallback description.
 *
 * @returns The trimmed `pkg.description` if it passes `safeProjectDescription` validation;
 *   otherwise `"A <framework> application"` when a framework is present,
 *   or `"A <language> project"` as the final fallback.
 */
export function resolveDefaultDescription(
  pkg: PackageJson | null,
  framework: string | null,
  language: string,
): string {
  const description = pkg?.description?.trim();
  if (description && safeProjectDescription.safeParse(description).success) return description;
  if (framework) return `A ${framework} application`;
  return `A ${language} project`;
}
