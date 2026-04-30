import { createDefaultConfig } from '../../../src/prompt/default-config.js';
import type { StackConfig } from '../../../src/schema/stack-config.js';
import { detectFixture } from './detectFixture.js';

export async function configForFixture(
  fixtureName: string,
  agentOverrides: Partial<StackConfig['agents']> = {},
): Promise<StackConfig> {
  const detected = await detectFixture(fixtureName);
  const cfg = createDefaultConfig(detected);
  return { ...cfg, agents: { ...cfg.agents, ...agentOverrides } };
}
