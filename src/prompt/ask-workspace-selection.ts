import { checkbox } from '@inquirer/prompts';
import { sanitizeForLog } from '../utils/index.js';
import type { DetectedStack } from '../detector/types.js';

export interface AskWorkspaceSelectionOptions {
  detected: DetectedStack;
}

/**
 * Presents a multi-select checkbox listing all detected workspace paths and returns the user's selection.
 *
 * @param options - Input options.
 * @param options.detected - The full `DetectedStack`; its `workspaceStacks` array determines the choices.
 *
 * @returns An array of selected workspace path strings. Returns an empty array immediately when
 *   `detected.workspaceStacks` is empty (non-monorepo project or no workspaces detected).
 *
 * @remarks
 * All workspaces are pre-checked by default.
 * Skipped under `--yes` / `--no-prompt` / `--non-interactive` — `resolveWorkspaceSelection`
 * returns all paths without prompting in those modes.
 */
export async function askWorkspaceSelection(
  options: AskWorkspaceSelectionOptions,
): Promise<string[]> {
  const { detected } = options;
  if (detected.workspaceStacks.length === 0) return [];
  const choices = detected.workspaceStacks.map((workspaceStack: DetectedStack['workspaceStacks'][number]) => ({
    name: `${sanitizeForLog(workspaceStack.path)} — ${sanitizeForLog(workspaceStack.language ?? 'unknown')}`,
    value: workspaceStack.path,
    checked: true,
  }));
  return checkbox<string>({
    message: 'Select workspaces to receive generated agent files:',
    choices,
  });
}
