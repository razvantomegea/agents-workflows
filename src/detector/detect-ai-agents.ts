import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileExists } from '../utils/index.js';
import type { AiAgentId, DetectedAiAgent, DetectedAiAgents } from './types.js';

const execFileAsync = promisify(execFile);

interface AiAgentRule {
  id: AiAgentId;
  name: string;
  cmd: string;
  configPath: string;
  envVars: readonly string[];
}

const AI_AGENT_RULES: readonly AiAgentRule[] = [
  { id: 'claude', name: 'Claude Code', cmd: 'claude', configPath: '.claude', envVars: ['ANTHROPIC_API_KEY'] },
  { id: 'codex', name: 'Codex CLI', cmd: 'codex', configPath: '.codex/config.toml', envVars: ['OPENAI_API_KEY'] },
  { id: 'cursor', name: 'Cursor', cmd: 'cursor', configPath: '.cursor', envVars: [] },
  { id: 'aider', name: 'Aider', cmd: 'aider', configPath: '.aider.conf.yml', envVars: ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'] },
  { id: 'continue', name: 'Continue.dev', cmd: '', configPath: '.continue/config.yaml', envVars: [] },
  { id: 'copilot', name: 'Copilot CLI', cmd: 'copilot', configPath: '.copilot', envVars: ['COPILOT_GITHUB_TOKEN', 'GH_TOKEN', 'GITHUB_TOKEN'] },
  { id: 'windsurf', name: 'Windsurf', cmd: 'windsurf', configPath: '.codeium/windsurf', envVars: [] },
  { id: 'gemini', name: 'Gemini CLI', cmd: 'gemini', configPath: '.gemini', envVars: ['GEMINI_API_KEY'] },
] as const;

export async function isCommandOnPath(cmd: string): Promise<boolean> {
  if (!cmd) return false;

  const locator = process.platform === 'win32' ? 'where' : 'which';

  try {
    await execFileAsync(locator, [cmd], { timeout: 500 });
    return true;
  } catch {
    return false;
  }
}

export async function hasConfigPath(relativeToHome: string): Promise<boolean> {
  return fileExists(resolve(homedir(), relativeToHome));
}

export function hasAnyEnvVar(names: readonly string[]): { present: boolean; matched: string[] } {
  const envNames = new Set(Object.keys(process.env));
  const matched = names.filter((name) => envNames.has(name));

  return { present: matched.length > 0, matched };
}

export async function detectAiAgents(): Promise<DetectedAiAgents> {
  const agents = await Promise.all(AI_AGENT_RULES.map(detectAiAgent));

  return {
    agents,
    hasClaudeCode: isDetected(agents.find((agent) => agent.id === 'claude')),
    hasCodexCli: isDetected(agents.find((agent) => agent.id === 'codex')),
  };
}

async function detectAiAgent(rule: AiAgentRule): Promise<DetectedAiAgent> {
  const env = hasAnyEnvVar(rule.envVars);
  const [cliAvailable, configPresent] = await Promise.all([
    isCommandOnPath(rule.cmd),
    hasConfigPath(rule.configPath),
  ]);

  return {
    id: rule.id,
    name: rule.name,
    cliAvailable,
    configPresent,
    apiKeyPresent: env.present,
    matchedEnvVars: env.matched,
  };
}

export function isDetected(agent: DetectedAiAgent | undefined): boolean {
  return Boolean(agent?.cliAvailable || agent?.configPresent || agent?.apiKeyPresent);
}
