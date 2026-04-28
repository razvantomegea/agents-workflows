import type { StackConfig } from '../../schema/stack-config.js';
import type { GeneratorContext, GeneratedFile } from '../types.js';
import { renderCopilotInstructions } from './render-instructions.js';
import { renderCopilotPromptFiles } from './render-prompt-file.js';

export { COPILOT_PROMPT_TOOLS, getCopilotPromptTools } from './prompt-tool-allowlist.js';
export type { CopilotPromptKey } from './prompt-tool-allowlist.js';

/**
 * Note: when only Copilot is selected, `AGENTS.md` is still emitted
 * unconditionally by `generate-root-config.ts`, satisfying the PRD E11.T3
 * universal-fallback requirement without an explicit gate here.
 */
export async function generateCopilotConfig(
  config: StackConfig,
  context: GeneratorContext,
): Promise<GeneratedFile[]> {
  if (!config.targets.copilot) return [];
  const instructions = await renderCopilotInstructions(context);
  const prompts = await renderCopilotPromptFiles({
    selectedCommands: config.selectedCommands,
    context,
  });
  return [instructions, ...prompts];
}
