import type { PartialActivation } from '../partial-activation-map.js';
import { escapeYamlString, renderYamlGlobsList } from '../yaml-helpers.js';

export function renderMdcFrontmatter(activation: PartialActivation): string {
  const description = `description: "${escapeYamlString(activation.description)}"`;
  if (activation.mode === 'always') {
    return ['---', description, 'alwaysApply: true', '---'].join('\n');
  }
  if (activation.mode === 'glob') {
    return ['---', description, 'globs:', renderYamlGlobsList(activation.globs), 'alwaysApply: false', '---'].join('\n');
  }
  return ['---', description, 'alwaysApply: false', '---'].join('\n');
}
