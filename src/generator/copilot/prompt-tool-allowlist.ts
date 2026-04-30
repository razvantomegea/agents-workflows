/**
 * Per-prompt minimal Copilot Agent `tools:` allow-list (PRD E9.T7). The
 * arrays are tightly scoped per workflow surface. Forbidden across every
 * entry: `bash`, `shell`, `runInTerminal`, and any unbounded command tool.
 * `workflow-plan` is read-only on non-plan files (no `editFiles`), per E9.T7.
 * `workflow-fix` may edit files but must not invoke unbounded shell.
 * `external-review` is fully read-only.
 */
export type CopilotPromptKey = 'workflowPlan' | 'workflowFix' | 'externalReview';

export const COPILOT_DEFAULT_MODEL = 'gpt-5';

export const COPILOT_PROMPT_TOOLS: Readonly<Record<CopilotPromptKey, readonly string[]>> = {
  workflowPlan: ['codebase', 'search'],
  workflowFix: ['codebase', 'search', 'editFiles', 'problems', 'testFailure'],
  externalReview: ['codebase', 'search', 'problems'],
};

export const COPILOT_FORBIDDEN_TOOLS: readonly string[] = [
  'bash',
  'shell',
  'runInTerminal',
  'terminal',
  'runCommand',
];

/**
 * Returns the scoped Copilot Agent `tools:` allow-list for the given prompt key.
 *
 * Each workflow surface has a tightly-scoped set of tools (see `COPILOT_PROMPT_TOOLS`).
 * No entry includes `bash`, `shell`, `runInTerminal`, or other unbounded command
 * tools (see `COPILOT_FORBIDDEN_TOOLS`).
 *
 * @param key - The Copilot prompt identifier: `'workflowPlan'`, `'workflowFix'`,
 *   or `'externalReview'`.
 * @returns A read-only array of tool name strings for the specified prompt.
 */
export function getCopilotPromptTools(key: CopilotPromptKey): readonly string[] {
  return COPILOT_PROMPT_TOOLS[key];
}
