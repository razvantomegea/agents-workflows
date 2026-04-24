import { generateAll } from '../../src/generator/index.js';
import type { GeneratedFile } from '../../src/generator/types.js';
import { makeStackConfig, findFile, getContent } from './fixtures.js';

const ENABLED_COMMANDS = {
  workflowPlan: true,
  workflowFix: true,
  externalReview: false,
  workflowLonghorizon: false,
  workflowTcr: true,
};

const DISABLED_COMMANDS = {
  workflowPlan: true,
  workflowFix: true,
  externalReview: false,
  workflowLonghorizon: false,
  workflowTcr: false,
};

describe('Epic 8 T3 — workflow-tcr: enabled (claudeCode only)', () => {
  let files: GeneratedFile[];

  beforeAll(async () => {
    files = await generateAll(
      makeStackConfig({
        selectedCommands: ENABLED_COMMANDS,
        targets: { claudeCode: true, codexCli: false },
      }),
    );
  });

  it('emits .claude/commands/workflow-tcr.md when flag is true', () => {
    expect(findFile(files, '.claude/commands/workflow-tcr.md')).toBeDefined();
  });

  it('does not emit .codex/prompts/workflow-tcr.md when codexCli is disabled', () => {
    expect(findFile(files, '.codex/prompts/workflow-tcr.md')).toBeUndefined();
  });

  it('contains resolved test command value', () => {
    const content = getContent(files, '.claude/commands/workflow-tcr.md');
    expect(content).toContain('pnpm test');
  });

  it('contains "test && commit || revert" semantics description', () => {
    const content = getContent(files, '.claude/commands/workflow-tcr.md');
    expect(content).toContain('test && commit || revert');
  });

  it('warns about mainBranch', () => {
    const content = getContent(files, '.claude/commands/workflow-tcr.md');
    expect(content).toContain('main');
    expect(content).toContain('Never run TCR on');
  });

  it('warns about the destructive nature of git reset --hard', () => {
    const content = getContent(files, '.claude/commands/workflow-tcr.md');
    expect(content).toContain('git reset --hard');
    expect(content).toContain('destructive');
  });

  it('references the deny list conflict', () => {
    const content = getContent(files, '.claude/commands/workflow-tcr.md');
    expect(content).toContain('deny list');
  });
});

describe('Epic 8 T3 — workflow-tcr: enabled with codexCli target', () => {
  let files: GeneratedFile[];

  beforeAll(async () => {
    files = await generateAll(
      makeStackConfig({
        selectedCommands: ENABLED_COMMANDS,
        targets: { claudeCode: true, codexCli: true },
      }),
    );
  });

  it('emits .claude/commands/workflow-tcr.md', () => {
    expect(findFile(files, '.claude/commands/workflow-tcr.md')).toBeDefined();
  });

  it('emits .codex/prompts/workflow-tcr.md when codexCli is enabled', () => {
    expect(findFile(files, '.codex/prompts/workflow-tcr.md')).toBeDefined();
  });
});

describe('Epic 8 T3 — workflow-tcr: disabled by default', () => {
  let files: GeneratedFile[];

  beforeAll(async () => {
    files = await generateAll(
      makeStackConfig({
        selectedCommands: DISABLED_COMMANDS,
        targets: { claudeCode: true, codexCli: true },
      }),
    );
  });

  it('does not emit .claude/commands/workflow-tcr.md when flag is false', () => {
    expect(findFile(files, '.claude/commands/workflow-tcr.md')).toBeUndefined();
  });

  it('does not emit .codex/prompts/workflow-tcr.md when flag is false', () => {
    expect(findFile(files, '.codex/prompts/workflow-tcr.md')).toBeUndefined();
  });
});
