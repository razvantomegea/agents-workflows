import { renderTemplate } from '../utils/template-renderer.js';
import type { StackConfig } from '../schema/stack-config.js';
import type { GeneratorContext, GeneratedFile } from './types.js';

export async function generateRootConfig(
  config: StackConfig,
  context: GeneratorContext,
): Promise<GeneratedFile[]> {
  const files: GeneratedFile[] = [];

  if (config.targets.claudeCode) {
    const claudeMd = await renderTemplate('config/CLAUDE.md.ejs', context);
    files.push({ path: 'CLAUDE.md', content: claudeMd });

    const settings = await renderTemplate('config/settings-local.json.ejs', context);
    files.push({ path: '.claude/settings.local.json', content: settings });
  }

  if (config.targets.codexCli) {
    const codexConfig = await renderTemplate('config/codex-config.toml.ejs', context);
    files.push({ path: '.codex/config.toml', content: codexConfig });
  }

  const agentsMd = await renderTemplate('config/AGENTS.md.ejs', context);
  files.push({ path: 'AGENTS.md', content: agentsMd });

  if (config.governance.enabled) {
    const [prTemplate, governanceMd] = await Promise.all([
      renderTemplate('governance/pull_request_template.md.ejs', context),
      renderTemplate('governance/GOVERNANCE.md.ejs', context),
    ]);
    files.push({ path: '.github/pull_request_template.md', content: prTemplate });
    files.push({ path: 'docs/GOVERNANCE.md', content: governanceMd });
  }

  return files;
}
