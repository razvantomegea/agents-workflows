# Plan - Epic 3 Code Review Depth
_Branch: `feature/epic-3-code-review-depth` | Date: 2026-04-20_

## Context

Epic 3 upgrades review rigor across the framework: `code-reviewer` gets the full §2.1 nine-section checklist with Conventional Comments, a new §2.18 AI-complacency guard is wired into the three review surfaces, the §1.7 cross-model routing table is paste-ready in `AGENTS.md`, `reviewer` exposes an explicit numbered 5-step gate (review → fix → type-check → tests → lint/format), and `/external-review` supports a user-specified terminal command with Code Rabbit CLI as the default. This delivers the `[MUST]` review-depth requirement from PRD.md:1492–1520 without touching agents outside the review surface.

## Pre-implementation checklist

- [ ] Grepped codebase for existing equivalents (components, hooks, utils, types, constants)
  - `review-checklist.md.ejs` exists as a 9-line table partial driven by `reviewChecklist` context — will be replaced with the §2.1 nine-section static checklist. The dynamic `buildReviewChecklist` / `ReviewChecklistItem` machinery in `src/generator/review-checklist-rules.ts` and `src/generator/types.ts` is kept intact (still referenced by its own `tests/generator/review-checklist.test.ts`); this plan keeps the dynamic rules accessible as an optional rendered appendix inside the new partial so stack-specific rules (Drizzle, Zustand, TanStack Query, React hooks) are not lost.
  - `definition-of-done.md.ejs`, `fail-safe.md.ejs`, `untrusted-content.md.ejs` show the existing partial shape (H2 heading + wrapper-tag block). New `ai-complacency.md.ejs` follows the same pattern with an `<ai_complacency_guard>` block.
  - `AGENTS.md.ejs` already has a Sub-agent Routing table (task→agent, lines 17–38). The new "Model routing" table is a separate section inserted after it — do **not** duplicate or replace the existing routing table.
  - `external-review.md.ejs` is a short command (38 lines) — extend, do not rewrite.
  - `reviewer.md.ejs` already has a 6-step "When invoked" list that roughly matches the gate; Task E3.T4 rewrites it into the explicit 5-step numbered gate (review → fix → type-check → tests → lint/format) with per-step failure handling.
- [ ] Verified no type duplication — `GeneratorContext`, `ReviewChecklistItem` in `src/generator/types.ts` are untouched. No new context fields required: new partials contain static markdown only (except the optional dynamic appendix in `review-checklist.md.ejs` which reuses the existing `reviewChecklist` array).
- [ ] Confirmed no magic numbers — PR size (`≤ 400 LOC`), complexity bounds (`≤15 / ≤20 / ≤4`), and Argon2id params (`m=19456, t=2, p=1`) are pasted verbatim from the PRD source of truth (§2.1 / §1.7); commit subject limit reuses the same `≤72-char` wording as PRD.

## Files to be created or modified

- **Create:** `src/templates/partials/ai-complacency.md.ejs`
- **Modify:** `src/templates/partials/review-checklist.md.ejs`
- **Modify:** `src/templates/agents/code-reviewer.md.ejs`
- **Modify:** `src/templates/agents/reviewer.md.ejs`
- **Modify:** `src/templates/commands/external-review.md.ejs`
- **Modify:** `src/templates/config/AGENTS.md.ejs`
- **Create:** `tests/generator/epic-3-review-depth.test.ts`

No generator/TS source files, no schema, no new context fields.

## Tasks

### Task 1 - E3.T1 Rewrite review-checklist partial with §2.1 nine-section checklist [LOGIC] [PARALLEL]

**Files**
- `src/templates/partials/review-checklist.md.ejs`

**Input**
- PRD §2.1 (PRD.md:676–765) paste-ready checklist content.
- Existing partial body (9-line dynamic table) driven by `reviewChecklist` context.

**Output**
- Replace partial body with the nine H3 sections (`### 1. Correctness` … `### 9. AI-specific`) exactly as specified in §2.1, followed by the Conventional Comments footer (`nit:` non-blocking, `(blocking)` for must-fix, "Delegate style entirely to formatters").
- Append a final `### Stack-specific rules` sub-section that renders the existing dynamic `reviewChecklist` table (the prior partial body) so stack-specific rules are preserved. Guard with `<% if (reviewChecklist && reviewChecklist.length > 0) { -%>` so environments without this context still render cleanly.

**Notes**
- DRY: keep the dynamic table logic inside this file rather than duplicating it in `code-reviewer.md.ejs`.
- Rendered `code-reviewer.md` must stay ≤ 250 lines — verified by Task 7 test. The static checklist is ~75 lines; code-reviewer already includes 4 partials + ~55 lines of shell. Net addition ≈ 65 lines, comfortably under 250.
- Do not introduce new context keys; `reviewChecklist` already exists in `GeneratorContext`.
- Acceptance hooks (Task 7): `review-checklist includes all nine §2.1 section headings`, `code-reviewer rendered output stays ≤ 250 lines`, `review-checklist includes Conventional Comments footer`.

### Task 2 - E3.T2a Create ai-complacency partial [LOGIC]

**Files**
- `src/templates/partials/ai-complacency.md.ejs` (new)

**Input**
- PRD §2.18 (PRD.md:1247–1267) paste-ready snippet.

**Output**
- New partial following the existing H2 + wrapper-tag idiom (see `definition-of-done.md.ejs`):
  - H2 heading: `## AI-authored code (Thoughtworks Radar v33 — "Hold" on AI complacency)`.
  - Wrapper: `<ai_complacency_guard>` / `</ai_complacency_guard>`.
  - Bullets for each of the 6 verification rules from §2.18, including the final `Never auto-merge on AI approval alone.` clause verbatim.

**Notes**
- DRY: self-contained partial, no nested includes.
- Wrapper tag `<ai_complacency_guard>` is unique (grep: only PRD.md currently contains `ai_complacency`).
- Must live at `src/templates/partials/` so all three consumers can include it with `'../partials/ai-complacency.md.ejs'`.

### Task 3 - E3.T2b Wire ai-complacency into code-reviewer, reviewer, external-review [LOGIC]

**Files**
- `src/templates/agents/code-reviewer.md.ejs`
- `src/templates/agents/reviewer.md.ejs`
- `src/templates/commands/external-review.md.ejs`

**Input**
- New `ai-complacency.md.ejs` from Task 2.

**Output**
- Add a single `<%- include('../partials/ai-complacency.md.ejs') %>` in each file:
  - `code-reviewer.md.ejs`: directly after the `review-checklist` include (after line 13), before `docs-reference`.
  - `reviewer.md.ejs`: directly after the `definition-of-done` include (after line 15), before `## When invoked`.
  - `external-review.md.ejs`: directly before the final `## Rules` section, so the guard applies to findings emitted by the external tool.

**Notes**
- DRY: single partial, three consumers — no copy-paste of §2.18 content.
- Commands and agents are both one level below `src/templates/`, so `../partials/...` relative paths resolve identically (confirmed by `generate-commands.ts` reusing the same `renderTemplate`).
- Depends on Task 2; share-file constraint with Tasks 5 and 6 for `reviewer.md.ejs` and `external-review.md.ejs` — sequence: Task 5 → Task 3 (reviewer), Task 6 → Task 4 → Task 3 (external-review), or fold all three edits for one file into a single editing session.
- Acceptance hooks (Task 7): `ai-complacency partial appears in code-reviewer, reviewer, external-review only`, `ai-complacency enforces no-auto-merge clause`.

### Task 4 - E3.T3 Insert §1.7 model-routing table and external-review family-diff rule [LOGIC] [PARALLEL]

**Files**
- `src/templates/config/AGENTS.md.ejs`
- `src/templates/commands/external-review.md.ejs`

**Input**
- PRD §1.7 (PRD.md:266–297) paste-ready model-routing block with 9-role table and the "never let the writer be its own final reviewer" rule.

**Output**
- `AGENTS.md.ejs`: insert H2 section `## Model routing (verify current model IDs in vendor docs)` directly after the Sub-agent Routing block (after line 38, before `## Planning Workflow` at line 40). Include the full 9-row table verbatim (architect, implementer, code-reviewer, reviewer, external-review, code-optimizer, test-writer, e2e-tester, ui-designer) and the trailing rule paragraph starting with `Rule: never let the writer be its own final reviewer.`
- `external-review.md.ejs`: add H2 section `## Cross-model requirement` after step 2 of `## Instructions` (or just before `## Output`) stating: the external review tool **must** run on a different model family than the implementer/code-reviewer used for the diff; family parity between writer and final reviewer is forbidden.

**Notes**
- DRY: existing Sub-agent Routing *task→agent* table (AGENTS.md.ejs:17–38) is different data (task mapping) from the *role→model family* table — keep both.
- Table content is static markdown, no EJS conditionals. No pipes inside cell content, safe as pasted.
- Shares `external-review.md.ejs` with Tasks 3 and 6 — coordinate edits.
- Acceptance hooks (Task 7): `AGENTS.md contains model-routing table with 9 roles`, `external-review enforces different-family rule`.

### Task 5 - E3.T4 Make reviewer gate explicit 5-step numbered list with failure handling [LOGIC] [PARALLEL]

**Files**
- `src/templates/agents/reviewer.md.ejs`

**Input**
- Current 6-step `## When invoked` list (reviewer.md.ejs:17–28).
- PRD §1.6 Definition of Done context (PRD.md:231–264).

**Output**
- Replace `## When invoked` body with an explicit numbered 5-step gate (in order: code-reviewer → apply fixes → type-check → tests → lint/format). Each step carries a failure-handling clause:
  1. Invoke `code-reviewer` (and `security-reviewer` in parallel when `hasSecurityReviewer`). **If invocation fails:** stop and surface the error — do not proceed to fixes.
  2. Route every critical/warning finding to `implementer` and re-check. **If a fix introduces new findings:** loop back to step 1 against the newly modified files.
  3. Run type-check (`<%= commands.typeCheck %>`) when configured. **If type-check fails:** route errors to `implementer`; do not silence with `any`/`@ts-ignore`/`eslint-disable`; re-run until clean.
  4. Run tests (`<%= commands.test %>`). **If any suite fails:** route failures to `implementer`; never delete or weaken tests to pass. Loop back to step 3 after fixes.
  5. Run lint/format (`<%= commands.lint %>`). **If lint/format fails:** route failures to `implementer`; never use `eslint-disable` to suppress; loop back to step 1 after fixes.
- Keep the scratchpad bookkeeping item as a preamble bullet (not a numbered gate step), so the 5 numbered items are exactly the five gate steps.
- Keep the existing `<%- include('../partials/definition-of-done.md.ejs') %>`; Task 3 adds the `ai-complacency` include adjacent to it.

**Notes**
- DRY: reuse `commands.typeCheck` and `commands.test` from `GeneratorContext` (already used in this file and in `AGENTS.md.ejs`).
- Shares file with Task 3's reviewer edit — apply Task 5 first, then Task 3's one-line include addition.
- Acceptance hooks (Task 7): `reviewer gate lists five numbered steps in order`, `reviewer gate states per-step failure handling`.

### Task 6 - E3.T5 Document terminal command override and Code Rabbit CLI default in external-review [LOGIC] [PARALLEL]

**Files**
- `src/templates/commands/external-review.md.ejs`

**Input**
- Current short command template (38 lines).
- PRD §1.7 mention: `external-review | DIFFERENT family, fresh context | high | Any CLI (Code Rabbit default) · Cursor BugBot · Copilot PR review agent`.

**Output**
- Add H2 section `## Command selection` (between `## Instructions` and `## Output`) documenting:
  - Users may pass a terminal command after the slash command (e.g. `/external-review cursor-bugbot review --base <mainBranch>`) to override the default tool; the agent must run exactly that command and parse its output into `QA.md`.
  - When no terminal command is supplied, the default tool is the **Code Rabbit CLI** (`coderabbit review` or vendor-current equivalent — verify availability via `coderabbit --version`).
  - If Code Rabbit CLI is not installed, halt and instruct the user to either install it or re-invoke with an explicit command argument; do not silently substitute another tool.
- Update step 1 of `## Instructions` from `Verify the external review tool is available.` to `Verify the external review tool is available (user-supplied command, or Code Rabbit CLI default).`

**Notes**
- DRY: shares file with Tasks 3 and 4. All three edits may be applied in one editing pass by the implementer; tag separately to keep test coverage atomic.
- Acceptance hooks (Task 7): `external-review documents terminal command override`, `external-review documents Code Rabbit CLI default`.

### Task 7 - Add Epic 3 acceptance tests [TEST]

**Files**
- `tests/generator/epic-3-review-depth.test.ts` (new)

**Input**
- `generateAll` fixture pattern used by `tests/generator/epic-2-quality.test.ts` (including `getAgentContent`, `getCommandContent`, `assertInclusion`, `assertStepOrder`). Copy only the helpers needed — Rule of Three not yet met for epic-1/epic-2/epic-3 helper extraction.

**Output**
- New Jest test file with `describe('Epic 3 review depth', ...)`:
  1. `renders all nine §2.1 section headings in code-reviewer` — asserts each of `### 1. Correctness`, `### 2. Security (OWASP Top 10 2025 baseline)`, `### 3. Tests`, `### 4. Design`, `### 5. Readability / naming`, `### 6. Observability`, `### 7. Documentation`, `### 8. Git hygiene`, `### 9. AI-specific` is present in the rendered `.claude/agents/code-reviewer.md`.
  2. `code-reviewer rendered output stays ≤ 250 lines` — `expect(content.split(/\r?\n/).length).toBeLessThanOrEqual(250)`.
  3. `review-checklist includes Conventional Comments footer` — asserts `Use Conventional Comments` and `(blocking)` present.
  4. `ai-complacency partial renders in code-reviewer, reviewer, and external-review only` — inclusion assertion over agents plus check for `.claude/commands/external-review.md`; asserts `<ai_complacency_guard>` absent from other agents.
  5. `ai-complacency enforces no-auto-merge clause` — asserts `Never auto-merge on AI approval alone` in all three consumers.
  6. `AGENTS.md contains model-routing table with nine roles` — asserts header row plus each of the 9 role names appears; asserts `never let the writer be its own final reviewer` is present.
  7. `external-review enforces different-family rule` — asserts the exact wording used in Task 4 (e.g. `different model family`) in rendered `.claude/commands/external-review.md`.
  8. `reviewer gate has five numbered steps in order` — `assertStepOrder` on rendered reviewer content checking: `code-reviewer`, `apply` (fixes), `pnpm check-types` (type-check literal from fixture), `pnpm test`, `pnpm lint` (lint/format). Also asserts each step has a failure clause keyword chosen in Task 5.
  9. `external-review documents terminal command override and Code Rabbit CLI default` — asserts both `Code Rabbit CLI` and `override` (or the exact wording from Task 6) appear.

**Notes**
- Keep the file ≤ 200 lines. If helper duplication with `epic-2-quality.test.ts` reaches 3 occurrences, file a follow-up to extract — do not extract in this PR.
- No `any` types — use `GeneratedFile[]` explicitly; object params when >2.
- Depends on Tasks 1–6 landing first.

## Risks and rollback

- **Risk:** Replacing the dynamic `reviewChecklist` table breaks `tests/generator/review-checklist.test.ts`. Mitigation: Task 1 keeps the dynamic table as a final `### Stack-specific rules` sub-section; the TS unit test for `buildReviewChecklist` stays untouched.
- **Risk:** Rendered `code-reviewer.md` exceeds 250 lines after pasting §2.1 verbatim. Mitigation: Task 1 projects net size ≈ 170 lines; Task 7's line-count assertion catches regression.
- **Risk:** EJS include path resolution differs between `agents/` and `commands/` subdirectories. Mitigation: both directories are one level deep from `src/templates/`; existing command templates and agents use the same `../partials/` pattern and the same `renderTemplate` helper.
- **Rollback:** all edits are contained to template files and one new test file. A single `git revert` on the feature-branch commits restores previous behavior; no schema, no generator logic, no build artifacts are touched.

## Out of scope (explicit non-goals)

- No changes to `src/generator/review-checklist-rules.ts` or the `ReviewChecklistItem` type.
- No changes to `security-reviewer.md.ejs` (Epic 4 territory).
- No changes to `implementer.md.ejs`, `code-optimizer.md.ejs`, or other non-review agents.
- No changes to `CLAUDE.md.ejs` model-routing (PRD §1.7 scopes the table to `AGENTS.md`; avoid drift).
- No new context fields in `GeneratorContext`.
- No commit or push — user drives merges.
- Do not mark PRD.md Epic 3 as `[DONE]` inside this plan's implementation; the user appends the DONE marker after reviewing the merged branch.

## Post-implementation checklist

- [ ] `pnpm check-types` - zero errors
- [ ] `pnpm test` - all suites pass (including new `epic-3-review-depth.test.ts`)
- [ ] `pnpm lint` - zero warnings
- [ ] Run `code-reviewer` agent on all modified files - all critical and warning findings fixed
- [ ] Run `security-reviewer` agent in parallel - all critical and warning findings fixed
- [ ] DRY scan complete - §2.1 lives only in `review-checklist.md.ejs`; §2.18 only in `ai-complacency.md.ejs`; §1.7 table only in `AGENTS.md.ejs`
- [ ] Rendered `.claude/agents/code-reviewer.md` verified ≤ 250 lines
- [ ] PRD.md Epic 3 header (PRD.md:1492) ready for user to append `[DONE YYYY-MM-DD]` marker
- [ ] PLAN.md External errors section reviewed

## External errors

- **security-reviewer W1** — `project.name` / `project.description` are interpolated verbatim by EJS templates via the repo's identity-escape renderer. Root cause lives in `src/schema/stack-config.ts` (Zod schema lacks max-length + newline/angle-bracket regex on project metadata). Out of Epic 3 scope. Follow-up: tighten `stackConfigSchema.project` with `z.string().max(...).regex(/^[^\n\r<>]+$/, ...)`, mirroring the existing `SAFE_BRANCH_RE` / `SAFE_COMMAND_RE` discipline.
- **code-reviewer W1** — Test helpers (`getAgentContent`, `getCommandContent`, `assertStepOrder`) are now duplicated across `tests/generator/epic-2-quality.test.ts` and `tests/generator/epic-3-review-depth.test.ts` (Rule of Two met). Extract to `tests/generator/test-helpers.ts` in the next epic-test PR before a third copy lands; also reconciles the blank-line drift in `assertStepOrder`.
- **final-reviewer observation** — `tests/generator/generate-all.test.ts` is 212 lines (exceeds project 200-line cap). Predates Epic 3; Epic 3 added only 2 lines. Split or slim in a follow-up cleanup PR.
- **E3.T6 pre-existing working-tree state** — `src/templates/commands/workflow-fix.md.ejs` shows as modified in `git status` but was not edited by any E3.T6 task. Change (stricter UI/UX routing to `ui-designer` before `implementer`) was pre-existing uncommitted work from a prior session. Left untouched per scope rule.
- **E3.T6 observation** — `QA.md` was staged as modified at session start but is absent from `git status` at session end. Likely reset by a hook or a prior generator run. Not touched by E3.T6.

## Task summary

| ID | Title | Type | Parallel? | Files |
|---|---|---|---|---|
| E3.T1 | Rewrite review-checklist partial with §2.1 nine-section checklist | [LOGIC] | [PARALLEL] | `src/templates/partials/review-checklist.md.ejs` |
| E3.T2a | Create ai-complacency partial | [LOGIC] | — | `src/templates/partials/ai-complacency.md.ejs` |
| E3.T2b | Wire ai-complacency into code-reviewer, reviewer, external-review | [LOGIC] | — (after T2a) | 3 files |
| E3.T3 | Insert §1.7 model-routing table + external-review family-diff rule | [LOGIC] | [PARALLEL] | `AGENTS.md.ejs`, `external-review.md.ejs` |
| E3.T4 | Explicit 5-step numbered reviewer gate | [LOGIC] | [PARALLEL] (share-file with T2b reviewer edit) | `reviewer.md.ejs` |
| E3.T5 | Terminal command override + Code Rabbit CLI default | [LOGIC] | [PARALLEL] (share-file with T3, T2b) | `external-review.md.ejs` |
| E3.TESTS | Epic 3 acceptance tests | [TEST] | — (after T1–T5) | `tests/generator/epic-3-review-depth.test.ts` |
