/**
 * CI guard: exits non-zero when any in-scope export under src/ lacks a docstring.
 *
 * Out-of-scope allowlist (PRD §Epic 15 — "Definition of core logic function"):
 *   - export type / export interface / export const enums
 *   - barrel re-exports in index.ts (export { … } from, export * from)
 *   - one-line passthroughs
 *   - .ejs templates
 *   - tests/** source files (excluded by passing rootDir = 'src')
 *   - generated artifacts under dist/ or coverage/
 */
import { auditDocstrings, type AuditEntry } from './lib/docstring-audit.js';

const EXIT_OK = 0;
const EXIT_GAPS = 1;

/**
 * Run the docstring coverage check against the given rootDir.
 *
 * @param params - Options object.
 * @param params.rootDir - Directory to audit (relative to cwd), e.g. `'src'`.
 * @returns An object containing the process exit code and the list of gap entries.
 */
export function runCheck({ rootDir }: { rootDir: string }): {
  exitCode: number;
  gaps: AuditEntry[];
} {
  const all = auditDocstrings({ rootDir });
  const gaps = all.filter((entry) => !entry.hasDocstring);
  const exitCode = gaps.length > 0 ? EXIT_GAPS : EXIT_OK;
  return { exitCode, gaps };
}

// ── CLI entrypoint ─────────────────────────────────────────────────────────────

const isMain =
  // ESM: compare import.meta.url to the resolved entry URL
  (typeof import.meta !== 'undefined' &&
    typeof process.argv[1] !== 'undefined' &&
    import.meta.url === new URL(process.argv[1], import.meta.url).href) ||
  // CJS fallback
  (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module);

if (isMain) {
  const { exitCode, gaps } = runCheck({ rootDir: 'src' });
  for (const gap of gaps) {
    process.stderr.write(`${gap.file}:${gap.line} ${gap.exportName}\n`);
  }
  process.exit(exitCode);
}
