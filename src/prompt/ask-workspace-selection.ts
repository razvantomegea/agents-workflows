import { checkbox } from '@inquirer/prompts';
import type { DetectedStack } from '../detector/types.js';

export interface AskWorkspaceSelectionOptions {
  detected: DetectedStack;
}

export async function askWorkspaceSelection(
  options: AskWorkspaceSelectionOptions,
): Promise<string[]> {
  const { detected } = options;
  if (detected.workspaceStacks.length === 0) return [];
  const choices = detected.workspaceStacks.map((ws) => ({
    name: `${ws.path} — ${ws.language ?? 'unknown'}`,
    value: ws.path,
    checked: true,
  }));
  return checkbox<string>({
    message: 'Select workspaces to receive generated agent files:',
    choices,
  });
}
