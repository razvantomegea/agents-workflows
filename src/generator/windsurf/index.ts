import type { StackConfig } from '../../schema/stack-config.js';
import type { GeneratorContext, GeneratedFile } from '../types.js';
import { listPartials } from '../list-partials.js';
import type { PartialEntry } from '../list-partials.js';
import { renderWindsurfRuleFile } from './render-rule-file.js';
import { renderWindsurfWorkflowFiles } from './render-workflow-file.js';

export { mergeWindsurfRule } from './merge-rule.js';
export { renderWindsurfRuleHeader } from './render-rule-header.js';

export async function generateWindsurfConfig(
  config: StackConfig,
  context: GeneratorContext,
): Promise<GeneratedFile[]> {
  if (!config.targets.windsurf) return [];
  const partials = await listPartials();
  const ruleFiles = await Promise.all(
    partials.map((partial: PartialEntry) => renderWindsurfRuleFile({ partial, context })),
  );
  const workflowFiles = await renderWindsurfWorkflowFiles({
    selectedCommands: config.selectedCommands,
    context,
  });
  return [...ruleFiles, ...workflowFiles];
}
