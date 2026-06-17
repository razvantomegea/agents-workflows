import type { PackageJson } from '../utils/index.js';
import { safeProjectDescription, safeProjectName } from '../schema/stack-config.js';

/**
 * Returns the default project name derived from `package.json`, or `"my-project"` as a fallback.
 *
 * Only names that pass `safeProjectName` validation are accepted; malicious or
 * otherwise non-conforming values (backticks, newlines, instructions, etc.) are
 * silently replaced with the safe default so that untrusted package metadata
 * cannot inject content into generated files.
 *
 * @param pkg - Parsed `package.json` content, or `null` when unavailable.
 *
 * @returns The trimmed `pkg.name` value when it passes validation, or `"my-project"` as a safe fallback.
 */
export function resolveDefaultProjectName(pkg: PackageJson | null): string {
  if (typeof pkg?.name !== 'string') return 'my-project';
  const projectName = pkg.name.trim();
  if (!projectName) return 'my-project';
  return safeProjectName.safeParse(projectName).success ? projectName : 'my-project';
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
  const fallbackDescription = framework ? `A ${framework} application` : `A ${language} project`;
  if (typeof pkg?.description !== 'string') return fallbackDescription;

  const description = pkg.description.trim();
  if (!description) return fallbackDescription;

  return safeProjectDescription.safeParse(description).success ? description : fallbackDescription;
}
