import { generateAll } from '../../src/generator/index.js';
import { mergeManagedTail } from '../../src/generator/managed-sentinel.js';
import { mergeJson } from '../../src/generator/merge-json.js';
import { makeStackConfig } from './fixtures.js';
import { CODE_REVIEWER_MAX_LINES } from './code-reviewer-config.js';

const makeConfig = makeStackConfig;

describe('generateAll', () => {
  it('renders all enabled templates with partial includes', async () => {
    const files = await generateAll(makeConfig());
    const paths = files.map((file) => file.path);

    expect(paths).toContain('.claude/agents/architect.md');
    expect(paths).toContain('.claude/agents/react-ts-senior.md');
    expect(paths).toContain('.claude/agents/security-reviewer.md');
    expect(paths).toContain('.codex/skills/architect/SKILL.md');
    expect(paths).toContain('.codex/skills/react-ts-senior/SKILL.md');
    expect(paths).toContain('.codex/skills/security-reviewer/SKILL.md');
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

    for (const file of files) {
      expect(file.content).not.toContain('[object Promise]');
      expect(file.content).not.toMatch(/&#\d+;|&amp;|&quot;|&lt;|&gt;/);
    }
  });

  it('renders project descriptions as markdown-safe text', async () => {
    const config = makeConfig();
    config.project.description = "A driver's app that shows <fuel> costs & speed";
    const files = await generateAll(config);

    const claudeMd = files.find((file) => file.path === 'CLAUDE.md');
    expect(claudeMd).toBeDefined();
    expect(claudeMd?.content).toContain("driver's");
    expect(claudeMd?.content).toContain('&lt;fuel&gt;');
    expect(claudeMd?.content).toContain('&amp; speed');
    expect(claudeMd?.content).not.toContain('&#39;');
  });

  it('injects docs reference into CLAUDE.md, AGENTS.md, and every agent when docsFile is set', async () => {
    const config = makeConfig();
    config.project.docsFile = 'PRD.md';
    const files = await generateAll(config);

    const claudeMd = files.find((file) => file.path === 'CLAUDE.md');
    const agentsMd = files.find((file) => file.path === 'AGENTS.md');
    expect(claudeMd?.content).toContain('## Primary Documentation');
    expect(claudeMd?.content).toContain('`PRD.md`');
    expect(agentsMd?.content).toContain('## Primary Documentation');
    expect(agentsMd?.content).toContain('`PRD.md`');

    const agentFiles = files.filter((file) => file.path.startsWith('.claude/agents/'));
    for (const file of agentFiles) {
      expect(file.content).toContain('## Primary Documentation');
      expect(file.content).toContain('`PRD.md`');
    }

    const skillFiles = files.filter((file) => file.path.startsWith('.codex/skills/'));
    for (const file of skillFiles) {
      expect(file.content).toContain('## Primary Documentation');
      expect(file.content).toContain('`PRD.md`');
    }
  });

  it('attaches merge callbacks to generated root files with supported merge semantics', async () => {
    const files = await generateAll(makeConfig());
    const filesByPath = new Map(files.map((file) => [file.path, file]));

    expect(filesByPath.get('CLAUDE.md')?.merge).toBe(mergeManagedTail);
    expect(filesByPath.get('AGENTS.md')?.merge).toBe(mergeManagedTail);
    expect(filesByPath.get('.claude/settings.json')?.merge).toBe(mergeJson);
  });

  it('attaches a managed-tail merge callback to nested AGENTS.md files', async () => {
    const config = makeConfig();
    config.monorepo = {
      isRoot: true,
      tool: 'pnpm',
      workspaces: [
        {
          path: 'api',
          language: 'python',
          runtime: 'python',
          framework: null,
          packageManager: 'uv',
          commands: { typeCheck: null, test: 'pytest', lint: null, build: null },
        },
      ],
    };

    const files = await generateAll(config);
    const nestedAgentsMd = files.find((file) => file.path === 'api/AGENTS.md');

    expect(nestedAgentsMd?.merge).toBe(mergeManagedTail);
  });

  it('renders configured project structure paths in CLAUDE.md and AGENTS.md', async () => {
    const config = makeConfig({
      paths: {
        sourceRoot: 'app/',
        componentsDir: 'app/ui/',
        hooksDir: 'app/hooks/',
        utilsDir: 'app/lib/',
        testsDir: 'spec/',
        designTokensFile: 'app/theme/tokens.ts',
        i18nDir: 'app/i18n/',
        testConfigFile: 'jest.config.ts',
      },
    });
    const files = await generateAll(config);
    const claudeMd = files.find((file) => file.path === 'CLAUDE.md');
    const agentsMd = files.find((file) => file.path === 'AGENTS.md');

    for (const content of [claudeMd?.content, agentsMd?.content]) {
      expect(content).toContain('## Project Structure');
      expect(content).toContain('|-- app/    # source root');
      expect(content).toContain('|-- app/ui/    # reusable UI components');
      expect(content).toContain('|-- app/hooks/    # application hooks');
      expect(content).toContain('|-- app/lib/    # utilities and business logic');
      expect(content).toContain('|-- spec/    # tests');
      expect(content).toContain('|-- app/theme/tokens.ts    # design tokens');
      expect(content).toContain('|-- app/i18n/    # internationalization resources');
      expect(content).toContain('`-- jest.config.ts    # test configuration');
    }
  });

  it('renders a Workspaces section in CLAUDE.md when config.monorepo.isRoot is true', async () => {
    const config = makeConfig();
    config.monorepo = {
      isRoot: true,
      tool: 'pnpm',
      workspaces: [
        {
          path: 'mobile',
          language: 'typescript',
          runtime: 'node',
          framework: null,
          packageManager: 'pnpm',
          commands: { typeCheck: 'pnpm check-types', test: 'pnpm test', lint: 'pnpm lint', build: 'pnpm build' },
        },
        {
          path: 'ingestion',
          language: 'python',
          runtime: 'python',
          framework: null,
          packageManager: 'uv',
          commands: { typeCheck: null, test: 'pytest', lint: null, build: null },
        },
      ],
    };
    const files = await generateAll(config);

    const claudeMd = files.find((file) => file.path === 'CLAUDE.md');
    expect(claudeMd?.content).toContain('## Workspaces');
    expect(claudeMd?.content).toContain('`mobile`');
    expect(claudeMd?.content).toContain('`ingestion`');

    const agentsMd = files.find((file) => file.path === 'AGENTS.md');
    expect(agentsMd?.content).toContain('## Workspaces');
  });

  it('emits nested AGENTS.md only for workspaces whose language differs from root (case-insensitive)', async () => {
    const config = makeConfig(); // root language: typescript
    config.monorepo = {
      isRoot: true,
      tool: 'pnpm',
      workspaces: [
        {
          path: 'web',
          language: 'TypeScript', // same as root (different case) — no nested AGENTS.md
          runtime: 'node',
          framework: null,
          packageManager: 'pnpm',
          commands: { typeCheck: 'pnpm check-types', test: 'pnpm test', lint: null, build: null },
        },
        {
          path: 'api',
          language: 'python', // different — should get nested AGENTS.md
          runtime: 'python',
          framework: 'fastapi',
          packageManager: 'uv',
          commands: { typeCheck: 'mypy .', test: 'pytest', lint: 'ruff check .', build: null },
        },
        {
          path: 'mobile',
          language: '', // empty language — should be skipped
          runtime: null,
          framework: null,
          packageManager: 'unknown',
          commands: { typeCheck: null, test: 'make test', lint: null, build: null },
        },
      ],
    };
    const files = await generateAll(config);

    const paths = files.map((file) => file.path);
    expect(paths).not.toContain('web/AGENTS.md');
    expect(paths).not.toContain('mobile/AGENTS.md');
    expect(paths).toContain('api/AGENTS.md');

    const nestedAgents = files.find((file) => file.path === 'api/AGENTS.md');
    expect(nestedAgents?.content).toContain('workspace: api');
    expect(nestedAgents?.content).toContain('Language: `python`');
    expect(nestedAgents?.content).toContain('Framework: `fastapi`');
    expect(nestedAgents?.content).toContain('mypy .');
    expect(nestedAgents?.content).toContain('agents-workflows:managed-start');
    expect(nestedAgents?.content).toContain('agents-workflows:managed-end');
    expect(nestedAgents?.merge).toBe(mergeManagedTail);
  });

  it('renders the configured primary branch in workflow and git guidance', async () => {
    const config = makeConfig();
    config.project.mainBranch = 'develop';
    const files = await generateAll(config);

    const workflowPlan = files.find((file) => file.path === '.claude/commands/workflow-plan.md');
    const workflowFix = files.find((file) => file.path === '.claude/commands/workflow-fix.md');
    const externalReview = files.find((file) => file.path === '.claude/commands/external-review.md');
    const claudeMd = files.find((file) => file.path === 'CLAUDE.md');
    const architect = files.find((file) => file.path === '.claude/agents/architect.md');

    expect(workflowPlan?.content).toContain('git checkout develop && git pull origin develop');
    expect(workflowPlan?.content).not.toContain('git checkout main && git pull origin main');
    expect(workflowFix?.content).toContain('merging `develop`');
    expect(externalReview?.content).toContain('compared to `develop`');
    expect(claudeMd?.content).toContain('from up-to-date `develop`');
    expect(architect?.content).toContain('from `develop`');
  });

  it('omits the Workspaces section for single-package projects', async () => {
    const config = makeConfig();
    config.monorepo = null;
    const files = await generateAll(config);
    const claudeMd = files.find((file) => file.path === 'CLAUDE.md');
    expect(claudeMd?.content).not.toContain('## Workspaces');
  });

  it('omits docs reference when docsFile is null', async () => {
    const config = makeConfig();
    config.project.docsFile = null;
    const files = await generateAll(config);

    for (const file of files) {
      expect(file.content).not.toContain('## Primary Documentation');
    }
  });

  it('renders the roadmap epic phase in workflow commands when roadmapFile is set', async () => {
    const config = makeConfig();
    config.project.docsFile = 'README.md';
    config.project.roadmapFile = 'PRD.md';
    const files = await generateAll(config);

    const workflowPlan = files.find((file) => file.path === '.claude/commands/workflow-plan.md');
    const workflowFix = files.find((file) => file.path === '.claude/commands/workflow-fix.md');
    expect(workflowPlan?.content).toContain('### Phase 4 — Mark epic done in `PRD.md`');
    expect(workflowPlan?.content).toContain('### Phase 5 — Done');
    expect(workflowFix?.content).toContain('Update `PRD.md` (if applicable)');
  });

  it('omits the roadmap epic phase and renumbers when roadmapFile is null', async () => {
    const config = makeConfig();
    config.project.docsFile = 'PRD.md';
    config.project.roadmapFile = null;
    const files = await generateAll(config);

    const workflowPlan = files.find((file) => file.path === '.claude/commands/workflow-plan.md');
    const workflowFix = files.find((file) => file.path === '.claude/commands/workflow-fix.md');
    expect(workflowPlan?.content).not.toContain('Mark epic done');
    expect(workflowPlan?.content).toContain('### Phase 4 — Done');
    expect(workflowPlan?.content).not.toContain('### Phase 5 — Done');
    expect(workflowFix?.content).not.toContain('Update `PRD.md`');
    expect(workflowFix?.content).not.toContain('items marked done');
  });

  it('emits tight SKILL.md frontmatter without blank lines after stripping model/color', async () => {
    const files = await generateAll(makeConfig());
    const skillFiles = files.filter((file) => file.path.startsWith('.codex/skills/') && file.path.endsWith('/SKILL.md'));
    expect(skillFiles.length).toBeGreaterThan(0);

    for (const file of skillFiles) {
      expect(file.content).not.toMatch(/^model: /m);
      expect(file.content).not.toMatch(/^color: /m);
      expect(file.content).not.toMatch(/tools: [^\n]+\n\n---/);
    }
  });

  it('renders non-empty templates for projects without a framework', async () => {
    const config = makeConfig();
    config.stack.framework = null;
    config.project.name = 'agents-workflows';
    config.project.description = 'Reusable AI agent configuration framework';
    config.paths.componentsDir = null;
    config.paths.hooksDir = null;
    config.agents.uiDesigner = false;

    const files = await generateAll(config);

    const implementer = files.find((file) => file.path === '.claude/agents/implementer.md');
    expect(implementer).toBeDefined();
    expect(implementer?.content).not.toContain('null /');
    expect(implementer?.content).not.toContain('null application');
    expect(implementer?.content).toContain('typescript');
    expect(implementer?.content).toContain('`agents-workflows`');

    for (const file of files) {
      expect(file.content.trim().length).toBeGreaterThan(0);
      expect(file.content).not.toContain('null /');
    }
  });

  it('renders modernized agent frontmatter and structured safety sections', async () => {
    const config = makeConfig();
    const files = await generateAll(config);
    const agentFiles = files.filter((file) => file.path.startsWith('.claude/agents/'));
    const expectedAgentCount = Object.values(config.agents).filter(Boolean).length;

    expect(agentFiles).toHaveLength(expectedAgentCount);

    for (const file of agentFiles) {
      expect(file.content).toMatch(/^tools: .+$/m);
      expect(file.content).toContain('<constraints>');
      expect(file.content).toContain('<uncertainty>');
      // implementer/ui-designer/e2e-tester carry Epic 4 content (§2.2 security, §2.4 API design, §2.6 git, §2.8 errors, §2.12 a11y); ≤280 per PLAN.md Epic 4 T7
      // code-reviewer carries the full §2.1 nine-section review checklist; raised from ≤250 (E3.T1)
      // to ≤320 to accommodate Epic 6 partials: observability (E6.T2), design-principles (E6.T3),
      // documentation (E6.T6).
      // architect raised from ≤280 to ≤300 to accommodate E6.T6 documentation partial.
      const lineLimit = file.path.endsWith('code-reviewer.md')
        ? CODE_REVIEWER_MAX_LINES
        : file.path.endsWith('architect.md')
          ? 300
          : 280;
      expect(file.content.split(/\r?\n/).length).toBeLessThanOrEqual(lineLimit);
    }

    const codeReviewer = agentFiles.find((file) => file.path.endsWith('code-reviewer.md'));
    expect(codeReviewer?.content).toMatch(/^tools: Read, Grep, Glob, Bash$/m);
    expect(codeReviewer?.content).not.toMatch(/^tools: .*?\b(?:Edit|Write)\b/m);
  });
});
