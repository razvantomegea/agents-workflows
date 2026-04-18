import type { PackageJson } from '../utils/index.js';

export function resolveDefaultProjectName(pkg: PackageJson | null): string {
  const name = pkg?.name?.trim();
  return name || 'my-project';
}

export function resolveDefaultDescription(
  pkg: PackageJson | null,
  framework: string | null,
  language: string,
): string {
  const description = pkg?.description?.trim();
  if (description) return description;
  if (framework) return `A ${framework} application`;
  return `A ${language} project`;
}
