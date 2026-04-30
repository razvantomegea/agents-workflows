import { generateAll } from '../../src/generator/index.js';
import { findFile, getContent, makeStackConfig } from './fixtures.js';

const REFINE_PATH = 'AGENTS_REFINE.md';

const REQUIRED_HEADINGS = [
  '## 1. Your mission',
  '## 2. Inputs to read first',
  '## 3. Audit targets',
  '## 4. Propose changes (do not edit yet)',
  '## 5. Stop conditions',
  '## 6. Verification hand-off',
];

const REQUIRED_PRD_REFS = ['§1.3', '§1.6', '§1.13', '§2.1'];

describe('refinement prompt generator', () => {
  it('emits AGENTS_REFINE.md by default with all mandated sections, agents, commands, and PRD refs', async () => {
    const config = makeStackConfig();
    const files = await generateAll(config);
    const content = getContent(files, REFINE_PATH);

    for (const heading of REQUIRED_HEADINGS) {
      expect(content).toContain(heading);
    }

    expect(content).toContain('.claude/agents/architect.md');
    expect(content).toContain('.claude/agents/implementer.md');
    expect(content).toContain('.claude/agents/code-reviewer.md');
    expect(content).toContain('.claude/agents/security-reviewer.md');
    expect(content).toContain('.claude/agents/code-optimizer.md');
    expect(content).toContain('.claude/agents/test-writer.md');
    expect(content).toContain('.claude/agents/reviewer.md');
    expect(content).toContain('.claude/agents/ui-designer.md');
    expect(content).toContain('.claude/agents/e2e-tester.md');
    expect(content).toContain('.codex/skills/architect/SKILL.md');
    expect(content).toContain('.codex/skills/implementer/SKILL.md');
    expect(content).toContain('.codex/skills/code-reviewer/SKILL.md');
    expect(content).toContain('.codex/skills/security-reviewer/SKILL.md');
    expect(content).toContain('.codex/skills/code-optimizer/SKILL.md');
    expect(content).toContain('.codex/skills/test-writer/SKILL.md');
    expect(content).toContain('.codex/skills/reviewer/SKILL.md');
    expect(content).toContain('.codex/skills/ui-designer/SKILL.md');
    expect(content).toContain('.codex/skills/e2e-tester/SKILL.md');

    expect(content).toContain(config.commands.typeCheck);
    expect(content).toContain(config.commands.test);
    expect(content).toContain(config.commands.lint);

    for (const ref of REQUIRED_PRD_REFS) {
      expect(content).toContain(ref);
    }

    expect(content).toContain(config.project.name);
  });

  it('omits disabled agents from the audit list', async () => {
    const config = makeStackConfig({
      agents: {
        architect: true,
        implementer: true,
        implementerVariant: 'generic',
        codeReviewer: true,
        securityReviewer: false,
        codeOptimizer: true,
        testWriter: true,
        e2eTester: false,
        reviewer: true,
        uiDesigner: false,
      },
    });
    const files = await generateAll(config);
    const content = getContent(files, REFINE_PATH);

    expect(content).not.toContain('.claude/agents/security-reviewer.md');
    expect(content).not.toContain('.claude/agents/ui-designer.md');
    expect(content).not.toContain('.claude/agents/e2e-tester.md');
    expect(content).not.toContain('.codex/skills/security-reviewer/SKILL.md');
    expect(content).not.toContain('.codex/skills/ui-designer/SKILL.md');
    expect(content).not.toContain('.codex/skills/e2e-tester/SKILL.md');
  });

  it('uses target-specific generated agent paths in AGENTS_REFINE.md', async () => {
    const config = makeStackConfig({
      targets: { claudeCode: false, codexCli: true, cursor: false, copilot: false, windsurf: false },
    });
    const files = await generateAll(config);
    const content = getContent(files, REFINE_PATH);

    expect(content).toContain('.codex/skills/implementer/SKILL.md');
    expect(content).not.toContain('.claude/agents/implementer.md');
    expect(content).not.toContain('.claude/agents/');
  });

  it('does not reference Codex skill paths when Codex output is disabled', async () => {
    const config = makeStackConfig({
      targets: { claudeCode: true, codexCli: false, cursor: false, copilot: false, windsurf: false },
    });
    const files = await generateAll(config);
    const content = getContent(files, REFINE_PATH);

    expect(content).toContain('.claude/agents/implementer.md');
    expect(content).not.toContain('.codex/skills/');
  });

  it('omits AGENTS_REFINE.md entirely when refinePrompt: false', async () => {
    const files = await generateAll(makeStackConfig(), { refinePrompt: false });
    expect(findFile(files, REFINE_PATH)).toBeUndefined();
  });

  it('emits AGENTS_REFINE.md when refinePrompt: true', async () => {
    const files = await generateAll(makeStackConfig(), { refinePrompt: true });
    expect(findFile(files, REFINE_PATH)).toBeDefined();
  });
});
