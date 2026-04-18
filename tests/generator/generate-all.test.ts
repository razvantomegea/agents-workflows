import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { generateAll } from '../../src/generator/index.js';
import { makeStackConfig } from './fixtures.js';

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

  it('preserves apostrophes and other markdown-special characters in project description', async () => {
    const config = makeConfig();
    config.project.description = "A driver's app that shows <fuel> costs & speed";
    const files = await generateAll(config);

    const claudeMd = files.find((file) => file.path === 'CLAUDE.md');
    expect(claudeMd).toBeDefined();
    expect(claudeMd?.content).toContain("driver's");
    expect(claudeMd?.content).toContain('<fuel>');
    expect(claudeMd?.content).toContain('& speed');
    expect(claudeMd?.content).not.toContain('&#39;');
    expect(claudeMd?.content).not.toContain('&amp;');
    expect(claudeMd?.content).not.toContain('&lt;');
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

  it('renders a Workspaces section in CLAUDE.md when config.monorepo.isRoot is true', async () => {
    const config = makeConfig();
    config.monorepo = { isRoot: true, tool: 'pnpm', workspaces: ['mobile', 'ingestion'] };
    const files = await generateAll(config);

    const claudeMd = files.find((file) => file.path === 'CLAUDE.md');
    expect(claudeMd?.content).toContain('## Workspaces');
    expect(claudeMd?.content).toContain('`mobile/`');
    expect(claudeMd?.content).toContain('`ingestion/`');

    const agentsMd = files.find((file) => file.path === 'AGENTS.md');
    expect(agentsMd?.content).toContain('## Workspaces');
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
      expect(file.content.split(/\r?\n/).length).toBeLessThanOrEqual(200);
    }

    const codeReviewer = agentFiles.find((file) => file.path.endsWith('code-reviewer.md'));
    expect(codeReviewer?.content).toMatch(/^tools: Read, Grep, Glob, Bash$/m);
    expect(codeReviewer?.content).not.toMatch(/^tools: .*?\b(?:Edit|Write)\b/m);
  });

  it('emits react-ts-senior only when agents.reactTsSenior is true and renders expected content', async () => {
    const files = await generateAll(makeConfig());
    const agent = files.find((file) => file.path === '.claude/agents/react-ts-senior.md');

    expect(agent).toBeDefined();
    expect(agent?.content).toContain('React + TypeScript');
    expect(agent?.content).toContain('Readonly<');
    expect(agent?.content).toContain('useCallback');
    expect(agent?.content).toContain('useMemo');
    expect(agent?.content).toContain('test-app');
    expect(agent?.content.split(/\r?\n/).length).toBeLessThanOrEqual(200);

    const templatePath = join(process.cwd(), 'src/templates/agents/react-ts-senior.md.ejs');
    const templateSource = await readFile(templatePath, 'utf8');
    expect(templateSource).not.toMatch(/Tamagui|Expo Router|Supabase|useTranslations|DataTestId/);

    const baseConfig = makeConfig();
    const disabledConfig = {
      ...baseConfig,
      agents: { ...baseConfig.agents, reactTsSenior: false },
    };
    const disabledFiles = await generateAll(disabledConfig);
    const disabledPaths = disabledFiles.map((file) => file.path);
    expect(disabledPaths).not.toContain('.claude/agents/react-ts-senior.md');
  });
});
