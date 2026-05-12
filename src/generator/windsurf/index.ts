import type { StackConfig } from '../../schema/stack-config.js';
import type { GeneratorContext, GeneratedFile } from '../types.js';
import { listPartials } from '../list-partials.js';
import type { PartialEntry } from '../list-partials.js';
import { renderWindsurfRuleFile } from './render-rule-file.js';
import { renderWindsurfWorkflowFiles } from './render-workflow-file.js';

export { mergeWindsurfRule } from './merge-rule.js';
export { renderWindsurfRuleHeader } from './render-rule-header.js';

/**
 * Generates all Windsurf IDE configuration files.
 *
 * Returns an empty array when `config.targets.windsurf` is `false`.  Otherwise
 * emits:
 * - One `.windsurf/rules/<ordered-filename>.md` file per discovered partial
 *   (rendered by `renderWindsurfRuleFile`).
 * - One `.windsurf/workflows/<name>.md` file per enabled command in
 *   `config.selectedCommands` (rendered by `renderWindsurfWorkflowFiles`).
 *
 * @param config - `StackConfig` slice consumed: `targets.windsurf` (gates
 *   emission) and `selectedCommands` (workflow enable flags).
 * @param context - Generator context passed to all rule and workflow renderers.
 *   If `context.discoveredPartials` is populated, that list is used instead of
 *   calling `listPartials()` again.
 * @returns An array of `GeneratedFile` entries for all Windsurf rule and
 *   workflow files, or an empty array when the Windsurf target is disabled.
 */
export async function generateWindsurfConfig(
  config: StackConfig,
  context: GeneratorContext,
): Promise<GeneratedFile[]> {
  if (!config.targets.windsurf) return [];
  const partials = context.discoveredPartials ?? await listPartials();
  const ruleFiles = await Promise.all(
    partials.map((partial: PartialEntry) => renderWindsurfRuleFile({ partial, context })),
  );
  const workflowFiles = await renderWindsurfWorkflowFiles({
    selectedCommands: config.selectedCommands,
    context,
  });
  return [...ruleFiles, ...workflowFiles];
}
