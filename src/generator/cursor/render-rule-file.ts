import { renderTemplate } from '../../utils/template-renderer.js';
import { getPartialActivation } from '../partial-activation-map.js';
import { orderedFilename } from '../partial-ordering.js';
import { renderMdcFrontmatter } from './render-mdc-frontmatter.js';
import { mergeMdc } from './merge-mdc.js';
import type { PartialEntry } from '../list-partials.js';
import type { GeneratorContext, GeneratedFile } from '../types.js';

export interface RenderRuleFileArgs {
  partial: PartialEntry;
  context: GeneratorContext;
}

/**
 * Renders a single Cursor `.mdc` rule file for a partial template.
 *
 * Steps:
 * 1. Resolves the activation metadata via `getPartialActivation`.
 * 2. Generates the MDC frontmatter block via `renderMdcFrontmatter`.
 * 3. Renders the partial body template.
 * 4. Wraps frontmatter and body in the `cursor/rule.mdc.ejs` wrapper.
 * 5. Derives an ordered filename (e.g. `00-deny-destructive-ops.mdc`).
 *
 * The returned `GeneratedFile` includes a `merge` function (`mergeMdc`) so
 * that on subsequent runs only user-customised sections are preserved.
 *
 * @param args - Object containing:
 *   - `partial` — a `PartialEntry` from `listPartials()`.
 *   - `context` — generator context passed to both template renders.
 * @returns A `GeneratedFile` targeting `.cursor/rules/<ordered-filename>.mdc`
 *   with `mergeMdc` as the merge strategy.
 */
export async function renderCursorRuleFile(args: RenderRuleFileArgs): Promise<GeneratedFile> {
  const { partial, context } = args;
  const activation = getPartialActivation(partial.slug);
  const frontmatter = renderMdcFrontmatter(activation);
  const body = await renderTemplate(partial.templatePath, context);
  const content = await renderTemplate('cursor/rule.mdc.ejs', { ...context, frontmatter, body });
  const filename = orderedFilename({ slug: partial.slug, activation, extension: 'mdc' });
  return { path: `.cursor/rules/${filename}`, content, merge: mergeMdc };
}
