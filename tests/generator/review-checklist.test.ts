import { buildReviewChecklist } from '../../src/generator/review-checklist-rules.js';
import { makeStackConfig } from './fixtures.js';
import type { StackConfig } from '../../src/schema/stack-config.js';

function makeConfig(stackOverrides: Partial<StackConfig['stack']> = {}): StackConfig {
  const base = makeStackConfig();
  return { ...base, stack: { ...base.stack, ...stackOverrides } };
}

describe('buildReviewChecklist', () => {
  it('includes TypeScript rules for TS projects', () => {
    const rules = buildReviewChecklist(makeConfig());
    const names = rules.map((r) => r.name);
    expect(names).toContain('No `any`');
    expect(names).toContain('No redundant type aliases');
  });

  it('includes React rules for React framework', () => {
    const rules = buildReviewChecklist(makeConfig());
    const names = rules.map((r) => r.name);
    expect(names).toContain('useCallback');
    expect(names).toContain('useMemo');
    expect(names).toContain('JSX extraction');
  });

  it('excludes React rules for Python', () => {
    const rules = buildReviewChecklist(makeConfig({ language: 'python', framework: 'fastapi' }));
    const names = rules.map((r) => r.name);
    expect(names).not.toContain('useCallback');
    expect(names).not.toContain('useMemo');
  });

  it('always includes universal rules', () => {
    const rules = buildReviewChecklist(makeConfig({ language: 'go', framework: 'chi' }));
    const names = rules.map((r) => r.name);
    expect(names).toContain('DRY');
    expect(names).toContain('Object params');
  });

  it('includes i18n rule when locale rules exist', () => {
    const config = makeConfig();
    config.project.localeRules = ['Romanian diacritics'];
    const rules = buildReviewChecklist(config);
    const names = rules.map((r) => r.name);
    expect(names).toContain('i18n compliance');
  });

  it('includes stack-specific database and state rules', () => {
    const rules = buildReviewChecklist(makeConfig({
      database: 'drizzle',
      stateManagement: 'tanstack-query',
    }));
    const names = rules.map((r) => r.name);
    expect(names).toContain('Drizzle schema alignment');
    expect(names).toContain('TanStack Query keys');
  });
});
