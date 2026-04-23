import { logger } from '../utils/index.js';
import type { DetectedStack } from '../detector/types.js';

export function printDetected(detected: DetectedStack): void {
  const entries = [
    ['Language', detected.language],
    ['Framework', detected.framework],
    ['UI Library', detected.uiLibrary],
    ['State', detected.stateManagement],
    ['Database', detected.database],
    ['Testing', detected.testFramework],
    ['E2E', detected.e2eFramework],
    ['Linter', detected.linter],
    ['Formatter', detected.formatter],
    ['Pkg Manager', detected.packageManager],
    ['Docs', detected.docsFile],
  ] as const;

  for (const [label, detection] of entries) {
    if (detection.value) {
      logger.label(label, `${detection.value} (${Math.round(detection.confidence * 100)}%)`);
    }
  }

  if (detected.monorepo.isMonorepo) {
    logger.label('Monorepo', `${detected.monorepo.tool ?? 'unknown'} (${detected.monorepo.workspaces.length} workspace(s))`);
  }
}
