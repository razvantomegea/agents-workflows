import type { StackConfig } from '../../src/schema/stack-config.js';
import type { GeneratedFile } from '../../src/generator/types.js';
import { generateCopilotConfig } from '../../src/generator/copilot/index.js';
import { COPILOT_PROMPT_TOOLS, COPILOT_FORBIDDEN_TOOLS } from '../../src/generator/copilot/prompt-tool-allowlist.js';
import { buildContext } from '../../src/generator/build-context.js';
import { makeStackConfig } from './fixtures.js';

const FORBIDDEN_PROMPT_TOOLS = COPILOT_FORBIDDEN_TOOLS;

const TARGETS_COPILOT_OFF: StackConfig['targets'] = {
  claudeCode: true,
  codexCli: false,
  cursor: false,
  copilot: false,
  windsurf: false,
};

const TARGETS_COPILOT_ON: StackConfig['targets'] = {
  ...TARGETS_COPILOT_OFF,
  copilot: true,
};

describe('generateCopilotConfig', () => {
  it('returns empty array when copilot target disabled', async () => {
    const config = makeStackConfig({ targets: TARGETS_COPILOT_OFF });
    const files = await generateCopilotConfig(config, buildContext(config));
    expect(files).toHaveLength(0);
  });

  it('emits a single .github/copilot-instructions.md when copilot enabled', async () => {
    const config = makeStackConfig({ targets: TARGETS_COPILOT_ON });
    const files = await generateCopilotConfig(config, buildContext(config));
    const instructions = files.find((file: GeneratedFile) => file.path === '.github/copilot-instructions.md');
    expect(instructions).toBeDefined();
    expect(instructions?.content).toContain('GitHub Copilot Instructions');
    expect(instructions?.content).toContain('Dangerous operations');
    expect(instructions?.content).toContain('git push');
    expect(instructions?.content).toContain('rm -rf');
  });

  it('keeps copilot-instructions.md under 300 lines', async () => {
    const config = makeStackConfig({ targets: TARGETS_COPILOT_ON });
    const files = await generateCopilotConfig(config, buildContext(config));
    const instructions = files.find((file: GeneratedFile) => file.path === '.github/copilot-instructions.md');
    expect(instructions).toBeDefined();
    const lineCount = instructions!.content.split(/\r?\n/).length;
    expect(lineCount).toBeLessThanOrEqual(300);
  });

  it('emits selected prompt files with YAML frontmatter under .github/prompts/', async () => {
    const config = makeStackConfig({ targets: TARGETS_COPILOT_ON });
    const files = await generateCopilotConfig(config, buildContext(config));
    const promptPaths = files
      .filter((file: GeneratedFile) => file.path.startsWith('.github/prompts/'))
      .map((file: GeneratedFile) => file.path);
    expect(promptPaths).toContain('.github/prompts/workflow-plan.prompt.md');
    expect(promptPaths).toContain('.github/prompts/workflow-fix.prompt.md');
    expect(promptPaths).toContain('.github/prompts/external-review.prompt.md');
    const plan = files.find((file: GeneratedFile) => file.path === '.github/prompts/workflow-plan.prompt.md');
    expect(plan?.content.startsWith('---\n')).toBe(true);
    expect(plan?.content).toContain('tools:');
  });

  it('per-prompt tools allow-list never includes unbounded shell tools', () => {
    for (const tools of Object.values(COPILOT_PROMPT_TOOLS)) {
      for (const forbidden of FORBIDDEN_PROMPT_TOOLS) {
        expect(tools).not.toContain(forbidden);
      }
    }
  });

  it('workflow-plan tools are read-only (no editFiles per E9.T7)', () => {
    expect(COPILOT_PROMPT_TOOLS.workflowPlan).not.toContain('editFiles');
  });

  it('external-review tools are read-only', () => {
    expect(COPILOT_PROMPT_TOOLS.externalReview).not.toContain('editFiles');
  });
});
