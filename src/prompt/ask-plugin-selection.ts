import { checkbox } from '@inquirer/prompts';
import { PLUGIN_REGISTRY } from '../generator/plugin-registry.js';
import type { StackConfig } from '../schema/stack-config.js';
import type { PluginDef } from '../generator/plugin-registry.js';

const PLUGIN_CHOICES = PLUGIN_REGISTRY.map((plugin: PluginDef) => ({
  name: `${plugin.name} — ${plugin.description}`,
  value: plugin.id,
  checked: false,
}));

export async function askPluginSelection(): Promise<StackConfig['plugins']> {
  const selected = await checkbox({
    message: 'Select plugins to install into .claude/skills/:',
    choices: PLUGIN_CHOICES,
  });

  return {
    superpowers: selected.includes('superpowers'),
    caveman: selected.includes('caveman'),
    claudeMdManagement: selected.includes('claudeMdManagement'),
    featureDev: selected.includes('featureDev'),
    codeReviewPlugin: selected.includes('codeReviewPlugin'),
    codeSimplifier: selected.includes('codeSimplifier'),
  };
}
