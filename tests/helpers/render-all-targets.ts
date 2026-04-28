import { generateAll } from '../../src/generator/index.js';
import { makeStackConfig } from '../generator/fixtures.js';
import type { StackConfig } from '../../src/schema/stack-config.js';
import type { GeneratedFile } from '../../src/generator/types.js';

export interface RenderAllTargetsOptions {
  configOverrides?: Partial<StackConfig>;
}

export async function renderAllTargets(options: RenderAllTargetsOptions = {}): Promise<GeneratedFile[]> {
  const overrides = options.configOverrides ?? {};
  const config = makeStackConfig({
    ...overrides,
    targets: {
      claudeCode: true,
      codexCli: true,
      cursor: true,
      copilot: true,
      windsurf: true,
      ...overrides.targets,
    },
  });
  return generateAll(config);
}
