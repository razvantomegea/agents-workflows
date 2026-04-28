import type { PartialActivation } from '../partial-activation-map.js';
import { escapeYamlString, renderYamlGlobsList } from '../yaml-helpers.js';

export function renderWindsurfRuleHeader(activation: PartialActivation): string {
  const lines: string[] = ['---'];
  if (activation.mode === 'always') {
    lines.push('activation: always_on');
  } else if (activation.mode === 'glob') {
    lines.push('activation: glob');
    lines.push('globs:');
    lines.push(renderYamlGlobsList(activation.globs));
  } else if (activation.mode === 'modelDecision') {
    lines.push('activation: model_decision');
  } else {
    lines.push('activation: manual');
  }
  lines.push(`description: "${escapeYamlString(activation.description)}"`);
  lines.push('---');
  return lines.join('\n');
}
