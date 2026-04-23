import { logger } from '../utils/index.js';
import type { DetectedAiAgent } from '../detector/types.js';

export function printDetectedAiTools(agents: readonly DetectedAiAgent[]): void {
  const names = agents
    .filter((agent) => agent.cliAvailable)
    .map((agent) => agent.name);

  if (names.length > 0) {
    logger.info(`Detected AI tools on PATH: ${names.join(', ')}`);
  }
}
