import { generateAll } from '../../src/generator/index.js';
import { makeStackConfig } from './fixtures.js';

const makeConfig = makeStackConfig;

const AGENTS_WITH_UNTRUSTED = [
  'architect',
  'implementer',
  'code-reviewer',
  'security-reviewer',
  'ui-designer',
  'react-ts-senior',
];
const AGENTS_WITHOUT_UNTRUSTED = ['code-optimizer', 'test-writer', 'e2e-tester', 'reviewer'];
const ALL_AGENTS = [...AGENTS_WITH_UNTRUSTED, ...AGENTS_WITHOUT_UNTRUSTED];
const AGENTS_WITH_TOOL_USE = ['architect', 'implementer', 'react-ts-senior'];
const AGENTS_WITHOUT_TOOL_USE = [
  'code-reviewer',
  'security-reviewer',
  'code-optimizer',
  'test-writer',
  'e2e-tester',
  'reviewer',
  'ui-designer',
];

describe('Epic 1 safety partials', () => {
  it('wires context-budget into AGENTS.md and CLAUDE.md only', async () => {
    const files = await generateAll(makeConfig());

    const agentsMd = files.find((file) => file.path === 'AGENTS.md');
    const claudeMd = files.find((file) => file.path === 'CLAUDE.md');
    expect(agentsMd?.content).toContain('finite attention budget');
    expect(claudeMd?.content).toContain('finite attention budget');

    const agentFiles = files.filter((file) => file.path.startsWith('.claude/agents/'));
    for (const agentFile of agentFiles) {
      expect(agentFile.content).not.toContain('finite attention budget');
    }
  });

  it('wires untrusted-content into the mapped agents only', async () => {
    const files = await generateAll(makeConfig());

    for (const agentName of AGENTS_WITH_UNTRUSTED) {
      const agentFile = files.find((file) => file.path === `.claude/agents/${agentName}.md`);
      expect(agentFile?.content).toContain('<untrusted_content_protocol>');
    }

    for (const agentName of AGENTS_WITHOUT_UNTRUSTED) {
      const agentFile = files.find((file) => file.path === `.claude/agents/${agentName}.md`);
      expect(agentFile?.content).not.toContain('<untrusted_content_protocol>');
    }
  });

  it('wires fail-safe into all 10 agent templates', async () => {
    const files = await generateAll(makeConfig());

    for (const agentName of ALL_AGENTS) {
      const agentFile = files.find((file) => file.path === `.claude/agents/${agentName}.md`);
      expect(agentFile?.content).toContain('<fail_safe>');
    }
  });

  it('wires tool-use-discipline into architect, implementer, react-ts-senior only', async () => {
    const files = await generateAll(makeConfig());

    for (const agentName of AGENTS_WITH_TOOL_USE) {
      const agentFile = files.find((file) => file.path === `.claude/agents/${agentName}.md`);
      expect(agentFile?.content).toContain('<tool_use_discipline>');
      expect(agentFile?.content).toContain('issue them as parallel tool');
    }

    for (const agentName of AGENTS_WITHOUT_TOOL_USE) {
      const agentFile = files.find((file) => file.path === `.claude/agents/${agentName}.md`);
      expect(agentFile?.content).not.toContain('<tool_use_discipline>');
      expect(agentFile?.content).not.toContain('issue them as parallel tool');
    }
  });

  it('includes Dangerous operations section in rendered AGENTS.md', async () => {
    const files = await generateAll(makeConfig());
    const agentsMd = files.find((file) => file.path === 'AGENTS.md');
    expect(agentsMd).toBeDefined();
    expect(agentsMd?.content).toContain('## Dangerous operations');
    expect(agentsMd?.content).toContain('rm -rf');
    expect(agentsMd?.content).toContain('npm publish');
  });

  it('renders .claude/settings.local.json with deny list and PostToolUse hook', async () => {
    const files = await generateAll(makeConfig());
    const settings = files.find((file) => file.path === '.claude/settings.local.json');
    expect(settings).toBeDefined();
    const parsed = JSON.parse(settings!.content) as {
      permissions: { allow: string[]; deny: string[] };
      hooks?: { PostToolUse: Array<{ matcher: string; command: string }> };
    };
    expect(parsed.permissions.deny).toContain('Bash(rm -rf:*)');
    expect(parsed.permissions.deny).toContain('Edit(.env*)');
    expect(parsed.permissions.deny).toContain('Edit(migrations/**)');
    expect(parsed.permissions.deny).toHaveLength(20);
    expect(parsed.permissions.deny).toContain('Bash(git push --force-with-lease:*)');
    expect(parsed.permissions.deny).toContain('Bash(rm --recursive:*)');
    expect(parsed.hooks?.PostToolUse[0].matcher).toBe('Edit|Write');
    expect(parsed.hooks?.PostToolUse[0].command).toContain('--fix');
  });

  it('emits .codex/config.toml with Codex-native safety defaults', async () => {
    const files = await generateAll(makeConfig());
    const codexConfig = files.find((file) => file.path === '.codex/config.toml');

    expect(codexConfig).toBeDefined();
    const toml = codexConfig!.content;

    expect(toml).toContain('approval_policy = "untrusted"');
    expect(toml).toContain('sandbox_mode = "workspace-write"');
    expect(toml).toContain('[sandbox_workspace_write]');
    expect(toml).toContain('network_access = false');
    expect(toml).not.toContain('[permissions]');
  });

  it('omits .codex/config.toml when targets.codexCli is false', async () => {
    const config = makeConfig();
    config.targets.codexCli = false;
    const files = await generateAll(config);
    const paths = files.map((file) => file.path);
    expect(paths).not.toContain('.codex/config.toml');
  });
});
