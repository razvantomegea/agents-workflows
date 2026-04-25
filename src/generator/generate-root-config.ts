import { renderTemplate } from '../utils/template-renderer.js';
import type { StackConfig } from '../schema/stack-config.js';
import type { GeneratorContext, GeneratedFile } from './types.js';

/**
 * Generate root-level configuration and documentation files based on the provided stack configuration.
 *
 * The function conditionally renders and collects templates (e.g., CLAUDE, Codex, AGENTS, ADR template,
 * and governance-related documents) according to flags in `config` and returns all generated file entries.
 *
 * @param config - Stack configuration that controls which templates are rendered (e.g., `targets.claudeCode`, `targets.codexCli`, `governance.enabled`) and provides project metadata when needed
 * @param context - Rendering context passed into templates to produce file contents
 * @returns An array of generated files, each with a `path` and rendered `content`
 */
export async function generateRootConfig(
  config: StackConfig,
  context: GeneratorContext,
): Promise<GeneratedFile[]> {
  const files: GeneratedFile[] = [];

  if (config.targets.claudeCode) {
    const claudeMd = await renderTemplate('config/CLAUDE.md.ejs', context);
    files.push({ path: 'CLAUDE.md', content: claudeMd });

    const settings = await renderTemplate('config/settings.json.ejs', context);
    files.push({ path: '.claude/settings.json', content: settings });
  }

  if (config.targets.codexCli) {
    const codexConfig = await renderTemplate('config/codex-config.toml.ejs', context);
    files.push({ path: '.codex/config.toml', content: codexConfig });

    const codexRules = await renderTemplate('config/codex-project-rules.ejs', context);
    files.push({ path: '.codex/rules/project.rules', content: codexRules });
  }

  const agentsMd = await renderTemplate('config/AGENTS.md.ejs', context);
  files.push({ path: 'AGENTS.md', content: agentsMd });

  const agentsDeploymentMd = await renderTemplate('config/AGENTS-DEPLOYMENT.md.ejs', context);
  files.push({ path: 'AGENTS-DEPLOYMENT.md', content: agentsDeploymentMd });

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
