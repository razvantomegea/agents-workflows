import { generateAll } from '../../src/generator/index.js';
import { makeStackConfig } from './fixtures.js';

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
    const files = await generateAll(makeStackConfig());

    const agentsMd = files.find((file) => file.path === 'AGENTS.md');
    const claudeMd = files.find((file) => file.path === 'CLAUDE.md');
    expect(agentsMd?.content).toContain('Load only files, symbols, and recent decisions');
    expect(claudeMd?.content).toContain('Load only files, symbols, and recent decisions');

    const agentFiles = files.filter((file) => file.path.startsWith('.claude/agents/'));
    for (const agentFile of agentFiles) {
      expect(agentFile.content).not.toContain('Load only files, symbols, and recent decisions');
    }
  });

  it('wires untrusted-content into the mapped agents only', async () => {
    const files = await generateAll(makeStackConfig());

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
    const files = await generateAll(makeStackConfig());

    for (const agentName of ALL_AGENTS) {
      const agentFile = files.find((file) => file.path === `.claude/agents/${agentName}.md`);
      expect(agentFile?.content).toContain('<fail_safe>');
    }

    const architectFile = files.find((file) => file.path === '.claude/agents/architect.md');
    const implementerFile = files.find((file) => file.path === '.claude/agents/implementer.md');
    expect(architectFile?.content).toContain('materially change the plan');
    expect(architectFile?.content).toContain('Do not accumulate failed plan attempts');
    expect(architectFile?.content).not.toContain('Task-related edits are allowed');
    expect(implementerFile?.content).toContain('Task-related edits are allowed');
  });

  it('wires tool-use-discipline into architect, implementer, react-ts-senior only', async () => {
    const files = await generateAll(makeStackConfig());

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
    const files = await generateAll(makeStackConfig());
    const agentsMd = files.find((file) => file.path === 'AGENTS.md');
    expect(agentsMd).toBeDefined();
    expect(agentsMd?.content).toContain('## Dangerous operations');
    expect(agentsMd?.content).toContain('rm -rf');
    expect(agentsMd?.content).toContain('npm publish');
  });

  it('renders .claude/settings.local.json with deny list and PostToolUse hook', async () => {
    const files = await generateAll(makeStackConfig());
    const settings = files.find((file) => file.path === '.claude/settings.local.json');
    expect(settings).toBeDefined();
    const parsed = JSON.parse(settings!.content) as {
      permissions: { allow: string[]; deny: string[] };
      hooks?: {
        PostToolUse: Array<{
          matcher: string;
          hooks: Array<{ type: string; command: string }>;
        }>;
      };
    };
    expect(parsed.permissions.deny).toContain('Bash(rm -rf:*)');
    expect(parsed.permissions.deny).toContain('Edit(.env*)');
    expect(parsed.permissions.deny).toContain('Write(.env*)');
    expect(parsed.permissions.deny).toContain('MultiEdit(.env*)');
    expect(parsed.permissions.deny).toContain('Edit(migrations/**)');
    expect(parsed.permissions.allow).toEqual(
      expect.arrayContaining(['Edit(./**)', 'MultiEdit(./**)', 'Write(./**)']),
    );
    expect(parsed.permissions.allow).not.toContain('Read(./**)');
    expect(parsed.permissions.deny).toHaveLength(30);
    expect(parsed.permissions.deny).toContain('Bash(git push --force-with-lease:*)');
    expect(parsed.permissions.deny).toContain('Bash(rm --recursive:*)');
    expect(parsed.permissions.deny).toContain('Bash(cargo publish:*)');
    expect(parsed.permissions.deny).not.toContain('Bash(pypi upload:*)');
    expect(parsed.permissions.deny).toContain('Bash(twine upload:*)');
    expect(parsed.hooks?.PostToolUse[0].matcher).toBe('Edit|MultiEdit|Write');
    expect(parsed.hooks?.PostToolUse[0].hooks).toEqual([
      { type: 'command', command: expect.stringContaining('--fix') },
    ]);
  });

  it('emits .codex/config.toml with Codex-native safety defaults', async () => {
    const files = await generateAll(makeStackConfig());
    const codexConfig = files.find((file) => file.path === '.codex/config.toml');

    expect(codexConfig).toBeDefined();
    const toml = codexConfig!.content;

    expect(toml).toContain('approval_policy = "on-failure"');
    expect(toml).toContain('sandbox_mode = "workspace-write"');
    expect(toml).toContain('[sandbox_workspace_write]');
    expect(toml).toContain('network_access = false');
    expect(toml).not.toContain('[permissions]');
  });

  it('omits .codex/config.toml when targets.codexCli is false', async () => {
    const config = makeStackConfig();
    config.targets.codexCli = false;
    const files = await generateAll(config);
    const paths = files.map((file) => file.path);
    expect(paths).not.toContain('.codex/config.toml');
  });
});
