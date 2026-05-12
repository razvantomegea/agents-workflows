import { join } from 'node:path';
import { fileExists } from '../utils/file-exists.js';
import type { Detection } from './types.js';

const ROADMAP_CONFIDENCE = 0.9;
const ROADMAP_CANDIDATES: readonly string[] = ['PRD.md', 'ROADMAP.md', 'EPICS.md'];

/**
 * Detects the primary roadmap / planning document for the project.
 *
 * Candidates are checked in priority order: `PRD.md`, `ROADMAP.md`, `EPICS.md`.
 * The first file found is returned with a fixed confidence of 0.9.
 *
 * @param projectRoot - Absolute path to the project root directory.
 * @returns A `Detection` whose `value` is the matched filename (e.g. `"PRD.md"`)
 *   and `confidence` is `0.9`, or `{ value: null, confidence: 0 }` when none
 *   of the candidates exist.
 * @remarks Performs up to three sequential filesystem stat calls. No errors are
 *   surfaced; a missing or unreadable directory yields `{ value: null, confidence: 0 }`.
 */
export async function detectRoadmapFile(projectRoot: string): Promise<Detection> {
  for (const filename of ROADMAP_CANDIDATES) {
    if (await fileExists(join(projectRoot, filename))) {
      return { value: filename, confidence: ROADMAP_CONFIDENCE };
    }
  }
  return { value: null, confidence: 0 };
}
