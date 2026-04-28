# Plan — Epic 12 — Polyglot Monorepo Support

_Branch: `feature/epic-12-polyglot-monorepo` | Date: 2026-04-28_

## Context

**Goal (verbatim from PRD §Epic 12, line 2554).** `agents-workflows init` produces workspace-aware outputs in polyglot monorepos: each workspace gets its own detected stack and toolchain commands, a nested `AGENTS.md` is emitted per workspace when languages differ, root config carries a `## Workspaces` index table, and every agent routes Definition-of-Done gates through the nearest workspace manifest per §1.18.

**Out of scope (PRD §Epic 12 non-goals, lines 2623–2629):** Bazel/Buck2/Pants/Moon/Nx polyglot plugins, JVM monorepos (Gradle multi-module, Maven reactor), remote-caching integration (Turbo/Nx Cloud/Bazel Remote), CI matrix generation across workspaces, build-graph-based change-detection.

**Doc-vs-code mismatch flagged.** The user task brief states the partial count is "40 → 41 after T4". The actual current count under `src/templates/partials/` is **42**, so this epic will land **43** partials after T4 (per CLAUDE.md "flag mismatches" rule §README and §CLAUDE.md "When `README.md` and code disagree, flag the mismatch").

## Pre-implementation checklist

- [ ] On `feature/epic-12-polyglot-monorepo` branched from clean `main` (verified: `git status` clean, branch matches).
- [ ] `detectMonorepo` reviewed — `src/detector/detect-monorepo.ts:14-24` returns `MonorepoInfo { isMonorepo, tool, workspaces: string[] }`; T1 extends the `MonorepoTool` union (line 6) and adds new readers, but keeps the existing JS readers intact and the `workspaces: string[]` shape on this layer.
- [ ] `detectLanguage` reviewed — `src/detector/detect-language.ts:6-43` already detects TS/JS/Python/Go/Rust/Java/C# from a single root; T2 reuses it unchanged, scoped to a workspace path.
- [ ] `detectPackageManager` reviewed — `src/detector/detect-package-manager.ts:5-42` already maps lockfiles to `pnpm/yarn/npm/bun/uv/poetry/pipenv/pip/go-mod`; T2 reuses it.
- [ ] `safeCommand` (line 26) and `safeCommandNullable` (line 27) of `src/schema/stack-config.ts` confirmed — T3 reuses both verbatim. **`SAFE_COMMAND_RE` (line 14) MUST NOT be broadened.**
- [ ] `writeFileSafe` four-status contract confirmed — `src/generator/write-file.ts:5` exports `WriteFileStatus = 'written' | 'skipped' | 'merged' | 'unchanged'`; default behavior is "never clobber a hand-edited file" (Epic 7 contract — `writeFileSafe` only writes on first creation, on `existing === content` no-op, or after explicit user prompt). T6 calls it for every nested `AGENTS.md`.
- [ ] Partial count baseline: **42 today** under `src/templates/partials/`; T4 adds exactly **1** new partial → **43 after T4**. T5 edits 3 existing partials, no new files.
- [ ] `polyglot-monorepo.md.ejs` confirmed absent under `src/templates/partials/` (will be created by T4).
- [ ] `workspace-AGENTS.md.ejs` confirmed absent under `src/templates/config/` (will be created by T6 — note: this is a **config template**, not a partial, so it does not count toward the partial cap).
- [ ] Existing `src/templates/partials/workspaces.md.ejs` (12 lines) confirmed — currently iterates `monorepo.workspaces` as `string[]`. T6 updates it in place to render the §Epic 12 acceptance bullet 2 `## Workspaces` index table from the new `WorkspaceStack[]` shape (do **not** introduce a parallel partial).
- [ ] Existing schema `monorepo` shape (`src/schema/stack-config.ts:177-181`): `{ isRoot: boolean; tool: enum-or-null; workspaces: string[] }`. New shape after T3: `monorepo.workspaces: WorkspaceStack[]`, `monorepo.tool: enum-with-new-values-or-null`, plus a new **top-level** `languages: string[]` (sibling of `stack` / `monorepo`). Backward compat via `.default([])` on `workspaces` and `languages` so legacy manifests deserialize unchanged (PRD §Epic 12 acceptance bullet 5).
- [ ] Agent template partial-include blocks located: `architect.md.ejs:11-23`, `implementer.md.ejs:11-41`, `code-reviewer.md.ejs:11-26`, `code-optimizer.md.ejs:11-25`, `test-writer.md.ejs:11-19`, `reviewer.md.ejs:11-19`. T4 inserts the new include after the last existing partial-include line in each.
- [ ] No `any` allowed; all new functions with >2 parameters use a single object parameter; all files ≤200 lines.
- [ ] All `path.join` calls use `node:path` `join`/`resolve` (Windows-aware). Never hardcode `/`.

## Tasks

### Task 1 — Extend `MonorepoTool` enum and polyglot workspace readers [LOGIC]

- **Files**:
  - `src/detector/detect-monorepo.ts` (edit — extend enum + add 6 readers, keep existing JS readers intact).
- **Input**: PRD E12.T1 (lines 2575–2579). Existing readers `readPnpmWorkspace` (line 47), `readPackageJson` (line 36), `readLernaPackages` (line 78), `expandWorkspacePatterns` (line 93).
- **Output**:
  - `MonorepoTool` union (line 6) extended with: `'cargo' | 'go-work' | 'uv' | 'poetry' | 'dotnet-sln' | 'cmake'`.
  - New private readers in the same file: `readCargoWorkspace`, `readGoWork`, `readUvWorkspace`, `readPoetryWorkspace`, `readDotnetSolution`, `readCmakeSubdirs`.
  - `readWorkspacePatterns` (line 31) gains the new readers. **Detection ordering** (PRD bullet): JS wins on `package.json workspaces` → `pnpm-workspace.yaml` → `lerna.json` → Cargo (`Cargo.toml [workspace]`) → `go.work` → `pyproject.toml [tool.uv.workspace]` → `pyproject.toml [tool.poetry]`'s `packages` array → `*.sln` → `CMakeLists.txt`.
  - `MonorepoInfo` (`src/detector/detect-monorepo.ts:8-12`) shape unchanged — keeps `workspaces: string[]` (raw relative paths). The richer `WorkspaceStack[]` shape lives in the **schema**, not in `MonorepoInfo` (see Task 2 Notes).
  - Satisfies acceptance bullets 1 (JS-only path retained) and 1 (six new manifest formats parse).
- **Notes**:
  - DRY: reuse `fileExists` (`src/utils/index.ts`), `readFile` (`node:fs/promises`), and `expandWorkspacePatterns` (line 93) — do not duplicate path-walking logic. The existing `parsePnpmWorkspacePackages` (line 54) is the model for line-based YAML parsing; mirror its style for `pyproject.toml` table parsing without pulling in a TOML dep (read `Cargo.toml` and `pyproject.toml` line-wise; PRD does not require full TOML parsing for `[workspace] members` / `[tool.uv.workspace] members`).
  - File cap: `detect-monorepo.ts` is currently 126 lines. After this task it must stay ≤200; split helpers into a new `src/detector/monorepo-readers/` folder if it exceeds. Prefer one file unless ≥200 lines.
  - No `any`. Each reader returns `Promise<string[] | null>` (workspace member globs/paths) and is composed by `readWorkspacePatterns`.
  - `*.sln` parser: parse `Project("...") = "name", "rel\path\to.csproj", "..."` lines and return the directory portion of the `.csproj` path; normalize Windows backslashes to forward slashes via `path.posix.dirname`.
  - `CMakeLists.txt`: regex `add_subdirectory\(\s*([^)\s]+)\s*\)`; ignore commented lines.
  - `go.work`: parse `use (` ... `)` block and standalone `use ./pkg` lines.
  - **Reviewer fix (C-2):** Poetry packages live under `[tool.poetry]`'s `packages` array, not a `[tool.poetry.packages]` section header; `parsePoetryPackages` section-detect regex corrected to `/^\[tool\.poetry\]\s*$/`.

### Task 2 — Per-workspace stack detection [LOGIC]

- **Files**:
  - `src/detector/detect-workspace-stack.ts` (**new** — ≤120 lines).
  - `src/detector/detect-stack.ts` (edit — aggregate workspace stacks and `languages`).
  - `src/detector/types.ts` (edit — add `DetectedStack.languages: readonly string[]` field; add `WorkspaceStackDetection` interface for the in-memory aggregate before schema parsing).
  - `src/detector/index.ts` (edit — export `detectWorkspaceStack` and `WorkspaceStackDetection`).
  - `src/cli/init-command.ts` (edit — `rootMonorepoConfig` lines 93–100 must build `WorkspaceStack[]` from `detected.monorepo.workspaces` paths via `detectWorkspaceStack`; `installWorkspaces` line 102 must consume the enriched per-workspace stacks rather than re-running detection).
- **Input**: PRD E12.T2 (lines 2581–2585). Existing detector pipeline in `detect-stack.ts:31-91`. Existing `detectMonorepo` (Task 1).
- **Output**:
  - `detectWorkspaceStack({ workspacePath })` runs the same pipeline as `detectStack` but **scoped to a workspace directory**: `detectLanguage`, `detectFramework`, `detectTestFramework`, `detectLinter`, `detectFormatter`, `detectPackageManager`, `detectE2e`, `detectAuth`, `detectI18n`, plus `resolveCommands` reuse via `src/prompt/commands.ts`. Returns `WorkspaceStackDetection { path, language, runtime, framework, packageManager, commands: { typeCheck, test, lint, build } }`.
  - `detectStack` now: when `monorepo.workspaces.length > 0`, `Promise.all` over `detectWorkspaceStack` per workspace path and aggregate `languages: readonly string[]` = distinct non-null lowercased language values across `[rootLanguage, ...workspaceLanguages]`.
  - `DetectedStack` gains `languages: readonly string[]` and `workspaceStacks: readonly WorkspaceStackDetection[]` (empty arrays when monolingual). Existing single-language root path is preserved (acceptance bullet 5).
  - `init-command.ts:93-100` rewritten to call `detectStack` once at root, then map `detected.workspaceStacks` into the schema-shaped `WorkspaceStack[]` — no second detection pass. `installWorkspaces` (line 102) consumes that pre-detected list.
  - Satisfies acceptance bullet 1 (per-workspace tooling) and the per-task done-when (TS+Rust+Python fixture resolves three distinct workspace stacks).
- **Notes**:
  - **Two-layer model (must be explicit so it isn't conflated):** the **detector layer** (`MonorepoInfo.workspaces: string[]`) carries raw relative paths; the **schema layer** (`StackConfig['monorepo'].workspaces: WorkspaceStack[]` from Task 3) carries the enriched per-workspace stacks. `detectStack` is the bridge: it produces `DetectedStack.workspaceStacks: WorkspaceStackDetection[]`, and `init-command.ts → rootMonorepoConfig` translates that into the schema shape.
  - DRY: `detectWorkspaceStack` MUST reuse the existing detector functions imported by `detect-stack.ts` — do **not** copy detection logic. The shared piece is the body of `detect-stack.ts:31-91` minus `detectMonorepo` / `detectAiAgents` / `detectDocsFile` / `detectRoadmapFile` (those are root-only concerns). Extract a new private helper `runStackPipeline(projectRoot)` in `detect-stack.ts` that both `detectStack` (root) and `detectWorkspaceStack` call. This avoids code duplication.
  - `detectWorkspaceStack` signature: **single-object parameter** `{ workspacePath: string }` (>2 params anticipated when adding `rootScripts` later). Matches CLAUDE.md "Functions with more than 2 parameters must use a single object parameter."
  - `commands.{typeCheck,test,lint,build}` per workspace: reuse `resolveCommands` from `src/prompt/commands.ts` — do not invent a parallel command resolver. Read the workspace's `package.json` scripts (or `Cargo.toml` `[package]` for Rust, etc.) and feed them to the existing helper.
  - No `any`. `WorkspaceStackDetection` is a discriminated union not needed; a plain interface suffices.
  - File cap: new file ≤120 lines; if `detect-stack.ts` exceeds 200 after edits, split `runStackPipeline` into its own file.
  - Windows-aware: every workspace path computed with `path.join(projectRoot, relativePath)` — never hardcoded `/`.

### Task 3 — Schema update for per-workspace stacks and languages [SCHEMA]

- **Files**:
  - `src/schema/stack-config.ts` (edit — extend `monorepo.workspaces`, add `WorkspaceStack` schema, add top-level `languages`).
- **Input**: PRD E12.T3 (lines 2587–2591). Existing schema lines 26–27 (`safeCommand`, `safeCommandNullable`), 177–181 (`monorepo` object).
- **Output**:
  - New private schema constant `workspaceStackSchema` defined alongside the existing block (just before `stackConfigSchema`):
    ```ts
    const workspaceStackSchema = z.object({
      path: safeProjectPath,
      language: z.string(),
      runtime: z.string(),
      framework: z.string().nullable().default(null),
      packageManager: z.string(),
      commands: z.object({
        typeCheck: safeCommandNullable,
        test: safeCommand,
        lint: safeCommandNullable,
        build: safeCommandNullable,
      }),
    });
    ```
  - `monorepo` object (lines 177–181) becomes:
    ```ts
    monorepo: z.object({
      isRoot: z.boolean(),
      tool: z.enum(['pnpm','npm','yarn','lerna','turbo','nx','cargo','go-work','uv','poetry','dotnet-sln','cmake']).nullable(),
      workspaces: z.array(workspaceStackSchema).default([]),
    }).nullable().default(null),
    ```
  - **New top-level field** (sibling of `stack` and `monorepo`, NOT nested inside `monorepo`): `languages: z.array(z.string()).default([])`.
  - Exported types: `WorkspaceStack = z.infer<typeof workspaceStackSchema>`.
  - Satisfies acceptance bullet 5 (legacy `workspaces: string[]` migrating: legacy manifests with `monorepo.workspaces: ["packages/foo"]` now fail strict parse because the schema expects objects — so the schema MUST also accept legacy `string[]` via a `z.preprocess` that maps `string` items to `{ path: s, language: '', runtime: '', framework: null, packageManager: '', commands: { typeCheck: null, test: '', lint: null, build: null } }` — or, simpler, default `workspaces: []` and let migration happen in the manifest loader. **Decision: default `[]` and re-derive workspaces from detection on load.** The Epic 7 manifest loader already calls `detectStack` so legacy manifests cleanly upgrade.
- **Notes**:
  - **DRY: reuse `safeCommand` / `safeCommandNullable` (lines 26–27) verbatim.** Do NOT introduce a separate validator for workspace commands. Workspace commands MUST pass the same `SAFE_COMMAND_RE` (line 14) as root commands (PRD: "No broadening of the `SAFE_COMMAND_RE` pattern").
  - **Top-level placement:** `languages` is a **sibling** of `stack` and `monorepo` at the top level of `stackConfigSchema`, NOT nested under `monorepo`. PRD §Epic 12 line 2584 says "aggregates a top-level `languages: string[]`".
  - **Backward compatibility (acceptance bullet 5):**
    - JS-only monorepos: schema still parses today's manifests because `workspaces: []` is the default. The `monorepoTool` enum is widened additively (no removed values).
    - Monolingual repos: `monorepo` stays `null`; `languages` defaults to `[]`. No diff in serialized JSON for monolingual projects.
    - Legacy manifests with `monorepo.workspaces: string[]` deserialize after `init`'s `detectStack` re-runs and produces the enriched shape; the manifest is rewritten on save. Add one Zod test asserting an empty-array `monorepo.workspaces` parse succeeds against the new schema.
  - No `any`. `WorkspaceStack` is exported as `z.infer<typeof workspaceStackSchema>` — no manual interface duplicate.
  - File cap: `stack-config.ts` is currently 192 lines. After this edit it must stay ≤200. If it would exceed, extract `workspaceStackSchema` to a sibling file `src/schema/workspace-stack.ts` and re-export from `stack-config.ts`.

### Task 4 — New partial `polyglot-monorepo.md.ejs` and wire into 6 agent templates [UI] [PARALLEL]

- **Files**:
  - `src/templates/partials/polyglot-monorepo.md.ejs` (**new**, ≤80 lines per PRD).
  - `src/templates/agents/architect.md.ejs` (edit — insert include after line 23, the last existing partial-include before "## Planning protocol").
  - `src/templates/agents/implementer.md.ejs` (edit — insert include after line 41, the last `tdd-discipline` include).
  - `src/templates/agents/code-reviewer.md.ejs` (edit — insert include after line 26, after `untrusted-content`).
  - `src/templates/agents/code-optimizer.md.ejs` (edit — insert include after line 25, after `performance`).
  - `src/templates/agents/test-writer.md.ejs` (edit — insert include after line 19, after `tdd-discipline`).
  - `src/templates/agents/reviewer.md.ejs` (edit — insert include after line 19, after `subagent-delegation`).
- **Input**: PRD E12.T4 (lines 2593–2597), §1.18 paste-ready snippet (PRD lines 869–903 — render verbatim inside `<polyglot_monorepo>` ... `</polyglot_monorepo>` tags).
- **Output**:
  - New partial body = the **exact** §1.18 7-bullet snippet wrapped in a Markdown heading `## Polyglot monorepo navigation`. Contains no logic except a single `<% if (polyglot) { -%>` guard.
  - **Render predicate** passed to each `include`: `polyglot = monorepo && monorepo.workspaces.length > 1 || (languages && languages.length >= 2)`. Compute it once in `src/generator/build-context.ts` (new field `isPolyglot: boolean` on `GeneratorContext`) so all templates share one predicate (DRY). Pass it into the include via local context binding `<%- include('../partials/polyglot-monorepo.md.ejs', { polyglot: isPolyglot }) %>`.
  - Satisfies acceptance bullet 2 (rendering in polyglot fixtures).
- **Notes**:
  - **PARALLEL with Task 5** — different files, no overlap.
  - DRY: a **single** `isPolyglot` predicate in `build-context.ts` — do not recompute in each template. Import-time data flow: `detectStack` aggregates `languages` → `init-command.ts` writes them into `StackConfig` (T3 schema field) → `buildContext` derives `isPolyglot` from `config.languages.length >= 2 || (config.monorepo?.workspaces.length ?? 0) > 1`.
  - **No new partials beyond this one** — Task 5 cross-references only.
  - File cap: partial ≤80 lines (PRD constraint). Each agent template currently 50–121 lines; adding one include line keeps each well under 200.
  - The wrapping `<polyglot_monorepo>` ... `</polyglot_monorepo>` XML-style tags follow the existing partial convention (cf. `definition-of-done.md.ejs`, `fail-safe.md.ejs`, `tool-use-discipline.md.ejs`).
  - `architect.md.ejs` already enumerates planning rules — the partial reinforces them but does NOT duplicate them; it adds the workspace-routing layer.
  - Update `src/templates/agents/architect.md.ejs` Pre-implementation Checklist Block (lines 56–70) to add a checkbox `- [ ] Cross-workspace plan: every touched workspace's DoD enumerated` **only when** `<% if (isPolyglot) { %>`. Keep monolingual snapshots byte-identical.

### Task 5 — Cross-reference workspace routing in three existing partials [UI] [PARALLEL]

- **Files**:
  - `src/templates/partials/definition-of-done.md.ejs` (edit — currently 16 lines; add ≤4 conditional lines).
  - `src/templates/partials/fail-safe.md.ejs` (edit — currently 15 lines; add ≤3 conditional lines).
  - `src/templates/partials/tool-use-discipline.md.ejs` (edit — currently 14 lines; add ≤3 conditional lines).
- **Input**: PRD E12.T5 (lines 2599–2603). Existing partial bodies (read above).
- **Output**:
  - `definition-of-done.md.ejs`: under bullet 4 ("The specific acceptance criterion is verified end-to-end."), add `<% if (isPolyglot) { -%>` block: "DoD gates run **per touched workspace** — type-check, lint, and the narrowest relevant test in each workspace's toolchain (see polyglot partial)."
  - `fail-safe.md.ejs`: append a `<% if (isPolyglot) { -%>` block after the existing `<fail_safe>` body: "Before any command, run `pwd` and walk upward to the nearest manifest. Use that workspace's commands — never the repo root's."
  - `tool-use-discipline.md.ejs`: append a `<% if (isPolyglot) { -%>` line under "When doing N independent reads/searches…": "Per-workspace searches/reads fan out as parallel tool calls — one per workspace."
  - Satisfies acceptance bullet 2 (cross-reference in polyglot fixtures only) and PRD task done-when (monolingual snapshots unchanged).
- **Notes**:
  - **PARALLEL with Task 4** — disjoint file set.
  - DRY: cross-reference the §1.18 snippet (link by name "polyglot partial") — do **not** duplicate the 7-bullet body. The polyglot partial holds the full content; these three add only routing reminders.
  - All conditional blocks gated by the same `isPolyglot` predicate from Task 4 (single source of truth).
  - File cap: each edited partial stays ≤30 lines after edits (well under 200).
  - Existing monolingual snapshots in `tests/generator/__snapshots__/` MUST remain byte-identical — the `<% if (isPolyglot) { -%>` guard ensures this. Task 8 adds an explicit assertion.

### Task 6 — Nested per-workspace `AGENTS.md` + root `## Workspaces` table [LOGIC]

- **Files**:
  - `src/generator/generate-root-config.ts` (edit — emit nested AGENTS.md and update root AGENTS.md / CLAUDE.md path).
  - `src/templates/config/AGENTS.md.ejs` (edit — replace existing line 15 include of `workspaces.md.ejs` with the upgraded version).
  - `src/templates/config/CLAUDE.md.ejs` (edit — same change at line 15).
  - `src/templates/partials/workspaces.md.ejs` (edit — replace 12-line bullet list with the `## Workspaces` markdown table — see PRD bullet "root table lists every workspace").
  - `src/templates/config/workspace-AGENTS.md.ejs` (**new** — minimal template rendering `language` + `packageManager` + `commands.{typeCheck,test,lint,build}` for one workspace).
- **Input**: PRD E12.T6 (lines 2605–2609). Existing `generateRootConfig` (`src/generator/generate-root-config.ts:15-71`). Existing `writeFileSafe` four-status contract.
- **Output**:
  - **Root table:** `workspaces.md.ejs` upgraded to render a Markdown table with columns `path | language | package manager | typeCheck | test | lint | build` for each `workspace` in `monorepo.workspaces` (`WorkspaceStack[]`). Conditional on `monorepo && monorepo.workspaces.length > 0 && monorepo.isRoot`. Replaces today's bullet-list output. AGENTS.md.ejs / CLAUDE.md.ejs already include this partial at line 15 — no extra wiring there.
  - **Nested AGENTS.md:** `generateRootConfig` iterates `config.monorepo?.workspaces ?? []`; for each workspace whose `language !== config.stack.language` (case-insensitive), render `workspace-AGENTS.md.ejs` with that workspace's data and push `{ path: <workspacePath>/AGENTS.md, content }` onto `files`. The shared `writeFileSafe` (consumed via `installer/write-files.ts`) handles the never-clobber-hand-edits semantics — no separate code path needed.
  - **Root table renderer helper:** new function `renderWorkspaceTableRow({ workspace })` extracted (single-object param per CLAUDE.md rule) into `src/generator/workspace-table.ts` if `workspaces.md.ejs` exceeds inline-EJS readability. Otherwise inline.
  - Satisfies acceptance bullet 3 (nested `AGENTS.md` per differing-language workspace) and bullet 2 (root table).
- **Notes**:
  - **DRY: reuse the existing `workspaces.md.ejs` partial — do not create a parallel partial** (per user instruction "No new partials beyond the one explicitly required"). The new file `workspace-AGENTS.md.ejs` is a **config template** under `src/templates/config/`, not a partial — explicitly allowed by PRD E12.T6 Files list and outside the partial cap.
  - **DRY: reuse `writeFileSafe`** (Epic 7 contract) for all nested writes. The default behavior — first-create writes; existing-equal no-op; existing-different prompts/respects sticky/override — is exactly what acceptance bullet 3 requires ("re-running `init` preserves hand-edited nested files").
  - Functions with >2 params use a single object parameter: `renderWorkspaceTableRow({ workspace })`, `emitNestedAgentsFiles({ config, context, files })`.
  - File cap: `generate-root-config.ts` is currently 71 lines. After this task it must stay ≤200 — add a private helper `emitNestedAgentsFiles` and call it after the existing `agentsMd` push.
  - Windows-aware: nested `AGENTS.md` paths use `path.join(workspace.path, 'AGENTS.md')` then forward-slash normalize (`split(path.sep).join('/')`) for the manifest's `files: string[]` — the manifest stores POSIX-style paths regardless of host OS.
  - Comparison `language !== config.stack.language` is case-insensitive (`.toLowerCase()`).
  - `workspace-AGENTS.md.ejs` body (≤30 lines): heading `# AGENTS.md (workspace: <%= workspace.path %>)`, a `<!-- agents-workflows:managed-start -->` marker, language/runtime line, package manager line, DoD commands list, `<!-- agents-workflows:managed-end -->`. Mirrors the marker convention from `src/templates/config/AGENTS.md.ejs` for Epic 7 merge compatibility.

### Task 7 — Prompt flow: confirm detected workspaces (multi-select + non-interactive flags) [LOGIC]

- **Files**:
  - `src/prompt/questions.ts` (edit — add `askWorkspaceSelection({ detected })` exporting a `checkbox` of detected workspaces).
  - `src/prompt/prompt-flow.ts` (edit — call new question after `askInstallScope` resolves to non-`root`; persist the result into `monorepo.workspaces`).
  - `src/prompt/install-scope.ts` (edit — extend the existing prompt; do NOT introduce a parallel scope handler).
  - `src/cli/init-command.ts` (edit — `installWorkspaces` (line 102) iterates the user-selected subset, not the full `detected.monorepo.workspaces`).
- **Input**: PRD E12.T7 (lines 2611–2615). Existing prompt-flow shape (`src/prompt/prompt-flow.ts:43-163`). Existing `--yes` / `--no-prompt` / `--merge-strategy` semantics from Epic 7 (`InitCommandOptions`).
- **Output**:
  - New `askWorkspaceSelection({ detected, isPolyglot })` in `questions.ts`: returns `string[]` of selected workspace paths via `checkbox` from `@inquirer/prompts` (existing dep), pre-checked = all detected. Display label per row: `<path> — <language>` so the user sees what they're (de)selecting.
  - `prompt-flow.ts` invokes it only when (a) `monorepo.workspaces.length > 0` AND (b) `options.yes !== true && options.noPrompt !== true`. With `--yes`, keep all detected workspaces. With `--no-prompt`, also keep all detected workspaces but skip the confirmation prompt. With neither, ask the user.
  - User-deselected workspaces: their paths are filtered out before the schema-shaping in `init-command.ts:rootMonorepoConfig`. No nested `AGENTS.md` is emitted, no row in the root table, no per-workspace pass in `installWorkspaces`.
  - Satisfies acceptance bullet 1 (workspace resolution honors user selection) and PRD done-when.
- **Notes**:
  - **DRY: extend `askInstallScope`** (`src/prompt/install-scope.ts:6`) — do not parallel-implement scope vs. workspace selection. Add a follow-up `checkbox` after the `select` returns `'per-package'` or `'both'`.
  - **DRY: reuse `parseSafetyFlags` and `parseNonInteractiveFlags`** from `src/cli/`. Do NOT introduce a third flag-parsing helper.
  - Functions with >2 params: `askWorkspaceSelection({ detected, isPolyglot })` is single-object-param.
  - No `any`. Return type `Promise<string[]>` (paths).
  - File cap: `questions.ts` is currently 245 lines, **already over the 200-line guideline**. **DO NOT enlarge it further** — put `askWorkspaceSelection` in a new file `src/prompt/ask-workspace-selection.ts` and re-export from `questions.ts` (mirrors the existing `ask-targets.ts` / `ask-isolation.ts` / `ask-non-interactive.ts` pattern at lines 240–244). Flag this 245-line file as a separate cleanup target in the post-implementation checklist.
  - `prompt-flow.ts` is currently 163 lines — adding the call must keep it ≤200; if not, extract a `applyWorkspaceSelection` helper.
  - Windows-aware: paths from `checkbox` choices are POSIX-style (already normalized by `expandWorkspacePatterns`).

### Task 8 — Jest fixtures and snapshot coverage [TEST]

- **Files**:
  - `tests/fixtures/monorepo-cargo/Cargo.toml` (**new**) + `tests/fixtures/monorepo-cargo/crates/foo/Cargo.toml` + `tests/fixtures/monorepo-cargo/crates/foo/src/lib.rs`.
  - `tests/fixtures/monorepo-go-work/go.work` (**new**) + `tests/fixtures/monorepo-go-work/svc/go.mod` + `tests/fixtures/monorepo-go-work/svc/main.go`.
  - `tests/fixtures/monorepo-uv/pyproject.toml` (**new**) + `tests/fixtures/monorepo-uv/packages/foo/pyproject.toml` + `tests/fixtures/monorepo-uv/packages/foo/src/__init__.py`.
  - `tests/fixtures/monorepo-dotnet-sln/solution.sln` (**new**) + `tests/fixtures/monorepo-dotnet-sln/Foo/Foo.csproj`.
  - `tests/fixtures/monorepo-cmake/CMakeLists.txt` (**new**) + `tests/fixtures/monorepo-cmake/foo/CMakeLists.txt` + `tests/fixtures/monorepo-cmake/foo/main.cpp`.
  - `tests/fixtures/monorepo-hybrid-pnpm-python-rust/` (**new** directory tree) — `pnpm-workspace.yaml` + `apps/web/package.json` + `services/api/pyproject.toml` + `crates/core/Cargo.toml` (and minimal `src/`/`lib.rs` placeholders, ≤2 lines each).
  - `tests/detector/detect-monorepo.test.ts` (edit — extend with cases for the six new tools; reuse the existing `mkdtemp` pattern at lines 60–73).
  - `tests/detector/detect-workspace-stack.test.ts` (**new**).
  - `tests/generator/generate-workspace-agents.test.ts` (**new**).
  - `tests/schema/stack-config.test.ts` (edit — add tests asserting `workspaces` defaults `[]`, `languages` defaults `[]`, `safeCommand` enforced on workspace commands).
- **Input**: PRD E12.T8 (lines 2617–2621). Existing fixtures convention from `tests/fixtures/{nextjs-app,python-fastapi,react-native-expo}/` (single manifest). Existing `tests/detector/detect-monorepo.test.ts` `mkdtemp` pattern (lines 28–73).
- **Output**:
  - Six new fixtures under `tests/fixtures/`. Total LOC < 200 across all six (PRD constraint).
  - Tests assert: workspace resolution (Task 1), per-workspace stack output (Task 2), polyglot partial rendering present (Task 4) and absent in monolingual fixtures, three existing partials' polyglot reminders gated correctly (Task 5), nested `AGENTS.md` emission with correct content (Task 6), root `## Workspaces` table contents (Task 6), `writeFileSafe` round-trip preserving hand edits (Task 6 / Epic 7), and prompt flow `--yes` keeps all + deselected workspaces produce no nested files (Task 7 — assert via direct call to the `askWorkspaceSelection`-replacing fake).
  - Satisfies acceptance bullets 1, 2, 3, 4, 5 (PRD §Epic 12 lines 2569–2573).
- **Notes**:
  - **Convention deviation flagged:** existing fixtures (`nextjs-app/`, `python-fastapi/`, `react-native-expo/`) are single-manifest directories. Five of the six new fixtures (Cargo / go.work / uv / .sln / CMake) carry a root manifest **plus** at least one nested workspace dir with its own manifest — this is a structural deviation justified by the polyglot acceptance bullet (each fixture must produce a workspace resolution against its manifest format). The hybrid fixture (`monorepo-hybrid-pnpm-python-rust/`) deviates further — three nested workspace dirs with three different manifests in one tree. State this deviation in the test file headers.
  - **DRY: reuse the `makeRoot` / `mkdtemp` helper pattern** from `tests/detector/detect-monorepo.test.ts:36-40` — copy the same shape into the new test files; if it ends up in three test files, extract to `tests/detector/test-helpers.ts` (already exists). Reuse `findFile` / `getContent` from `tests/generator/fixtures.ts:16-32` for the generator tests.
  - **DRY: reuse `makeStackConfig` and `makeDetectedStack`** from `tests/generator/fixtures.ts:51-80` — extend with `monorepo` overrides; do not duplicate setup boilerplate.
  - **Backward-compat assertions (mandatory per acceptance bullet 5):**
    - One test loads a legacy `.agents-workflows.json` fixture with `monorepo: { isRoot: true, tool: 'pnpm', workspaces: ['apps/web'] }` (legacy `string[]`) and confirms it parses without error after the schema treats `workspaces` as defaulting to `[]` (manifest is reseeded by `init`).
    - One test confirms a monolingual fixture (`tests/fixtures/nextjs-app/`) produces `languages: []` and `monorepo: null` and **no** `polyglot-monorepo.md.ejs` rendering.
    - One snapshot test confirms the three Task-5 partials are byte-identical for a monolingual config vs. their pre-Epic-12 baseline.
  - All new test files use single-object parameters where helper signatures exceed 2 params.
  - Total fixture content cap < 200 LOC.
  - File cap: each new test file ≤200 lines.

## Tags

- `[UI]` template-rendering changes (T4, T5).
- `[LOGIC]` runtime / detection / generator code (T1, T2, T6, T7).
- `[SCHEMA]` Zod schema changes (T3).
- `[TEST]` Jest fixtures + tests (T8).
- `[PARALLEL]` independent of other tasks (T4 and T5 only — disjoint file sets, both depend on T3 but not on each other).

## Dependency order

```text
T1 ──> T2 ──> T3 ──> T4 [PARALLEL with T5]
                ├──> T5 [PARALLEL with T4]
                └──> T6
       T2 ──────────> T7
T1..T7 ───────────────> T8
```

## Post-implementation checklist

- [ ] `pnpm check-types` — zero errors.
- [ ] `pnpm test` — all suites pass; new fixtures green; monolingual snapshots byte-identical.
- [ ] `pnpm lint` — zero warnings (Oxlint).
- [ ] Run `code-reviewer` and `security-reviewer` agents in **parallel** on every modified file from T1–T7 (T8 reviewed separately as test-only). Apply every critical and warning finding via `implementer`.
- [ ] Run `code-optimizer` once across all modified files.
- [ ] Run `reviewer` for the final 5-step gate (review → fix → check-types → test → lint).
- [ ] Run `/external-review` (CodeRabbit CLI default) on the full diff vs. `main`. Capture findings to `QA.md`. Run `/workflow-fix` until clean.
- [ ] DRY scan complete — confirm `runStackPipeline` (T2), `isPolyglot` (T4), `safeCommand` reuse (T3), `writeFileSafe` reuse (T6), `parseSafetyFlags` reuse (T7) — no parallel implementations introduced.
- [ ] Backward-compat verified — `.agents-workflows.json` from a JS-only monorepo (e.g. existing repo's own manifest) deserializes and re-renders without diff.
- [ ] Partial count = **43** under `src/templates/partials/` (was 42; +1 from T4; T5 edits in place).
- [ ] File-size cap audited — every modified or new file under `src/` and `tests/` ≤ 200 lines. Flagged exception: `src/prompt/questions.ts` (already 245 LOC pre-Epic; T7 must NOT add lines — extract to a sibling file).
- [ ] No `any` types introduced anywhere.
- [ ] Manual `git diff` review on the feature branch before any commit (Epic 9 / CLAUDE.md `Sub-agent deny-bypass caveat`).

## External errors

### T8 findings (test-only, no src/ changes required)

- **`writeFileSafe` round-trip preservation not directly tested** — per PLAN T8 constraint ("if it would balloon the test file, mention in External errors and keep the test file lean"), this assertion was skipped. The installer test suite already covers `writeFileSafe` behavior via `tests/installer/backup.test.ts` and `tests/generator/no-direct-fs-write.test.ts`.

- **`tests/schema/stack-config.test.ts` line count (pre-existing drift)** — file is 295 lines, already over the 200-line cap before T8 work. One new test was added (the monolingual cross-check). The drift predates Epic 12; flagged for future extraction into sub-files.

- **`tests/detector/detect-monorepo.test.ts` note** — the file uses ESM (`import.meta.url`) so `__dirname` is unavailable. Fixed by importing `dirname` + `fileURLToPath` from node built-ins (matches pattern in `tests/detector/detect-stack.test.ts:2-5`).

- **T5 partial byte-identicalness (PLAN line 232) relaxed** — per task body instructions, the "byte-identical pre-Epic-12 baseline snapshot" for `fail-safe.md.ejs`, `definition-of-done.md.ejs`, and `tool-use-discipline.md.ejs` was relaxed to a single `not.toContain(POLYGLOT_HEADING)` absence check. If stricter byte-identical baseline coverage is required later, snapshot the three partials directly in a dedicated snapshot test.

- **`inferNpmOrYarn` (`src/detector/detect-monorepo.ts:127`) is pre-Epic-12 tech debt** — always returns `'npm'`; out of scope for Epic 12.
