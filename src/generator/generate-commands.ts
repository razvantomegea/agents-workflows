import { renderTemplate } from '../utils/template-renderer.js';
import type { StackConfig } from '../schema/stack-config.js';
import type { GeneratorContext, GeneratedFile } from './types.js';

interface CommandDefinition {
  key: keyof StackConfig['selectedCommands'];
  templateFile: string;
  outputName: string;
}

const COMMAND_DEFINITIONS: CommandDefinition[] = [
  { key: 'workflowPlan', templateFile: 'commands/workflow-plan.md.ejs', outputName: 'workflow-plan.md' },
  { key: 'workflowFix', templateFile: 'commands/workflow-fix.md.ejs', outputName: 'workflow-fix.md' },
  { key: 'externalReview', templateFile: 'commands/external-review.md.ejs', outputName: 'external-review.md' },
];

export async function generateCommands(
  config: StackConfig,
  context: GeneratorContext,
): Promise<GeneratedFile[]> {
  const files: GeneratedFile[] = [];

  for (const command of COMMAND_DEFINITIONS) {
    if (!config.selectedCommands[command.key]) continue;

    const content = await renderTemplate(
      command.templateFile,
      context as unknown as Record<string, unknown>,
    );

    if (config.targets.claudeCode) {
      files.push({ path: `.claude/commands/${command.outputName}`, content });
    }

    if (config.targets.codexCli) {
      files.push({ path: `.codex/prompts/${command.outputName}`, content });
    }
  }

  return files;
}
