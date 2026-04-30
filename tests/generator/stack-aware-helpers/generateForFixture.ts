import { generateAll } from '../../../src/generator/index.js';
import type { GeneratedFile } from '../../../src/generator/types.js';
import type { StackConfig } from '../../../src/schema/stack-config.js';
import { configForFixture } from './configForFixture.js';

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
