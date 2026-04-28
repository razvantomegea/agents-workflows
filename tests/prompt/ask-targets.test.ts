import { resolveTargetDefaultsSync } from '../../src/prompt/ask-targets.js';
import type { DetectedAiAgent, DetectedAiAgents } from '../../src/detector/types.js';

function makeAgent(id: DetectedAiAgent['id'], cliAvailable = false): DetectedAiAgent {
  return {
    id,
    name: id,
    cliAvailable,
    configPresent: false,
    apiKeyPresent: false,
    matchedEnvVars: [],
  };
}

function makeDetected(overrides: Partial<DetectedAiAgents> = {}): DetectedAiAgents {
  return {
    agents: [
      makeAgent('claude'),
      makeAgent('codex'),
      makeAgent('cursor'),
      makeAgent('copilot'),
      makeAgent('windsurf'),
    ],
    hasClaudeCode: false,
    hasCodexCli: false,
    ...overrides,
  };
}

describe('resolveTargetDefaultsSync', () => {
  it('checks claudeCode when no other tool detected (legacy default)', () => {
    const defaults = resolveTargetDefaultsSync({ detected: makeDetected() });
    expect(defaults).toEqual({
      claudeCode: true,
      codexCli: false,
      cursor: false,
      copilot: false,
      windsurf: false,
    });
  });

  it('checks claudeCode + codexCli when both detected', () => {
    const detected = makeDetected({ hasClaudeCode: true, hasCodexCli: true });
    const defaults = resolveTargetDefaultsSync({ detected });
    expect(defaults.claudeCode).toBe(true);
    expect(defaults.codexCli).toBe(true);
  });

  it('does not check claudeCode by default when codex is the only tool detected', () => {
    const detected = makeDetected({ hasCodexCli: true });
    const defaults = resolveTargetDefaultsSync({ detected });
    expect(defaults.claudeCode).toBe(false);
    expect(defaults.codexCli).toBe(true);
  });

  it('checks cursor when cursor agent is detected via CLI', () => {
    const detected = makeDetected({
      agents: [
        makeAgent('claude'),
        makeAgent('codex'),
        makeAgent('cursor', true),
        makeAgent('copilot'),
        makeAgent('windsurf'),
      ],
    });
    const defaults = resolveTargetDefaultsSync({ detected });
    expect(defaults.cursor).toBe(true);
  });

  it('checks copilot when copilot CLI is detected', () => {
    const detected = makeDetected({
      agents: [
        makeAgent('claude'),
        makeAgent('codex'),
        makeAgent('cursor'),
        makeAgent('copilot', true),
        makeAgent('windsurf'),
      ],
    });
    const defaults = resolveTargetDefaultsSync({ detected });
    expect(defaults.copilot).toBe(true);
  });

  it('checks copilot when .github/ directory exists even without copilot agent', () => {
    const defaults = resolveTargetDefaultsSync({ detected: makeDetected(), githubDirPresent: true });
    expect(defaults.copilot).toBe(true);
  });

  it('checks windsurf when windsurf agent is detected', () => {
    const detected = makeDetected({
      agents: [
        makeAgent('claude'),
        makeAgent('codex'),
        makeAgent('cursor'),
        makeAgent('copilot'),
        makeAgent('windsurf', true),
      ],
    });
    const defaults = resolveTargetDefaultsSync({ detected });
    expect(defaults.windsurf).toBe(true);
  });

  it('checks all five when every signal fires', () => {
    const detected = makeDetected({
      hasClaudeCode: true,
      hasCodexCli: true,
      agents: [
        makeAgent('claude', true),
        makeAgent('codex', true),
        makeAgent('cursor', true),
        makeAgent('copilot', true),
        makeAgent('windsurf', true),
      ],
    });
    const defaults = resolveTargetDefaultsSync({ detected, githubDirPresent: true });
    expect(defaults).toEqual({
      claudeCode: true,
      codexCli: true,
      cursor: true,
      copilot: true,
      windsurf: true,
    });
  });
});
