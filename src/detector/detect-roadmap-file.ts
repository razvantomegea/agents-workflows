import { join } from 'node:path';
import { fileExists } from '../utils/file-exists.js';
import type { Detection } from './types.js';

const ROADMAP_CONFIDENCE = 0.9;
const ROADMAP_CANDIDATES: readonly string[] = ['PRD.md', 'ROADMAP.md', 'EPICS.md'];

export async function detectRoadmapFile(projectRoot: string): Promise<Detection> {
  for (const filename of ROADMAP_CANDIDATES) {
    if (await fileExists(join(projectRoot, filename))) {
      return { value: filename, confidence: ROADMAP_CONFIDENCE };
    }
  }
  return { value: null, confidence: 0 };
}
