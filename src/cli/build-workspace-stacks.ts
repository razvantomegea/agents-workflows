import { logger, sanitizeForLog } from '../utils/index.js';
import type { DetectedStack, WorkspaceStackDetection } from '../detector/types.js';
import type { WorkspaceStack } from '../schema/stack-config.js';
import { workspaceStackSchema } from '../schema/workspace-stack.js';

type ReadyWorkspace = WorkspaceStackDetection & {
  language: string;
  packageManager: string;
  commands: WorkspaceStackDetection['commands'] & { test: string };
};

function isReadyWorkspace(ws: WorkspaceStackDetection): ws is ReadyWorkspace {
  return ws.language !== null && ws.packageManager !== null && ws.commands.test !== null;
}

function buildMissingFields(ws: WorkspaceStackDetection): string[] {
  const missing: string[] = [];
  if (ws.language === null) missing.push('language');
  if (ws.packageManager === null) missing.push('packageManager');
  if (ws.commands.test === null) missing.push('commands.test');
  return missing;
}

/**
 * Convert raw workspace detection results to typed WorkspaceStack values.
 *
 * Workspaces are skipped when any required field is absent (language,
 * packageManager, commands.test). A warn log is emitted per skipped workspace
 * listing every missing field so callers can diagnose detection gaps.
 *
 * Each candidate is also validated against workspaceStackSchema; workspaces
 * that fail schema validation are dropped with a warn log (WARNING W3).
 */
export function buildWorkspaceStacks(detected: DetectedStack): WorkspaceStack[] {
  const validated: WorkspaceStack[] = [];

  for (const ws of detected.workspaceStacks) {
    if (!isReadyWorkspace(ws)) {
      const missing = buildMissingFields(ws);
      logger.warn(
        `Skipping workspace ${sanitizeForLog(ws.path)}: ${missing.join(', ')} not detected`,
      );
      continue;
    }

    const candidate: WorkspaceStack = {
      path: ws.path,
      language: ws.language,
      runtime: ws.runtime,
      framework: ws.framework,
      packageManager: ws.packageManager,
      commands: {
        typeCheck: ws.commands.typeCheck,
        test: ws.commands.test,
        lint: ws.commands.lint,
        build: ws.commands.build,
      },
    };

    const result = workspaceStackSchema.safeParse(candidate);
    if (result.success) {
      validated.push(result.data);
    } else {
      logger.warn(
        `Skipping workspace ${sanitizeForLog(ws.path)}: schema validation failed (${result.error.issues[0]?.message ?? 'unknown'})`,
      );
    }
  }

  return validated;
}
