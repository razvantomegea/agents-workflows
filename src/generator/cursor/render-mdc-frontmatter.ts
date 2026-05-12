import type { PartialActivation } from '../partial-activation-map.js';
import { escapeYamlString, renderYamlGlobsList } from '../yaml-helpers.js';

/**
 * Renders the YAML frontmatter block for a Cursor `.mdc` rule file.
 *
 * The output format depends on the activation mode:
 * - `'always'` → `alwaysApply: true`, no globs field.
 * - `'glob'`   → `globs:` list populated from `activation.globs`,
 *   `alwaysApply: false`.
 * - `'modelDecision'` | `'manual'` → `alwaysApply: false`, no globs field.
 *
 * The `description` value is escaped with `escapeYamlString` so special
 * characters do not break the YAML parser.
 *
 * @param activation - Resolved activation metadata for a partial template.
 * @returns A YAML frontmatter string delimited by `---` lines, ready to
 *   prepend to the rule body.
 */
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
