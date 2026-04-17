import { createDefaultConfig, resolveCommands } from '../../src/prompt/prompt-flow.js';
import type { DetectedStack } from '../../src/detector/types.js';

const emptyDetection = { value: null, confidence: 0 };

function makeDetectedStack(): DetectedStack {
  return {
    language: { value: 'typescript', confidence: 0.95 },
    runtime: { value: 'node', confidence: 0.85 },
    framework: { value: 'nextjs', confidence: 0.95 },
    uiLibrary: { value: 'tailwind', confidence: 0.9 },
    stateManagement: { value: 'zustand', confidence: 0.9 },
    database: { value: 'prisma', confidence: 0.95 },
    auth: { value: 'nextauth', confidence: 0.95 },
    testFramework: { value: 'vitest', confidence: 0.95 },
    testLibrary: emptyDetection,
    e2eFramework: emptyDetection,
    linter: { value: 'eslint', confidence: 0.9 },
    formatter: { value: 'prettier', confidence: 0.9 },
    packageManager: { value: 'pnpm', confidence: 0.95 },
    monorepo: false,
  };
}

describe('resolveCommands', () => {
  it('uses package scripts for build, dev, format, lint, and test commands', () => {
    const commands = resolveCommands('pnpm', 'vitest', 'eslint', 'typescript', {
      build: 'tsup',
      dev: 'tsx src/index.ts',
      format: 'prettier --write .',
      lint: 'oxlint .',
      test: 'jest',
      typecheck: 'tsc --noEmit',
    });

    expect(commands).toEqual({
      typeCheck: 'pnpm typecheck',
      test: 'pnpm test',
      lint: 'pnpm lint',
      format: 'pnpm format',
      build: 'pnpm build',
      dev: 'pnpm dev',
    });
  });
});

describe('createDefaultConfig', () => {
  it('builds a non-interactive config from detected stack values', () => {
    const config = createDefaultConfig(makeDetectedStack(), { build: 'next build' });

    expect(config.stack.auth).toBe('nextauth');
    expect(config.tooling.packageManager).toBe('pnpm');
    expect(config.commands.build).toBe('pnpm build');
    expect(config.agents.uiDesigner).toBe(true);
  });
});
