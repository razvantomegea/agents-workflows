import { generateAll } from '../../src/generator/index.js';
import {
  BASH_DENY_COMMAND_PATTERNS,
  EXPECTED_ALLOWED_DOMAINS_COUNT,
  buildDenyList,
} from '../../src/generator/permissions.js';
import type { CommandHook, PostToolUseHook, PreToolUseHook } from '../../src/generator/types.js';
import { makeStackConfig } from './fixtures.js';
import { assertSettingsJsonShape } from './settings-json-shape.helper.js';

interface SandboxBlock {
  mode: string;
  autoAllowBashIfSandboxed: boolean;
  allowedDomains: string[];
}

interface SettingsJson {
  permissions: { defaultMode: string; allow: string[]; deny: string[] };
  sandbox: SandboxBlock;
  hooks: {
    PreToolUse: PreToolUseHook[];
    PostToolUse: PostToolUseHook[];
  };
}

let parsedSettings: SettingsJson;
let generatedFiles: Awaited<ReturnType<typeof generateAll>>;

beforeAll(async () => {
  generatedFiles = await generateAll(makeStackConfig());
  const settings = generatedFiles.find((file) => file.path === '.claude/settings.json');
  if (!settings) {
    throw new Error('Expected .claude/settings.json to be generated');
  }
  parsedSettings = JSON.parse(settings.content) as SettingsJson;
});

describe('Epic 5 — PreToolUse hook shape in settings.json', () => {
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
    expect(command).toContain('git branch -d');
  });

  it('PostToolUse hook from Epic 1 remains intact with pnpm lint --fix command', () => {
    expect(parsedSettings.hooks.PostToolUse[0].matcher).toBe('Edit|MultiEdit|Write');
    expect(parsedSettings.hooks.PostToolUse[0].hooks[0].command).toContain('--fix');
  });
});

describe('Epic 5 — settings.json top-level fields (E9.T2)', () => {
  it('has defaultMode set to "default"', () => {
    expect(parsedSettings.permissions.defaultMode).toBe('default');
  });

  it('has sandbox.mode set to "workspace-write"', () => {
    expect(parsedSettings.sandbox.mode).toBe('workspace-write');
  });

  it('has sandbox.autoAllowBashIfSandboxed set to true', () => {
    expect(parsedSettings.sandbox.autoAllowBashIfSandboxed).toBe(true);
  });

  it('has sandbox.allowedDomains with exactly 7 entries', () => {
    expect(parsedSettings.sandbox.allowedDomains).toHaveLength(EXPECTED_ALLOWED_DOMAINS_COUNT);
  });

  it('sandbox.allowedDomains includes the required registries and APIs', () => {
    const domains = parsedSettings.sandbox.allowedDomains;
    expect(domains).toContain('api.github.com');
    expect(domains).toContain('registry.npmjs.org');
    expect(domains).toContain('nodejs.org');
    expect(domains).toContain('raw.githubusercontent.com');
    expect(domains).toContain('objects.githubusercontent.com');
    expect(domains).toContain('pypi.org');
    expect(domains).toContain('files.pythonhosted.org');
  });
});

describe('Epic 5 — DESTRUCTIVE_BASH_PATTERNS sync with deny list', () => {
  it('every BASH_DENY_COMMAND_PATTERNS entry appears as Bash(<pattern>:*) in buildDenyList()', () => {
    const deny = buildDenyList();
    for (const pattern of BASH_DENY_COMMAND_PATTERNS) {
      expect(deny).toContain(`Bash(${pattern}:*)`);
    }
  });
});

describe('Epic 5 — settings.json shape helper parity', () => {
  it('matches the shared settings JSON shape assertions', () => {
    assertSettingsJsonShape(parsedSettings);
  });
});

describe('Epic 5 — AGENTS.md Tooling / hooks section', () => {
  it('contains the Tooling / hooks section heading', () => {
    const agentsMd = generatedFiles.find((f) => f.path === 'AGENTS.md');
    expect(agentsMd).toBeDefined();
    expect(agentsMd!.content).toContain('## Tooling / hooks');
  });

  it('references .claude/settings.json in the hooks section', () => {
    const agentsMd = generatedFiles.find((f) => f.path === 'AGENTS.md');
    expect(agentsMd).toBeDefined();
    expect(agentsMd!.content).toContain('.claude/settings.json');
  });
});
