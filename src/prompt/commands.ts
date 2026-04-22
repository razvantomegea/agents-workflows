import type { StackConfig } from '../schema/stack-config.js';

export type PackageScripts = Record<string, string>;

export function resolvePackageManagerPrefix(pm: string): string {
  const prefixMap: Record<string, string> = {
    npm: 'npm run',
    pnpm: 'pnpm',
    yarn: 'yarn',
    bun: 'bun run',
  };
  return prefixMap[pm] ?? pm;
}

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
