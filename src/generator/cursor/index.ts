import type { StackConfig } from '../../schema/stack-config.js';
import type { GeneratorContext, GeneratedFile } from '../types.js';
import { listPartials } from '../list-partials.js';
import type { PartialEntry } from '../list-partials.js';
import { renderCursorRuleFile } from './render-rule-file.js';
import { renderCursorCommandFiles } from './render-command-file.js';

export { mergeMdc } from './merge-mdc.js';
export { renderMdcFrontmatter } from './render-mdc-frontmatter.js';

/**
 * Generates all Cursor IDE configuration files.
 *
 * Returns an empty array when `config.targets.cursor` is `false`.  Otherwise
 * emits:
 * - One `.cursor/rules/<ordered-filename>.mdc` file per discovered partial
 *   (rendered by `renderCursorRuleFile`).
 * - One `.cursor/commands/<name>.md` file per enabled command in
 *   `config.selectedCommands` (rendered by `renderCursorCommandFiles`).
 *
 * @param config - `StackConfig` slice consumed: `targets.cursor` (gates
 *   emission) and `selectedCommands` (command enable flags).
 * @param context - Generator context passed to all rule and command renderers.
 *   If `context.discoveredPartials` is populated, that list is used instead of
 *   calling `listPartials()` again.
 * @returns An array of `GeneratedFile` entries for all Cursor rule and command
 *   files, or an empty array when the Cursor target is disabled.
 */
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
