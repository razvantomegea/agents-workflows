import { getContent } from '../fixtures.js';
import { IMPLEMENTER_CLAUDE_PATH } from './constants.js';
import { generateForFixture } from './generateForFixture.js';

export async function getImplementerContent(fixtureName: string): Promise<string> {
  const files = await generateForFixture(fixtureName);
  return getContent(files, IMPLEMENTER_CLAUDE_PATH);
}
