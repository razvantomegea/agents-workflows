import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLUGIN_REGISTRY } from './plugin-registry.js';
import type { StackConfig } from '../schema/stack-config.js';
import type { GeneratedFile, GeneratorContext } from './types.js';

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const PLUGINS_DIR = join(MODULE_DIR, '..', 'plugins');
const SAFE_PLUGIN_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const SUPPORTED_PLUGIN_IDS = new Set<keyof StackConfig['plugins']>(
  PLUGIN_REGISTRY.map((plugin: (typeof PLUGIN_REGISTRY)[number]) => plugin.id),
);

function hasErrorCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

function assertSafePluginPathId({ label, value }: { label: string; value: string }): void {
  if (!SAFE_PLUGIN_ID_PATTERN.test(value)) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
}

function getUnsupportedEnabledPlugins(plugins: StackConfig['plugins']): string[] {
  const enabledUnsupportedPlugins: string[] = [];
  for (const [pluginId, isEnabled] of Object.entries(plugins) as Array<[keyof StackConfig['plugins'], boolean]>) {
    if (isEnabled && !SUPPORTED_PLUGIN_IDS.has(pluginId)) {
      enabledUnsupportedPlugins.push(pluginId);
    }
  }
  return enabledUnsupportedPlugins;
}

export async function generatePlugins(
  config: StackConfig,
  _context: GeneratorContext,
): Promise<GeneratedFile[]> {
  if (!config.targets.claudeCode) return [];

  const unsupportedEnabledPlugins = getUnsupportedEnabledPlugins(config.plugins);
  if (unsupportedEnabledPlugins.length > 0) {
    throw new Error(
      `Unsupported plugin selection(s): ${unsupportedEnabledPlugins.join(', ')}. Remove them from .agents-workflows.json; these entries do not ship installable skills.`,
    );
  }

  const files: GeneratedFile[] = [];

  for (const plugin of PLUGIN_REGISTRY) {
    if (!config.plugins[plugin.id]) continue;
    assertSafePluginPathId({ label: 'plugin sourceId', value: plugin.sourceId });

    for (const skill of plugin.skills) {
      assertSafePluginPathId({ label: 'skill id', value: skill.id });
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
