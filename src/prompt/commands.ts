import type { StackConfig } from '../schema/stack-config.js';

export type PackageScripts = Record<string, string>;

/**
 * Returns the command prefix used to run package scripts for the given package manager.
 *
 * @param pm - Package manager identifier (e.g., `npm`, `pnpm`, `yarn`, `bun`).
 *
 * @returns The script prefix string (e.g., `"npm run"`, `"pnpm"`, `"yarn"`, `"bun run"`).
 *   Falls back to `pm` itself for unrecognised values.
 */
export function resolvePackageManagerPrefix(pm: string): string {
  const prefixMap: Record<string, string> = {
    npm: 'npm run',
    pnpm: 'pnpm',
    yarn: 'yarn',
    bun: 'bun run',
  };
  return prefixMap[pm] ?? pm;
}

/**
 * Derives the `StackConfig['commands']` set from detected tooling and existing `package.json` scripts.
 *
 * @param pm - Package manager identifier used to determine the script prefix.
 * @param testFramework - Test framework identifier (e.g., `jest`, `vitest`, `pytest`, `go-test`).
 * @param linter - Linter identifier (e.g., `eslint`, `oxlint`, `ruff`), or `null` when absent.
 * @param language - Primary language identifier (e.g., `typescript`, `python`, `go`).
 * @param scripts - Optional `package.json` `scripts` map; named scripts override framework defaults
 *   when a matching key is found (e.g., `check-types`, `test`, `lint`, `format`/`fmt`, `build`, `dev`/`start`).
 *
 * @returns A `StackConfig['commands']` object with `typeCheck`, `test`, `lint`, `format`, `build`, and `dev`.
 *   Fields are `null` when no matching script or framework mapping is found.
 */
export function resolveCommands(
  pm: string,
  testFramework: string,
  linter: string | null,
  language: string,
  scripts: PackageScripts = {},
): StackConfig['commands'] {
  const prefix = resolvePackageManagerPrefix(pm);
  const packageCommand = (scriptName: string): string => `${prefix} ${scriptName}`;
  const scriptCommand = (names: string[]): string | null => {
    const match = names.find((name) => scripts[name]);
    return match ? packageCommand(match) : null;
  };

  const typeCheckMap: Record<string, string> = {
    typescript: scriptCommand(['check-types', 'typecheck', 'type-check', 'tsc']) ?? `${prefix} check-types`,
    python: 'mypy .',
    go: 'go vet ./...',
  };

  const testMap: Record<string, string> = {
    jest: `${prefix} test`,
    vitest: `${prefix} test`,
    pytest: 'pytest',
    'go-test': 'go test ./...',
  };

  const lintMap: Record<string, string> = {
    eslint: `${prefix} lint`,
    oxlint: `${prefix} lint`,
    biome: `${prefix} lint`,
    ruff: 'ruff check .',
  };

  return {
    typeCheck: typeCheckMap[language] ?? null,
    test: scriptCommand(['test']) ?? testMap[testFramework] ?? `${prefix} test`,
    lint: scriptCommand(['lint']) ?? (linter ? (lintMap[linter] ?? `${prefix} lint`) : null),
    format: scriptCommand(['format', 'fmt']),
    build: scriptCommand(['build']),
    dev: scriptCommand(['dev', 'start']),
  };
}
