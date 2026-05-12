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

export async function generatePlugins(
  config: StackConfig,
  _context: GeneratorContext,
): Promise<GeneratedFile[]> {
  if (!config.targets.claudeCode) return [];

  const files: GeneratedFile[] = [];

  for (const plugin of PLUGIN_REGISTRY) {
    if (!config.plugins[plugin.id]) continue;

    for (const skill of plugin.skills) {
      const skillFile = join(PLUGINS_DIR, plugin.sourceId, skill.id, 'SKILL.md');
      let content: string;
      try {
        content = await readFile(skillFile, 'utf-8');
      } catch (error) {
        if (hasErrorCode(error, 'ENOENT')) {
          throw new Error(`Plugin skill missing: ${plugin.sourceId}/${skill.id}/SKILL.md — run pnpm fetch-plugins before building.`);
        }
        throw error;
      }
      files.push({ path: `.claude/skills/${skill.id}/SKILL.md`, content });
    }
  }

  return files;
}
