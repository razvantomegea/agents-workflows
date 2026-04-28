import type { DetectedStack } from '../detector/types.js';
import { askWorkspaceSelection } from './ask-workspace-selection.js';

export interface ResolveWorkspaceSelectionOptions {
  detected: DetectedStack;
  yes: boolean;
  noPrompt: boolean;
}

/**
 * Resolves the set of workspace paths to install into.
 *
 * When non-interactive flags are set or there are no detected workspaces,
 * returns all workspace paths without prompting. Otherwise, delegates to
 * the interactive `askWorkspaceSelection` prompt so the user can deselect
 * workspaces before generation.
 */
export async function resolveWorkspaceSelection(
  options: ResolveWorkspaceSelectionOptions,
): Promise<readonly string[]> {
  const { detected, yes, noPrompt } = options;

  if (detected.workspaceStacks.length === 0) return [];

  if (yes || noPrompt) {
    return detected.workspaceStacks.map((ws) => ws.path);
  }

  return askWorkspaceSelection({ detected });
}
