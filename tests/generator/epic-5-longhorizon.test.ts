import { generateAll } from '../../src/generator/index.js';
import type { GeneratedFile } from '../../src/generator/types.js';
import { makeStackConfig, findFile, getContent } from './fixtures.js';

const LONGHORIZON_ENABLED_COMMANDS = {
  workflowPlan: true,
  workflowFix: true,
  externalReview: true,
  workflowLonghorizon: true,
  workflowTcr: false,
};

const LONGHORIZON_CODEX_COMMANDS = {
  ...LONGHORIZON_ENABLED_COMMANDS,
  externalReview: false,
};

const LONGHORIZON_DISABLED_COMMANDS = {
  ...LONGHORIZON_CODEX_COMMANDS,
  workflowLonghorizon: false,
};

const CLAUDE_ONLY_TARGETS = { claudeCode: true, codexCli: false };
const BOTH_TARGETS = { claudeCode: true, codexCli: true };

describe('Epic 5 T1 — workflow-longhorizon: enabled (claudeCode only)', () => {
  let files: GeneratedFile[];

  beforeAll(async () => {
    files = await generateAll(
      makeStackConfig({
        selectedCommands: LONGHORIZON_ENABLED_COMMANDS,
        targets: CLAUDE_ONLY_TARGETS,
      }),
    );
  });

  it('emits .claude/commands/workflow-longhorizon.md', () => {
    expect(findFile(files, '.claude/commands/workflow-longhorizon.md')).toBeDefined();
  });

  it('does not emit .codex/prompts/workflow-longhorizon.md when codexCli is disabled', () => {
    expect(findFile(files, '.codex/prompts/workflow-longhorizon.md')).toBeUndefined();
  });

  it('contains <session_bootstrap> tag', () => {
    const content = getContent(files, '.claude/commands/workflow-longhorizon.md');
    expect(content).toContain('<session_bootstrap>');
  });

  it('contains all 11 numbered steps in the bootstrap protocol', () => {
    const content = getContent(files, '.claude/commands/workflow-longhorizon.md');
    for (let step = 1; step <= 11; step++) {
      expect(content).toMatch(new RegExp(`^${step}\\.`, 'm'));
    }
  });

  it('references feature_list.json', () => {
    const content = getContent(files, '.claude/commands/workflow-longhorizon.md');
    expect(content).toContain('feature_list.json');
  });

  it('contains passes: false sentinel', () => {
    const content = getContent(files, '.claude/commands/workflow-longhorizon.md');
    expect(content).toContain('passes: false');
  });

  it('requires end-to-end verification before passes: true', () => {
    const content = getContent(files, '.claude/commands/workflow-longhorizon.md');
    expect(content).toContain('passes: false');
    expect(content).toContain('passes=true');
    expect(content).toContain('end-to-end verification');
  });

  it('references claude-progress.txt', () => {
    const content = getContent(files, '.claude/commands/workflow-longhorizon.md');
    expect(content).toContain('claude-progress.txt');
  });

  it('contains the "Do not finish multiple features" clause', () => {
    const content = getContent(files, '.claude/commands/workflow-longhorizon.md');
    expect(content).toContain('Do not try to finish multiple features in one session');
  });

  it('contains the "Do not flip passes=true" clause', () => {
    const content = getContent(files, '.claude/commands/workflow-longhorizon.md');
    expect(content).toContain('Do not flip passes=true without end-to-end verification');
  });

  it('contains the "Do not edit or remove feature entries" clause', () => {
    const content = getContent(files, '.claude/commands/workflow-longhorizon.md');
    expect(content).toContain('Do not edit or remove feature entries');
  });
});

describe('Epic 5 T1 — workflow-longhorizon: enabled with codexCli target', () => {
  let files: GeneratedFile[];

  beforeAll(async () => {
    files = await generateAll(
      makeStackConfig({
        selectedCommands: LONGHORIZON_CODEX_COMMANDS,
        targets: BOTH_TARGETS,
      }),
    );
  });

  it('emits .claude/commands/workflow-longhorizon.md', () => {
    expect(findFile(files, '.claude/commands/workflow-longhorizon.md')).toBeDefined();
  });

  it('emits .codex/prompts/workflow-longhorizon.md when codexCli is enabled', () => {
    expect(findFile(files, '.codex/prompts/workflow-longhorizon.md')).toBeDefined();
  });
});

describe('Epic 5 T1 — workflow-longhorizon: disabled', () => {
  let files: GeneratedFile[];

  beforeAll(async () => {
    files = await generateAll(
      makeStackConfig({
        selectedCommands: LONGHORIZON_DISABLED_COMMANDS,
        targets: BOTH_TARGETS,
      }),
    );
  });

  it('does not emit .claude/commands/workflow-longhorizon.md', () => {
    expect(findFile(files, '.claude/commands/workflow-longhorizon.md')).toBeUndefined();
  });

  it('does not emit .codex/prompts/workflow-longhorizon.md', () => {
    expect(findFile(files, '.codex/prompts/workflow-longhorizon.md')).toBeUndefined();
  });
});
