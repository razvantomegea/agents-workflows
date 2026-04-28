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

export async function renderWindsurfRuleFile(args: RenderWindsurfRuleArgs): Promise<GeneratedFile> {
  const { partial, context } = args;
  const activation = getPartialActivation(partial.slug);
  const header = renderWindsurfRuleHeader(activation);
  const body = await renderTemplate(partial.templatePath, context);
  const content = await renderTemplate('windsurf/rule.md.ejs', { ...context, header, body });
  const filename = orderedFilename({ slug: partial.slug, activation, extension: 'md' });
  return { path: `.windsurf/rules/${filename}`, content, merge: mergeWindsurfRule };
}
