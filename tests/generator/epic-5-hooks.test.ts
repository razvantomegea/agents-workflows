import { generateAll } from '../../src/generator/index.js';
import { DESTRUCTIVE_BASH_PATTERNS, buildDenyList } from '../../src/generator/permissions.js';
import type { CommandHook, PostToolUseHook, PreToolUseHook } from '../../src/generator/types.js';
import { makeStackConfig } from './fixtures.js';

interface SettingsJson {
  permissions: { allow: string[]; deny: string[] };
  hooks: {
    PreToolUse: PreToolUseHook[];
    PostToolUse: PostToolUseHook[];
  };
}

let parsedSettings: SettingsJson;
let generatedFiles: Awaited<ReturnType<typeof generateAll>>;

beforeAll(async () => {
  generatedFiles = await generateAll(makeStackConfig());
  const settings = generatedFiles.find((file) => file.path === '.claude/settings.local.json');
  if (!settings) {
    throw new Error('Expected .claude/settings.local.json to be generated');
  }
  parsedSettings = JSON.parse(settings.content) as SettingsJson;
});

describe('Epic 5 — PreToolUse hook shape in settings.local.json', () => {
  it('PreToolUse is a non-empty array with Bash matcher', () => {
    expect(Array.isArray(parsedSettings.hooks.PreToolUse)).toBe(true);
    expect(parsedSettings.hooks.PreToolUse.length).toBeGreaterThan(0);
    expect(parsedSettings.hooks.PreToolUse[0].matcher).toBe('Bash');
  });

  it('PreToolUse[0].hooks[0].type is "command"', () => {
    expect(parsedSettings.hooks.PreToolUse[0].hooks[0].type).toBe('command');
  });

  it('PreToolUse command contains all required destructive pattern substrings', () => {
    const commandHook: CommandHook = parsedSettings.hooks.PreToolUse[0].hooks[0];
    const command = commandHook.command;

    expect(command).toContain('rm -rf');
    expect(command).toContain('git push --force');
    expect(command).toContain('git reset --hard');
    expect(command).toContain('git branch -D');
  });

  it('PostToolUse hook from Epic 1 remains intact with pnpm lint --fix command', () => {
    expect(parsedSettings.hooks.PostToolUse[0].matcher).toBe('Edit|MultiEdit|Write');
    expect(parsedSettings.hooks.PostToolUse[0].hooks[0].command).toContain('--fix');
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
  it('contains the Tooling / hooks section heading', () => {
    const agentsMd = generatedFiles.find((f) => f.path === 'AGENTS.md');
    expect(agentsMd).toBeDefined();

    expect(agentsMd!.content).toContain('## Tooling / hooks');
  });

  it('references .claude/settings.local.json in the hooks section', () => {
    const agentsMd = generatedFiles.find((f) => f.path === 'AGENTS.md');
    expect(agentsMd).toBeDefined();

    expect(agentsMd!.content).toContain('.claude/settings.local.json');
  });
});
