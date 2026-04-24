# Plan - Epic 8 Situational Enhancements
_Branch: `feature/epic-8-situational-enhancements` | Date: 2026-04-23_

## Context
Epic 8 [NICE] adds five situational enhancements to the generated agent configs: an i18n partial gated by library detection (E8.T1), a TCR (`test && commit || revert`) workflow command (E8.T2), an OSCAL continuous-compliance scaffold under governance (E8.T3), expanded continuous-profiling guidance inside the existing observability partial (E8.T4), and a Graphite/ghstack stacked-PR tooling mention inside the git-rules partial (E8.T5). NICE only deprioritizes this work versus MUST/SHOULD epics — every task must still satisfy DRY, the 200-line file cap, explicit typing (no `any`), and the standard review/test loop.

## Pre-implementation checklist

- [ ] Read `PRD.md` lines 1184–1211 (§2.13 Internationalization paste-ready snippet) and lines 1764–1770 (Epic 8 task list)
- [ ] Read `src/templates/partials/observability.md.ejs` to confirm the existing single-line continuous-profiling NICE entry that E8.T4 expands
- [ ] Read `src/templates/partials/git-rules.md.ejs` "PR Size Cap" section that already mentions `Graphite / ghstack / git-town` to confirm where the E8.T5 expansion lands without duplicating
- [ ] Grep `src/detector/` for an existing i18n-library detector (none expected — confirms a new detector is required for E8.T1)
- [ ] Grep `src/templates/agents/{ui-designer,implementer}.md.ejs` for any existing i18n include (none expected — confirms partial is new)
- [ ] Read `src/detector/dependency-detector.ts` and `src/detector/detect-auth.ts` to mirror the `createDependencyDetector` pattern for the new i18n detector
- [ ] Read `src/generator/generate-commands.ts`, `src/schema/stack-config.ts`, `src/prompt/default-config.ts`, `src/prompt/prompt-flow.ts`, and `src/prompt/questions.ts` to mirror the registration shape used for `workflow-fix` / `workflow-longhorizon` when adding TCR
- [ ] Read `src/generator/generate-root-config.ts` governance-block structure to mirror the conditional emit pattern for the OSCAL template (`src/templates/governance/oscal-component.json.ejs`)
- [ ] Grepped codebase for existing equivalents (components, hooks, utils, types, constants)
- [ ] Verified no type duplication - shared types imported, not redeclared
- [ ] Confirmed no magic numbers - all values reference design tokens or named constants

## Tasks

### Task 1 - Detect i18n library [LOGIC] [SCHEMA]
**Files**:
- `src/detector/detect-i18n.ts` (new)
- `src/detector/types.ts` (modify — add `i18n: Detection` to `DetectedStack`)
- `src/detector/detect-stack.ts` (modify — add `detectI18n` to the `Promise.all` and to the returned `DetectedStack`)
- `src/detector/index.ts` (modify — re-export `detectI18n`)
- `src/schema/stack-config.ts` (modify — add `stack.i18nLibrary: z.string().nullable().default(null)`)
- `src/prompt/default-config.ts` (modify — set `stack.i18nLibrary` from detection)
- `src/prompt/prompt-flow.ts` (modify — propagate `stack.i18nLibrary: detected.i18n.value`)
- `src/generator/build-context.ts` (modify — surface `hasI18n: Boolean(config.stack.i18nLibrary)` flag)
- `src/generator/types.ts` (modify — extend `GeneratorContext` with `hasI18n: boolean` and `i18nLibrary: string | null`)
- `tests/detector/detect-i18n.test.ts` (new)

**Input**: stack detection runs in `detect-stack.ts`. The new detector must follow `createDependencyDetector` rules and recognise: `i18next`, `react-i18next`, `next-intl`, `next-translate`, `@formatjs/intl`, `react-intl`, `@lingui/core`, `@lingui/react`, `vue-i18n`, `svelte-i18n`, `@nuxtjs/i18n`. Confidence values mirror `detect-auth.ts` (`0.9` for first-class libs, `0.8` for indirect markers like `@formatjs/intl`).

**Output**: `detected.i18n.value` is a non-null string when any matching dep is present in the target project; the value flows through to `config.stack.i18nLibrary` and into `GeneratorContext` as `hasI18n` + `i18nLibrary`. Existing tests still pass.

**Notes**:
- DRY: reuse `createDependencyDetector` exactly — no new detector primitive.
- Do NOT add an interactive prompt in `questions.ts` for this — mirror `detectAuth`, which is detection-only and not user-prompted (per `prompt-flow.ts` line 76 setting `auth: null`). This keeps Epic 8 NICE-scoped and avoids prompt churn.
- `Detection` type already exists in `src/detector/types.ts`; do not redeclare.
- File budget: `detect-i18n.ts` should stay ≤ 25 lines.
- Test colocates a fixture only if needed; otherwise unit-test the detector against a mocked `package.json` via the same pattern used by `tests/detector/detect-auth.test.ts` (read it first to mirror exactly).

### Task 2 - i18n partial and conditional includes [UI] [PARALLEL]
**Files**:
- `src/templates/partials/i18n.md.ejs` (new)
- `src/templates/agents/implementer.md.ejs` (modify — conditional include after the `concurrency.md.ejs` line)
- `src/templates/agents/ui-designer.md.ejs` (modify — conditional include after the `performance.md.ejs` line)
- `tests/generator/epic-8-i18n.test.ts` (new)

**Input**: §2.13 paste-ready snippet (PRD lines 1196–1210). The partial must be a verbatim transcription of the snippet (UTF-8/NFC, no string concat, ICU MessageFormat, `Intl.*`, `Accept-Language` resolution, CSS logical properties, CLDR plural categories, select for gender, `Temporal` over `Date`).

**Output**: When `hasI18n` is true, both `implementer.md` and `ui-designer.md` render the `## Internationalization` section. When `hasI18n` is false, neither file references it. Test asserts both presence (with i18n lib) and absence (without).

**Notes**:
- Conditional include syntax: `<% if (hasI18n) { -%>\n<%- include('../partials/i18n.md.ejs') %>\n<% } -%>` — mirror the `<% if (isBackend) {` pattern already in `implementer.md.ejs` line 29.
- DRY: the partial is the single source of truth — do not inline the rules into either agent template.
- The partial must NOT hardcode a specific library; the rules apply regardless of whether the project uses `i18next`, `next-intl`, etc. (matches PRD §2.13 wording).
- Test fixture must use `makeStackConfig({ stack: { ..., i18nLibrary: 'i18next' } })` — extend `tests/generator/fixtures.ts` with the new field default `null` so existing tests are unaffected.
- File budget: partial ≤ 30 lines (snippet is 14 lines).
- `[PARALLEL]` with Tasks 4, 5, 6 — they touch disjoint files.

### Task 3 - TCR workflow command [LOGIC]
**Files**:
- `src/templates/commands/workflow-tcr.md.ejs` (new)
- `src/schema/stack-config.ts` (modify — add `selectedCommands.workflowTcr: z.boolean().default(false)`)
- `src/prompt/default-config.ts` (modify — set `selectedCommands.workflowTcr: false`)
- `src/prompt/prompt-flow.ts` (modify — propagate `workflowTcr: selectedCommands.includes('workflowTcr')`)
- `src/prompt/questions.ts` (modify — add `{ name: '/workflow-tcr — TCR (test && commit || revert)', value: 'workflowTcr', checked: false }` to the `askCommandSelection` choices array)
- `src/generator/generate-commands.ts` (modify — append `{ key: 'workflowTcr', templateFile: 'commands/workflow-tcr.md.ejs', outputName: 'workflow-tcr.md' }` to `COMMAND_DEFINITIONS`)
- `tests/generator/fixtures.ts` (modify — add `workflowTcr: false` to the default `selectedCommands` block)
- `tests/generator/epic-8-tcr.test.ts` (new)

**Input**: TCR semantics from Thoughtworks Radar Vol 33 (Trial): on every change, run the test command; on green, auto-commit; on red, hard-revert. The command must reference `commands.test`, `mainBranch`, and respect the existing "NEVER commit or push unless user-invoked" rule by being explicitly invoked (the slash command itself is the user's opt-in). Mirror the structural shape of `src/templates/commands/workflow-fix.md.ejs`: frontmatter, instructions, verification rules, git-rules footer.

**Output**: When `selectedCommands.workflowTcr` is true and `targets.claudeCode` is true, `.claude/commands/workflow-tcr.md` is emitted; same for `.codex/prompts/workflow-tcr.md` when `targets.codexCli` is true. Default config keeps the command off so existing users' regenerations are unchanged.

**Notes**:
- DRY: do NOT duplicate command-emit logic — reuse `COMMAND_DEFINITIONS` only.
- The TCR command must explicitly note the destructive nature of `git reset --hard` and require the user to be on a dedicated TCR branch (never `mainBranch`). The repo-wide deny list already blocks `git reset --hard` in `.claude/settings.local.json` (per Epic 9 work) — flag this conflict in the command body so users know they must invoke TCR with explicit per-tool approval, not via the auto-allowlist.
- The command body must be ≤ 200 lines.
- Use `<%= commands.test %>` and `<%= mainBranch %>` for parametrisation; never hardcode `pnpm test` or `main`.
- Test asserts: file emitted only when flag true; references `<%= commands.test %>` resolved value; contains "test && commit || revert"; warns about `mainBranch`; not emitted by default.

### Task 4 - OSCAL continuous-compliance template [SCHEMA] [PARALLEL]
**Files**:
- `src/templates/governance/COMPLIANCE.md.ejs` (new)
- `src/templates/governance/oscal-component.json.ejs` (new — minimal OSCAL 1.1.2 component-definition skeleton)
- `src/generator/generate-root-config.ts` (modify — extend the existing `if (config.governance.enabled)` block to also render and push `docs/COMPLIANCE.md` and `docs/oscal/component-definition.json`)
- `tests/generator/epic-8-oscal.test.ts` (new)

**Input**: NIST OSCAL 1.1.2 component-definition format (the smallest valid OSCAL artifact). The Markdown wrapper (`COMPLIANCE.md`) explains: what OSCAL is, why continuous compliance matters (Radar v33 Adopt), how the JSON sidecar maps repo controls (deny list, secret scanning, signing, SBOM, branch protection) to a control catalog (NIST 800-53 Rev 5 baseline references). The JSON file must validate as well-formed JSON and contain a `component-definition.uuid`, `metadata.title`, `metadata.last-modified`, `metadata.version`, `metadata.oscal-version`, and one `components` entry.

**Output**: When `governance.enabled` is true, `docs/COMPLIANCE.md` and `docs/oscal/component-definition.json` are emitted alongside the existing `docs/GOVERNANCE.md` and `docs/SUPPLY_CHAIN.md`. When `governance.enabled` is false, neither file appears.

**Notes**:
- DRY: route through the existing `governance.enabled` gate — do NOT add a new top-level config flag. Mirror the parallel `Promise.all` pattern in `generate-root-config.ts` lines 31–40.
- Use a fixed placeholder UUID literal (e.g. `00000000-0000-0000-0000-000000000000`) and document it as "regenerate per project" in the Markdown wrapper. Generating a real UUID requires `crypto.randomUUID()` and would make the output non-deterministic — out of scope for this NICE task.
- Tone/structure mirrors `src/templates/governance/SUPPLY_CHAIN.md.ejs` (single H1, partial includes if needed). Keep `COMPLIANCE.md.ejs` ≤ 80 lines and `oscal-component.json.ejs` ≤ 50 lines.
- Test asserts: file emitted only when `governance.enabled` true; JSON parses via `JSON.parse`; contains required OSCAL keys; off by default.
- `[PARALLEL]` with Tasks 2, 5, 6.

### Task 5 - Continuous profiling note inside observability partial [LOGIC] [PARALLEL]
**Files**:
- `src/templates/partials/observability.md.ejs` (modify — replace the single-line `NICE: continuous profiling (Pyroscope / Parca / OTel eBPF receiver).` with an expanded 4–6 line block)
- `tests/generator/epic-8-observability.test.ts` (new)

**Input**: Expand the existing one-line NICE entry into actionable guidance: name eBPF as the low-overhead production-safe profiler; cite Pyroscope / Parca / Polar Signals as concrete OSS implementations; mention the OpenTelemetry profiles signal (now stable in OTel spec, 2025); call out CPU-flame-graph + heap as the two profile types worth shipping; warn that profiling sample rates need a budget (default 100 Hz) and PII-safe stack symbolisation.

**Output**: The observability partial now includes a substantive continuous-profiling subsection. All agents that include `observability.md.ejs` (currently `implementer.md.ejs`) automatically pick up the change. No new EJS variables introduced.

**Notes**:
- DRY: extend the existing single line — do NOT add a new partial. The expansion belongs inside `observability.md.ejs` because `implementer.md.ejs` already includes that partial.
- Keep total `observability.md.ejs` ≤ 40 lines after the change (currently 18).
- Test asserts: `implementer.md` content contains "eBPF", "OpenTelemetry profiles", at least one of "Pyroscope" / "Parca" / "Polar Signals", and the "100 Hz" sample-rate guidance literal — proving the expansion landed via the partial chain.
- `[PARALLEL]` with Tasks 2, 4, 6.

### Task 6 - Stacked PR tooling note in git-rules partial [LOGIC] [PARALLEL]
**Files**:
- `src/templates/partials/git-rules.md.ejs` (modify — expand the existing "PR Size Cap" bullet that already mentions `Graphite / ghstack / git-town` into a 3-line block with concrete invocation examples)
- `tests/generator/epic-8-git-rules.test.ts` (new)

**Input**: The current bullet at line 31 of `git-rules.md.ejs` reads: `PRs ≤ 400 LOC changed. If larger, split using stacked PRs (Graphite / ghstack / git-town).` Expand into: (a) when to stack (one logical change per PR, dependent stack ≤ 5), (b) the canonical commands (`gt create` / `ghstack` / `git town hack`), (c) merge order (bottom-up, never rebase a stack from an old base).

**Output**: `git-rules.md.ejs` retains its existing "PR Size Cap" heading but the body is expanded. All consumers of the partial (AGENTS.md, CLAUDE.md, architect.md) automatically pick up the change via existing includes — no other files modified.

**Notes**:
- DRY: do NOT create a new `stacked-pr.md.ejs` partial. The mention is small enough to belong with `git-rules.md.ejs`. PRD §E8.T5 explicitly says "in git-rules".
- Keep `git-rules.md.ejs` ≤ 60 lines after the change (currently 41).
- Test asserts: `AGENTS.md` content contains "stacked PRs", "Graphite" or "gt create", and "merge bottom-up" or equivalent literal.
- `[PARALLEL]` with Tasks 2, 4, 5.

### Task 7 - Aggregate Epic 8 integration test and snapshot refresh [TEST]
**Files**:
- `tests/generator/epic-8-integration.test.ts` (new)
- `tests/generator/fixtures.ts` (modify — add `i18nLibrary: null` to default stack and `workflowTcr: false` to default selectedCommands so existing tests remain green)
- `tests/detector/__snapshots__/detect-ai-agents.test.ts.snap` (regenerate ONLY if `pnpm test` reports it as broken — do not blanket-refresh)

**Input**: A single end-to-end test that exercises the full Epic 8 surface: (a) renders with `i18nLibrary: 'i18next'` + `workflowTcr: true` + `governance.enabled: true` and asserts every Epic 8 artifact is present; (b) renders with all defaults and asserts none are present; (c) regression-checks that no pre-Epic-8 file path disappears.

**Output**: Single integration test that fails loudly if any Epic 8 task regresses. Existing tests in `tests/generator/generate-all.test.ts` and `tests/detector/detect-stack.test.ts` continue to pass.

**Notes**:
- DRY: reuse `makeStackConfig`, `findFile`, `getContent` from `tests/generator/fixtures.ts` — do not redeclare helpers.
- Do NOT duplicate the per-task assertions from Tasks 2/3/4/5/6 — this aggregate test is a smoke matrix, not an exhaustive re-test.
- File budget: ≤ 100 lines.
- Run `pnpm test` once locally after Task 7 lands to confirm full suite is green before invoking the review loop.

## Post-implementation checklist

- [ ] `pnpm check-types` - zero errors
- [ ] `pnpm test` - all suites pass
- [ ] `pnpm lint` - zero warnings
- [ ] Run `code-reviewer` agent on all modified files - all critical and warning findings fixed
- [ ] Run `security-reviewer` agent in parallel with `code-reviewer` (TCR command and OSCAL artifact ship security-relevant content)
- [ ] DRY scan complete - no duplicated code across modified files
- [ ] Verified no agent template exceeds the 200-line cap after the new conditional includes
- [ ] Verified `i18n.md.ejs` does NOT render when `hasI18n` is false (negative test passes)
- [ ] Verified `workflow-tcr.md` does NOT render when `selectedCommands.workflowTcr` is false (default-off behavior preserved)
- [ ] Verified `docs/COMPLIANCE.md` and `docs/oscal/component-definition.json` only render when `governance.enabled` is true
- [ ] Run `/external-review` and address every CodeRabbit finding via `/workflow-fix`

## External errors

CodeRabbit external review (2026-04-23) surfaced 10 findings outside the Epic 8 changeset — recorded here, not fixed in this branch:
- `.github/workflows/ci.yml`: missing `pnpm lint` CI step (pre-existing infra).
- `src/templates/partials/architect-fail-safe.md.ejs`: CRLF line endings (pre-existing).
- `src/templates/agents/test-writer.md.ejs`: doc says tests live in separate `tests/` dir; project convention is colocated (pre-existing template — both Claude and Codex outputs reflect this).
- `tests/generator/epic-1-safety.test.ts`: implicit-typed `find` callbacks (Epic 1).
- `src/templates/partials/stack-context.md.ejs`: unguarded `stackItems.forEach` (pre-existing).
- `src/prompt/detected-ai-flags.ts`: implicit `candidate` parameter type (pre-existing).
- `src/templates/agents/ui-designer.md.ejs`: references `README.md` as canonical-source rather than `PRD.md` (pre-existing — Epic 8 only added an i18n include here).
- `src/templates/partials/testing-patterns.md.ejs`: unguarded `<%= testsDir %>` and `<%= conventions.maxFileLength %>` (pre-existing).
- `.claude/scratchpad/review-task-epic5.md` (×2): scratchpad artifacts, not shipped product code.

## Summary

| # | Title | Type | Parallel | Files (count) |
|---|---|---|---|---|
| 1 | Detect i18n library | LOGIC + SCHEMA | no | 10 |
| 2 | i18n partial and conditional includes | UI | yes | 4 |
| 3 | TCR workflow command | LOGIC | no | 8 |
| 4 | OSCAL continuous-compliance template | SCHEMA | yes | 4 |
| 5 | Continuous profiling note inside observability partial | LOGIC | yes | 2 |
| 6 | Stacked PR tooling note in git-rules partial | LOGIC | yes | 2 |
| 7 | Aggregate Epic 8 integration test and snapshot refresh | TEST | no | 3 |
