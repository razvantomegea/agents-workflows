import { join } from 'node:path';
import { logger, fileExists } from '../utils/index.js';

interface AgentInfo {
  name: string;
  description: string;
  category: 'agent' | 'command';
}

const AVAILABLE_ITEMS: AgentInfo[] = [
  { name: 'architect', description: 'Planning agent (Opus) — structured PLAN.md generation', category: 'agent' },
  { name: 'implementer', description: 'Primary implementation agent — code writing and editing', category: 'agent' },
  { name: 'code-reviewer', description: 'Post-edit review with checklist — quality enforcement', category: 'agent' },
  { name: 'code-optimizer', description: 'Performance and quality analysis', category: 'agent' },
  { name: 'test-writer', description: 'Unit test generation', category: 'agent' },
  { name: 'e2e-tester', description: 'E2E test generation', category: 'agent' },
  { name: 'reviewer', description: 'Review loop orchestrator — 4-step quality gate', category: 'agent' },
  { name: 'ui-designer', description: 'UI/UX design system enforcement', category: 'agent' },
  { name: 'workflow-plan', description: 'End-to-end feature planning and execution', category: 'command' },
  { name: 'workflow-fix', description: 'Fix QA issues from QA.md', category: 'command' },
  { name: 'external-review', description: 'External review tool integration', category: 'command' },
];

export async function listCommand(projectRoot: string): Promise<void> {
  logger.heading('Available agents and commands');

  const agents = AVAILABLE_ITEMS.filter((i) => i.category === 'agent');
  const commands = AVAILABLE_ITEMS.filter((i) => i.category === 'command');

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
