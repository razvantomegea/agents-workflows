import { isDetected } from '../detector/detect-ai-agents.js';
import type { DetectedAiAgent, DetectedStack } from '../detector/types.js';
import type { StackConfig } from '../schema/stack-config.js';

/**
 * Maps raw `DetectedStack` AI agent presence data to the flat `StackConfig['detectedAiAgents']` flags object.
 *
 * @param detected - Full `DetectedStack` produced by `detectStack`.
 *
 * @returns A `StackConfig['detectedAiAgents']` object with a boolean flag per known AI tool
 *   (`claudeCode`, `codexCli`, `cursor`, `aider`, `continueDev`, `copilot`, `windsurf`, `gemini`).
 */
export function toDetectedAiAgentFlags(detected: DetectedStack): StackConfig['detectedAiAgents'] {
  const isPresent = (id: string): boolean =>
    isDetected(detected.aiAgents.agents.find((candidate: DetectedAiAgent) => candidate.id === id));

  return {
    claudeCode: detected.aiAgents.hasClaudeCode,
    codexCli: detected.aiAgents.hasCodexCli,
    cursor: isPresent('cursor'),
    aider: isPresent('aider'),
    continueDev: isPresent('continue'),
    copilot: isPresent('copilot'),
    windsurf: isPresent('windsurf'),
    gemini: isPresent('gemini'),
  };
}
