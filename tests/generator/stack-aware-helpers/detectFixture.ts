import { join } from 'node:path';
import { detectStack } from '../../../src/detector/detect-stack.js';
import type { DetectedStack } from '../../../src/detector/types.js';
import { FIXTURES_DIR } from './constants.js';

export async function detectFixture(fixtureName: string): Promise<DetectedStack> {
  return detectStack(join(FIXTURES_DIR, fixtureName));
}
