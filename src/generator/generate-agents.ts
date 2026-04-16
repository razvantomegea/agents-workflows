import { renderTemplate } from '../utils/template-renderer.js';
import type { StackConfig } from '../schema/stack-config.js';
import type { GeneratorContext, GeneratedFile } from './types.js';

interface AgentDefinition {
  key: keyof StackConfig['agents'];
  templateFile: string;
  outputName: string;
}

const AGENT_DEFINITIONS: AgentDefinition[] = [
  { key: 'architect', templateFile: 'agents/architect.md.ejs', outputName: 'architect.md' },
  { key: 'implementer', templateFile: 'agents/implementer.md.ejs', outputName: 'implementer.md' },
  { key: 'codeReviewer', templateFile: 'agents/code-reviewer.md.ejs', outputName: 'code-reviewer.md' },
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

    const content = await renderTemplate(agent.templateFile, context as unknown as Record<string, unknown>);

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

function convertToSkill(agentContent: string): string {
  return agentContent
    .replace(/^model: .+$/m, '')
    .replace(/^color: .+$/m, '')
    .replace(/\bagent\b/gi, (match) => {
      if (match === 'Agent') return 'Skill';
      if (match === 'AGENT') return 'SKILL';
      return 'skill';
    })
    .replace(/\n{3,}/g, '\n\n');
}
