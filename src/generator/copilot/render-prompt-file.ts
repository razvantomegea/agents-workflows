import { renderTemplate } from '../../utils/template-renderer.js';
import type { GeneratorContext, GeneratedFile } from '../types.js';
import type { StackConfig } from '../../schema/stack-config.js';
import { getCopilotPromptTools, COPILOT_DEFAULT_MODEL, type CopilotPromptKey } from './prompt-tool-allowlist.js';

interface CopilotPromptDef {
  key: CopilotPromptKey;
  configKey: keyof StackConfig['selectedCommands'];
  outputName: string;
  templateFile: string;
  description: string;
  argumentHint: string;
}

// `workflowLonghorizon` and `workflowTcr` are Claude/Codex-only by PRD scope (E11.T3);
// not emitted as Copilot prompts. Extend deliberately when those flows mature.
const COPILOT_PROMPTS: readonly CopilotPromptDef[] = [
  {
    key: 'workflowPlan',
    configKey: 'workflowPlan',
    outputName: 'workflow-plan.prompt.md',
    templateFile: 'commands/workflow-plan.md.ejs',
    description: 'Plan and execute a feature or bug fix end-to-end.',
    argumentHint: '<feature description>',
  },
  {
    key: 'workflowFix',
    configKey: 'workflowFix',
    outputName: 'workflow-fix.prompt.md',
    templateFile: 'commands/workflow-fix.md.ejs',
    description: 'Fix verified QA issues from a QA report.',
    argumentHint: 'QA.md',
  },
  {
    key: 'externalReview',
    configKey: 'externalReview',
    outputName: 'external-review.prompt.md',
    templateFile: 'commands/external-review.md.ejs',
    description: 'Run an external review tool and write findings to QA.md.',
    argumentHint: '',
  },
];

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
