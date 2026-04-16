import { buildContext } from '../../src/generator/build-context.js';
import type { StackConfig } from '../../src/schema/stack-config.js';

function makeConfig(overrides: Partial<StackConfig> = {}): StackConfig {
  return {
    project: { name: 'test-app', description: 'A test app', locale: 'en', localeRules: [] },
    stack: { language: 'typescript', runtime: 'node', framework: 'nextjs', uiLibrary: 'tailwind', stateManagement: 'zustand', database: 'prisma', auth: null },
    tooling: { packageManager: 'pnpm', packageManagerPrefix: 'pnpm', testFramework: 'vitest', testLibrary: 'react-testing-library', e2eFramework: 'playwright', linter: 'eslint', formatter: 'prettier' },
    paths: { sourceRoot: 'src/', componentsDir: 'src/components/', hooksDir: 'src/hooks/', utilsDir: 'src/utils/', testsDir: null, designTokensFile: null, i18nDir: null, testConfigFile: null },
    commands: { typeCheck: 'pnpm check-types', test: 'pnpm test', lint: 'pnpm lint', format: null, build: null, dev: null },
    conventions: { componentStyle: 'arrow', propsStyle: 'readonly', maxFileLength: 200, testColocation: true, barrelExports: true, strictTypes: true },
    agents: { architect: true, implementer: true, codeReviewer: true, codeOptimizer: true, testWriter: true, e2eTester: true, reviewer: true, uiDesigner: true },
    selectedCommands: { workflowPlan: true, workflowFix: true, externalReview: false },
    targets: { claudeCode: true, codexCli: false },
    ...overrides,
  };
}

describe('buildContext', () => {
  it('sets isReact true for Next.js', () => {
    const ctx = buildContext(makeConfig());
    expect(ctx.isReact).toBe(true);
    expect(ctx.isFrontend).toBe(true);
    expect(ctx.isMobile).toBe(false);
    expect(ctx.isTypescript).toBe(true);
  });

  it('sets isMobile true for Expo', () => {
    const ctx = buildContext(makeConfig({
      stack: { language: 'typescript', runtime: 'react-native', framework: 'expo', uiLibrary: 'tamagui', stateManagement: 'zustand', database: 'supabase', auth: null },
    }));
    expect(ctx.isMobile).toBe(true);
    expect(ctx.isReact).toBe(true);
  });

  it('sets isReact false for Python', () => {
    const ctx = buildContext(makeConfig({
      stack: { language: 'python', runtime: 'python', framework: 'fastapi', uiLibrary: null, stateManagement: null, database: 'sqlalchemy', auth: null },
    }));
    expect(ctx.isReact).toBe(false);
    expect(ctx.isFrontend).toBe(false);
    expect(ctx.isTypescript).toBe(false);
  });

  it('builds stack items list', () => {
    const ctx = buildContext(makeConfig());
    expect(ctx.stackItems).toContain('Typescript (node)');
    expect(ctx.stackItems).toContain('Nextjs');
    expect(ctx.stackItems).toContain('Tailwind');
    expect(ctx.stackItems).toContain('Zustand');
    expect(ctx.stackItems).toContain('Prisma');
  });

  it('builds review checklist with TypeScript and React rules', () => {
    const ctx = buildContext(makeConfig());
    const ruleNames = ctx.reviewChecklist.map((r) => r.name);
    expect(ruleNames).toContain('No `any`');
    expect(ruleNames).toContain('DRY');
    expect(ruleNames).toContain('useCallback');
    expect(ruleNames).toContain('useMemo');
  });

  it('excludes React rules for non-React projects', () => {
    const ctx = buildContext(makeConfig({
      stack: { language: 'python', runtime: 'python', framework: 'fastapi', uiLibrary: null, stateManagement: null, database: null, auth: null },
    }));
    const ruleNames = ctx.reviewChecklist.map((r) => r.name);
    expect(ruleNames).not.toContain('useCallback');
    expect(ruleNames).not.toContain('useMemo');
    expect(ruleNames).not.toContain('No `any`');
    expect(ruleNames).toContain('DRY');
  });
});
