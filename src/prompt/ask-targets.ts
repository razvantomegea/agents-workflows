import { checkbox } from '@inquirer/prompts';
import { resolve } from 'node:path';
import type { DetectedAiAgent, DetectedAiAgents } from '../detector/types.js';
import { isDetected } from '../detector/detect-ai-agents.js';
import { fileExists } from '../utils/index.js';

export interface TargetSelections {
  claudeCode: boolean;
  codexCli: boolean;
  cursor: boolean;
  copilot: boolean;
  windsurf: boolean;
}

export interface AskTargetsOptions {
  detected: DetectedAiAgents;
  projectRoot?: string;
}

function findAgent(detected: DetectedAiAgents, id: DetectedAiAgent['id']): DetectedAiAgent | undefined {
  return detected.agents.find((agent: DetectedAiAgent) => agent.id === id);
}

export function resolveTargetDefaultsSync(
  options: Readonly<{ detected: DetectedAiAgents; githubDirPresent?: boolean }>,
): TargetSelections {
  const { detected, githubDirPresent = false } = options;
  const cursor = isDetected(findAgent(detected, 'cursor'));
  const copilotAgent = isDetected(findAgent(detected, 'copilot'));
  const windsurf = isDetected(findAgent(detected, 'windsurf'));
  const noOtherTool = !detected.hasCodexCli && !cursor && !copilotAgent && !windsurf;
  return {
    claudeCode: detected.hasClaudeCode || noOtherTool,
    codexCli: detected.hasCodexCli,
    cursor,
    copilot: copilotAgent || githubDirPresent,
    windsurf,
  };
}

export async function resolveTargetDefaults(options: AskTargetsOptions): Promise<TargetSelections> {
  const { detected, projectRoot } = options;
  const githubDirPresent = projectRoot ? await fileExists(resolve(projectRoot, '.github')) : false;
  return resolveTargetDefaultsSync({ detected, githubDirPresent });
}

const TARGET_CHOICES = [
  { name: 'Claude Code (.claude/)', value: 'claudeCode' as const },
  { name: 'Codex CLI (.codex/)', value: 'codexCli' as const },
  { name: 'Cursor (.cursor/rules/, .cursor/commands/)', value: 'cursor' as const },
  { name: 'VSCode + GitHub Copilot (.github/copilot-instructions.md, .github/prompts/)', value: 'copilot' as const },
  { name: 'Windsurf (.windsurf/rules/, .windsurf/workflows/)', value: 'windsurf' as const },
] as const;

type TargetKey = (typeof TARGET_CHOICES)[number]['value'];

export async function askTargets(options: AskTargetsOptions): Promise<TargetSelections> {
  const defaults = await resolveTargetDefaults(options);
  const choices = TARGET_CHOICES.map(({ name, value }: { name: string; value: TargetKey }) => ({
    name,
    value,
    checked: defaults[value],
  }));
  const selected = await checkbox<TargetKey>({
    message: 'Select agent target surfaces to generate:',
    choices,
  });
  const set = new Set<TargetKey>(selected);
  return {
    claudeCode: set.has('claudeCode'),
    codexCli: set.has('codexCli'),
    cursor: set.has('cursor'),
    copilot: set.has('copilot'),
    windsurf: set.has('windsurf'),
  };
}
