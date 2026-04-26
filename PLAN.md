# Plan - Epic 10 — Semi-Autonomous Non-Interactive Workflow Mode
_Branch: `feature/epic-10-non-interactive-mode` | Date: 2026-04-25_

## Context

Epic 9 hardening shipped (deny-first `.claude/settings.json`, `.codex/rules/project.rules`, Windows-native + exfil + shell-wrapper denies, sandbox block with `allowedDomains`). Epic 10 layers an **opt-in** non-interactive posture on top: when the user explicitly accepts the §1.9.1 risks via prompt or CLI flag, the generator emits Codex `approval_policy = "never"` + `network_access = true` and Claude `permissions.defaultMode = "bypassPermissions"`; otherwise the safe Epic 9 defaults (`on-request` / `default` / `network_access = false`) stay in force. `--yes` alone never enables non-interactive; the host-OS isolation choice requires a second confirmation. The deny / forbid layers and the workspace-write sandbox remain unchanged in both branches.

## Pre-implementation checklist

- [ ] Confirm Epic 9 hardening is fully landed on `main` (E9.T1–T5, E9.T10–T15) — audit `.claude/settings.json` ships `sandbox.allowedDomains`, `.codex/rules/project.rules` covers Unix + Windows + exfil + wrapper denies, and `tests/generator/epic-1-safety.test.ts` is green.
- [ ] Grep current shape of `PromptAnswers` (`src/prompt/types.ts`) and `stackConfigSchema` (`src/schema/stack-config.ts`) — neither currently has a `security` block; schema additions land first (Task 1) so all downstream tasks compile.
- [ ] Inspect `src/templates/config/codex-config.toml.ejs` (17 lines, no branching) and `src/templates/config/settings.json.ejs` (54 lines, single `"defaultMode": "default"` literal) to confirm both need conditional rewrites in Task 5.
- [ ] Inspect `src/cli/index.ts` commander registrations and `src/cli/safety-flags.ts` to confirm where to thread `--non-interactive` / `--isolation` / `--accept-risks` and where to emit the three exit-1 error messages from E10.T12.
- [ ] Inspect `src/cli/init-command.ts` (line 114 calls `runPromptFlow(detected, projectRoot, { yes: options.yes })`) and `src/cli/update-command.ts` (line 50 `nonInteractive = options.yes || options.noPrompt`) to confirm where the new flag-driven `security` value flows in.
- [ ] Inspect `src/templates/partials/subagent-caveat.md.ejs` (1-line partial) as the precedent for the new `security-disclosure.md.ejs` partial format and consumer-include style.
- [ ] Inspect `tests/generator/epic-1-safety.test.ts` for the inline-assertion snapshot pattern (no Jest snapshot files; assertions on `JSON.parse(content)` and TOML `.toContain`) so Task 8's nine cases match house style.
- [ ] Confirm root docs (`README.md`, `CLAUDE.md`, `AGENTS.md`, `QA.md`) are hand-edited; Epic 10 doc tasks (T3, T4, T6, T7, T8) update **both** the root files and the corresponding EJS templates in `src/templates/config/` so downstream consumers receive the same guidance.
- [ ] Confirm no file in the modified set crosses 200 lines after edits — flag split-out helper modules in advance (notably `src/cli/non-interactive-flags.ts` for shared validation; `src/prompt/ask-non-interactive.ts` for the disclosure prompt to keep `questions.ts` ≤200 lines).

## Tasks

### Task 1 — `StackConfig.security` schema + PromptAnswers extension [SCHEMA] [LOGIC]
**Files**
- `src/schema/stack-config.ts`
- `src/prompt/types.ts`
- `src/prompt/default-config.ts`

**Input**
- PRD lines 2152–2166 (E10.T10).
- Existing `stackConfigSchema` (no `security` block today; defaults pattern at lines 117–119 for `governance`).
- `createDefaultConfig` in `src/prompt/default-config.ts` returns the full `StackConfig`; current call sites at `src/prompt/prompt-flow.ts:45` (the `--yes` path) and `src/cli/init-command.ts:114`.

**Output**
- New top-level `security` zod object on `stackConfigSchema` with three fields, defaults exactly as PRD §E10.T10 spec:
  - `nonInteractiveMode: z.boolean().default(false)`
  - `runsIn: z.enum(['devcontainer','docker','vm','vps','clean-machine','host-os']).nullable().default(null)`
  - `disclosureAcknowledgedAt: z.string().datetime().nullable().default(null)`
- Whole-block default `{ nonInteractiveMode: false, runsIn: null, disclosureAcknowledgedAt: null }` so old manifests parse.
- `PromptAnswers` (`src/prompt/types.ts`) gains a `security: { nonInteractiveMode: boolean; runsIn: IsolationChoice | null; disclosureAcknowledgedAt: string | null }` shape with `IsolationChoice` exported as a string-literal union (DRY — Task 2 + Task 3 + Task 5 reuse this exact union).
- `createDefaultConfig` returns the safe-default `security` object so the `--yes` path (no flags) emits `nonInteractiveMode: false`.

**Notes**
- Lands FIRST — Tasks 2, 3, 4, 5 all import the new schema or the `IsolationChoice` union. Anything that compiles against the old shape breaks until this task is in.
- DRY: define `IsolationChoice` once in `src/schema/stack-config.ts` (export from there) and re-import in `src/prompt/types.ts`, `src/prompt/ask-non-interactive.ts` (Task 2), `src/cli/non-interactive-flags.ts` (Task 3). Do not redeclare the union in any other file.
- File-size watch: `stack-config.ts` is currently 129 lines — adding ~10 lines stays well under 200.
- Keep helper-free; no `any`. Use `z.infer<typeof stackConfigSchema>['security']` if a derived TS type is needed instead of redeclaring.

### Task 2 — `askNonInteractiveMode()` prompt + disclosure render [LOGIC] [UI]
**Files**
- `src/prompt/ask-non-interactive.ts` (new — keeps `questions.ts` under 200 lines)
- `src/prompt/questions.ts` (re-export only)
- `src/prompt/prompt-flow.ts` (call site)

**Input**
- PRD lines 2128–2150 (E10.T9): six-step behaviour, host-os exact-match second confirm, ISO timestamp capture.
- `IsolationChoice` from Task 1.
- `security-disclosure.md.ejs` partial body from Task 4 (rendered as plaintext for terminal output).
- `confirm` and `select` from `@inquirer/prompts` (already used in `src/prompt/questions.ts`).

**Output**
- Exported `askNonInteractiveMode(options: AskNonInteractiveOptions): Promise<SecurityAnswer>` where:
  - `AskNonInteractiveOptions` = `{ yes?: boolean; nonInteractive?: boolean; isolation?: IsolationChoice; acceptRisks?: boolean }` (single-object param — exceeds two scalars).
  - `SecurityAnswer` = the same shape as `StackConfig['security']`.
- Behaviour matches the six-step spec verbatim: `{ yes: true }` alone returns safe defaults; explicit `nonInteractive` honours the flag with isolation validation; otherwise renders disclosure → `confirm` → isolation `select` → exact-match host-os second confirm (`"yes, I accept the risks"`); accept returns `{ nonInteractiveMode: true, runsIn, disclosureAcknowledgedAt: new Date().toISOString() }`.
- `prompt-flow.ts` calls `askNonInteractiveMode({ yes: options.yes, ... })` after `askTargets` and before `askGovernance`; the returned `security` lands in the assembled `StackConfig`.
- Re-export the new function from `src/prompt/questions.ts` so existing imports (e.g. `import { askMainBranch } from '../prompt/questions.js'`) stay grouped.

**Notes**
- Depends on Task 1 (schema/types) and Task 4 (partial body). Wire the partial render via the existing EJS render util used by `src/generator/` (read template, render with `{}` context, strip leading `#` heading lines for terminal display); document the helper in this task so Task 5 reuses the same render call.
- DRY: the exact-match string `"yes, I accept the risks"` and the host-os warning text appear in BOTH this prompt AND the `security-disclosure.md.ejs` partial (Task 4). Define the constant once in `src/prompt/ask-non-interactive.ts` as `HOST_OS_ACCEPT_PHRASE` and import it from `src/cli/non-interactive-flags.ts` (Task 3) so error messages stay in lockstep.
- `prompt-flow.ts` is currently 142 lines — adding ~6 lines for the call + assembly stays under 200. Do NOT inline the prompt logic there.
- File-size watch: target `ask-non-interactive.ts` ≤120 lines.
- No `any`; explicit return + param types throughout.

### Task 3 — CLI flag wiring on `init` and `update` [API] [LOGIC]
**Files**
- `src/cli/non-interactive-flags.ts` (new — single source of truth for parse + validate)
- `src/cli/index.ts` (commander registrations on both `init` and `update`)
- `src/cli/init-command.ts` (`InitCommandOptions` + thread to `runPromptFlow`)
- `src/cli/update-command.ts` (`UpdateCommandOptions` only; behaviour wiring is Task 6)

**Input**
- PRD lines 2193–2205 (E10.T12): three flags, three exact error messages, exit code 1 on violation.
- Existing `parseSafetyFlags` in `src/cli/safety-flags.ts` as the precedent for typed parse + `SafetyFlagsError`.
- Commander `addOption(new Option(...).choices([...]))` pattern already used at `src/cli/index.ts:26`.

**Output**
- `parseNonInteractiveFlags({ nonInteractive, isolation, acceptRisks }): NonInteractiveFlags` returning either `{ enabled: false }` or `{ enabled: true, isolation: IsolationChoice, acceptedHostOsRisk: boolean }`. Throws a new `NonInteractiveFlagsError` (subclass of `Error`, mirrors `SafetyFlagsError`) with the three PRD-mandated messages:
  - `--non-interactive requires --isolation=<env>`
  - `--non-interactive --isolation=host-os requires --accept-risks (see PRD §1.9.1)`
  - `--no-non-interactive` always wins (forces `enabled: false`).
- `handleSafetyErrors` in `src/cli/safety-flags.ts` extended (or a sibling helper added) to also catch `NonInteractiveFlagsError` and exit 1 with the message — DRY the exit handling.
- `commander` wiring on BOTH `init` and `update` subcommands:
  - `--non-interactive` / `--no-non-interactive` (commander `--no-` negation pair).
  - `--isolation <env>` with `.choices([...IsolationChoice values...])`.
  - `--accept-risks`.
- `InitCommandOptions` and `UpdateCommandOptions` extended with `nonInteractive?: boolean`, `isolation?: IsolationChoice`, `acceptRisks?: boolean`. `init-command.ts` passes them through to `runPromptFlow` → `askNonInteractiveMode` (Task 2).

**Notes**
- Depends on Task 1 (`IsolationChoice`) and Task 2 (the prompt that consumes the flags). Lands after both.
- DRY: `parseNonInteractiveFlags` is the SINGLE validator; both `init` and `update` call it. Do NOT duplicate validation in `update-command.ts` — that is Task 6's responsibility consuming the same helper.
- DRY: reuse `HOST_OS_ACCEPT_PHRASE` constant from Task 2 inside the host-os error message wording so both surfaces speak the same phrase.
- `index.ts` is currently 92 lines — six `.option()` additions across two subcommands brings it to ~110, still under 200.
- File-size watch: target `non-interactive-flags.ts` ≤80 lines.
- No `any`; every commander action callback uses an explicit interface, not `Record<string, unknown>`.

### Task 4 — Security-disclosure EJS partial [SCHEMA] [DOCS] [PARALLEL with Task 1]
**Files**
- `src/templates/partials/security-disclosure.md.ejs` (new)

**Input**
- PRD lines 2217–2237 (E10.T14): five risk items with citations, three consumers (terminal render, embedded comment header, generated docs), recommendation block, host-os warning paragraph.
- `src/templates/partials/subagent-caveat.md.ejs` as the formatting/style precedent.

**Output**
- New EJS partial rendering canonical Markdown with these sections in this exact order:
  1. **What non-interactive mode does.**
  2. **What it does NOT relax.**
  3. **Known risks (5 items, cite PRD §1.9.1)** — one paragraph each for sub-agent deny-bypass, Windows sandbox, PowerShell wrappers, `bypassPermissions` unreliability, network exfiltration.
  4. **Recommendation** — list devcontainer / docker / VM / clean-machine isolation options.
  5. **If you run on your primary OS** — enumerate readable paths (`~/.ssh/*`, `~/.aws/credentials`, `~/.config/gh/hosts.yml`, browser cookie stores, Windows `%APPDATA%`).
  6. **Manual review is still required.** sentence about `git diff`.
- Renders cleanly as terminal plaintext (Task 2 consumer) AND as Markdown embedded inside `CLAUDE.md` / `AGENTS.md` (Task 7 consumer) AND as a short-form header comment for `.codex/config.toml` / `.claude/settings.json` (Task 5 consumer — the comment lines reuse a `<%# %>`-stripped subset).
- Optional `condense: boolean` EJS context flag for the short-form header comment variant — when `true`, only the "Known risks" titles render (no body), keeping the in-config comment block to ≤8 lines.
- Single source of truth — no parallel copy of the disclosure text lives anywhere else in the repo (DRY).

**Notes**
- PARALLEL with Task 1 (no shared files). Lands before Task 2 (prompt renders it) and Task 5 (templates embed it).
- DRY: this partial is the ONLY copy of the §1.9.1 disclosure language; if the partial changes, all three consumers update simultaneously. Tasks 2, 5, and 7 must NOT inline duplicate text.
- File-size watch: target ≤180 lines (most content is short bullets; well under 200).
- No JSX/HTML; use plain Markdown so terminal rendering preserves structure.

### Task 5 — Template branching for `.codex/config.toml` and `.claude/settings.json` [SCHEMA] [LOGIC]
**Files**
- `src/templates/config/codex-config.toml.ejs`
- `src/templates/config/settings.json.ejs`
- `src/generator/build-context.ts` (thread `security` into template context + add a condensed disclosure comment block)
- `src/generator/types.ts` (extend `GeneratorContext` with `security`)

**Input**
- PRD lines 2167–2191 (E10.T11): exact TOML/JSON shape per branch + self-documenting comment block when non-interactive.
- Current `codex-config.toml.ejs` (lines 1–17) emits flat safe-default TOML with no branching.
- Current `settings.json.ejs` (lines 1–54) hard-codes `"defaultMode": "default"` at line 3.
- `buildContext` in `src/generator/build-context.ts` (line 26) — needs to pass `security` and a pre-rendered short-form disclosure comment block to the templates.

**Output**
- `codex-config.toml.ejs` rewritten with `<% if (security.nonInteractiveMode) { %>` / `<% } else { %>` branches:
  - Non-interactive branch: leading comment block `# Non-interactive mode enabled (runsIn=<%= security.runsIn %>, acknowledged=<%= security.disclosureAcknowledgedAt %>).` + `# See PRD §1.9.1 ...` (5 short risk titles from the condensed partial) + `approval_policy = "never"`, `sandbox_mode = "workspace-write"`, `[sandbox_workspace_write]`, `network_access = true`.
  - Safe branch: existing comment + `approval_policy = "on-request"` + `network_access = false` (preserves current Epic 9 behaviour byte-for-byte when `nonInteractiveMode === false`).
- `settings.json.ejs` line 3 changes from `"defaultMode": "default"` to `"defaultMode": <%- jsonString(security.nonInteractiveMode ? 'bypassPermissions' : 'default') %>`. The `sandbox` block (lines 15–22) emits unconditionally — no change.
- `buildContext` extended:
  - Add `security: config.security` passthrough to the returned context.
  - Add `disclosureCommentLines: string[]` — a pre-rendered short-form comment-stripped version of `security-disclosure.md.ejs` for the TOML header (Task 4 partial called with `condense: true`). Empty array when `nonInteractiveMode === false`.
  - Add `security` and `disclosureCommentLines` to `GeneratorContext` interface in `src/generator/types.ts`.

**Notes**
- Depends on Task 1 (schema) and Task 4 (partial). Lands after both.
- DRY: the short-form comment lines come from the SAME partial as the long-form prompt render (Task 2) and the docs embed (Task 7) — three consumers, one source of truth.
- File-size watch: `codex-config.toml.ejs` grows from 17 → ~40 lines (well under 200); `settings.json.ejs` grows from 54 → ~56 lines; `build-context.ts` grows from 105 → ~115 lines.
- No `any`; `GeneratorContext` additions are explicit `StackConfig['security']` and `readonly string[]`.
- Verify the emitted TOML still parses with a TOML parser in Task 8 (case 7 + 8) and the emitted JSON still parses with `JSON.parse` (case 9).

### Task 6 — `update` round-trip for `security` (preserve / re-disclose / flag-override) [LOGIC]
**Files**
- `src/cli/update-command.ts`
- `src/cli/resolve-security-update.ts` (new helper if `update-command.ts` would exceed ~180 lines)

**Input**
- PRD lines 2207–2215 (E10.T13): four behaviour branches (currently-on + interactive, currently-off + interactive, `--yes` preserve verbatim, explicit flags honour with validation).
- `parseNonInteractiveFlags` from Task 3.
- `askNonInteractiveMode` from Task 2.
- Existing `update-command.ts` line 50 (`nonInteractive = options.yes || options.noPrompt`) and line 52 (manifest spread into `config`).

**Output**
- After `parsed.data.config` lands but before `generateAll(config)`, branch on the resolved security state:
  - If `options.nonInteractive` / `options.isolation` / `options.acceptRisks` are explicitly set: call `parseNonInteractiveFlags` (Task 3) and use its result; if it says enabled, call `askNonInteractiveMode({ nonInteractive: true, isolation, acceptRisks })` to fill in `disclosureAcknowledgedAt`; if it says disabled, force `security: { nonInteractiveMode: false, runsIn: null, disclosureAcknowledgedAt: null }`.
  - Else if `options.yes` or `options.noPrompt`: preserve `parsed.data.config.security` verbatim — no implicit changes.
  - Else if `parsed.data.config.security.nonInteractiveMode === true`: print one-line reminder (`Non-interactive mode is enabled for this project (runsIn=<runsIn>, acknowledged=<ISO>). See PRD §1.9.1.`) and `confirm({ message: 'Keep non-interactive mode enabled?', default: true })`. On decline, flip to safe defaults.
  - Else (currently off): `confirm({ message: 'Enable non-interactive mode? (advanced — see security disclosure)', default: false })`. On accept, run the full E10.T9 disclosure flow via `askNonInteractiveMode({})`.
- The resolved `security` block lands in the `config` variable that flows into `generateAll` and the persisted manifest.

**Notes**
- Depends on Tasks 1, 2, 3. Lands after all three.
- DRY: re-uses `askNonInteractiveMode` (Task 2) and `parseNonInteractiveFlags` (Task 3) — no parallel implementation. Only the branching control flow lives in `update-command.ts` (or its extracted helper).
- File-size watch: `update-command.ts` is 131 lines — branching block adds ~30 lines, total ~160. If it crosses 180, extract the branching into `src/cli/resolve-security-update.ts` (`resolveSecurityForUpdate({ existing, options }): Promise<StackConfig['security']>`) and call from `update-command.ts`. Plan for the helper-extraction up front; do not inline >50 lines here.
- No `any`; the `security` resolution function returns `StackConfig['security']` explicitly.

### Task 7 — Docs: invocation, rule-order, isolation, multi-tool guidance [DOCS]
**Files**
- `README.md` (root, hand-edited)
- `CLAUDE.md` (root, hand-edited)
- `AGENTS.md` (root, hand-edited)
- `QA.md` (root, hand-edited — currently empty)
- `src/templates/config/AGENTS.md.ejs`
- `src/templates/config/CLAUDE.md.ejs`

**Input**
- PRD E10.T3 (lines 2069–2077): one-line + logged Claude/Codex invocations, "`--full-auto` != `approval_policy = \"never\"`" note, no dangerous-bypass-flag examples.
- PRD E10.T4 (lines 2079–2086): three-step guard order, "non-interactive" ≠ "unsandboxed", developer-assisted scope, manual `git diff` review, Windows §1.9.1 caveat with isolation-selector pointer.
- PRD E10.T6 (lines 2101–2109): `cursor-agent --prompt "..."` invocation, Background Agents server-side parity, `.cursor/rules/00-deny-destructive-ops.mdc` precondition, `--yolo` forbidden.
- PRD E10.T7 (lines 2110–2118): VSCode Agent mode + `chat.agent.enabled`, Copilot coding agent + branch-protection backstop, `tools:` frontmatter is the ceiling, no auto-approve setting.
- PRD E10.T8 (lines 2119–2127): Cascade Manual/Auto/Yolo modes, Auto = repo-recommended non-interactive, Yolo forbidden, `.windsurf/rules/00-forbidden-commands.md` precondition.
- PRD E10.T5 (lines 2087–2099): smoke-test protocol entries (baseline denial, sandbox rejection, wget-pipe-to-shell, SSH keypair write, PowerShell wrapper, iwr exfil, sub-agent residual, nominal flow, logging) — all into `QA.md`.
- Embed `security-disclosure.md.ejs` (Task 4) into the "Semi-autonomous" section of the EJS `CLAUDE.md` and `AGENTS.md` templates ONLY when `security.nonInteractiveMode === true` (gate via `<% if (security.nonInteractiveMode) { %>`).

**Output**
- `README.md` gains a "Semi-autonomous non-interactive mode" subsection under existing Workflow patterns: canonical one-liners, logged variants, the `--full-auto != approval_policy = "never"` clarifier, the rule-order paragraph, the four-line per-tool table (Claude / Codex / Cursor / Copilot / Windsurf with their headless invocation + the deny-list precondition for each).
- `CLAUDE.md`, `AGENTS.md` (root) gain a short paragraph under the existing safety section describing the three-stage guard order, the developer-assisted-feature-branch scope, and the Windows §1.9.1 caveat (link, do not duplicate the disclosure body).
- `QA.md` (currently empty) gains the full E10.T5 smoke checklist + a pointer to `tests/security/smoke.test.ts` (E9.T15) for the automatable subset and a "residual cases (expected to fail today)" section for the sub-agent bypass entry.
- `src/templates/config/CLAUDE.md.ejs` and `src/templates/config/AGENTS.md.ejs` gain a `<% if (security.nonInteractiveMode) { %><%- include('../partials/security-disclosure.md.ejs') %><% } %>` block in the Semi-autonomous section so generated docs cite the disclosure inline when the user opted in.
- All examples use ONLY the safe invocations (`claude -p`, `codex exec`, `cursor-agent --prompt`, `/workflow-plan` from VSCode chat, Cascade Auto). No `--dangerously-skip-permissions`, `--dangerously-bypass-approvals-and-sandbox`, `--yolo`, or `sandbox_mode = "danger-full-access"` appears in any of these files.

**Notes**
- Groups E10.T3 + T4 + T6 + T7 + T8 (5 doc-shaped tasks) into one logical unit per the orchestrator's "max 8 tasks" cap and the prompt's grouping guidance.
- Depends on Task 4 (partial body to embed) and Task 5 (template context now exposes `security`).
- DRY: every per-tool invocation appears ONCE in the README table; `CLAUDE.md` / `AGENTS.md` link to README's Semi-autonomous subsection rather than repeat the table. The §1.9.1 disclosure body lives only in the partial (Task 4).
- File-size watch: `README.md` 323 → ~370 lines (no cap; reference doc). `CLAUDE.md` 130 → ~145 lines (under the 200 cap from `CLAUDE.md` itself). `AGENTS.md` 247 → ~262 lines (already over 200 — flag the existing overrun in the Notes; do not refactor in this epic, but record the violation in the post-implementation checklist as a follow-up). `AGENTS.md.ejs` 208 → ~223 lines (already over 200 in template — same flag).
- Cursor / Copilot / Windsurf doc additions are PROSE only — no new template files (E11 owns the actual `.cursor/rules` / `.github/prompts` / `.windsurf/rules` emission pipeline). Document the per-tool prerequisites and reference the Epic 9 deny-rule files; do not generate them here.

### Task 8 — Tests: `tests/generator/epic-10-non-interactive.test.ts` [TEST]
**Files**
- `tests/generator/epic-10-non-interactive.test.ts` (new)
- `tests/generator/fixtures.ts` (extend with `makeStackConfigNonInteractive` helper)

**Input**
- PRD lines 2240–2252 (E10.T15): nine cases enumerated.
- Existing test patterns in `tests/generator/epic-1-safety.test.ts` (inline `JSON.parse` + `.toContain` on TOML — no Jest snapshot files).
- `runPromptFlow` from `src/prompt/index.ts`, `parseNonInteractiveFlags` from Task 3, `generateAll` from `src/generator/index.ts`, `manifestSchema` from `src/schema/manifest.ts`.

**Output**
- Nine `it()` cases mapped 1-to-1 with PRD spec:
  1. `runPromptFlow(detected, root, { yes: true })` returns `security.nonInteractiveMode === false`, `runsIn === null`, `disclosureAcknowledgedAt === null`.
  2. `parseNonInteractiveFlags({ nonInteractive: true, isolation: 'docker', acceptRisks: false })` then a `runPromptFlow` (or direct `askNonInteractiveMode`) produces `security.nonInteractiveMode === true`, `runsIn === 'docker'`, `disclosureAcknowledgedAt` is a parseable ISO-8601 string within the last 5 seconds.
  3. `parseNonInteractiveFlags({ nonInteractive: true, isolation: 'host-os' })` (no `acceptRisks`) THROWS `NonInteractiveFlagsError` with the exact PRD-mandated message.
  4. `parseNonInteractiveFlags({ nonInteractive: true })` (no isolation) THROWS the exact PRD-mandated message.
  5. Manifest round-trip enabled: build a `StackConfig` with `security.nonInteractiveMode === true` + `runsIn === 'vm'`, persist via `manifestSchema.parse`, run an `update --yes`-equivalent code path, assert every `security` field byte-for-byte preserved.
  6. Manifest round-trip legacy: parse a manifest JSON literal with NO `security` key (simulating an old install), assert `manifestSchema.safeParse` succeeds with `security.nonInteractiveMode === false` defaults and the result re-serializes cleanly.
  7. Snapshot non-interactive `.codex/config.toml`: build `security.nonInteractiveMode === true` config, run `generateAll`, find `.codex/config.toml`, assert `.toContain('approval_policy = "never"')`, `.toContain('network_access = true')`, `.toContain('runsIn=')`, `.toContain('acknowledged=')`, `.toContain('PRD §1.9.1')`.
  8. Snapshot safe-default `.codex/config.toml`: same but `security.nonInteractiveMode === false`, assert `.toContain('approval_policy = "on-request"')`, `.toContain('network_access = false')`, and `.not.toContain('runsIn=')` and `.not.toContain('approval_policy = "never"')`.
  9. Snapshot `.claude/settings.json` both branches: parse with `JSON.parse`, assert `permissions.defaultMode === 'bypassPermissions'` for the non-interactive branch and `'default'` for the safe branch; assert `sandbox.mode === 'workspace-write'` and `sandbox.allowedDomains.length > 0` in BOTH branches.
- Reuse `makeStackConfig` fixture from `tests/generator/fixtures.ts` and extend it (or add a sibling `makeStackConfigNonInteractive(overrides?)`) so the new tests stay declarative.

**Notes**
- Lands LAST. Depends on every prior task.
- DRY: do not duplicate the makeStackConfig fixture — extend it. If multiple tests need the non-interactive variant, factor `makeStackConfigNonInteractive(overrides)` into `tests/generator/fixtures.ts` so future epics reuse it.
- File-size watch: target ≤200 lines for the new test file. If it exceeds, split the snapshot cases (7–9) into `epic-10-templates.test.ts` and keep flag/round-trip logic in `epic-10-non-interactive.test.ts`.
- Do NOT regress `tests/generator/epic-1-safety.test.ts` line 152 (`approval_policy = "on-request"`) — the safe-default branch must still emit it byte-for-byte. Run the full Jest suite as part of post-implementation checklist.
- Mock `@inquirer/prompts` for cases 1–4 (the prompt-driven cases); use real `parseNonInteractiveFlags` (no mocking — it is pure) for the validation throws.
- No `any`; explicit interface for the manifest fixture and the parsed JSON / TOML shapes.

## Post-implementation checklist

- [ ] `pnpm check-types` — zero errors (especially after schema additions in Task 1).
- [ ] `pnpm test` — all suites pass; the new `tests/generator/epic-10-non-interactive.test.ts` is green; `tests/generator/epic-1-safety.test.ts` and every other Epic 1–9 suite still green (no regression on safe defaults).
- [ ] `pnpm lint` — zero warnings.
- [ ] Manual: run `pnpm dev init --yes -d /tmp/fixture-default` on a fresh fixture, confirm `.agents-workflows.json` has `"security":{"nonInteractiveMode":false,"runsIn":null,"disclosureAcknowledgedAt":null}`, `.codex/config.toml` contains `approval_policy = "on-request"`, `.claude/settings.json` contains `"defaultMode":"default"`.
- [ ] Manual: run `pnpm dev init --non-interactive --isolation=docker -d /tmp/fixture-noninteractive`, confirm `security.nonInteractiveMode === true` + `runsIn === 'docker'` + ISO timestamp in manifest, `.codex/config.toml` contains `approval_policy = "never"` + `network_access = true` + the `runsIn=docker, acknowledged=...` comment block, `.claude/settings.json` contains `"defaultMode":"bypassPermissions"`.
- [ ] Manual: run `pnpm dev init --non-interactive --isolation=host-os` (no `--accept-risks`) and confirm exit code 1 + the exact PRD error message.
- [ ] Manual: run `pnpm dev update --yes` on the non-interactive fixture and confirm the manifest's `security` block is preserved byte-for-byte.
- [ ] Run `code-reviewer` agent on all modified files — fix every critical and warning finding.
- [ ] Run `security-reviewer` agent (parallel) on all modified files — confirm the Epic 9 deny-list / forbid-list still enforced in the non-interactive branch; flag any path where the new branch silently drops a guard.
- [ ] DRY scan: confirm `IsolationChoice` is declared exactly once (Task 1), the `HOST_OS_ACCEPT_PHRASE` constant exactly once (Task 2), and the `security-disclosure.md.ejs` partial body has no parallel copy in any other file.
- [ ] Pre-existing file-size violations noted but NOT remediated in this epic: `AGENTS.md` (root, 243 lines) and `src/templates/config/AGENTS.md.ejs` (205 lines). Open a follow-up issue rather than refactoring inside this branch.

## External errors

- **Pre-existing file-size overage (not remediated in Epic 10):** `AGENTS.md` (root) is 247 lines and `src/templates/config/AGENTS.md.ejs` is 208 lines, both exceeding the project's 200-line cap. Both files were already over the cap before Epic 10 began (per the PLAN's pre-implementation notes). Epic 10 added ~3–8 net lines to each (for the semi-autonomous paragraph and the conditional disclosure include). Refactoring these files is out of scope for Epic 10 and should be tracked as a follow-up cleanup.
- **PRD §E10.T11 spec gap (acknowledged, not fixable in code):** The PRD asks for a self-documenting `runsIn` + `acknowledged` comment block in BOTH `.codex/config.toml` and `.claude/settings.json` when non-interactive mode is enabled. JSON does not support inline comments natively, so `settings.json` only emits the `defaultMode` value change; the comment block lands only in the TOML emit. Documented in `README.md`'s Semi-autonomous subsection and the rendered `CLAUDE.md` / `AGENTS.md` disclosure embed.
