import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fileExists } from '../utils/file-exists.js';
import { PLUGIN_REGISTRY } from './plugin-registry.js';
import type { StackConfig } from '../schema/stack-config.js';
import type { GeneratedFile, GeneratorContext } from './types.js';

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const PLUGINS_DIR = join(MODULE_DIR, '..', 'plugins');

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
      if (!(await fileExists(skillFile))) {
        console.warn(`Plugin skill missing: ${plugin.id}/${skill.id}/SKILL.md — run pnpm fetch-plugins`);
        continue;
      }
      const content = await readFile(skillFile, 'utf-8');
      files.push({ path: `.claude/skills/${skill.id}/SKILL.md`, content });
    }
  }

  return files;
}
