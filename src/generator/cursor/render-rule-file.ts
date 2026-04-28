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

export async function renderCursorRuleFile(args: RenderRuleFileArgs): Promise<GeneratedFile> {
  const { partial, context } = args;
  const activation = getPartialActivation(partial.slug);
  const frontmatter = renderMdcFrontmatter(activation);
  const body = await renderTemplate(partial.templatePath, context);
  const content = await renderTemplate('cursor/rule.mdc.ejs', { ...context, frontmatter, body });
  const filename = orderedFilename({ slug: partial.slug, activation, extension: 'mdc' });
  return { path: `.cursor/rules/${filename}`, content, merge: mergeMdc };
}
