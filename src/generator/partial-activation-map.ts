/**
 * Single source of truth mapping each `src/templates/partials/<slug>.md.ejs`
 * file to its multi-IDE activation mode (Cursor MDC frontmatter +
 * Windsurf rule header). T3 / T5 generators consume `getPartialActivation`;
 * T6 parity test enumerates partials at runtime via `listPartials()`.
 */

export type PartialActivationMode = 'always' | 'glob' | 'modelDecision' | 'manual';

export type PartialActivation =
  | { mode: 'always'; description: string }
  | { mode: 'glob'; description: string; globs: readonly string[] }
  | { mode: 'modelDecision'; description: string }
  | { mode: 'manual'; description: string };

export const ALWAYS_ON_SLUGS: readonly string[] = [
  'deny-destructive-ops',
  'untrusted-content',
  'fail-safe',
  'architect-fail-safe',
  'tool-use-discipline',
  'definition-of-done',
  'error-handling-self',
  'context-budget',
  'dry-rules',
  'git-rules',
  'review-checklist',
  'ai-complacency',
];

export const MODEL_DECISION_SLUGS: readonly string[] = [
  'docs-reference',
  'stack-context',
  'code-style',
  'file-organization',
  'workspaces',
];

const ALWAYS_ON_SLUG_SET: ReadonlySet<string> = new Set(ALWAYS_ON_SLUGS);
const MODEL_DECISION_SLUG_SET: ReadonlySet<string> = new Set(MODEL_DECISION_SLUGS);

const BACKEND_GLOBS = ['**/server/**', '**/api/**', '**/routes/**', '**/*.controller.ts'];
const UI_GLOBS = ['**/components/**', '**/pages/**', '**/app/**', '**/*.tsx', '**/*.jsx', '**/*.vue', '**/*.svelte'];
const TEST_GLOBS = ['**/*.test.ts', '**/*.spec.ts', '**/*.test.tsx', '**/*.spec.tsx', '**/__tests__/**'];

interface GlobEntry {
  description: string;
  globs: readonly string[];
}

const GLOB_ACTIVATION: Readonly<Record<string, GlobEntry>> = {
  'api-design': { description: 'API design conventions for backend modules.', globs: BACKEND_GLOBS },
  accessibility: { description: 'Accessibility checklist for UI files.', globs: UI_GLOBS },
  performance: { description: 'Performance budgets for UI / hot-path files.', globs: UI_GLOBS },
  'testing-patterns': { description: 'Test structure and naming patterns.', globs: TEST_GLOBS },
  concurrency: { description: 'Concurrency/locking guidance for server modules.', globs: BACKEND_GLOBS },
};

function describe(slug: string): string {
  return `${slug.replace(/-/g, ' ')} guidance.`;
}

/**
 * Returns the IDE activation metadata for a named partial template slug.
 *
 * Lookup order:
 * 1. `ALWAYS_ON_SLUGS` → `{ mode: 'always', description }` (always active).
 * 2. `GLOB_ACTIVATION` map → `{ mode: 'glob', description, globs }` (active
 *    for matching file paths).
 * 3. `MODEL_DECISION_SLUGS` → `{ mode: 'modelDecision', description }` (AI
 *    decides relevance at inference time).
 * 4. Fallback → `{ mode: 'manual', description }` (manually activated).
 *
 * @param slug - The partial template slug (e.g. `'deny-destructive-ops'`).
 * @returns A `PartialActivation` discriminated union for the given slug.
 */
export function getPartialActivation(slug: string): PartialActivation {
  if (ALWAYS_ON_SLUG_SET.has(slug)) {
    return { mode: 'always', description: describe(slug) };
  }
  const globEntry = GLOB_ACTIVATION[slug];
  if (globEntry) {
    return { mode: 'glob', description: globEntry.description, globs: globEntry.globs };
  }
  if (MODEL_DECISION_SLUG_SET.has(slug)) {
    return { mode: 'modelDecision', description: describe(slug) };
  }
  return { mode: 'manual', description: describe(slug) };
}

/**
 * Returns `true` when `slug` has an explicit activation entry in one of the
 * three known sets (`ALWAYS_ON_SLUGS`, `MODEL_DECISION_SLUGS`, or
 * `GLOB_ACTIVATION`).
 *
 * Slugs that return `false` still receive a valid (manual) activation from
 * `getPartialActivation`; this predicate is used by tests and tooling to
 * detect unregistered partials.
 *
 * @param slug - The partial template slug to check.
 * @returns `true` if the slug is registered in a known activation set.
 */
export function isKnownActivationSlug(slug: string): boolean {
  return (
    ALWAYS_ON_SLUG_SET.has(slug)
    || MODEL_DECISION_SLUG_SET.has(slug)
    || Boolean(GLOB_ACTIVATION[slug])
  );
}
