import type { StackConfig } from '../../schema/stack-config.js';
import type { GeneratorContext, GeneratedFile } from '../types.js';
import { listPartials } from '../list-partials.js';
import type { PartialEntry } from '../list-partials.js';
import { renderCursorRuleFile } from './render-rule-file.js';
import { renderCursorCommandFiles } from './render-command-file.js';

export { mergeMdc } from './merge-mdc.js';
export { renderMdcFrontmatter } from './render-mdc-frontmatter.js';

export async function generateCursorConfig(
  config: StackConfig,
  context: GeneratorContext,
): Promise<GeneratedFile[]> {
  if (!config.targets.cursor) return [];
  const partials = context.discoveredPartials ?? await listPartials();
  const ruleFiles = await Promise.all(
    partials.map((partial: PartialEntry) => renderCursorRuleFile({ partial, context })),
  );
  const commandFiles = await renderCursorCommandFiles({
    selectedCommands: config.selectedCommands,
    context,
  });
  return [...ruleFiles, ...commandFiles];
}
