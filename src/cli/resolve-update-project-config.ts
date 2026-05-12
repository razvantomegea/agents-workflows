import { askMainBranch, askProjectDocumentationFiles } from '../prompt/index.js';
import type { StackConfig } from '../schema/stack-config.js';

/**
 * Returns the project config to use for the current `update` run.
 *
 * @param params - Input parameters as a readonly object.
 * @param params.existing - The project config stored in the current `.agents-workflows.json` manifest.
 * @param params.promptsSuppressed - When `true` (`--yes`, `--no-prompt`, or `--non-interactive`),
 *   returns the existing config unchanged without prompting.
 *
 * @returns The updated `StackConfig['project']` — either the unchanged existing value or a
 *   new value built from interactive prompts (`askProjectDocumentationFiles`, `askMainBranch`).
 *
 * @remarks
 * Interactive branch (prompts shown):
 * - Asks for documentation file and roadmap file paths.
 * - Asks for the primary git branch name.
 *
 * Non-interactive branch (`promptsSuppressed === true`):
 * - Returns `params.existing` verbatim; no I/O.
 */
export async function resolveUpdateProjectConfig(
  params: Readonly<{
    existing: StackConfig['project'];
    promptsSuppressed: boolean;
  }>,
): Promise<StackConfig['project']> {
  if (params.promptsSuppressed) {
    return params.existing;
  }

  const projectDocumentation = await askProjectDocumentationFiles({
    docsFile: params.existing.docsFile,
    roadmapFile: params.existing.roadmapFile,
  });
  const mainBranch = await askMainBranch(params.existing.mainBranch);

  return {
    ...params.existing,
    ...projectDocumentation,
    mainBranch,
  };
}
