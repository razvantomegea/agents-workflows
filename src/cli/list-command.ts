import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger, fileExists } from '../utils/index.js';

export interface AgentInfo {
  name: string;
  description: string;
  category: 'agent' | 'command';
  templatePath: string;
}

interface TemplateDefinition {
  category: 'agent' | 'command';
  templatePath: string;
}

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(MODULE_DIR, '..', 'templates');

const TEMPLATE_DEFINITIONS: TemplateDefinition[] = [
  { category: 'agent', templatePath: 'agents/architect.md.ejs' },
  { category: 'agent', templatePath: 'agents/implementer-variants/generic.md.ejs' },
  { category: 'agent', templatePath: 'agents/code-reviewer.md.ejs' },
  { category: 'agent', templatePath: 'agents/code-optimizer.md.ejs' },
  { category: 'agent', templatePath: 'agents/test-writer.md.ejs' },
  { category: 'agent', templatePath: 'agents/e2e-tester.md.ejs' },
  { category: 'agent', templatePath: 'agents/reviewer.md.ejs' },
  { category: 'agent', templatePath: 'agents/ui-designer.md.ejs' },
  { category: 'command', templatePath: 'commands/workflow-plan.md.ejs' },
  { category: 'command', templatePath: 'commands/workflow-fix.md.ejs' },
  { category: 'command', templatePath: 'commands/external-review.md.ejs' },
];

export async function listCommand(projectRoot: string): Promise<void> {
  logger.heading('Available agents and commands');

  const items = await readAvailableItems();
  const agents = items.filter((i) => i.category === 'agent');
  const commands = items.filter((i) => i.category === 'command');

  logger.info('Agents:');
  for (const agent of agents) {
    const installed = await isInstalled(projectRoot, 'agent', agent.name);
    const status = installed ? '  [installed]' : '';
    logger.info(`  ${agent.name.padEnd(18)} ${agent.description}${status}`);
  }

  logger.blank();
  logger.info('Commands:');
  for (const command of commands) {
    const installed = await isInstalled(projectRoot, 'command', command.name);
    const status = installed ? '  [installed]' : '';
    logger.info(`  ${command.name.padEnd(18)} ${command.description}${status}`);
  }
}

export async function readAvailableItems(): Promise<AgentInfo[]> {
  return Promise.all(TEMPLATE_DEFINITIONS.map(async (definition) => {
    const metadata = await readTemplateMetadata(definition.templatePath);
    return {
      ...definition,
      name: metadata.name,
      description: metadata.description,
    };
  }));
}

async function readTemplateMetadata(
  templatePath: string,
): Promise<{ name: string; description: string }> {
  const content = await readFile(join(TEMPLATES_DIR, templatePath), 'utf-8');
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content);

  if (!frontmatter) {
    throw new Error(`Template ${templatePath} is missing frontmatter metadata.`);
  }

  const values = new Map<string, string>();
  for (const line of frontmatter[1].split(/\r?\n/)) {
    const match = /^([a-zA-Z]+):\s*(.*)$/.exec(line);
    if (match) values.set(match[1], match[2].replace(/^"|"$/g, ''));
  }

  const name = values.get('name');
  const description = values.get('description');
  if (!name || !description) {
    throw new Error(`Template ${templatePath} must define name and description metadata.`);
  }

  return { name, description };
}

async function isInstalled(
  projectRoot: string,
  category: 'agent' | 'command',
  name: string,
): Promise<boolean> {
  if (category === 'agent') {
    return fileExists(join(projectRoot, `.claude/agents/${name}.md`));
  }
  return fileExists(join(projectRoot, `.claude/commands/${name}.md`));
}
