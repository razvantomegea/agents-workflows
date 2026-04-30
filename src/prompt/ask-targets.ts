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

/**
 * Computes the default target selections synchronously from detected AI agent presence.
 *
 * @param options - Input options as a readonly object.
 * @param options.detected - The AI agent detection results from `detectStack`.
 * @param options.githubDirPresent - Whether a `.github/` directory exists; used to pre-check
 *   the Copilot target even when Copilot is not detected on PATH. Defaults to `false`.
 *
 * @returns A `TargetSelections` object with each target defaulted to `true` when the
 *   corresponding tool was detected, and `claudeCode` additionally defaulted to `true`
 *   when no other tool is detected.
 */
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

/**
 * Asynchronously computes the default target selections, including a filesystem check for `.github/`.
 *
 * @param options - Input options.
 * @param options.detected - The AI agent detection results from `detectStack`.
 * @param options.projectRoot - Optional project root path; when provided, checks for `.github/` presence
 *   to pre-check the Copilot target.
 *
 * @returns A `TargetSelections` object with defaults derived from detection and filesystem state.
 */
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

/**
 * Presents a multi-select checkbox for agent target surfaces and returns the user's selections.
 *
 * @param options - Input options passed through to `resolveTargetDefaults` for default pre-checks.
 * @param options.detected - The AI agent detection results from `detectStack`.
 * @param options.projectRoot - Optional project root used to check for `.github/` presence.
 *
 * @returns A `TargetSelections` object representing which output surfaces to generate
 *   (Claude Code, Codex CLI, Cursor, Copilot, Windsurf).
 *
 * @remarks
 * Skipped under `--yes` — `resolveTargetDefaults` is called directly in the non-interactive branch
 * of `runPromptFlow` instead.
 */
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
