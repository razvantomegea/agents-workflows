import fs from 'fs';
import path from 'path';
import { generateAll } from '../../src/generator/index.js';
import { makeStackConfig } from './fixtures.js';

const TEMPLATES_DIR = path.resolve('src/templates/partials');

describe('Epic 5 — AGENTS.md rendered content', () => {
  it('contains all required MCP-policy and session-hygiene literals', async () => {
    const files = await generateAll(makeStackConfig());
    const agentsMd = files.find((f) => f.path === 'AGENTS.md');
    expect(agentsMd).toBeDefined();
    const content = agentsMd!.content;

    expect(content).toContain('fine-grained PATs');
    expect(content).toContain('STDIO-on-localhost');
    expect(content).toContain('git worktree add');
    expect(content).toContain('/rewind');
    expect(content).toContain('/fork');
    expect(content).toContain('/clear');
    expect(content).toContain('/compact');
    expect(content.toLowerCase()).toContain('two-strike');
    expect(content).toContain('NOTES.md');
    expect(content).toContain('Rule of Two');
  });
});

describe('Epic 5 — CLAUDE.md rendered content', () => {
  it('contains session-hygiene and memory-discipline literals', async () => {
    const files = await generateAll(makeStackConfig());
    const claudeMd = files.find((f) => f.path === 'CLAUDE.md');
    expect(claudeMd).toBeDefined();
    const content = claudeMd!.content;

    expect(content).toContain('git worktree add');
    expect(content).toContain('/rewind');
    expect(content).toContain('/fork');
    expect(content).toContain('/clear');
    expect(content).toContain('/compact');
    expect(content).toContain('NOTES.md');
    expect(content.toLowerCase()).toContain('two-strike');
  });

  it('does NOT contain MCP-policy literals (AGENTS-only policy)', async () => {
    const files = await generateAll(makeStackConfig());
    const claudeMd = files.find((f) => f.path === 'CLAUDE.md');
    expect(claudeMd).toBeDefined();
    const content = claudeMd!.content;

    expect(content).not.toContain('fine-grained PATs');
    expect(content).not.toContain('STDIO-on-localhost');
  });
});

describe('Epic 5 — architect.md rendered content', () => {
  it('contains subagent_delegation fence and required delegation literals', async () => {
    const files = await generateAll(makeStackConfig());
    const architectMd = files.find((f) => f.path === '.claude/agents/architect.md');
    expect(architectMd).toBeDefined();
    const content = architectMd!.content;

    expect(content).toContain('<subagent_delegation>');
    expect(content).toContain('>10 files');
    expect(content).toContain('<5 tool calls');
    expect(content).toContain('objective | output_format | max_tokens | allowed_tools | stop_conditions');
    expect(content).toContain('1-2k-token distilled summary');
  });
});

describe('Epic 5 — reviewer.md rendered content', () => {
  it('contains subagent_delegation fence', async () => {
    const files = await generateAll(makeStackConfig());
    const reviewerMd = files.find((f) => f.path === '.claude/agents/reviewer.md');
    expect(reviewerMd).toBeDefined();

    expect(reviewerMd!.content).toContain('<subagent_delegation>');
  });
});

describe('Epic 5 — partial template line-length caps', () => {
  it('mcp-policy.md.ejs is at most 60 lines', () => {
    const lines = fs.readFileSync(path.join(TEMPLATES_DIR, 'mcp-policy.md.ejs'), 'utf8').split('\n');
    expect(lines.length).toBeLessThanOrEqual(60);
  });

  it('session-hygiene.md.ejs is at most 50 lines', () => {
    const lines = fs.readFileSync(path.join(TEMPLATES_DIR, 'session-hygiene.md.ejs'), 'utf8').split('\n');
    expect(lines.length).toBeLessThanOrEqual(50);
  });

  it('memory-discipline.md.ejs is at most 50 lines', () => {
    const lines = fs.readFileSync(path.join(TEMPLATES_DIR, 'memory-discipline.md.ejs'), 'utf8').split('\n');
    expect(lines.length).toBeLessThanOrEqual(50);
  });

  it('subagent-delegation.md.ejs is at most 50 lines', () => {
    const lines = fs.readFileSync(path.join(TEMPLATES_DIR, 'subagent-delegation.md.ejs'), 'utf8').split('\n');
    expect(lines.length).toBeLessThanOrEqual(50);
  });
});
