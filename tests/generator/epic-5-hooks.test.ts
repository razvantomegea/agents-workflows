import { generateAll } from '../../src/generator/index.js';
import { DESTRUCTIVE_BASH_PATTERNS, buildDenyList } from '../../src/generator/permissions.js';
import { makeStackConfig } from './fixtures.js';

interface CommandHook {
  type: string;
  command: string;
}

interface HookEntry {
  matcher: string;
  hooks: CommandHook[];
}

interface SettingsJson {
  permissions: { allow: string[]; deny: string[] };
  hooks: {
    PreToolUse: HookEntry[];
    PostToolUse: HookEntry[];
  };
}

describe('Epic 5 — PreToolUse hook shape in settings.local.json', () => {
  it('PreToolUse is a non-empty array with Bash matcher', async () => {
    const files = await generateAll(makeStackConfig());
    const settings = files.find((f) => f.path === '.claude/settings.local.json');
    expect(settings).toBeDefined();
    const parsed = JSON.parse(settings!.content) as SettingsJson;

    expect(Array.isArray(parsed.hooks.PreToolUse)).toBe(true);
    expect(parsed.hooks.PreToolUse.length).toBeGreaterThan(0);
    expect(parsed.hooks.PreToolUse[0].matcher).toBe('Bash');
  });

  it('PreToolUse[0].hooks[0].type is "command"', async () => {
    const files = await generateAll(makeStackConfig());
    const parsed = JSON.parse(
      files.find((f) => f.path === '.claude/settings.local.json')!.content,
    ) as SettingsJson;

    expect(parsed.hooks.PreToolUse[0].hooks[0].type).toBe('command');
  });

  it('PreToolUse command contains all required destructive pattern substrings', async () => {
    const files = await generateAll(makeStackConfig());
    const parsed = JSON.parse(
      files.find((f) => f.path === '.claude/settings.local.json')!.content,
    ) as SettingsJson;
    const command = parsed.hooks.PreToolUse[0].hooks[0].command;

    expect(command).toContain('rm -rf');
    expect(command).toContain('git push --force');
    expect(command).toContain('git reset --hard');
    expect(command).toContain('git branch -D');
  });

  it('PostToolUse hook from Epic 1 remains intact with pnpm lint --fix command', async () => {
    const files = await generateAll(makeStackConfig());
    const parsed = JSON.parse(
      files.find((f) => f.path === '.claude/settings.local.json')!.content,
    ) as SettingsJson;

    expect(parsed.hooks.PostToolUse[0].matcher).toBe('Edit|MultiEdit|Write');
    expect(parsed.hooks.PostToolUse[0].hooks[0].command).toContain('--fix');
  });
});

describe('Epic 5 — DESTRUCTIVE_BASH_PATTERNS sync with deny list', () => {
  it('every DESTRUCTIVE_BASH_PATTERNS entry appears as Bash(<pattern>:*) in buildDenyList()', () => {
    const deny = buildDenyList();
    for (const pattern of DESTRUCTIVE_BASH_PATTERNS) {
      expect(deny).toContain(`Bash(${pattern}:*)`);
    }
  });
});

describe('Epic 5 — AGENTS.md Tooling / hooks section', () => {
  it('contains the Tooling / hooks section heading', async () => {
    const files = await generateAll(makeStackConfig());
    const agentsMd = files.find((f) => f.path === 'AGENTS.md');
    expect(agentsMd).toBeDefined();

    expect(agentsMd!.content).toContain('## Tooling / hooks');
  });

  it('references .claude/settings.local.json in the hooks section', async () => {
    const files = await generateAll(makeStackConfig());
    const agentsMd = files.find((f) => f.path === 'AGENTS.md');
    expect(agentsMd).toBeDefined();

    expect(agentsMd!.content).toContain('.claude/settings.local.json');
  });
});
