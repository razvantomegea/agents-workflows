import { renderTemplate } from '../utils/template-renderer.js';
import type { StackConfig } from '../schema/stack-config.js';
import type { GeneratorContext, GeneratedFile } from './types.js';

export async function generateRootConfig(
  config: StackConfig,
  context: GeneratorContext,
): Promise<GeneratedFile[]> {
  const files: GeneratedFile[] = [];
  const data = context as unknown as Record<string, unknown>;

  if (config.targets.claudeCode) {
    const claudeMd = await renderTemplate('config/CLAUDE.md.ejs', data);
    files.push({ path: 'CLAUDE.md', content: claudeMd });

    const settings = await renderTemplate('config/settings-local.json.ejs', data);
    files.push({ path: '.claude/settings.local.json', content: settings });
  }

  const agentsMd = await renderTemplate('config/AGENTS.md.ejs', data);
  files.push({ path: 'AGENTS.md', content: agentsMd });

  return files;
}
