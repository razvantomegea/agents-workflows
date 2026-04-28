import { checkbox } from '@inquirer/prompts';
import { sanitizeForLog } from '../utils/index.js';
import type { DetectedStack } from '../detector/types.js';

export interface AskWorkspaceSelectionOptions {
  detected: DetectedStack;
}

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
