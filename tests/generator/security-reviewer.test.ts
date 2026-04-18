import { generateAll } from '../../src/generator/index.js';
import { makeStackConfig } from './fixtures.js';
import type { StackConfig } from '../../src/schema/stack-config.js';

function makeConfig(agentOverrides: Partial<StackConfig['agents']> = {}): StackConfig {
  const base = makeStackConfig({ stack: { language: 'typescript', runtime: 'node', framework: 'nextjs', uiLibrary: 'tailwind', stateManagement: 'zustand', database: 'prisma', auth: 'nextauth' } });
  return { ...base, agents: { ...base.agents, ...agentOverrides } };
}

function findFile(files: Awaited<ReturnType<typeof generateAll>>, path: string): { path: string; content: string } | undefined {
  return files.find((file) => file.path === path);
}

describe('security-reviewer agent template', () => {
  it('emits a read-only frontmatter and injection/auth/secrets sections when enabled', async () => {
    const files = await generateAll(makeConfig());
    const agent = findFile(files, '.claude/agents/security-reviewer.md');

    expect(agent).toBeDefined();
    expect(agent?.content).toMatch(/^name: security-reviewer$/m);
    expect(agent?.content).toMatch(/^tools: Read, Grep, Glob, Bash$/m);
    expect(agent?.content).not.toMatch(/^tools: .*?\b(?:Edit|Write)\b/m);
    expect(agent?.content).toMatch(/Injection/);
    expect(agent?.content).toMatch(/Authentication/);
    expect(agent?.content).toMatch(/Secrets/);
    expect(agent?.content).toContain('nextauth');
    expect(agent?.content).toContain('prisma');
  });

  it('omits the agent and all orchestration wiring when disabled', async () => {
    const files = await generateAll(makeConfig({ securityReviewer: false }));
    const paths = files.map((file) => file.path);

    expect(paths).not.toContain('.claude/agents/security-reviewer.md');
    expect(paths).not.toContain('.codex/skills/security-reviewer/SKILL.md');

    const reviewer = findFile(files, '.claude/agents/reviewer.md');
    const claudeMd = findFile(files, 'CLAUDE.md');
    const agentsMd = findFile(files, 'AGENTS.md');

    expect(reviewer?.content).not.toContain('security-reviewer');
    expect(claudeMd?.content).not.toContain('security-reviewer');
    expect(agentsMd?.content).not.toContain('security-reviewer');
  });

  it('injects parallel security-reviewer delegation into reviewer and root configs when enabled', async () => {
    const files = await generateAll(makeConfig());
    const reviewer = findFile(files, '.claude/agents/reviewer.md');
    const claudeMd = findFile(files, 'CLAUDE.md');
    const agentsMd = findFile(files, 'AGENTS.md');

    expect(reviewer?.content).toMatch(/`code-reviewer` and `security-reviewer` in parallel/);
    expect(claudeMd?.content).toMatch(/\| Security review \(parallel to code review\) \| `security-reviewer` \|/);
    expect(agentsMd?.content).toMatch(/\| Security review \(parallel to code review\) \| `security-reviewer` \|/);
  });

  it('rewrites Agent tokens to Skill in the codex skill output', async () => {
    const files = await generateAll(makeConfig());
    const skill = findFile(files, '.codex/skills/security-reviewer/SKILL.md');

    expect(skill).toBeDefined();
    expect(skill?.content).not.toMatch(/^model: /m);
    expect(skill?.content).not.toMatch(/^color: /m);
  });
});
