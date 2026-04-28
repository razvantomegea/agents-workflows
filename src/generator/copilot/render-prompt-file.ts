import { renderTemplate } from '../../utils/template-renderer.js';
import type { GeneratorContext, GeneratedFile } from '../types.js';
import type { StackConfig } from '../../schema/stack-config.js';
import { getCopilotPromptTools, COPILOT_DEFAULT_MODEL } from './prompt-tool-allowlist.js';
import { COPILOT_PROMPTS, type CopilotPromptDef } from './prompt-registry.js';

export interface RenderCopilotPromptFilesArgs {
  selectedCommands: StackConfig['selectedCommands'];
  context: GeneratorContext;
}

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
