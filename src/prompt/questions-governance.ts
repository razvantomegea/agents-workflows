import { confirm } from '@inquirer/prompts';
import type { DetectedStack } from '../detector/types.js';

export async function askTargets(
  detected: DetectedStack['aiAgents'],
): Promise<{ claudeCode: boolean; codexCli: boolean }> {
  const claudeDefault = detected.hasClaudeCode || !detected.hasCodexCli;
  const codexDefault = detected.hasCodexCli;
  const claudeCode = await confirm({ message: 'Generate Claude Code config (.claude/)?', default: claudeDefault });
  const codexCli = await confirm({ message: 'Generate Codex CLI config (.codex/)?', default: codexDefault });

  return { claudeCode, codexCli };
}

export async function askGovernance(): Promise<{ enabled: boolean }> {
  const enabled = await confirm({
    message: 'Ship governance scaffolding (.github/pull_request_template.md + docs/GOVERNANCE.md)?',
    default: false,
  });
  return { enabled };
}
