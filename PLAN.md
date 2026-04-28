# Epic 11 — Multi-IDE Target Outputs

**Branch:** `feature/epic-11-multi-ide-targets` | **Date:** 2026-04-28

## Context

Goal (verbatim from PRD §Epic 11): "Make `agents-workflows` emit native agent configurations for **five** tools instead of two: Claude Code + Codex CLI (existing) plus Cursor, VSCode + GitHub Copilot, and Windsurf. One shared partial library under `src/templates/partials/` feeds every target so content stays DRY and behaviour is consistent across tools." The five targets are **Claude Code, Codex CLI, Cursor, VSCode + Copilot, Windsurf**. Landing this epic unblocks E9.T6 (Cursor deny rule), E9.T7 (Copilot prompt frontmatter), and E9.T8 (Windsurf forbidden-commands rule), which all require the per-target output surfaces this epic creates.

**Out of scope (do not touch in this epic):** Aider, Continue.dev, Gemini CLI, Copilot CLI, Cline/Roo as first-class targets (they consume `AGENTS.md` natively); legacy `.cursorrules` / `.windsurfrules` single-file emission; auto-detect-driven override of user choice (detector seeds defaults only, user always confirms); the deny/forbid rule content itself (that is Epic 9). `AGENTS.md` is already emitted unconditionally by `src/generator/generate-root-config.ts:37-38`, so the PRD §E11.T3 "Copilot-only fallback" requires **no code change** — the existing unconditional emission already satisfies it; T1 must call this out so reviewers do not second-guess.

## Pre-implementation checklist

- [ ] Branch up to date with main (`feature/epic-11-multi-ide-targets` from clean `main`)
- [ ] All partials in `src/templates/partials/` enumerated (count: **40**)
- [ ] `writeFileSafe` signature confirmed: `({ path, content, merge?, displayPath? }) => Promise<WriteFileResult>` from `src/generator/write-file.ts:14-19`
- [ ] Detector return shape for `cursor` / `copilot` / `windsurf` confirmed in `src/detector/detect-ai-agents.ts` and already mapped to flags in `src/prompt/detected-ai-flags.ts:12-16` — no detector code changes required
- [ ] Confirmed `AGENTS.md` is unconditionally emitted today (`src/generator/generate-root-config.ts:37-38`) so the Copilot-only fallback requires no new code path

## Tasks

### T1 — Schema + `askTargets()` checkbox + threading [SCHEMA][LOGIC]

- **Files**:
  - `src/schema/stack-config.ts` (edit lines 122-125: extend `targets` object)
  - `src/prompt/types.ts` (edit lines 27-28: extend `PromptAnswers`)
  - `src/prompt/ask-targets.ts` (full rewrite: 2× `confirm` → 1× `checkbox`)
  - `src/prompt/defaults.ts` (no edit; verify `resolveDefault*` untouched)
  - `src/prompt/default-config.ts` (edit lines 32-35: extend default `targets`)
  - `src/prompt/prompt-flow.ts` (no signature change at line 71; result type widens through inference)
  - `tests/prompt/ask-targets.test.ts` (new) and `tests/schema/stack-config.test.ts` (extend)
- **Input**: PRD E11.T1 (lines 2454-2464). Detector flags from `toDetectedAiAgentFlags()` (`src/prompt/detected-ai-flags.ts`).
- **Output**:
  - Zod `targets` object gains `cursor`, `copilot`, `windsurf` booleans, each defaulting to `false` (so existing `.agents-workflows.json` manifests deserialize unchanged).
  - `askTargets()` becomes a single `checkbox({ ... })` with 5 choices; defaults seeded from detector per PRD bullet list (claude default `hasClaudeCode || (no other tool detected)`; codex `hasCodexCli`; cursor / copilot / windsurf from agent records; copilot also pre-checks if `.github/` exists in workspace).
  - `default-config.ts` `targets` gains the same three booleans (defaults: `cursor`/`copilot`/`windsurf` from `detected.aiAgents.agents.find(...)` matches via `isDetected`).
  - Unit test sweeps representative subsets of the 2^5 = 32 combinations: all-on, all-off, claude-only (legacy), codex-only, cursor+copilot+windsurf without claude/codex, copilot-only.
- **Notes**:
  - 200-line cap: `ask-targets.ts` after rewrite stays ≤60 lines (one helper for default seeding, one `checkbox` call).
  - DRY: do **not** duplicate the `isDetected` helper — import from `src/detector/detect-ai-agents.ts`. The "is `.github/` present" check goes through `fileExists` from `src/utils/index.ts`; do **not** introduce a parallel helper.
  - No `any`. Update `askTargets()` return type explicitly to `{ claudeCode: boolean; codexCli: boolean; cursor: boolean; copilot: boolean; windsurf: boolean }`.
  - Functions with >2 params: `askTargets` already takes one arg (detector record); the new checkbox-default helper takes a single options object.
  - Schema additions are additive booleans with `.default(false)` — existing fixtures and snapshots remain valid.

### T2 — Shared partial→activation map + ordering helpers + target registry [LOGIC]

- **Files**:
  - `src/generator/partial-activation-map.ts` (new) — single source of truth for partial slug → activation metadata
  - `src/generator/partial-ordering.ts` (new) — deterministic `00-`/`10-`/`20-`/`30-` prefix per activation bucket
  - `src/generator/list-partials.ts` (new) — runtime fs glob over `src/templates/partials/*.md.ejs`, returns `{ slug, path }[]`
  - `src/generator/index.ts` (edit) — refactor `generateAll()` to a `TARGET_GENERATORS` registry array so T3/T4/T5 each append one entry without colliding on this file
  - `tests/generator/partial-activation-map.test.ts` (new) and `tests/generator/partial-ordering.test.ts` (new)
- **Input**: PRD E11.T2 (lines 2474-2477) — Cursor MDC activation buckets; PRD E11.T4 (lines 2491-2495) — Windsurf activation buckets (same buckets, different syntax).
- **Output**:
  - `getPartialActivation(slug: string): PartialActivation` returning a discriminated union: `{ mode: 'always' } | { mode: 'glob'; globs: string[] } | { mode: 'modelDecision'; description: string } | { mode: 'manual'; description: string }`. PRD-listed slugs go in their stated buckets:
    - `mode: 'always'` — `untrusted-content`, `fail-safe`, `architect-fail-safe`, `tool-use-discipline`, `definition-of-done`, `error-handling-self`, `context-budget`, `dry-rules`, `git-rules`, `review-checklist`, `ai-complacency`
    - `mode: 'glob'` — `api-design` (backend), `accessibility` (UI), `performance` (UI), `testing-patterns` (test files), `concurrency` (server)
    - `mode: 'modelDecision'` — `docs-reference`, `stack-context`, `code-style`, `file-organization`, `workspaces`
  - **Default fallback rule for the remaining ~24 partials**: content/policy partials default to `modelDecision` with the partial's first H2 line as description; situational opt-in partials (`i18n`, `coderabbit-setup`, `deployment`, `error-handling-code`, `subagent-delegation`, `subagent-caveat`, `refactoring`, `security-disclosure`, `host-hardening`, `tooling`, `observability`, `mcp-policy`, `memory-discipline`, `session-hygiene`, `supply-chain`, `tdd-discipline`, `documentation`, `design-principles`, `security-defaults`) default to `manual`. Document the rule in a TSDoc block on `getPartialActivation` so the parity test in T6 can rely on it.
  - `orderingPrefix({ mode })` returns `'00'` for `always`, `'10'` for `glob`, `'20'` for `modelDecision`, `'30'` for `manual`. Combined filename: `${prefix}-${slug}`.
  - `listPartials()` returns the 40 partials (sorted alphabetically by slug for stable iteration).
  - `generateAll()` becomes:
    ```ts
    const TARGET_GENERATORS: TargetGenerator[] = [generateAgents, generateCommands, generateRootConfig, generateScripts, generateCursorConfig, generateCopilotConfig, generateWindsurfConfig];
    ```
    so T3/T4/T5 each add **one line** to this array — no merge conflict between the parallel branches.
- **Notes**:
  - 200-line cap: each new file ≤120 lines. `partial-activation-map.ts` will be the longest (one entry per slug); split slug groups into named constants (`ALWAYS_ON_SLUGS`, `GLOB_SLUGS`, etc., UPPER_SNAKE_CASE) at module top to keep the function body short.
  - DRY: this file is the **single source** consumed by both Cursor (T3) and Windsurf (T5). Do not duplicate the slug list or the bucket logic in either generator.
  - No `any`. Use a discriminated union for `PartialActivation`.
  - Single-object param for `orderingPrefix`.
  - The registry refactor (`TARGET_GENERATORS`) keeps the parallel-merge story honest. State explicitly in PR review: "T3/T4/T5 only append, never modify, the array."

### T3 — Cursor target generator [LOGIC][PARALLEL]

- **Files**:
  - `src/generator/cursor/index.ts` (new, ≤80 lines, exports `generateCursorConfig`)
  - `src/generator/cursor/render-mdc-frontmatter.ts` (new) — YAML frontmatter from `PartialActivation` (`description`, `alwaysApply`, `globs`)
  - `src/generator/cursor/render-rule-file.ts` (new) — wires partial body + frontmatter into `.cursor/rules/NN-<slug>.mdc`
  - `src/generator/cursor/render-command-file.ts` (new) — re-renders the three commands into `.cursor/commands/`
  - `src/generator/cursor/merge-mdc.ts` (new) — custom `MergeFunction` that treats the YAML frontmatter block as fully managed and preserves user-edited body content below the frontmatter delimiter
  - `src/templates/cursor/rule.mdc.ejs` (new) — minimal MDC wrapper template (frontmatter then `<%- body %>`)
  - `src/templates/cursor/command.md.ejs` (new) — Cursor command wrapper (or pass-through to existing `commands/*.md.ejs` if no Cursor-specific shape needed; document choice)
  - `src/generator/index.ts` (append `generateCursorConfig` to `TARGET_GENERATORS`)
  - `tests/generate-cursor-config.test.ts` (new) — see T6 for parity assertions; this file owns the per-target snapshot
- **Input**: PRD E11.T2 (lines 2466-2478). Activation buckets from T2's `getPartialActivation`.
- **Output**:
  - When `config.targets.cursor === true`: emits one `.cursor/rules/NN-<slug>.mdc` per partial (40 files), plus 3 `.cursor/commands/{workflow-plan,workflow-fix,external-review}.md` files.
  - Filename format: `00-untrusted-content.mdc`, `00-fail-safe.mdc`, ..., `10-api-design.mdc`, `20-stack-context.mdc`, `30-i18n.mdc`, etc.
  - MDC frontmatter:
    - `mode: 'always'` → `alwaysApply: true`, `description: '<from partial H2>'`
    - `mode: 'glob'` → `globs: [...]`, `description: '<from partial H2>'`
    - `mode: 'modelDecision'` → `description: '<from partial H2>'` only
    - `mode: 'manual'` → `description: '<from partial H2>'` only (user invokes via `@`)
  - Every write goes through `writeFileSafe({ path, content, merge: mergeMdc })` — **zero direct `fs.writeFile*` calls**.
- **Notes**:
  - 200-line cap: 5 files × ≤80 lines each. Index orchestrates; renderers are pure functions.
  - DRY: the partial body comes from rendering the same `src/templates/partials/<slug>.md.ejs` source — do **not** copy or fork partial content. Use the existing `renderTemplate()` from `src/utils/template-renderer.ts`.
  - DRY: command rendering reuses the existing `commands/{workflow-plan,workflow-fix,external-review}.md.ejs` templates (already present at `src/templates/commands/`). The Cursor-specific wrapper only adds the `.cursor/commands/` output path.
  - No `any`. `mergeMdc` uses the same `MergeFunction` shape from `src/generator/write-file.ts:8-12`.
  - Functions with >2 params: every helper takes a single object param.
  - Custom merger: standard `mergeMarkdown` is heading-based and won't handle YAML frontmatter cleanly. `mergeMdc` parses `---\n...\n---\n<body>`, replaces frontmatter wholesale (managed), preserves user-appended body content past a `<!-- agents-workflows:managed-end -->` sentinel that the template emits at end-of-managed-body.
  - Wire-in: append one entry to `TARGET_GENERATORS` in `src/generator/index.ts` (T2 created the registry).

### T4 — VSCode + GitHub Copilot target generator [LOGIC][PARALLEL]

- **Files**:
  - `src/generator/copilot/index.ts` (new, ≤80 lines, exports `generateCopilotConfig`)
  - `src/generator/copilot/render-instructions.ts` (new) — flattens selected partials into one `.github/copilot-instructions.md`
  - `src/generator/copilot/render-prompt-file.ts` (new) — emits `.github/prompts/<name>.prompt.md` with YAML frontmatter (`description`, `name`, `argument-hint`, `agent`, `model`, `tools`)
  - `src/generator/copilot/prompt-tool-allowlist.ts` (new) — per-prompt minimal `tools:` arrays (stable initial values; E9.T7 will tighten later)
  - `src/templates/copilot/copilot-instructions.md.ejs` (new) — header + ordered `<%- include %>` of the safety partials per PRD E11.T3
  - `src/templates/copilot/prompt.md.ejs` (new) — frontmatter wrapper around the three command templates
  - `src/generator/index.ts` (append `generateCopilotConfig` to `TARGET_GENERATORS`)
  - `tests/generate-copilot-config.test.ts` (new)
- **Input**: PRD E11.T3 (lines 2480-2486). Initial `tools:` allow-list per prompt (kept minimal until E9.T7 tightens).
- **Output**:
  - When `config.targets.copilot === true`: emits **one** `.github/copilot-instructions.md` (≤300 lines, **no YAML frontmatter** — flat Markdown sections in this order: project header → context budget → dangerous ops (§1.4 verbatim) → git discipline → security defaults → Definition of Done → AI-complacency guard → MCP policy → memory discipline) and three `.github/prompts/{workflow-plan,workflow-fix,external-review}.prompt.md` files **with** YAML frontmatter (`tools:` per prompt).
  - `tools:` arrays: `workflow-plan` excludes `runInTerminal` and excludes write tools on non-plan files; `workflow-fix` includes file-edit tools but excludes unbounded shell; `external-review` is read-only. **Never** include `bash`, `shell`, or unbounded command tools (PRD E9.T7 line 2092).
  - Every write goes through `writeFileSafe({ path, content, merge: mergeMarkdown })` — instructions file uses standard `mergeMarkdown` (heading-based, already in `src/generator/merge-markdown.ts`); prompt files use the same.
  - **No new code path for the AGENTS.md fallback** — `generate-root-config.ts:37-38` already emits `AGENTS.md` unconditionally, satisfying PRD line 2485 ("when only Copilot is selected and the user has no `AGENTS.md`, still emit `AGENTS.md`"). Add a code comment in `src/generator/copilot/index.ts` noting the dependency.
- **Notes**:
  - 200-line cap: 4 files × ≤80 lines. The instructions renderer is the longest (concatenates ~9 partials with section separators); keep partial-rendering in a small loop.
  - DRY: instructions content comes from re-rendering existing partials (`context-budget`, `git-rules`, `security-defaults`, `definition-of-done`, `ai-complacency`, `mcp-policy`, `memory-discipline`, etc.) — do **not** duplicate text. The §1.4 dangerous-ops block already lives in `AGENTS.md.ejs` lines 169-186; extract it to a new partial `dangerous-ops.md.ejs` only if T4 finds it isn't yet a partial. **Stop and ask the user** before adding a new partial; otherwise inline-render via the same source location.
  - DRY: per-prompt `tools:` allow-lists live in **one** module (`prompt-tool-allowlist.ts`) so E9.T7 can tighten by editing one file. Constants in UPPER_SNAKE_CASE.
  - No `any`. Tool allow-list typed as `Record<'workflowPlan' | 'workflowFix' | 'externalReview', readonly string[]>`.
  - Functions with >2 params take a single object param.
  - Wire-in: append one entry to `TARGET_GENERATORS`.

### T5 — Windsurf target generator [LOGIC][PARALLEL]

- **Files**:
  - `src/generator/windsurf/index.ts` (new, ≤80 lines, exports `generateWindsurfConfig`)
  - `src/generator/windsurf/render-rule-header.ts` (new) — Windsurf in-body activation block from `PartialActivation` (`activation: always_on | glob | model_decision | manual`, `globs:`, `description:`)
  - `src/generator/windsurf/render-rule-file.ts` (new)
  - `src/generator/windsurf/render-workflow-file.ts` (new) — Cascade `.windsurf/workflows/<name>.md`
  - `src/generator/windsurf/merge-rule.ts` (new) — custom merger preserving user content below the activation header
  - `src/templates/windsurf/rule.md.ejs` (new)
  - `src/templates/windsurf/workflow.md.ejs` (new)
  - `src/generator/index.ts` (append `generateWindsurfConfig` to `TARGET_GENERATORS`)
  - `tests/generate-windsurf-config.test.ts` (new)
- **Input**: PRD E11.T4 (lines 2488-2497). Activation buckets shared with Cursor via T2's `getPartialActivation` and `orderingPrefix` (same source-of-truth, different syntax).
- **Output**:
  - When `config.targets.windsurf === true`: emits one `.windsurf/rules/NN-<slug>.md` per partial (40 files) + three `.windsurf/workflows/{workflow-plan,workflow-fix,external-review}.md`.
  - Activation header (in-body, top of file):
    - `mode: 'always'` → `activation: always_on`
    - `mode: 'glob'` → `activation: glob` + `globs:` list
    - `mode: 'modelDecision'` → `activation: model_decision` + `description:`
    - `mode: 'manual'` → `activation: manual` + `description:`
  - Every write through `writeFileSafe({ path, content, merge: mergeWindsurfRule })` — **zero direct `fs.writeFile*` calls**.
- **Notes**:
  - 200-line cap: 5 files × ≤80 lines.
  - DRY: same `getPartialActivation` and `orderingPrefix` from T2; same partial source under `src/templates/partials/`. Do **not** redefine activation buckets.
  - DRY: workflows reuse existing `commands/{workflow-plan,workflow-fix,external-review}.md.ejs` content; the wrapper template only changes the output filename and (if needed) prepends a Cascade frontmatter.
  - No `any`. The custom merger uses the same `MergeFunction` signature.
  - Functions with >2 params take a single object param.
  - Wire-in: append one entry to `TARGET_GENERATORS`.

### T6 — Multi-target parity tests + `fs.writeFile` grep gate [TEST]

- **Files**:
  - `tests/generate-cursor-config.test.ts` (extend from T3)
  - `tests/generate-copilot-config.test.ts` (extend from T4)
  - `tests/generate-windsurf-config.test.ts` (extend from T5)
  - `tests/target-selection.test.ts` (new) — 32-combination sample of `targets` × emitted files
  - `tests/multi-target-parity.test.ts` (new) — data-driven parity assertion
  - `tests/no-direct-fs-write.test.ts` (new) — grep gate
  - `__snapshots__/` colocated next to each test
  - `tests/helpers/render-all-targets.ts` (new) — shared test helper
- **Input**: PRD E11.T6 (lines 2505-2509). PRD E11.T5 enforcement (line 2503).
- **Output**:
  - **Per-target snapshot tests** (one per generator) capture rendered file paths + content for a representative `StackConfig`. Snapshots reviewed by human on first run.
  - **Parity test** (data-driven):
    1. Globs `src/templates/partials/*.md.ejs` at runtime, extracts each slug.
    2. Generates Cursor + Copilot + Windsurf outputs with all targets enabled.
    3. For each slug asserts:
       - exactly one `.cursor/rules/NN-<slug>.mdc` file present
       - exactly one `.windsurf/rules/NN-<slug>.md` file present
       - a section in `.github/copilot-instructions.md` whose H2/H3 heading matches a slug-derived title **OR** the slug appears in a `COPILOT_INSTRUCTIONS_EXCLUSIONS` constant (documented inclusion list — Copilot uses curated subset per PRD line 2483, not all 40 partials)
    4. Test fails if a new partial is added without satisfying all three.
  - **`fs.writeFile` grep gate**: asserts `src/generator/cursor/**/*.ts`, `src/generator/copilot/**/*.ts`, `src/generator/windsurf/**/*.ts` contain **zero** matches for `fs\.writeFile|writeFileSync|fs\.promises\.writeFile|node:fs.*writeFile`. Implemented as a small Jest test using `fast-glob` (or built-in `fs/promises.readdir` + recursion) + `node:fs/promises.readFile` — no shelling out.
  - Re-run idempotency test: render → write to tmp dir → render again → assert `status: 'unchanged'` for every file (covers the `writeFileSafe` re-run preservation requirement of E11.T5).
- **Notes**:
  - 200-line cap: split parity test from snapshot tests; each test file ≤180 lines.
  - DRY: factor a `renderAllTargets(config)` test helper in `tests/helpers/render-all-targets.ts` so each test file imports the same generator-runner.
  - No `any`. Use `string[]` for slug lists, `Map<string, string>` for filename → content.
  - Single-object params for any helper >2 args.
  - The grep gate is the canonical enforcement of PRD E11.T5 ("ESLint rule (or simple Grep in CI)") — folded here per the prompt spec rather than as a separate task.

### T7 — README "Supported targets" table + AGENTS.md tooling note [DOCS]

- **Files**:
  - `README.md` (replace existing "What gets written" table at lines 257-262 with a 5-row "Supported targets" table)
  - `src/templates/config/AGENTS.md.ejs` (add one paragraph under the existing Tooling section, near line 199)
  - `tests/generator/snapshot.test.ts` (or equivalent existing AGENTS.md snapshot — update snapshot)
- **Input**: PRD E11.T7 (lines 2511-2515).
- **Output**:
  - README table replaces the old 3-row table with: rows = Claude Code, Codex CLI, Cursor, VSCode + Copilot, Windsurf; columns = `Tool | Output paths | Activation model | Detection signals`. The "Always emitted" row (`AGENTS.md`, `.agents-workflows.json`) becomes a one-line note immediately above the table.
  - `AGENTS.md.ejs` paragraph (verbatim spec from PRD line 2514): "This file is the universal surface — Copilot, Windsurf, Gemini CLI, Aider, and Continue.dev read it natively. Claude Code, Codex CLI, and Cursor additionally consume tool-native files under `.claude/`, `.codex/`, and `.cursor/`."
  - No stale references to "dual output" remain anywhere in `README.md`.
- **Notes**:
  - 200-line cap: only doc edits. `README.md` is already large; do not refactor unrelated sections.
  - DRY: detection signals column references `src/detector/detect-ai-agents.ts` `AI_AGENT_RULES` shape — keep wording aligned (CLI on PATH / config dir / env var).
  - The AGENTS.md snapshot test will need to be regenerated after this edit. Reviewer must visually confirm the diff.

## Post-implementation checklist

- [ ] `pnpm check-types` — zero errors
- [ ] `pnpm test` — all suites green (per-target snapshots reviewed; parity test passes; grep gate passes; 32-combination test passes)
- [ ] `pnpm lint` — zero warnings
- [ ] `/external-review` clean → `QA.md` resolved via `/workflow-fix`
- [ ] No new `fs.writeFile*` outside `writeFileSafe` (enforced by `tests/no-direct-fs-write.test.ts`)
- [ ] Parity test asserts every partial → Cursor `.mdc` rule + Windsurf `.md` rule + Copilot section (or documented exclusion)
- [ ] Re-run idempotency: second `init` on a clean tmp dir produces zero `written` outcomes (all `unchanged`)
- [ ] `TARGET_GENERATORS` registry in `src/generator/index.ts` contains exactly 7 entries (4 existing + 3 new)
- [ ] No file in `src/generator/cursor/`, `src/generator/copilot/`, `src/generator/windsurf/`, or any new `src/generator/*.ts` exceeds 200 lines
- [ ] DRY scan: activation buckets defined in exactly one place (`partial-activation-map.ts`), tool allow-lists in exactly one place (`prompt-tool-allowlist.ts`), partial bodies sourced only from `src/templates/partials/`

## External errors

- `tests/generator/generate-all.test.ts` — "preserves apostrophes and other markdown-special characters in project description" fails because the externally-introduced `markdownText()` template helper (in `CLAUDE.md.ejs`/`AGENTS.md.ejs`) now strips `<`, `>`, `&` from `project.description`. The test premise is invalidated by the new escaping policy. Out of Epic 11 scope.
- `tests/generator/permissions.test.ts` — "matches the generator output from .agents-workflows.json" fails because the externally-tightened `safeProjectDescription` regex `/^[a-zA-Z0-9 .,:;!?()_/@+-]+$/` rejects the em dash (`—`) present in this repo's own `.agents-workflows.json` description. Either widen the regex (add `—`/`–` and other typographic punctuation) or normalize the manifest. Out of Epic 11 scope.
