import { generateWindsurfConfig } from '../../src/generator/windsurf/index.js';
import { renderWindsurfRuleHeader } from '../../src/generator/windsurf/render-rule-header.js';
import { mergeWindsurfRule } from '../../src/generator/windsurf/merge-rule.js';
import { listPartials } from '../../src/generator/list-partials.js';
import { buildContext } from '../../src/generator/build-context.js';
import { makeStackConfig } from './fixtures.js';

describe('generateWindsurfConfig', () => {
  it('returns empty array when windsurf target disabled', async () => {
    const config = makeStackConfig({ targets: { claudeCode: true, codexCli: false, cursor: false, copilot: false, windsurf: false } });
    const files = await generateWindsurfConfig(config, buildContext(config));
    expect(files).toHaveLength(0);
  });

  it('emits one .windsurf/rules/NN-<slug>.md per partial when windsurf enabled', async () => {
    const config = makeStackConfig({ targets: { claudeCode: true, codexCli: false, cursor: false, copilot: false, windsurf: true } });
    const files = await generateWindsurfConfig(config, buildContext(config));
    const partials = await listPartials();
    const ruleFiles = files.filter((f) => f.path.startsWith('.windsurf/rules/'));
    expect(ruleFiles).toHaveLength(partials.length);
    for (const partial of partials) {
      const matched = ruleFiles.find((f) => f.path.endsWith(`-${partial.slug}.md`));
      expect(matched).toBeDefined();
      expect(matched?.content.startsWith('---\n')).toBe(true);
    }
  });

  it('emits selected workflows under .windsurf/workflows/', async () => {
    const config = makeStackConfig({ targets: { claudeCode: true, codexCli: false, cursor: false, copilot: false, windsurf: true } });
    const files = await generateWindsurfConfig(config, buildContext(config));
    const workflowFiles = files.filter((f) => f.path.startsWith('.windsurf/workflows/'));
    const paths = workflowFiles.map((f) => f.path);
    expect(paths).toContain('.windsurf/workflows/workflow-plan.md');
    expect(paths).toContain('.windsurf/workflows/workflow-fix.md');
    expect(paths).toContain('.windsurf/workflows/external-review.md');
  });
});

describe('renderWindsurfRuleHeader', () => {
  it('emits activation: always_on for always mode', () => {
    const out = renderWindsurfRuleHeader({ mode: 'always', description: 'safety' });
    expect(out).toContain('activation: always_on');
    expect(out).toContain('description: "safety"');
  });

  it('emits activation: glob with globs list', () => {
    const out = renderWindsurfRuleHeader({ mode: 'glob', description: 'ui', globs: ['**/*.tsx'] });
    expect(out).toContain('activation: glob');
    expect(out).toContain('  - "**/*.tsx"');
  });

  it('emits activation: model_decision and manual', () => {
    expect(renderWindsurfRuleHeader({ mode: 'modelDecision', description: 'd' })).toContain('activation: model_decision');
    expect(renderWindsurfRuleHeader({ mode: 'manual', description: 'm' })).toContain('activation: manual');
  });
});

describe('mergeWindsurfRule', () => {
  const path = '.windsurf/rules/00-fail-safe.md';
  it('preserves user tail past managed-end', () => {
    const incoming = '---\nactivation: always_on\n---\nbody\n<!-- agents-workflows:managed-end -->\n';
    const existing = '---\nactivation: always_on\n---\nold\n<!-- agents-workflows:managed-end -->\nuser content\n';
    const merged = mergeWindsurfRule({ existing, incoming, path });
    expect(merged).toContain('body');
    expect(merged).toContain('user content');
  });

  it('returns incoming when no user tail', () => {
    const incoming = '---\nactivation: always_on\n---\nbody\n<!-- agents-workflows:managed-end -->\n';
    const existing = '---\nactivation: always_on\n---\nold\n<!-- agents-workflows:managed-end -->\n';
    const merged = mergeWindsurfRule({ existing, incoming, path });
    expect(merged).toBe(incoming);
  });
});
