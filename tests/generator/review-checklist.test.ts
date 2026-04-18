import { buildReviewChecklist } from '../../src/generator/review-checklist-rules.js';
import type { StackConfig } from '../../src/schema/stack-config.js';

function makeConfig(overrides: Partial<StackConfig['stack']> = {}): StackConfig {
  return {
    project: { name: 'test', description: 'test', locale: 'en', localeRules: [], docsFile: null },
    stack: { language: 'typescript', runtime: 'node', framework: 'nextjs', uiLibrary: null, stateManagement: null, database: null, auth: null, ...overrides },
    tooling: { packageManager: 'npm', packageManagerPrefix: 'npm run', testFramework: 'jest', testLibrary: null, e2eFramework: null, linter: null, formatter: null },
    paths: { sourceRoot: 'src/', componentsDir: null, hooksDir: null, utilsDir: 'src/utils/', testsDir: null, designTokensFile: null, i18nDir: null, testConfigFile: null },
    commands: { typeCheck: null, test: 'npm test', lint: null, format: null, build: null, dev: null },
    conventions: { componentStyle: 'arrow', propsStyle: 'readonly', maxFileLength: 200, testColocation: true, barrelExports: true, strictTypes: true },
    agents: { architect: true, implementer: true, codeReviewer: true, codeOptimizer: true, testWriter: true, e2eTester: false, reviewer: true, uiDesigner: true },
    selectedCommands: { workflowPlan: true, workflowFix: true, externalReview: false },
    targets: { claudeCode: true, codexCli: false },
    detectedAiAgents: { claudeCode: false, codexCli: false, cursor: false, aider: false, continueDev: false, copilot: false, windsurf: false, gemini: false },
    monorepo: null,
  };
}

describe('buildReviewChecklist', () => {
  it('includes TypeScript rules for TS projects', () => {
    const rules = buildReviewChecklist(makeConfig());
    const names = rules.map((r) => r.name);
    expect(names).toContain('No `any`');
    expect(names).toContain('No redundant type aliases');
  });

  it('includes React rules for React framework', () => {
    const rules = buildReviewChecklist(makeConfig());
    const names = rules.map((r) => r.name);
    expect(names).toContain('useCallback');
    expect(names).toContain('useMemo');
    expect(names).toContain('JSX extraction');
  });

  it('excludes React rules for Python', () => {
    const rules = buildReviewChecklist(makeConfig({ language: 'python', framework: 'fastapi' }));
    const names = rules.map((r) => r.name);
    expect(names).not.toContain('useCallback');
    expect(names).not.toContain('useMemo');
  });

  it('always includes universal rules', () => {
    const rules = buildReviewChecklist(makeConfig({ language: 'go', framework: 'chi' }));
    const names = rules.map((r) => r.name);
    expect(names).toContain('DRY');
    expect(names).toContain('Object params');
    expect(names).toContain('File length');
  });

  it('includes i18n rule when locale rules exist', () => {
    const config = makeConfig();
    config.project.localeRules = ['Romanian diacritics'];
    const rules = buildReviewChecklist(config);
    const names = rules.map((r) => r.name);
    expect(names).toContain('i18n compliance');
  });

  it('includes stack-specific database and state rules', () => {
    const rules = buildReviewChecklist(makeConfig({
      database: 'drizzle',
      stateManagement: 'tanstack-query',
    }));
    const names = rules.map((r) => r.name);
    expect(names).toContain('Drizzle schema alignment');
    expect(names).toContain('TanStack Query keys');
  });
});
