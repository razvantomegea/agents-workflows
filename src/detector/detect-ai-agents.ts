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

/**
 * Checks whether a CLI command is available on the system PATH.
 *
 * @param cmd - The command name to locate (e.g. `"claude"`, `"codex"`).
 *   An empty string always returns `false` without spawning a process.
 * @returns `true` if the command is found by `which` (Unix) or `where` (Windows),
 *   `false` otherwise.
 * @remarks Spawns a short-lived child process (`which`/`where`) with a 500 ms
 *   timeout. Any spawn error or non-zero exit is silently swallowed and treated
 *   as "not found".
 */
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

/**
 * Checks whether a config path exists under the current user's home directory.
 *
 * @param relativeToHome - Path relative to `os.homedir()` (e.g. `".claude"`,
 *   `".codex/config.toml"`).
 * @returns `true` if the resolved path exists on the filesystem, `false`
 *   otherwise.
 * @remarks Performs a single filesystem stat call via `fileExists`.
 */
export async function hasConfigPath(relativeToHome: string): Promise<boolean> {
  return fileExists(resolve(homedir(), relativeToHome));
}

/**
 * Tests whether any of the given environment variable names are set in the
 * current process environment.
 *
 * @param names - List of environment variable names to check (e.g.
 *   `["ANTHROPIC_API_KEY"]`).
 * @returns An object with:
 *   - `present` — `true` if at least one name was found in `process.env`.
 *   - `matched` — subset of `names` that are actually set.
 * @remarks Reads `process.env` synchronously; no I/O performed.
 */
export function hasAnyEnvVar(names: readonly string[]): { present: boolean; matched: string[] } {
  const envNames = new Set(Object.keys(process.env));
  const matched = names.filter((name) => envNames.has(name));

  return { present: matched.length > 0, matched };
}

/**
 * Detects which AI coding agents are available in the current environment.
 *
 * Checks for Claude Code, Codex CLI, Cursor, Aider, Continue.dev, Copilot CLI,
 * Windsurf, and Gemini CLI. For each agent the detector tests CLI availability,
 * presence of a config path under `$HOME`, and known API-key environment variables.
 *
 * @returns A `DetectedAiAgents` object containing:
 *   - `agents` — one `DetectedAiAgent` entry per supported agent.
 *   - `hasClaudeCode` — convenience flag derived via `isDetected` for the
 *     `"claude"` agent.
 *   - `hasCodexCli` — convenience flag derived via `isDetected` for the
 *     `"codex"` agent.
 * @remarks Performs up to two parallel I/O operations per agent (child-process
 *   spawn + filesystem stat). All errors are swallowed inside helpers; the
 *   function never rejects.
 */
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

/**
 * Returns `true` when a `DetectedAiAgent` shows at least one positive signal
 * (CLI available, config path present, or API key in environment).
 *
 * @param agent - A `DetectedAiAgent` entry, or `undefined` when the agent was
 *   not found in the results list.
 * @returns `true` if `cliAvailable`, `configPresent`, or `apiKeyPresent` is
 *   truthy; `false` when `agent` is `undefined` or all three fields are falsy.
 */
export function isDetected(agent: DetectedAiAgent | undefined): boolean {
  return Boolean(agent?.cliAvailable || agent?.configPresent || agent?.apiKeyPresent);
}
