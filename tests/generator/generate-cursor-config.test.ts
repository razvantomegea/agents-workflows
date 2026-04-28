import { generateCursorConfig } from '../../src/generator/cursor/index.js';
import { renderMdcFrontmatter } from '../../src/generator/cursor/render-mdc-frontmatter.js';
import { mergeMdc } from '../../src/generator/cursor/merge-mdc.js';
import { listPartials } from '../../src/generator/list-partials.js';
import { buildContext } from '../../src/generator/build-context.js';
import { makeStackConfig } from './fixtures.js';

describe('generateCursorConfig', () => {
  it('returns empty array when cursor target disabled', async () => {
    const config = makeStackConfig({ targets: { claudeCode: true, codexCli: false, cursor: false, copilot: false, windsurf: false } });
    const files = await generateCursorConfig(config, buildContext(config));
    expect(files).toHaveLength(0);
  });

  it('emits one .cursor/rules/NN-<slug>.mdc per partial when cursor enabled', async () => {
    const config = makeStackConfig({ targets: { claudeCode: true, codexCli: false, cursor: true, copilot: false, windsurf: false } });
    const files = await generateCursorConfig(config, buildContext(config));
    const partials = await listPartials();
    const ruleFiles = files.filter((f) => f.path.startsWith('.cursor/rules/'));
    expect(ruleFiles).toHaveLength(partials.length);
    for (const partial of partials) {
      const matched = ruleFiles.find((f) => f.path.endsWith(`-${partial.slug}.mdc`));
      expect(matched).toBeDefined();
      expect(matched?.content.startsWith('---\n')).toBe(true);
    }
  });

  it('emits enabled commands under .cursor/commands/', async () => {
    const config = makeStackConfig({ targets: { claudeCode: true, codexCli: false, cursor: true, copilot: false, windsurf: false } });
    const files = await generateCursorConfig(config, buildContext(config));
    const commandFiles = files.filter((f) => f.path.startsWith('.cursor/commands/'));
    const paths = commandFiles.map((f) => f.path);
    expect(paths).toContain('.cursor/commands/workflow-plan.md');
    expect(paths).toContain('.cursor/commands/workflow-fix.md');
    expect(paths).toContain('.cursor/commands/external-review.md');
  });

  it('uses NN ordering prefix per activation mode', async () => {
    const config = makeStackConfig({ targets: { claudeCode: true, codexCli: false, cursor: true, copilot: false, windsurf: false } });
    const files = await generateCursorConfig(config, buildContext(config));
    const ruleFiles = files.filter((f) => f.path.startsWith('.cursor/rules/'));
    const failSafe = ruleFiles.find((f) => f.path === '.cursor/rules/00-fail-safe.mdc');
    const apiDesign = ruleFiles.find((f) => f.path === '.cursor/rules/10-api-design.mdc');
    const stackContext = ruleFiles.find((f) => f.path === '.cursor/rules/20-stack-context.mdc');
    expect(failSafe).toBeDefined();
    expect(apiDesign).toBeDefined();
    expect(stackContext).toBeDefined();
  });
});

describe('renderMdcFrontmatter', () => {
  it('renders alwaysApply: true for always mode', () => {
    const out = renderMdcFrontmatter({ mode: 'always', description: 'safety rule' });
    expect(out).toContain('alwaysApply: true');
    expect(out).toContain('description: "safety rule"');
  });

  it('renders globs list for glob mode', () => {
    const out = renderMdcFrontmatter({ mode: 'glob', description: 'ui rule', globs: ['**/*.tsx'] });
    expect(out).toContain('globs:');
    expect(out).toContain('  - "**/*.tsx"');
    expect(out).toContain('alwaysApply: false');
  });

  it('emits description-only frontmatter for modelDecision and manual modes', () => {
    const md = renderMdcFrontmatter({ mode: 'modelDecision', description: 'decision' });
    expect(md).toContain('description: "decision"');
    expect(md).toContain('alwaysApply: false');
    expect(md).not.toContain('globs:');

    const man = renderMdcFrontmatter({ mode: 'manual', description: 'manual' });
    expect(man).toContain('description: "manual"');
    expect(man).not.toContain('globs:');
  });
});

describe('mergeMdc', () => {
  const path = '.cursor/rules/00-fail-safe.mdc';

  it('preserves user-appended body past the managed-end sentinel', () => {
    const incoming = '---\nalwaysApply: true\n---\nmanaged body\n<!-- agents-workflows:managed-end -->\n';
    const existing = '---\nalwaysApply: true\n---\nold body\n<!-- agents-workflows:managed-end -->\n# user added\nnotes here\n';
    const merged = mergeMdc({ existing, incoming, path });
    expect(merged).toContain('managed body');
    expect(merged).toContain('# user added');
    expect(merged).toContain('notes here');
  });

  it('returns incoming content unchanged when existing has no user tail', () => {
    const incoming = '---\nalwaysApply: true\n---\nbody\n<!-- agents-workflows:managed-end -->\n';
    const existing = '---\nalwaysApply: true\n---\nold\n<!-- agents-workflows:managed-end -->\n';
    const merged = mergeMdc({ existing, incoming, path });
    expect(merged).toBe(incoming);
  });
});
