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

  const adrTemplate = await renderTemplate('docs/decisions/0001-adr-template.md.ejs', context);
  files.push({ path: 'docs/decisions/0001-adr-template.md', content: adrTemplate });

  if (config.governance.enabled) {
    const [prTemplate, governanceMd, supplyChainMd, releaseWorkflow, complianceMd, oscalComponent] =
      await Promise.all([
        renderTemplate('governance/pull_request_template.md.ejs', context),
        renderTemplate('governance/GOVERNANCE.md.ejs', context),
        renderTemplate('governance/SUPPLY_CHAIN.md.ejs', context),
        renderTemplate('ci/release.yml.ejs', {
          ...context,
          projectName: config.project.name,
        }),
        renderTemplate('governance/COMPLIANCE.md.ejs', context),
        renderTemplate('governance/oscal-component.json.ejs', context),
      ]);
    files.push({ path: '.github/pull_request_template.md', content: prTemplate });
    files.push({ path: 'docs/GOVERNANCE.md', content: governanceMd });
    files.push({ path: 'docs/SUPPLY_CHAIN.md', content: supplyChainMd });
    files.push({
      path: '.github/workflows/release.yml',
      content: releaseWorkflow,
    });
    files.push({ path: 'docs/COMPLIANCE.md', content: complianceMd });
    files.push({ path: 'docs/oscal/component-definition.json', content: oscalComponent });
  }

  return files;
}
