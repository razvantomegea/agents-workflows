import { join } from 'node:path';
import { fileExists } from '../utils/file-exists.js';
import type { Detection } from './types.js';

interface DocCandidate {
  filename: string;
  confidence: number;
}

const DOC_CANDIDATES: DocCandidate[] = [
  { filename: 'README.md', confidence: 0.9 },
  { filename: 'ARCHITECTURE.md', confidence: 0.85 },
  { filename: 'DOCS.md', confidence: 0.8 },
  { filename: 'PRD.md', confidence: 0.7 },
];

/**
 * Detects the primary documentation file for the project.
 *
 * Candidates are checked in priority order:
 * `README.md` (0.9) → `ARCHITECTURE.md` (0.85) → `DOCS.md` (0.8) → `PRD.md` (0.7).
 * The first file found is returned.
 *
 * @param projectRoot - Absolute path to the project root directory.
 * @returns A `Detection` whose `value` is the matched filename (e.g. `"README.md"`)
 *   and `confidence` reflects the candidate's priority, or `{ value: null,
 *   confidence: 0 }` when none of the candidates exist.
 * @remarks Performs up to four sequential filesystem stat calls. No errors are
 *   surfaced; a missing or unreadable directory yields `{ value: null, confidence: 0 }`.
 */
export async function detectDocsFile(projectRoot: string): Promise<Detection> {
  for (const candidate of DOC_CANDIDATES) {
    if (await fileExists(join(projectRoot, candidate.filename))) {
      return { value: candidate.filename, confidence: candidate.confidence };
    }
  }
  return { value: null, confidence: 0 };
}
