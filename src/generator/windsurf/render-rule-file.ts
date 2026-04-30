import { renderTemplate } from '../../utils/template-renderer.js';
import { getPartialActivation } from '../partial-activation-map.js';
import { orderedFilename } from '../partial-ordering.js';
import { renderWindsurfRuleHeader } from './render-rule-header.js';
import { mergeWindsurfRule } from './merge-rule.js';
import type { PartialEntry } from '../list-partials.js';
import type { GeneratorContext, GeneratedFile } from '../types.js';

export interface RenderWindsurfRuleArgs {
  partial: PartialEntry;
  context: GeneratorContext;
}

/**
 * Renders a single Windsurf rule file for a partial template.
 *
 * Steps:
 * 1. Resolves the activation metadata via `getPartialActivation`.
 * 2. Generates the Windsurf YAML rule header via `renderWindsurfRuleHeader`.
 * 3. Renders the partial body template.
 * 4. Wraps header and body in the `windsurf/rule.md.ejs` wrapper.
 * 5. Derives an ordered filename (e.g. `00-deny-destructive-ops.md`).
 *
 * The returned `GeneratedFile` includes a `merge` function
 * (`mergeWindsurfRule`) so that on subsequent runs only user-customised
 * sections are preserved.
 *
 * @param args - Object containing:
 *   - `partial` — a `PartialEntry` from `listPartials()`.
 *   - `context` — generator context passed to both template renders.
 * @returns A `GeneratedFile` targeting `.windsurf/rules/<ordered-filename>.md`
 *   with `mergeWindsurfRule` as the merge strategy.
 */
export async function renderWindsurfRuleFile(args: RenderWindsurfRuleArgs): Promise<GeneratedFile> {
  const { partial, context } = args;
  const activation = getPartialActivation(partial.slug);
  const header = renderWindsurfRuleHeader(activation);
  const body = await renderTemplate(partial.templatePath, context);
  const content = await renderTemplate('windsurf/rule.md.ejs', { ...context, header, body });
  const filename = orderedFilename({ slug: partial.slug, activation, extension: 'md' });
  return { path: `.windsurf/rules/${filename}`, content, merge: mergeWindsurfRule };
}
