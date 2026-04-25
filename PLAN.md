# Plan - Post-Epic-9 Cleanup (Epic 6/8 line-count regressions)
_Branch: fix/post-epic-9-cleanup | Date: 2026-04-25_

## Context

Commit `a88dc1b` rewrote `src/templates/partials/git-rules.md.ejs` with auto-formatter line-wraps and runaway indentation, growing it from 51 to 64 lines and splitting the contiguous string `one logical change per PR` across a wrapped line. That single regression cascades into three failing assertions: the partial breaches its 60-line cap, the rendered `architect.md` breaches its 300-line cap (currently 310), and the Epic 8 T6 "logical change" guard fails because the substring no longer renders contiguously. All three are addressable by restoring the pre-`a88dc1b` flat single-line-per-bullet form of the partial while preserving every Epic 8 T6 string token. No code under `.claude/settings.json`, `.codex/config.toml`, `.codex/rules/project.rules`, `tests/security/**`, `docs/security-smoke-runbook.md`, or `src/templates/partials/subagent-caveat.md.ejs` is touched.

## Pre-implementation checklist

- [ ] Read `PRD.md` §2.6 (Git and commit hygiene) and §1.4 (Destructive-operation guardrails) to confirm required content for the partial
- [ ] Grep `src/templates` for `logical change`, `bottom-up`, `gt create`, `ghstack`, `git town hack`, `≤ 5` to confirm the partial is the only source for each token
- [ ] Confirm `tests/generator/epic-8-git-rules.test.ts` is the canonical guard for partial line-count (≤60) and Epic 8 T6 string tokens
- [ ] Confirm `tests/generator/generate-all.test.ts` enforces the architect render cap of 300 lines (separate from `CODE_REVIEWER_MAX_LINES`)
- [ ] Verify no Epic 9 deny-listed file is on the modification path
- [ ] Verify `git status` is clean apart from this PLAN.md before starting Task 1

## Tasks

### Task 1 - Restore flat git-rules partial preserving every Epic 8 T6 token [LOGIC]

**Files**
- `src/templates/partials/git-rules.md.ejs`

**Input**
- Failing assertion `git-rules partial template file is within 60 lines` (`tests/generator/epic-8-git-rules.test.ts:45-56`)
- Failing assertion `architect.md contains one-logical-change-per-PR guidance` (`tests/generator/epic-8-git-rules.test.ts:40-43`)
- Pre-`a88dc1b` form of the partial (51 lines, flush-left bullets, single-line phrases) recoverable via `git show a88dc1b^:src/templates/partials/git-rules.md.ejs`

**Output**
- File is ≤60 lines counted via `content.split('\n').length`
- Each bullet sits on a single line (no auto-wrap-induced indentation cascades)
- Rendered architect.md (after Task 2 regeneration) drops back to ≤300 lines

**Notes**
- MUST preserve every Epic 8 T6 substring on a single rendered line: `stacked PR`, `Graphite`, `gt create`, `ghstack`, `git town hack`, `merge bottom-up` (or `bottom-up`), `≤ 5` (or `<= 5`), and the contiguous phrase `one logical change per PR` (or at minimum `logical change` on one unbroken line)
- MUST keep all section headings: `## Git Rules`, `## Branch Convention`, `### Conventional Commits 1.0`, `### Trunk-Based Development`, `### PR Size Cap`, `### Commit Signing`, `### Pre-Commit Hooks`
- MUST keep the merge-order sentence and the canonical-commands table (Tool / Create stack entry / Push / sync) intact; collapsing the table is allowed only if every command token still appears as a literal in rendered output
- MUST keep both `<%= mainBranch %>` interpolations so the `develop`-branch rendering test in `tests/generator/generate-all.test.ts` still passes
- DRY: do not duplicate the deny-list or branch-naming guidance already covered by `untrusted-content.md.ejs` and `architect-fail-safe.md.ejs`
- Out of scope: rewriting bullets in the included `dry-rules.md.ejs`, `documentation.md.ejs`, or `design-principles.md.ejs` partials

### Task 2 - Regenerate committed agent and skill outputs [LOGIC]

**Files**
- `.claude/agents/architect.md`
- `.codex/skills/architect/SKILL.md`
- Any other generator output files that shrink because of Task 1 (`pnpm generate` will surface the full list)

**Input**
- Updated partial from Task 1
- Failing assertion `architect.md` rendered length must be ≤300 lines (`tests/generator/generate-all.test.ts:163-191`)

**Output**
- Regenerated `architect.md` is ≤300 lines and contains the contiguous string `one logical change per PR`
- Regenerated `SKILL.md` reflects the same partial change with no orphaned wrapping

**Notes**
- MUST run only the existing `pnpm generate` (or equivalent committed script) — do not hand-edit the rendered files
- DRY: rendered files are derived; never edit them manually if the partial is the source
- Out of scope: regenerating files under templates unrelated to git-rules (e.g. CLAUDE.md, AGENTS.md) unless `pnpm generate` updates them as a side effect; if so, include only the diff lines tied to git-rules

### Task 3 - Verify all three failing tests pass and no Epic 9 file changed [TEST]

**Files**
- `tests/generator/epic-8-git-rules.test.ts` (read-only verification)
- `tests/generator/generate-all.test.ts` (read-only verification)

**Input**
- Test runner outputs from `pnpm test --filter epic-8-git-rules` and `pnpm test --filter generate-all`

**Output**
- All eight Epic 8 T6 assertions green
- `generateAll` line-count assertion green for `architect.md`
- `git diff --stat` shows zero changes under `.claude/settings.json`, `.codex/config.toml`, `.codex/rules/project.rules`, `tests/security/**`, `docs/security-smoke-runbook.md`, `src/templates/partials/subagent-caveat.md.ejs`

**Notes**
- MUST NOT widen any line-count limit; only the partial and its derived renders may shrink
- If a test fails on a token not listed in the Epic 8 T6 guard (e.g. a different partial regressed), record it under `## External errors` in this PLAN and stop — do not expand scope
- DRY: do not duplicate verification logic already present in the test files

## Post-implementation checklist

- [ ] `pnpm check-types` - zero errors
- [ ] `pnpm test` - all suites pass (especially `epic-8-git-rules.test.ts` and `generate-all.test.ts`)
- [ ] `pnpm lint` - zero warnings
- [ ] `awk 'END {print NR}' src/templates/partials/git-rules.md.ejs` reports ≤60
- [ ] `awk 'END {print NR}' .claude/agents/architect.md` reports ≤300
- [ ] `grep -c 'one logical change per PR' .claude/agents/architect.md` reports ≥1
- [ ] `git diff --stat` confirms zero changes to Epic 9 deny-listed files
- [ ] Run `code-reviewer` agent on all modified files - all critical and warning findings fixed
- [ ] DRY scan complete - no duplicated code across modified files

## External errors

_None at plan creation time. Record here any failure surfaced during execution that requires touching a file outside this PR's narrow scope._
