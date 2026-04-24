import { confirm } from '@inquirer/prompts';
import type { DetectedStack } from '../detector/types.js';

/**
 * Prompt the user to choose whether to generate Claude Code and Codex CLI configuration scaffolding.
 *
 * @param detected - Detected AI agent capabilities; used to determine the default answers (`hasClaudeCode` and `hasCodexCli` influence defaults).
 * @returns An object with `claudeCode` set to `true` if the user opted to generate the `.claude/` config and `codexCli` set to `true` if the user opted to generate the `.codex/` config.
 */
export async function askTargets(
  detected: DetectedStack['aiAgents'],
): Promise<{ claudeCode: boolean; codexCli: boolean }> {
  const claudeDefault = detected.hasClaudeCode || !detected.hasCodexCli;
  const codexDefault = detected.hasCodexCli;
  const claudeCode = await confirm({ message: 'Generate Claude Code config (.claude/)?', default: claudeDefault });
  const codexCli = await confirm({ message: 'Generate Codex CLI config (.codex/)?', default: codexDefault });

  return { claudeCode, codexCli };
}

/**
 * Ask the user whether to include repository governance scaffolding.
 *
 * @returns An object with `enabled` set to `true` if the user opts to ship governance files, `false` otherwise.
 */
export async function askGovernance(): Promise<{ enabled: boolean }> {
  const enabled = await confirm({
    message: 'Ship governance scaffolding (.github/pull_request_template.md + docs/GOVERNANCE.md)?',
    default: false,
  });
  return { enabled };
}
