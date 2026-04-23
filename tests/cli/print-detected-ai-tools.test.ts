import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { printDetectedAiTools } from '../../src/cli/print-detected-ai-tools.js';
import { logger } from '../../src/utils/index.js';
import type { DetectedAiAgent } from '../../src/detector/types.js';

function makeAgent(overrides: Partial<DetectedAiAgent>): DetectedAiAgent {
  return {
    id: 'claude',
    name: 'claude',
    cliAvailable: false,
    configPresent: false,
    apiKeyPresent: false,
    matchedEnvVars: [],
    ...overrides,
  };
}

describe('printDetectedAiTools', () => {
  let infoSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => undefined);
  });

  afterEach(() => {
    infoSpy.mockRestore();
  });

  it('logs nothing when the agents array is empty', () => {
    printDetectedAiTools([]);

    expect(infoSpy).not.toHaveBeenCalled();
  });

  it('logs nothing when no agent has cliAvailable set to true', () => {
    const agents: readonly DetectedAiAgent[] = [
      makeAgent({ id: 'claude', name: 'claude', cliAvailable: false }),
      makeAgent({ id: 'codex', name: 'codex', cliAvailable: false }),
    ];

    printDetectedAiTools(agents);

    expect(infoSpy).not.toHaveBeenCalled();
  });

  it('logs only agents whose CLI is available, joined by comma', () => {
    const agents: readonly DetectedAiAgent[] = [
      makeAgent({ id: 'claude', name: 'claude', cliAvailable: true }),
      makeAgent({ id: 'codex', name: 'codex', cliAvailable: false }),
      makeAgent({ id: 'cursor', name: 'cursor', cliAvailable: true }),
    ];

    printDetectedAiTools(agents);

    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).toHaveBeenCalledWith('Detected AI tools on PATH: claude, cursor');
  });
});
