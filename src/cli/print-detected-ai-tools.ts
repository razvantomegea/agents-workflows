import { logger } from '../utils/index.js';
import type { DetectedAiAgent } from '../detector/types.js';

/**
 * Logs to stdout the names of AI tools found on `PATH` (i.e., `cliAvailable === true`).
 *
 * @param agents - List of detected AI agent entries to inspect.
 *
 * @remarks
 * Emits a single `logger.info` line listing all CLI-available agent names,
 * or nothing when no agents have `cliAvailable === true`.
 */
export function printDetectedAiTools(agents: readonly DetectedAiAgent[]): void {
  const names = agents
    .filter((agent) => agent.cliAvailable)
    .map((agent) => agent.name);

  if (names.length > 0) {
    logger.info(`Detected AI tools on PATH: ${names.join(', ')}`);
  }
}
