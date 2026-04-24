import type { MonorepoInfo } from './detect-monorepo.js';

export interface Detection<T = string> {
  value: T | null;
  confidence: number;
}

export type AiAgentId =
  | 'claude'
  | 'codex'
  | 'cursor'
  | 'aider'
  | 'continue'
  | 'copilot'
  | 'windsurf'
  | 'gemini';

export interface DetectedAiAgent {
  id: AiAgentId;
  name: string;
  cliAvailable: boolean;
  configPresent: boolean;
  apiKeyPresent: boolean;
  matchedEnvVars: readonly string[];
}

export interface DetectedAiAgents {
  agents: readonly DetectedAiAgent[];
  hasClaudeCode: boolean;
  hasCodexCli: boolean;
}

export interface DetectedStack {
  language: Detection;
  runtime: Detection;
  framework: Detection;
  uiLibrary: Detection;
  stateManagement: Detection;
  database: Detection;
  auth: Detection;
  i18n: Detection;
  testFramework: Detection;
  testLibrary: Detection;
  e2eFramework: Detection;
  linter: Detection;
  formatter: Detection;
  packageManager: Detection;
  monorepo: MonorepoInfo;
  aiAgents: DetectedAiAgents;
  docsFile: Detection;
}
