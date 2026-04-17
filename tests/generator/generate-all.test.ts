import { generateAll } from '../../src/generator/index.js';
import type { StackConfig } from '../../src/schema/stack-config.js';

function makeConfig(): StackConfig {
  return {
    project: { name: 'test-app', description: 'A test app', locale: 'en', localeRules: [] },
    stack: { language: 'typescript', runtime: 'node', framework: 'nextjs', uiLibrary: 'tailwind', stateManagement: 'zustand', database: 'prisma', auth: null },
    tooling: { packageManager: 'pnpm', packageManagerPrefix: 'pnpm', testFramework: 'jest', testLibrary: 'react-testing-library', e2eFramework: 'playwright', linter: 'eslint', formatter: 'prettier' },
    paths: { sourceRoot: 'src/', componentsDir: 'src/components/', hooksDir: 'src/hooks/', utilsDir: 'src/utils/', testsDir: 'tests/', designTokensFile: null, i18nDir: null, testConfigFile: null },
    commands: { typeCheck: 'pnpm check-types', test: 'pnpm test', lint: 'pnpm lint', format: null, build: null, dev: null },
    conventions: { componentStyle: 'arrow', propsStyle: 'readonly', maxFileLength: 200, testColocation: true, barrelExports: true, strictTypes: true },
    agents: { architect: true, implementer: true, codeReviewer: true, codeOptimizer: true, testWriter: true, e2eTester: true, reviewer: true, uiDesigner: true },
    selectedCommands: { workflowPlan: true, workflowFix: true, externalReview: true },
    targets: { claudeCode: true, codexCli: true },
  };
}

describe('generateAll', () => {
  it('renders all enabled templates with partial includes', async () => {
    const files = await generateAll(makeConfig());
    const paths = files.map((file) => file.path);

    expect(paths).toContain('.claude/agents/architect.md');
    expect(paths).toContain('.codex/skills/architect/SKILL.md');
    expect(paths).toContain('CLAUDE.md');
    expect(paths).toContain('AGENTS.md');
    expect(paths).toContain('.claude/commands/workflow-plan.md');
    expect(files.length).toBeGreaterThan(0);

    const emptyFiles = files.filter((file) => file.content.trim().length === 0);
    if (emptyFiles.length > 0) {
      const emptyFilePaths = emptyFiles.map((file) => file.path).join(', ');
      throw new Error(`Generated files with empty content: ${emptyFilePaths}`);
    }
    expect(emptyFiles.length).toBe(0);
  });
});
