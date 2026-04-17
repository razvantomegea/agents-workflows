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
    detectedAiAgents: { claudeCode: false, codexCli: false, cursor: false, aider: false, continueDev: false, copilot: false, windsurf: false, gemini: false },
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

  it('renders modernized agent frontmatter and structured safety sections', async () => {
    const files = await generateAll(makeConfig());
    const agentFiles = files.filter((file) => file.path.startsWith('.claude/agents/'));

    expect(agentFiles).toHaveLength(8);

    for (const file of agentFiles) {
      expect(file.content).toMatch(/^tools: .+$/m);
      expect(file.content).toContain('<constraints>');
      expect(file.content).toContain('<uncertainty>');
      expect(file.content.split(/\r?\n/).length).toBeLessThanOrEqual(200);
    }

    const codeReviewer = agentFiles.find((file) => file.path.endsWith('code-reviewer.md'));
    expect(codeReviewer?.content).toMatch(/^tools: Read, Grep, Glob, Bash$/m);
    expect(codeReviewer?.content).not.toMatch(/^tools: .*?\b(?:Edit|Write)\b/m);
  });
});
