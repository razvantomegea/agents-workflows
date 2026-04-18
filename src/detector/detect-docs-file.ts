import { join } from 'node:path';
import { fileExists } from '../utils/file-exists.js';
import type { Detection } from './types.js';

interface DocCandidate {
  filename: string;
  confidence: number;
}

const DOC_CANDIDATES: DocCandidate[] = [
  { filename: 'PRD.md', confidence: 0.9 },
  { filename: 'ARCHITECTURE.md', confidence: 0.85 },
  { filename: 'DOCS.md', confidence: 0.8 },
  { filename: 'README.md', confidence: 0.7 },
];

export async function detectDocsFile(projectRoot: string): Promise<Detection> {
  for (const candidate of DOC_CANDIDATES) {
    if (await fileExists(join(projectRoot, candidate.filename))) {
      return { value: candidate.filename, confidence: candidate.confidence };
    }
  }
  return { value: null, confidence: 0 };
}
