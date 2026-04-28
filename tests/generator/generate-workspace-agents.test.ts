/**
 * Tests for polyglot workspace AGENTS.md emission and partial rendering (Epic 12).
 *
 * Three behaviours verified:
 *  1. Nested AGENTS.md emitted only for workspaces whose language differs from root.
 *  2. ## Polyglot monorepo navigation gated by isPolyglot (languages.length >= 2).
 *  3. Monolingual config never renders the polyglot partial in any agent.
 *
 * DRY: reuses makeStackConfig / findFile / getContent from tests/generator/fixtures.ts.
 */
import { generateAll } from '../../src/generator/index.js';
import { makeStackConfig, findFile, getContent } from './fixtures.js';
import type { WorkspaceStack } from '../../src/schema/stack-config.js';

const POLYGLOT_HEADING = '## Polyglot monorepo navigation';

const PYTHON_WORKSPACE: WorkspaceStack = {
  path: 'services/api', language: 'python', runtime: 'python', framework: null,
  packageManager: 'uv', commands: { typeCheck: null, test: 'pytest', lint: null, build: null },
};

const RUST_WORKSPACE: WorkspaceStack = {
  path: 'crates/core', language: 'rust', runtime: 'rust', framework: null,
  packageManager: 'cargo',
  commands: { typeCheck: 'cargo check', test: 'cargo test', lint: 'cargo clippy', build: 'cargo build' },
};

const TS_WORKSPACE: WorkspaceStack = {
  path: 'apps/web', language: 'typescript', runtime: 'node', framework: null,
  packageManager: 'pnpm',
  commands: { typeCheck: 'pnpm check-types', test: 'pnpm test', lint: 'pnpm lint', build: null },
};

function buildPolyglotConfig() {
  return makeStackConfig({
    stack: { language: 'typescript', runtime: 'node', framework: null, uiLibrary: null, stateManagement: null, database: null, auth: null, i18nLibrary: null },
    languages: ['typescript', 'python', 'rust'],
    monorepo: { isRoot: true, tool: 'pnpm', workspaces: [TS_WORKSPACE, PYTHON_WORKSPACE, RUST_WORKSPACE] },
  });
}

describe('generateAll — polyglot workspace AGENTS.md emission', () => {
  it('emits nested AGENTS.md for python workspace (language differs from TS root)', async () => {
    const files = await generateAll(buildPolyglotConfig());
    expect(findFile(files, 'services/api/AGENTS.md')).toBeDefined();
  });

  it('emits nested AGENTS.md for rust workspace (language differs from TS root)', async () => {
    const files = await generateAll(buildPolyglotConfig());
    expect(findFile(files, 'crates/core/AGENTS.md')).toBeDefined();
  });

  it('does NOT emit nested AGENTS.md for TS workspace (same language as root)', async () => {
    const files = await generateAll(buildPolyglotConfig());
    expect(files.map((f) => f.path)).not.toContain('apps/web/AGENTS.md');
  });

  it('nested python AGENTS.md contains workspace language and test command', async () => {
    const files = await generateAll(buildPolyglotConfig());
    const content = getContent(files, 'services/api/AGENTS.md');
    expect(content).toContain('python');
    expect(content).toContain('pytest');
  });

  it('nested rust AGENTS.md contains workspace language and test command', async () => {
    const files = await generateAll(buildPolyglotConfig());
    const content = getContent(files, 'crates/core/AGENTS.md');
    expect(content).toContain('rust');
    expect(content).toContain('cargo test');
  });

  it('root CLAUDE.md contains the Workspaces table with all three workspace paths', async () => {
    const files = await generateAll(buildPolyglotConfig());
    const content = getContent(files, 'CLAUDE.md');
    expect(content).toContain('## Workspaces');
    expect(content).toContain('apps/web');
    expect(content).toContain('services/api');
    expect(content).toContain('crates/core');
  });

  it('root AGENTS.md contains the Workspaces table', async () => {
    const files = await generateAll(buildPolyglotConfig());
    expect(getContent(files, 'AGENTS.md')).toContain('## Workspaces');
  });
});

describe('generateAll — polyglot partial rendering (isPolyglot gate)', () => {
  it('renders polyglot navigation section in architect.md when languages.length >= 2', async () => {
    const files = await generateAll(buildPolyglotConfig());
    expect(getContent(files, '.claude/agents/architect.md')).toContain(POLYGLOT_HEADING);
  });

  it('renders polyglot navigation section in implementer.md when languages.length >= 2', async () => {
    const files = await generateAll(buildPolyglotConfig());
    expect(getContent(files, '.claude/agents/implementer.md')).toContain(POLYGLOT_HEADING);
  });

  it('renders polyglot navigation section in code-reviewer.md when languages.length >= 2', async () => {
    const files = await generateAll(buildPolyglotConfig());
    expect(getContent(files, '.claude/agents/code-reviewer.md')).toContain(POLYGLOT_HEADING);
  });

  it('renders polyglot navigation section in code-optimizer.md when languages.length >= 2', async () => {
    const files = await generateAll(buildPolyglotConfig());
    expect(getContent(files, '.claude/agents/code-optimizer.md')).toContain(POLYGLOT_HEADING);
  });

  it('renders polyglot navigation section in test-writer.md when languages.length >= 2', async () => {
    const files = await generateAll(buildPolyglotConfig());
    expect(getContent(files, '.claude/agents/test-writer.md')).toContain(POLYGLOT_HEADING);
  });

  it('renders polyglot navigation section in reviewer.md when languages.length >= 2', async () => {
    const files = await generateAll(buildPolyglotConfig());
    expect(getContent(files, '.claude/agents/reviewer.md')).toContain(POLYGLOT_HEADING);
  });

  it('does NOT render polyglot navigation in any agent for a monolingual config (languages: [])', async () => {
    // Arrange — makeStackConfig() defaults produce languages: []
    const config = makeStackConfig({ languages: [] });
    const files = await generateAll(config);
    const agentFiles = files.filter((f) => f.path.startsWith('.claude/agents/'));
    // Assert — polyglot partial must be absent from every agent
    for (const file of agentFiles) {
      expect(file.content).not.toContain(POLYGLOT_HEADING);
    }
  });
});
