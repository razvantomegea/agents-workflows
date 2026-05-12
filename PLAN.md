# PLAN — Epic 15 Core Logic Function Documentation

Branch: `feature/epic-15-core-logic-docs`

## Context
Add TSDoc to every exported core-logic function under `src/**/*.ts` per PRD §2.14. Ship CSV inventory + CI guard with shared audit core. Lock the rule into `review-checklist.md.ejs`. No behavior, signature, or runtime-import changes.

## Tasks (per PRD E15.T1–T9)

| # | Title | Tag | Status |
|---|-------|-----|--------|
| T1 | Inventory + audit core (`scripts/lib/docstring-audit.ts`, `scripts/audit-docstrings.ts`, `docs/docstring-audit.csv`) | LOGIC | done |
| T2 | Document `src/utils/` | LOGIC | done |
| T3 | Document `src/detector/` | LOGIC | done |
| T4 | Document `src/generator/` | LOGIC | done |
| T5 | Document `src/installer/` + `src/schema/` | LOGIC | done |
| T6 | Document `src/cli/` + `src/prompt/` | LOGIC | done |
| T7 | `review-checklist.md.ejs` bullet (§2.14) | LOGIC | done |
| T8 | CI guard `pnpm check-docs` | LOGIC | done |
| T9 | Tests for guard | TEST | done |

## File splits required during execution
- `src/generator/permissions.ts` → extracted `src/generator/pre-tool-use-hook.ts`
- `src/generator/write-file.ts` → extracted `src/generator/write-session.ts`
- `src/detector/monorepo-readers.ts` → extracted `src/detector/monorepo-readers/{toml-readers.ts,native-readers.ts,index.ts}`

Public API preserved via re-exports in every case.

## Verification
- `pnpm tsx scripts/audit-docstrings.ts` → 0 gaps under `src/`
- `pnpm check-docs` → exit 0
- `pnpm check-types` → clean
- `pnpm test` → 981 tests / 82 suites green
- `pnpm lint` → 0 warnings

## External errors
- `src/cli/init-command.ts` (263 lines) — pre-existing 200-line cap violation on `main` (227 lines before Epic 15 docstrings; this branch added 36 lines of TSDoc). Bringing it to ≤200 requires a file split unrelated to Epic 15 scope. Recommend a separate implementer task.
- `scripts/fetch-plugin-skills.ts` (252 lines) — pre-existing 200-line cap violation outside this change set.
- Security review INFO: `auditDocstrings({ rootDir })` does not jail-check `rootDir` against `process.cwd()`. Tests intentionally pass system tmp dirs, so the check would break the harness; the production CLI hardcodes `'src'`. Symlink follow guard added in `scripts/lib/walk-src.ts`. Path-traversal jail acceptable to leave as-is per current threat model.
