import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectStack } from '../../src/detector/detect-stack.js';
import { createDefaultConfig } from '../../src/prompt/default-config.js';
import { generateAll } from '../../src/generator/index.js';
import type { DetectedStack } from '../../src/detector/types.js';
import type { StackConfig } from '../../src/schema/stack-config.js';
import type { GeneratedFile } from '../../src/generator/types.js';
import { getContent } from './fixtures.js';

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url));
export const FIXTURES_DIR = join(CURRENT_DIR, '..', 'fixtures');

export const IMPLEMENTER_CLAUDE_PATH = '.claude/agents/implementer.md';
export const IMPLEMENTER_CODEX_PATH = '.codex/skills/implementer/SKILL.md';
export const UI_DESIGNER_CLAUDE_PATH = '.claude/agents/ui-designer.md';

/**
 * Run detectStack against a named fixture directory.
 */
export async function detectFixture(fixtureName: string): Promise<DetectedStack> {
  return detectStack(join(FIXTURES_DIR, fixtureName));
}

/**
 * Build a StackConfig via createDefaultConfig for a fixture, with optional agent overrides.
 */
export async function configForFixture(
  fixtureName: string,
  agentOverrides: Partial<StackConfig['agents']> = {},
): Promise<StackConfig> {
  const detected = await detectFixture(fixtureName);
  const cfg = createDefaultConfig(detected);
  return { ...cfg, agents: { ...cfg.agents, ...agentOverrides } };
}

/**
 * Generate all files for a fixture using both claudeCode and codexCli targets.
 */
export async function generateForFixture(
  fixtureName: string,
  agentOverrides: Partial<StackConfig['agents']> = {},
): Promise<GeneratedFile[]> {
  const cfg = await configForFixture(fixtureName, agentOverrides);
  const bothTargets: StackConfig = {
    ...cfg,
    targets: { ...cfg.targets, claudeCode: true, codexCli: true },
  };
  return generateAll(bothTargets);
}

/**
 * Get the rendered content of the implementer Claude agent for a fixture.
 */
export async function getImplementerContent(fixtureName: string): Promise<string> {
  const files = await generateForFixture(fixtureName);
  return getContent(files, IMPLEMENTER_CLAUDE_PATH);
}
