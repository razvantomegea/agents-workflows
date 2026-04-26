import { generateAll } from '../../src/generator/index.js';
import { makeStackConfig, getContent } from './fixtures.js';

const CODEX_TOML_PATH = '.codex/config.toml';
const SETTINGS_JSON_PATH = '.claude/settings.json';
const AGENTS_MD_PATH = 'AGENTS.md';
const CLAUDE_MD_PATH = 'CLAUDE.md';

const NON_INTERACTIVE_CONFIG = makeStackConfig({
  security: {
    nonInteractiveMode: true,
    runsIn: 'docker',
    disclosureAcknowledgedAt: '2026-04-25T12:00:00.000Z',
  },
});

describe('Epic 10 template branching — non-interactive mode', () => {
  describe('non-interactive branch (security.nonInteractiveMode === true)', () => {
    it('emits approval_policy = "never" and network_access = true in .codex/config.toml', async () => {
      const files = await generateAll(NON_INTERACTIVE_CONFIG);
      const toml = getContent(files, CODEX_TOML_PATH);

      expect(toml).toContain('approval_policy = "never"');
      expect(toml).toContain('network_access = true');
      // The comment header always has the safe-default description; check no non-comment key-value for on-request
      expect(toml).not.toMatch(/^approval_policy = "on-request"/m);
      expect(toml).not.toMatch(/^network_access = false/m);
    });

    it('includes runsIn, acknowledged, and PRD §1.9.1 in .codex/config.toml', async () => {
      const files = await generateAll(NON_INTERACTIVE_CONFIG);
      const toml = getContent(files, CODEX_TOML_PATH);

      expect(toml).toMatch(/^# Non-interactive mode enabled \(runsIn=docker, acknowledged=20\d{2}-\d{2}-\d{2}T/m);
      expect(toml).toContain('PRD §1.9.1');
    });

    it('emits defaultMode = "acceptEdits" in .claude/settings.json', async () => {
      const files = await generateAll(NON_INTERACTIVE_CONFIG);
      const json = getContent(files, SETTINGS_JSON_PATH);
      const parsed = JSON.parse(json) as {
        permissions: { defaultMode: string };
        sandbox: { mode: string; allowedDomains: string[] };
      };

      expect(parsed.permissions.defaultMode).toBe('acceptEdits');
      expect(json).not.toContain('bypassPermissions');
      expect(parsed.sandbox.mode).toBe('workspace-write');
      expect(parsed.sandbox.allowedDomains.length).toBeGreaterThan(0);
    });

    it('renders the acceptEdits Bash-still-prompts caveat in CLAUDE.md and AGENTS.md', async () => {
      const files = await generateAll(NON_INTERACTIVE_CONFIG);
      const claudeMd = getContent(files, CLAUDE_MD_PATH);
      const agentsMd = getContent(files, AGENTS_MD_PATH);

      expect(claudeMd).toContain('defaultMode = "acceptEdits"');
      expect(claudeMd).toContain('Bash commands still prompt');
      expect(agentsMd).toContain('defaultMode = "acceptEdits"');
      expect(agentsMd).toContain('Bash commands still prompt');
    });
  });

  describe('safe-default branch (security.nonInteractiveMode === false)', () => {
    const safeConfig = makeStackConfig();

    it('emits approval_policy = "on-request" and network_access = false in .codex/config.toml', async () => {
      const files = await generateAll(safeConfig);
      const toml = getContent(files, CODEX_TOML_PATH);

      expect(toml).toContain('approval_policy = "on-request"');
      expect(toml).toContain('network_access = false');
      expect(toml).not.toContain('approval_policy = "never"');
      expect(toml).not.toContain('runsIn=');
    });

    it('emits defaultMode = "default" in .claude/settings.json', async () => {
      const files = await generateAll(safeConfig);
      const json = getContent(files, SETTINGS_JSON_PATH);
      const parsed = JSON.parse(json) as {
        permissions: { defaultMode: string };
        sandbox: { mode: string; allowedDomains: string[] };
      };

      expect(parsed.permissions.defaultMode).toBe('default');
      expect(parsed.sandbox.mode).toBe('workspace-write');
      expect(parsed.sandbox.allowedDomains.length).toBeGreaterThan(0);
    });

    it('omits security-disclosure section from AGENTS.md when nonInteractiveMode is false', async () => {
      const files = await generateAll(safeConfig);
      const agentsMd = getContent(files, AGENTS_MD_PATH);

      expect(agentsMd).not.toContain('Semi-autonomous non-interactive mode — security disclosure');
      expect(agentsMd).not.toContain('approval_policy = "never"');
    });

    it('omits security-disclosure section from CLAUDE.md when nonInteractiveMode is false', async () => {
      const files = await generateAll(safeConfig);
      const claudeMd = getContent(files, CLAUDE_MD_PATH);

      expect(claudeMd).not.toContain('Semi-autonomous non-interactive mode — security disclosure');
      expect(claudeMd).not.toContain('bypassPermissions');
    });
  });

  describe('disclosure rendering — AGENTS.md and CLAUDE.md with nonInteractiveMode === true', () => {
    it('injects security disclosure into AGENTS.md when nonInteractiveMode is true', async () => {
      const files = await generateAll(NON_INTERACTIVE_CONFIG);
      const agentsMd = getContent(files, AGENTS_MD_PATH);

      expect(agentsMd).toContain('Semi-autonomous non-interactive mode — security disclosure');
      expect(agentsMd).toContain('PRD §1.9.1');
    });

    it('injects security disclosure into CLAUDE.md when nonInteractiveMode is true', async () => {
      const files = await generateAll(NON_INTERACTIVE_CONFIG);
      const claudeMd = getContent(files, CLAUDE_MD_PATH);

      expect(claudeMd).toContain('Semi-autonomous non-interactive mode — security disclosure');
      expect(claudeMd).toContain('PRD §1.9.1');
    });
  });
});
