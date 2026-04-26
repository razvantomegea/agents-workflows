import { join } from 'node:path';
import { fileExists } from '../utils/file-exists.js';
import type { Detection } from './types.js';

const ROADMAP_FILENAME = 'PRD.md';
const ROADMAP_CONFIDENCE = 0.9;

export async function detectRoadmapFile(projectRoot: string): Promise<Detection> {
  if (await fileExists(join(projectRoot, ROADMAP_FILENAME))) {
    return { value: ROADMAP_FILENAME, confidence: ROADMAP_CONFIDENCE };
  }
  return { value: null, confidence: 0 };
}
