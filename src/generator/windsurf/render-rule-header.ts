import type { PartialActivation } from '../partial-activation-map.js';
import { escapeYamlString, renderYamlGlobsList } from '../yaml-helpers.js';

/**
 * Renders the YAML rule header for a Windsurf `.md` rule file.
 *
 * The output format depends on the activation mode:
 * - `'always'`        → `activation: always_on`
 * - `'glob'`          → `activation: glob` with a `globs:` list.
 * - `'modelDecision'` → `activation: model_decision`
 * - `'manual'`        → `activation: manual`
 *
 * The `description` value is escaped with `escapeYamlString` so special
 * characters do not break the YAML parser.
 *
 * @param activation - Resolved activation metadata for a partial template.
 * @returns A YAML header string delimited by `---` lines, ready to prepend to
 *   the rule body in a Windsurf rule file.
 */
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
