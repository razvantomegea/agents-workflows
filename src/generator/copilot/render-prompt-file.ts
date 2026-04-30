import { renderTemplate } from '../../utils/template-renderer.js';
import type { GeneratorContext, GeneratedFile } from '../types.js';
import type { StackConfig } from '../../schema/stack-config.js';
import { getCopilotPromptTools, COPILOT_DEFAULT_MODEL } from './prompt-tool-allowlist.js';
import { COPILOT_PROMPTS, type CopilotPromptDef } from './prompt-registry.js';

export interface RenderCopilotPromptFilesArgs {
  selectedCommands: StackConfig['selectedCommands'];
  context: GeneratorContext;
}

/**
 * Renders Copilot prompt files for every enabled command in `selectedCommands`.
 *
 * Filters `COPILOT_PROMPTS` to those whose `configKey` flag is `true` in
 * `args.selectedCommands`, then for each enabled prompt:
 * 1. Renders the command body template.
 * 2. Wraps the body in the `copilot/prompt.md.ejs` wrapper, injecting
 *    description, name, argument hint, the default model
 *    (`COPILOT_DEFAULT_MODEL`), and the scoped tool allow-list from
 *    `getCopilotPromptTools`.
 *
 * All renders run concurrently via `Promise.all`.
 *
 * @param args - Object containing:
 *   - `selectedCommands` — subset of `StackConfig['selectedCommands']` used to
 *     determine which Copilot prompts to emit.
 *   - `context` — generator context passed to every EJS template.
 * @returns An array of `GeneratedFile` entries under `.github/prompts/`.
 */
export async function renderCopilotPromptFiles(args: RenderCopilotPromptFilesArgs): Promise<GeneratedFile[]> {
  const { selectedCommands, context } = args;
  const enabled = COPILOT_PROMPTS.filter((prompt: CopilotPromptDef) => selectedCommands[prompt.configKey]);
  return Promise.all(enabled.map(async (prompt: CopilotPromptDef) => {
    const body = await renderTemplate(prompt.templateFile, context);
    const content = await renderTemplate('copilot/prompt.md.ejs', {
      ...context,
      description: prompt.description,
      name: prompt.key,
      argumentHint: prompt.argumentHint,
      model: COPILOT_DEFAULT_MODEL,
      tools: getCopilotPromptTools(prompt.key),
      body,
    });
    return { path: `.github/prompts/${prompt.outputName}`, content };
  }));
}
