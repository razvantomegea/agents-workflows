# Plan - Epic 5 Advanced Agent Orchestration
_Branch: `feature/epic-5-advanced-orchestration` | Date: 2026-04-22_

## Context

Epic 5 delivers the long-horizon workflow harness, MCP / session / memory governance in
`AGENTS.md` + `CLAUDE.md`, a reusable sub-agent delegation partial for architect & reviewer,
a destructive-Bash `PreToolUse` hook in `settings-local.json`, and governance scaffolding
(PR template + `docs/GOVERNANCE.md`) wired behind a new opt-in prompt. PRD §1.8 / §1.9 /
§1.10 / §1.11 / §1.12 / §1.15 / §1.16 are the canonical sources; copy required phrases
verbatim so snapshot tests can assert them.

## Pre-implementation checklist

- [ ] Read PRD.md §1.8 (L301-332), §1.9 (L334-356), §1.10 (L405-427), §1.11 (L429-450), §1.12 (L452-480), §1.15 (L542-552), §1.16 (L554-582), Epic 5 block (L1643-1672)
- [ ] Grepped `src/templates/partials/` for existing equivalents - confirmed no `session-hygiene`, `memory-discipline`, `mcp-policy`, `subagent-delegation`, `governance`, or `long-horizon` partial exists
- [ ] Confirmed `generate-commands.ts` and `generate-root-config.ts` already own the extension points (command list + AGENTS/CLAUDE/settings render path)
- [ ] Confirmed governance opt-in requires new `StackConfig` key and prompt - noted in schema + prompt-flow updates
- [ ] Verified no type duplication - reusing `GeneratorContext`, `GeneratedFile`, and `StackConfig` shapes already in `src/generator/types.ts` and `src/schema/stack-config.ts`
- [ ] Confirmed no magic numbers - destructive-Bash patterns must be exported once from `src/generator/permissions.ts` and consumed by both deny list and PreToolUse hook

## Tasks

### Task T1 - Long-horizon workflow command [LOGIC] [SCHEMA]
**Files**
- `src/templates/commands/workflow-longhorizon.md.ejs` (new)
- `src/generator/generate-commands.ts`
- `src/schema/stack-config.ts` (add `workflowLonghorizon: z.boolean().default(false)` to `selectedCommands`)
- `src/prompt/questions.ts` (extend `askCommandSelection` choice list)
- `src/prompt/prompt-flow.ts` (map new key in both `runPromptFlow` and `createDefaultConfig`)

**Input**
- PRD §1.8 `<session_bootstrap>` block (L311-332), the `feature_list.json` JSON-over-Markdown rule, and §1.8 "do not try to finish multiple features in one session" directive.
- `GeneratorContext` fields (`mainBranch`, `commands.test`, `commands.typeCheck`, `tooling.packageManagerPrefix`).

**Output**
- New command file rendered to `.claude/commands/workflow-longhorizon.md` (and `.codex/prompts/...`) when the user opts in.
- New `selectedCommands.workflowLonghorizon` flag in `StackConfig`.
- New entry `{ key: 'workflowLonghorizon', templateFile: 'commands/workflow-longhorizon.md.ejs', outputName: 'workflow-longhorizon.md' }` in `COMMAND_DEFINITIONS`.
- Command template must contain: `<session_bootstrap>`, verbatim 11-step protocol, `feature_list.json` JSON contract block with `passes: false -> passes: true only after end-to-end verification`, `claude-progress.txt` update rule, and the three "Do not" clauses.

**Notes**
- DRY: reuse `<%- include('../partials/git-rules.md.ejs') %>` if a branch block is needed; do NOT redefine branch conventions.
- DRY: reference `mainBranch` and `commands.test` variables already exposed on the render context - never hard-code.
- File must stay <=200 lines.
- Checkbox choice label: `'/workflow-longhorizon - Multi-session long-horizon harness'`, default unchecked.

---

### Task T2 - MCP policy + session-hygiene + memory-discipline partials [LOGIC]
**Files**
- `src/templates/partials/mcp-policy.md.ejs` (new)
- `src/templates/partials/session-hygiene.md.ejs` (new)
- `src/templates/partials/memory-discipline.md.ejs` (new)
- `src/templates/config/AGENTS.md.ejs` (include all three partials after `context-budget` block)
- `src/templates/config/CLAUDE.md.ejs` (include `session-hygiene` + `memory-discipline` partials after `context-budget` block)

**Input**
- PRD §1.9 (L344-356): MCP least-privilege, per-task-scoped tokens, CLI-over-MCP, OAuth/STDIO rule, logging contract.
- PRD §1.10 (L415-427): worktrees, `/rewind`, `/fork`, "make the test suite the contract".
- PRD §1.11 (L439-450): `/clear` between tasks, `.claude/skills/*/SKILL.md` routing, `/compact`, two-strike rule.

**Output**
- Three new partial files, each <=60 lines, each starting with a level-2 heading (`## MCP policy`, `## Session hygiene`, `## Memory discipline`).
- Rendered `AGENTS.md` must contain `MCP policy`, `Session hygiene`, `Memory discipline` sections with required literals (`fine-grained PATs`, `STDIO-on-localhost`, `git worktree add`, `/rewind`, `/clear`, two-strike).
- Rendered `CLAUDE.md` must contain the `Session hygiene` + `Memory discipline` sections only (MCP is an AGENTS concern per §1.9 "Where to add").

**Notes**
- E5.T2 and E5.T3 both touch `AGENTS.md.ejs` - combined into one task so edits do not conflict; NOT `[PARALLEL]`.
- DRY: do NOT repeat the "keep this file under 200 lines" rule - it already lives in `context-budget.md.ejs`. Link by reference only.
- Snapshot-test literals to preserve: `fine-grained PATs`, `Rule of Two`, `worktree`, `/rewind`, `/fork`, `/clear`, `/compact`, `two-strike`, `NOTES.md`.

---

### Task T3 - Sub-agent delegation partial [LOGIC] [PARALLEL]
**Files**
- `src/templates/partials/subagent-delegation.md.ejs` (new)
- `src/templates/agents/architect.md.ejs` (add `<%- include('../partials/subagent-delegation.md.ejs') %>` after the `untrusted-content` include)
- `src/templates/agents/reviewer.md.ejs` (add same include after the `ai-complacency` include)

**Input**
- PRD §1.12 `<subagent_delegation>` block (L462-480): delegate criteria (>10 files, independent/parallel, isolated context), anti-criteria (<5 tool calls, sequential deps, main already has context), handoff summary 1-2k tokens, parallel-spawn requirement, five-field contract (`objective | output_format | max_tokens | allowed_tools | stop_conditions`).

**Output**
- Partial file <=50 lines wrapped in `<subagent_delegation>` XML fence with the five-field contract verbatim.
- Both `architect` and `reviewer` rendered outputs contain the `<subagent_delegation>` fence.

**Notes**
- `[PARALLEL]` w.r.t. T1, T2, T4, T5 - T3 does not share any file with them.
- DRY: do not duplicate delegation criteria in any agent body; require partial include.
- Snapshot-test literals: `>10 files`, `<5 tool calls`, `objective | output_format | max_tokens | allowed_tools | stop_conditions`, `1-2k-token distilled summary`.

---

### Task T4 - Destructive-Bash PreToolUse hook [LOGIC] [SCHEMA]
**Files**
- `src/generator/permissions.ts` (export `DESTRUCTIVE_BASH_PATTERNS` + new `buildPreToolUseHooks()` returning `readonly PreToolUseHook[]`)
- `src/generator/types.ts` (add `PreToolUseHook` interface + `preToolUseHooks: readonly PreToolUseHook[]` key on `GeneratorContext`)
- `src/generator/build-context.ts` (wire `preToolUseHooks: buildPreToolUseHooks()`)
- `src/templates/config/settings-local.json.ejs` (render `"PreToolUse"` array alongside existing `"PostToolUse"` array; only when hooks exist)
- `src/templates/config/AGENTS.md.ejs` (append a short `## Tooling / hooks` section linking to `.claude/settings.local.json`)

**Input**
- PRD §1.15 L542-552: hooks are the only way to **guarantee** a rule; `PreToolUse` on `Bash` matching destructive patterns = second layer over deny list.
- Existing deny list in `permissions.ts` (`Bash(rm -rf:*)`, `Bash(git push --force:*)`, etc.) - reuse the SAME patterns as the hook matcher source-of-truth.

**Output**
- New exported `buildPreToolUseHooks(): readonly PreToolUseHook[]` returning a single entry:
  `{ matcher: 'Bash', hooks: [{ type: 'command', command: '<guard script that exits 2 and prints a refusal when argv matches the destructive patterns>' }] }`.
- JSON render still parses under `JSON.parse`.
- Rendered `AGENTS.md` gains a short bullet list pointing to `.claude/settings.local.json` hook entries.

**Notes**
- No `any` - extend `GeneratorContext.preToolUseHooks: readonly PreToolUseHook[]`.
- DRY: destructive-pattern list MUST be derived from a single exported `DESTRUCTIVE_BASH_PATTERNS` const in `permissions.ts` and consumed by both `buildDenyList()` and `buildPreToolUseHooks()`. Do not hand-maintain two lists.
- `settings-local.json.ejs` currently only emits `PostToolUse` - extend it to also emit `PreToolUse` only when `preToolUseHooks.length > 0`, mirroring the existing conditional block exactly.
- Template length cap: <=60 lines total; split into EJS partials if it creeps past 80.

---

### Task T5 - Governance scaffolding (PR template + GOVERNANCE.md + opt-in prompt) [LOGIC] [SCHEMA] [PARALLEL]
**Files**
- `src/templates/governance/pull_request_template.md.ejs` (new)
- `src/templates/governance/GOVERNANCE.md.ejs` (new)
- `src/generator/generate-root-config.ts` (emit `.github/pull_request_template.md` + `docs/GOVERNANCE.md` when `config.governance.enabled` is true)
- `src/schema/stack-config.ts` (add `governance: z.object({ enabled: z.boolean().default(false) }).default({ enabled: false })`)
- `src/prompt/questions.ts` (new `askGovernance()` confirm prompt, default `false`)
- `src/prompt/prompt-flow.ts` (invoke `askGovernance()` in `runPromptFlow`; set `governance: { enabled: false }` in `createDefaultConfig`)

**Input**
- PRD §1.16 L554-582: PR template block (`## What / Why / How tested / Agent involvement`), label rule (`agent-authored`, `needs-human-review`), governance docs destination (`docs/GOVERNANCE.md`, `.github/pull_request_template.md`).
- Existing `generate-root-config.ts` render pattern (see `claudeMd`, `settings`, `codexConfig`, `agentsMd` calls).

**Output**
- New template files rendering the §1.16 PR template verbatim (including `Agent involvement` checklist) and a `GOVERNANCE.md` that documents: audit-log expectations, `agent-authored` / `needs-human-review` labels, `--output-format stream-json` for Codex/Claude CI, human-review-before-merge rule.
- `generateRootConfig` returns two additional `GeneratedFile` entries when `config.governance.enabled`.
- Prompt text: `'Ship governance scaffolding (.github/pull_request_template.md + docs/GOVERNANCE.md)?'` default `false`.

**Notes**
- `[PARALLEL]` w.r.t. T1, T2, T3, T4 - T5 touches schema, prompt, generator-root-config, and two new template files; no overlap with other tasks except `stack-config.ts` and `questions.ts`/`prompt-flow.ts` which T1 also edits. If T1 + T5 land in parallel, coordinate the schema edit (each adds a distinct key; conflicts are trivially mergeable but must be merged in one commit).
- DRY: do NOT restate git rules inside `GOVERNANCE.md`; link to `git-rules.md.ejs` / the rendered `AGENTS.md` Git Rules section.
- New templates live under `src/templates/governance/` to mirror §1.16 scope and keep Epic 6 SUPPLY_CHAIN colocation easy later.
- File-length cap: both EJS templates <=80 lines.
- Extend `tests/generator/fixtures.ts` `makeStackConfig` - default `governance: { enabled: false }` so existing tests keep passing (done in T8).

---

### Task T6 - Tests for T1 [TEST] [PARALLEL]
**Files**
- `tests/generator/epic-5-longhorizon.test.ts` (new)
- `tests/prompt/prompt-flow.test.ts` (extend - add coverage for `selectedCommands.workflowLonghorizon` default and opt-in branch)

**Input**
- T1 output files and EJS content.
- `makeStackConfig` fixture + `generateAll` harness (see existing `epic-4-standards.test.ts` for style).

**Output**
- New describe blocks assert: (a) file emitted at `.claude/commands/workflow-longhorizon.md` and `.codex/prompts/workflow-longhorizon.md` when targets enabled, (b) content contains `<session_bootstrap>`, `feature_list.json`, `passes: false`, `passes: true`, `claude-progress.txt`, all 11 bootstrap steps, (c) file absent when `workflowLonghorizon` flag is false, (d) prompt-flow default is `false` and opt-in flow flips it true.

**Notes**
- Route to `test-writer` subagent. Mirror existing `workflow-fix-command.test.ts` style; no new test helpers.
- File <=200 lines; one focused `describe` per invariant.

---

### Task T7 - Tests for T2, T3, T4 [TEST] [PARALLEL]
**Files**
- `tests/generator/epic-5-agents-md.test.ts` (new - covers T2 + T3 renders across AGENTS.md, CLAUDE.md, architect, reviewer)
- `tests/generator/epic-5-hooks.test.ts` (new - covers T4 `PreToolUse` JSON shape + AGENTS.md hooks mention)

**Input**
- T2/T3/T4 artefacts; `generateAll` + `makeStackConfig`.

**Output**
- `epic-5-agents-md.test.ts`: asserts literals `fine-grained PATs`, `STDIO-on-localhost`, `git worktree add`, `/rewind`, `/fork`, `/clear`, `/compact`, two-strike, and `<subagent_delegation>` fence in both architect and reviewer renders. Asserts partial length caps (`mcp-policy.md.ejs` <= 60, `session-hygiene.md.ejs` <= 50, `memory-discipline.md.ejs` <= 50, `subagent-delegation.md.ejs` <= 50).
- `epic-5-hooks.test.ts`: parses emitted `.claude/settings.local.json`, asserts `PreToolUse` array exists with a `Bash` matcher, destructive patterns (`rm -rf`, `git push --force`, `git reset --hard`) appear in the guard command, `PostToolUse` output from Epic 1 still renders intact, and `DESTRUCTIVE_BASH_PATTERNS` is single-source (import and compare against the deny list).

**Notes**
- Route to `test-writer` subagent; emulate `permissions.test.ts` for JSON-parse assertions.
- `[PARALLEL]` w.r.t. T6 and T8 - different files.

---

### Task T8 - Tests for T5 governance + fixtures wiring [TEST] [PARALLEL]
**Files**
- `tests/generator/epic-5-governance.test.ts` (new)
- `tests/prompt/prompt-flow.test.ts` (extend - assert `askGovernance()` default `false`, opt-in path sets `governance.enabled = true`)
- `tests/generator/fixtures.ts` (extend - default `governance: { enabled: false }`)

**Input**
- T5 artefacts; default and opt-in `StackConfig` variants via `makeStackConfig({ governance: { enabled: true } })`.

**Output**
- Asserts: governance opt-out -> `.github/pull_request_template.md` and `docs/GOVERNANCE.md` absent from `generateAll()` output. Opt-in -> both present with verbatim §1.16 PR template (`## What`, `## Why`, `## How tested`, `## Agent involvement`, `Agent-authored (writer model:`), and `GOVERNANCE.md` mentions `agent-authored`, `needs-human-review`, `stream-json`.

**Notes**
- Route to `test-writer` subagent. File <=200 lines.
- `[PARALLEL]` w.r.t. T6 and T7.
- DRY: do not duplicate PR-template strings in the test - read the emitted file and assert on substrings only.

## Post-implementation checklist

- [ ] `pnpm check-types` - zero errors
- [ ] `pnpm test` - all suites pass (including new `epic-5-*.test.ts` files and extended `prompt-flow.test.ts`)
- [ ] `pnpm lint` - zero warnings
- [ ] Regenerate a sample project (`pnpm dev` / `node dist/cli.js init --yes` in a scratch dir) and verify `.claude/commands/workflow-longhorizon.md`, `.claude/settings.local.json` (`PreToolUse` present), `AGENTS.md` (MCP + Session + Memory + Hooks sections), `CLAUDE.md` (Session + Memory sections), architect & reviewer agent bodies (delegation fence), `.github/pull_request_template.md` + `docs/GOVERNANCE.md` (when opted in)
- [ ] Run `code-reviewer` and `security-reviewer` agents in parallel on every modified file - all critical and warning findings fixed
- [ ] DRY scan - no duplicated destructive-pattern lists, no duplicated MCP/session/memory text across partials and config templates
- [ ] Every new EJS file <=200 lines (per CLAUDE.md)

## External errors

- Pre-existing (not introduced by Epic 5): `src/utils/template-renderer.ts` ships an `identityEscape` that makes `<%= %>` equivalent to `<%- %>` (no HTML encoding). Combined with free-text prompt fields (`localeRulesRaw`, `project.name`, `project.description`, `docsFile`, `stack.framework`, `stack.language`) that lack length caps or character allow-lists, this creates a prompt-injection path into generated agent-instruction files. Out of scope for Epic 5; flag for a future hardening epic (fits naturally under Epic 9 hardening).
- External review (CodeRabbit CLI 0.4.2, devbox/WSL): `cr review --agent --base main` and `cr review --plain --type uncommitted` both ran for ~2 min and exited 0 without emitting any finding events (only `review_context` + `connecting_to_review_service`). Per the agent contract this is "no findings", but the silent behaviour is inconclusive (service may not have responded). `QA.md` follows the no-findings template. Recommend re-running once the CodeRabbit service is known-healthy (auth verified, `curl -sSI https://api.coderabbit.ai/` returns 200) before merge.
- Pre-existing: `tests/prompt/prompt-flow.test.ts` is 330 lines (pre-existing growth pre- and post-Epic 5), exceeding the CLAUDE.md ≤200-line cap. Full refactor deferred; no Epic-5-specific duplication inside.
- Pre-existing (not introduced by Epic 5): `tests/prompt/prompt-flow.test.ts` is 330 lines, exceeding the CLAUDE.md ≤200-line cap. It was 314 lines before T6/T8 additions; T6 and T8 added coverage for `workflowLonghorizon` default/opt-in and governance defaults. Full refactor is out of scope here; flag for a future cleanup pass (split into `prompt-flow-commands.test.ts` and `prompt-flow-governance.test.ts` sub-files).
