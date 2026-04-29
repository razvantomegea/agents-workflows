import { join } from 'node:path';
import { access } from 'node:fs/promises';
import { detectStack } from '../../../src/detector/detect-stack.js';
import type { DetectedStack } from '../../../src/detector/types.js';
import { FIXTURES_DIR } from './constants.js';

export async function detectFixture(fixtureName: string): Promise<DetectedStack> {
  const fixturePath = join(FIXTURES_DIR, fixtureName);
  try {
    await access(fixturePath);
  } catch {
    throw new Error(`Fixture not found: ${fixtureName} (looked in ${fixturePath})`);
  }
  return detectStack(fixturePath);
}
