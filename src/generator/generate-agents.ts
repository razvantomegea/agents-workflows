import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderTemplate } from '../utils/template-renderer.js';
import { fileExists } from '../utils/file-exists.js';
import { convertToSkill } from '../utils/convert-to-skill.js';
import type { StackConfig } from '../schema/stack-config.js';
import type { GeneratorContext, GeneratedFile } from './types.js';

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(MODULE_DIR, '..', 'templates');

interface AgentDefinition {
  key: keyof StackConfig['agents'];
  templateFile: string;
  outputName: string;
}

const AGENT_DEFINITIONS: AgentDefinition[] = [
  { key: 'architect', templateFile: 'agents/architect.md.ejs', outputName: 'architect.md' },
  { key: 'implementer', templateFile: 'agents/implementer.md.ejs', outputName: 'implementer.md' },
  { key: 'codeReviewer', templateFile: 'agents/code-reviewer.md.ejs', outputName: 'code-reviewer.md' },
  { key: 'securityReviewer', templateFile: 'agents/security-reviewer.md.ejs', outputName: 'security-reviewer.md' },
  { key: 'codeOptimizer', templateFile: 'agents/code-optimizer.md.ejs', outputName: 'code-optimizer.md' },
  { key: 'testWriter', templateFile: 'agents/test-writer.md.ejs', outputName: 'test-writer.md' },
  { key: 'e2eTester', templateFile: 'agents/e2e-tester.md.ejs', outputName: 'e2e-tester.md' },
  { key: 'reviewer', templateFile: 'agents/reviewer.md.ejs', outputName: 'reviewer.md' },
  { key: 'uiDesigner', templateFile: 'agents/ui-designer.md.ejs', outputName: 'ui-designer.md' },
];

export async function generateAgents(
  config: StackConfig,
  context: GeneratorContext,
): Promise<GeneratedFile[]> {
  const files: GeneratedFile[] = [];

  for (const agent of AGENT_DEFINITIONS) {
    if (!config.agents[agent.key]) continue;

    let templateFile = agent.templateFile;

    if (agent.key === 'implementer') {
      const variant = config.agents.implementerVariant;
      templateFile = `agents/implementer-variants/${variant}.md.ejs`;
      const absoluteTemplatePath = join(TEMPLATES_DIR, templateFile);
      const exists = await fileExists(absoluteTemplatePath);
      if (!exists) {
        throw new Error(`Missing implementer variant template: agents/implementer-variants/${variant}.md.ejs`);
      }
    }

    const content = await renderTemplate(templateFile, context);

    if (config.targets.claudeCode) {
      files.push({ path: `.claude/agents/${agent.outputName}`, content });
    }

    if (config.targets.codexCli) {
      const skillContent = convertToSkill(content);
      files.push({ path: `.codex/skills/${agent.outputName.replace('.md', '')}/SKILL.md`, content: skillContent });
    }
  }

  return files;
}
