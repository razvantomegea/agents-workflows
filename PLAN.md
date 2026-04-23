# Plan - Epic 7: CLI Generator Safe File Handling
_Branch: `feature/epic-7-safe-file-handling` | Date: 2026-04-23_

## Context

Epic 7 delivers data-preserving re-runs of `agents-workflows init` / `update`. Today the CLI uses a boolean Markdown-only prompt via `writeGeneratedFiles` that can still blow away hand-edited JSON configs and prompts once per file with no diff preview, no yes-to-all / skip-all, no merge path. This epic funnels every generator write through a single `writeFileSafe` helper that shows a colored diff, offers `[y]/[n]/[a]/[s]/[m]`, and supports structured Markdown and JSON merges, plus CI flags (`--yes`, `--no-prompt`, `--merge-strategy`). Goal: a re-run of `init` never destroys user customizations, matching PRD §1.4.

**PRD vs code note.** PRD lines 1732 and 1752 say the `writeFileSafe` helper lives at `src/generator/write-file.ts` and must replace every `fs.write*` call in `src/generator/`. The actual generator (`src/generator/*`) currently emits an in-memory `GeneratedFile[]` and performs zero filesystem writes — all writes happen in `src/installer/write-files.ts` and the two CLI commands (`src/cli/init-command.ts`, `src/cli/update-command.ts`). This plan follows the PRD's exact file path (`src/generator/write-file.ts`) for the new helper but refactors the real write sites across `installer/` and `cli/` so no silent overwrite path remains. Raised here per the "flag the mismatch" rule.

## Pre-implementation checklist

- [ ] Confirm branch is `feature/epic-7-safe-file-handling` and tree is clean (`git status`)
- [ ] Read `PRD.md` lines 1718-1759 (Epic 7) and §1.4 destructive-ops philosophy
- [ ] Grepped codebase for existing equivalents (components, hooks, utils, types, constants)
- [ ] Confirmed `@inquirer/prompts@^7`, `diff@^7`, `chalk@^5` already in `package.json`; verify `remark` / `remark-parse` / `remark-stringify` / `unified` need to be added for T3
- [ ] Grep every existing write site: `writeFile`, `writeFileSync`, `outputFile`, `fs.promises.writeFile` under `src/` — inventory: `src/installer/write-files.ts:35`, `src/cli/init-command.ts:109`, `src/cli/update-command.ts:106`
- [ ] Confirm no existing diff helper beyond `src/installer/diff-files.ts` (it wraps `createTwoFilesPatch`) — T2 must either extend or share logic, not reimplement
- [ ] Verified no type duplication - shared types imported, not redeclared
- [ ] Confirmed no magic numbers - all values reference design tokens or named constants (80-line diff cap lives as `UPPER_SNAKE_CASE` constant in `src/utils/diff.ts`)

## Dependency ordering

- **T2** (`diff.ts`) ships first — it is a leaf, no dependencies on the others, but T1 consumes it for the preview step.
- **T1** (`writeFileSafe` + refactor existing writes) depends on T2; it can start in parallel only if it imports a pre-agreed `renderUnifiedDiff` signature from T2, else sequence T2 → T1.
- **T3** (Markdown merge) and **T4** (JSON merge) both depend on T1 because `writeFileSafe` owns the `merge?: (existing, incoming) => string | Promise<string>` contract; they can run in parallel with each other once T1's interface is defined.
- **T5** (CLI flags) depends on T1 — it wires `--yes` / `--no-prompt` / `--merge-strategy` into the shared module-level state that T1 introduces.
- **T6** (docs) has no code dependency and can run in parallel with any of T1–T5.

## Tasks

### Task 1 - E7.T1 `writeFileSafe` helper + refactor every write site `[LOGIC][TEST]`

**Files**
- `src/generator/write-file.ts` (new)
- `src/generator/write-file-prompt.ts` (new, split if `write-file.ts` approaches 200 lines — keeps prompt UI isolated from core write logic)
- `src/generator/index.ts` (add barrel export for `writeFileSafe`, `MergeStrategy`, `WriteFileResult`)
- `src/installer/write-files.ts` (refactor: `writeGeneratedFiles` loop replaces its `writeFile` + `shouldWriteFile` branch with a single `writeFileSafe` call per file)
- `src/cli/init-command.ts` (refactor line 109: manifest `writeFile` now goes through `writeFileSafe`)
- `src/cli/update-command.ts` (refactor line 106: manifest `writeFile` now goes through `writeFileSafe`)
- `tests/generator/write-file.test.ts` (new, colocated with generator test folder per existing `tests/generator/*` convention)

**Input**
Current state: three direct `fs.writeFile` call-sites plus the older boolean `confirmMarkdownOverwrite` prompt. T2's `renderUnifiedDiff` is available.

**Output**
A single `writeFileSafe({ path, content, merge?, projectRoot })` function returning `{ status: 'written' | 'skipped' | 'merged' | 'unchanged' }`. Uses `@inquirer/prompts` `select` (or `expand`) for the 5-choice menu `[y]es / [n]o / [a]ll / [s]kip-all / [m]erge` (`m` only offered if `merge` callback supplied). Module-level session state tracks sticky `all` and `skip-all` plus an override slot for CLI flags. If the file doesn't exist, write without prompting. If content is byte-identical, return `unchanged` without prompting. Uses `renderUnifiedDiff` before prompting. All three previous write sites now import from this helper; no direct `writeFile` / `writeFileSync` remains anywhere under `src/generator/`, `src/installer/`, or `src/cli/` (backup restore path in `src/installer/backup.ts` uses `copyFile` and stays).

**Notes**
- DRY: delete the now-dead `shouldWriteFile` helper in `src/installer/write-files.ts`; remove `confirmMarkdownOverwrite` / `confirmOverwrite` options or keep them as thin adapters that delegate to `writeFileSafe` for backward-compat with `tests/installer/write-files.test.ts` (prefer updating the test).
- DRY: re-use `src/utils/file-exists.ts` and `src/installer/diff-files.ts` logic; if preview rendering overlaps with `diffFiles`, call `renderUnifiedDiff` in both instead of duplicating.
- 200-line cap: split prompt rendering into `write-file-prompt.ts` if needed. Hard rule.
- Type safety: explicit `WriteFileStatus` union type exported from the module; no `any`; session state typed as `{ stickyAll: boolean; stickySkip: boolean; override: MergeStrategy | null }`.
- All param objects — `writeFileSafe` takes exactly one options object (project rule: >2 params → object).
- Jest: cover each prompt answer (`y`, `n`, `a`, `s`, `m`), unchanged-file short-circuit, non-existent-file path, sticky propagation across two calls, and module-state reset helper for test isolation.
- Mock `@inquirer/prompts` via `jest.unstable_mockModule` (repo uses ESM + experimental-vm-modules).

### Task 2 - E7.T2 Colored unified-diff preview helper `[LOGIC][TEST]` `[PARALLEL]`

**Files**
- `src/utils/diff.ts` (new)
- `src/utils/index.ts` (add barrel export for `renderUnifiedDiff`, `DIFF_LINE_CAP`)
- `tests/utils/diff.test.ts` (new, mirrors `tests/utils/convert-to-skill.test.ts`)

**Input**
Existing dependency `diff@^7` (`createTwoFilesPatch`) and `chalk@^5`. Existing `src/installer/diff-files.ts` already uses `createTwoFilesPatch` — confirm before adding a second caller.

**Output**
Pure function `renderUnifiedDiff({ path, before, after, lineCap? })` returning an ANSI-colored unified-diff string. Green for `+`, red for `-`, dim for hunk headers. Cap at `DIFF_LINE_CAP = 80` lines with footer `… (N more)`. Empty string (not a no-op throw) when `before === after`. File stays under 40 lines per PRD. Module constant `DIFF_LINE_CAP` is UPPER_SNAKE_CASE.

**Notes**
- DRY: export a `computeUnifiedPatch(before, after, path)` sub-function that `src/installer/diff-files.ts` can also consume in a follow-up (not required by this epic but the shape must not block it). Do not import chalk inside `computeUnifiedPatch` — keep color logic separate so `diff-files.ts` can adopt the plain-text path.
- Type safety: explicit `RenderDiffInput` interface exported; no `any`; `lineCap?: number` optional with default constant.
- 200-line cap: file must stay under 40 lines per PRD acceptance — enforce.
- Jest: cover (a) cap truncation with `… (N more)` footer, (b) no-diff edge case returns `''`, (c) ANSI codes present when color enabled, (d) multi-hunk output.

### Task 3 - E7.T3 Markdown-aware merge `[LOGIC][TEST]`

**Files**
- `src/generator/merge-markdown.ts` (new)
- `src/generator/index.ts` (export `mergeMarkdown`)
- `tests/generator/merge-markdown.test.ts` (new; PRD says `tests/merge-markdown.test.ts` but project convention is `tests/generator/*.test.ts` — colocate there)
- `package.json` (add `remark`, `remark-parse`, `remark-stringify`, `unified`, `mdast-util-*` types as needed — only if tree-walking mdast directly)

**Input**
T1's interface is stable. AGENTS.md template already uses `<!-- agents-workflows:managed-start -->` / `-end -->` block markers — decide whether Epic 7 keeps block markers or shifts to per-heading `<!-- agents-workflows:managed -->` tags as PRD 1743 specifies. Plan per PRD: per-heading managed tag.

**Output**
`mergeMarkdown({ existing, incoming })` returns a merged Markdown string. Parse both with `remark`. Key by top-level heading text (`#`, `##`). Rules:
- User heading with no managed tag → user body wins (preserved verbatim).
- Heading whose preceding HTML comment contains `agents-workflows:managed` → generator body wins.
- New managed headings not present in existing → appended at end of document.
- Idempotent on unchanged input (running twice = same output).

**Notes**
- DRY: if the existing AGENTS.md template's block-marker pattern is retained elsewhere, document the two-marker systems coexist; do not duplicate parsing logic between template rendering and merge.
- Type safety: use `mdast` types from `@types/mdast`; no `any` on AST nodes; define a local `MarkdownSection` interface (heading text + node range).
- 200-line cap: if AST walk grows, extract `find-managed-sections.ts` helper — Rule of Three before extracting.
- Install check: verify `remark`, `remark-parse`, `remark-stringify`, `unified` are deps; if absent, add them in this task's deliverable and note version pins (`remark@^15`, `unified@^11`).
- Jest: four cases per PRD — (a) idempotency on unchanged input, (b) user's custom non-managed heading preserved, (c) new managed heading appended, (d) managed-tagged heading overwritten by generator body. Plus edge cases: empty input, missing top-level heading, heading-only doc.

### Task 4 - E7.T4 JSON-aware merge `[LOGIC][TEST]` `[PARALLEL]`

**Files**
- `src/generator/merge-json.ts` (new)
- `src/generator/index.ts` (export `mergeJson`)
- `tests/generator/merge-json.test.ts` (new; PRD says `tests/merge-json.test.ts` — colocate under `tests/generator/` per project convention)

**Input**
T1 interface stable. Target files: `.claude/settings.local.json` (has `permissions.allow[]`, `permissions.deny[]`, `hooks{}`) and any Codex config JSON.

**Output**
`mergeJson({ existing, incoming })` → merged JSON string (stable key order, 2-space indent). Rules:
- Objects: deep-merge key-by-key. User wins on scalar conflicts unless the key is listed in a `MANAGED_JSON_KEYS` constant (start empty, documented extension point).
- Arrays of primitives: union, de-duplicated, sorted for deterministic diffs.
- Arrays of objects: concatenate unique-by-JSON-stringify (conservative; covers hook entries).
- Stable key order via `Object.keys(...).sort()` when serializing.

**Notes**
- DRY: `MANAGED_JSON_KEYS` lives in `src/generator/merge-json.ts` as UPPER_SNAKE_CASE const; if T3 grows an equivalent `MANAGED_MD_TAG` pattern, both constants live in their respective merge modules (no cross-module coupling).
- Type safety: accept `Record<string, unknown>` / `unknown[]` — explicit recursive function signatures, no `any`. Export a `JsonValue` discriminated type if one doesn't already exist (grep `src/schema/` first).
- 200-line cap: if deep-merge + de-dup grow past ~120 lines, extract `union-arrays.ts` helper.
- Jest: (a) user-added allow entry preserved on re-run with new generator deny rules applied, (b) stable key order across runs (snapshot-safe), (c) nested object deep-merge, (d) scalar conflict with user winning, (e) idempotency.

### Task 5 - E7.T5 CLI flags `--yes`, `--no-prompt`, `--merge-strategy` `[API][LOGIC][TEST]`

**Files**
- `src/cli/index.ts` (extend existing `commander` setup; do NOT create a new parser — `init` already has `-y, --yes`, keep that and add `--no-prompt`, `--merge-strategy`)
- `src/cli/init-command.ts` (thread new options into `writeFileSafe` session state)
- `src/cli/update-command.ts` (thread new options into `writeFileSafe` session state)
- `src/generator/write-file.ts` (expose `configureWriteSession({ override, noPrompt })` setter consumed by CLI)
- `tests/cli/flags.test.ts` (new; mirrors `tests/cli/list-command.test.ts` style)

**Input**
T1 complete — `writeFileSafe` has a module-level session state.

**Output**
- `--yes` → session `stickyAll = true` (answer overwrite-all, non-interactive).
- `--no-prompt` → session `stickySkip = true` (answer skip-all, non-interactive).
- `--merge-strategy=<keep|overwrite|merge>` → sets `override` strategy (keep = skip, overwrite = write, merge = run merge callback; fall back to overwrite if no merge available).
- Flags validate mutually: `--yes` + `--no-prompt` → exit non-zero with clear message. `--merge-strategy` must accept exactly the three values (zod enum or commander `choices`).
- `agents-workflows --help` documents each flag.
- Exit codes: 0 on success, non-zero on validation error.

**Notes**
- DRY: do NOT add a second CLI parser — extend the existing `commander` Command chain in `src/cli/index.ts`. The existing `init` already has `-y, --yes`; reuse that flag and add the new two to both `init` and `update` sub-commands (same option set, consider a helper `applySafetyFlags(command: Command)` to avoid copy-paste — extract only if Rule of Three triggers across `init` + `update` + any future subcommand).
- Type safety: add a `SafetyFlags` interface in `src/cli/types.ts` or colocate in `src/cli/safety-flags.ts`; typed via zod enum for `merge-strategy`.
- 200-line cap: `init-command.ts` is 167 lines today — adding flag plumbing risks overflow. Extract flag plumbing into a helper if `init-command.ts` crosses 190.
- Jest: assert each flag short-circuits the prompt (spy on `@inquirer/prompts` — must not be called), assert `--yes` + `--no-prompt` exits non-zero, assert `--merge-strategy=keep` skips, `=overwrite` writes, `=merge` invokes merge callback and falls back when none provided.

### Task 6 - E7.T6 README + AGENTS.md tooling note `[LOGIC]` `[PARALLEL]`

**Files**
- `README.md` (new section "Re-running on an existing project" — add after "Quick start")
- `src/templates/config/AGENTS.md.ejs` (insert one-liner under the existing `## Tooling / hooks` section, line 135)

**Input**
Epic 7 surface area understood (the 5 prompt answers, the 3 flags, Markdown/JSON merge behavior + unsupported-format fallback).

**Output**
- README section explains: the 5 prompt answers (`[y]/[n]/[a]/[s]/[m]`), the 3 CLI flags (`--yes`, `--no-prompt`, `--merge-strategy`), which formats support structured merge (Markdown, JSON) vs yes/no fallback (everything else).
- AGENTS.md template gets a one-liner: "`agents-workflows` never silently overwrites existing files — re-running `init` / `update` prompts before any write and preserves user-edited sections by default."

**Notes**
- DRY: the one-liner sources its wording from the README section — do not drift. If the same sentence appears again in a third doc later, extract to a shared partial (`src/templates/partials/no-destructive-writes.md.ejs`); not yet warranted (Rule of Three).
- No code changes — docs + template only. Can run in parallel with T1–T5.
- Verify the rendered AGENTS.md (via `pnpm test` on `tests/generator/epic-5-agents-md.test.ts`) still passes — check for snapshot diffs.

## Risks and rollback

- **Risk**: `remark` ecosystem on Node 20 ESM — the project uses `--experimental-vm-modules`. Verify `remark@^15` resolves cleanly before merging T3. Rollback: if remark integration stalls, degrade T3 to regex-based heading split with a TODO; keep the merge interface stable so a later swap is local.
- **Risk**: `@inquirer/prompts` ESM mocking in Jest is fragile. Rollback: if mocks misbehave, inject the prompt fn via options (`writeFileSafe({ ..., promptFn })`) and default-bind to `@inquirer/prompts` at module top — preserves test-ability without `unstable_mockModule`.
- **Risk**: `src/cli/init-command.ts` at 167 lines is close to the 200-cap; adding flag plumbing may trip it. Rollback: extract `apply-safety-flags.ts` helper under `src/cli/` before edits land.
- **Risk**: Existing `tests/installer/write-files.test.ts` relies on `confirmMarkdownOverwrite` / `confirmOverwrite` options. Rollback path: keep those options as adapter shims over `writeFileSafe` for one release, deprecation-comment them, migrate the test.
- **Rollback**: every task lives on the feature branch; revert individual commits per task if regressions appear. Do not squash until the full loop passes.

## Out of scope (non-goals)

- Binary-file merge (out — PRD: "unsupported formats fall back to yes/no/all/skip").
- Three-way merge with upstream template history (out — no tracked "last-generated" snapshot yet).
- TOML / YAML structured merge (out — only Markdown + JSON per PRD).
- Conflict markers inside files — merge either succeeds cleanly or falls back to overwrite/skip.
- Undo / redo UI beyond the existing `src/installer/backup.ts` backup-on-failure flow.

## Post-implementation checklist

- [ ] `pnpm check-types` - zero errors
- [ ] `pnpm test` - all suites pass
- [ ] `pnpm lint` - zero warnings
- [ ] Manual idempotency smoke test: run `pnpm dev init` in a scratch repo, hand-edit `CLAUDE.md` and `.claude/settings.local.json`, run `pnpm dev init` again — confirm hand-edits preserved, diff preview shown, each prompt answer behaves per PRD
- [ ] Run `code-reviewer` agent on all modified files - all critical and warning findings fixed
- [ ] Run `security-reviewer` agent in parallel - all critical and warning findings fixed
- [ ] DRY scan complete - no duplicated code across modified files (especially `diff-files.ts` vs `diff.ts`, `write-files.ts` vs `write-file.ts`)
- [ ] No `any` types introduced; all new functions have explicit parameter and return types
- [ ] All new files under 200 lines; `diff.ts` under 40 lines

## Summary

| Task | Tag | Files | Parallelizable |
|---|---|---|---|
| T1 `writeFileSafe` + refactor writes | `[LOGIC][TEST]` | `src/generator/write-file.ts`, `src/generator/write-file-prompt.ts`, `src/generator/index.ts`, `src/installer/write-files.ts`, `src/cli/init-command.ts`, `src/cli/update-command.ts`, `tests/generator/write-file.test.ts` | No (depends on T2) |
| T2 Colored unified-diff helper | `[LOGIC][TEST]` | `src/utils/diff.ts`, `src/utils/index.ts`, `tests/utils/diff.test.ts` | Yes |
| T3 Markdown-aware merge | `[LOGIC][TEST]` | `src/generator/merge-markdown.ts`, `src/generator/index.ts`, `tests/generator/merge-markdown.test.ts`, `package.json` | Yes (after T1 interface frozen) |
| T4 JSON-aware merge | `[LOGIC][TEST]` | `src/generator/merge-json.ts`, `src/generator/index.ts`, `tests/generator/merge-json.test.ts` | Yes (after T1 interface frozen) |
| T5 CLI flags `--yes`/`--no-prompt`/`--merge-strategy` | `[API][LOGIC][TEST]` | `src/cli/index.ts`, `src/cli/init-command.ts`, `src/cli/update-command.ts`, `src/generator/write-file.ts`, `tests/cli/flags.test.ts` | No (depends on T1) |
| T6 README + AGENTS.md tooling note | `[LOGIC]` | `README.md`, `src/templates/config/AGENTS.md.ejs` | Yes |

## External errors

_(none)_
