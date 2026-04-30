import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLUGIN_REGISTRY } from './plugin-registry.js';
import type { StackConfig } from '../schema/stack-config.js';
import type { GeneratedFile, GeneratorContext } from './types.js';

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const PLUGINS_DIR = join(MODULE_DIR, '..', 'plugins');

function hasErrorCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

/**
 * Generates Claude Code skill files for every enabled plugin.
 *
 * Reads each skill's `SKILL.md` from the on-disk plugin directory and emits it
 * under `.claude/skills/<skillId>/SKILL.md`.  Only runs when
 * `config.targets.claudeCode` is `true`; returns an empty array otherwise.
 *
 * If a skill file is missing (`ENOENT`), a warning is printed and the skill is
 * silently skipped so a partial plugin install does not abort the full
 * generation.  All other filesystem errors are re-thrown.
 *
 * @param config - `StackConfig` slice consumed: `targets.claudeCode` (gates
 *   emission) and `plugins` (maps plugin IDs to boolean enable flags).
 * @param _context - Generator context (accepted to satisfy the
 *   `TargetGenerator` contract; not used by this generator).
 * @returns An array of `GeneratedFile` entries for every successfully read skill
 *   file across all enabled plugins.
 * @throws Any filesystem error other than `ENOENT` from reading a skill file.
 */
export async function generatePlugins(
  config: StackConfig,
  _context: GeneratorContext,
): Promise<GeneratedFile[]> {
  if (!config.targets.claudeCode) return [];

  const files: GeneratedFile[] = [];

  for (const plugin of PLUGIN_REGISTRY) {
    if (!config.plugins[plugin.id]) continue;

    for (const skill of plugin.skills) {
      const skillFile = join(PLUGINS_DIR, plugin.id, skill.id, 'SKILL.md');
      let content: string;
      try {
        content = await readFile(skillFile, 'utf-8');
      } catch (error) {
        if (hasErrorCode(error, 'ENOENT')) {
          console.warn(`Plugin skill missing: ${plugin.id}/${skill.id}/SKILL.md — run pnpm fetch-plugins`);
          continue;
        }
        throw error;
      }
      files.push({ path: `.claude/skills/${skill.id}/SKILL.md`, content });
    }
  }

  return files;
}
