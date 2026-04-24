import { isDetected } from '../detector/detect-ai-agents.js';
import type { DetectedAiAgent, DetectedStack } from '../detector/types.js';
import type { StackConfig } from '../schema/stack-config.js';

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
