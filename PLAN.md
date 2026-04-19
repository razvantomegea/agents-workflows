# Plan - Epic 1: Agent Safety Core Protocols
_Branch: `feature/epic-1-agent-safety-core` | Date: 2026-04-19_

## Context

Every generated agent must refuse prompt injection, stop on dirty state, block destructive ops, and respect a finite context budget. Epic 1 adds four new EJS partials (`untrusted-content`, `fail-safe`, `tool-use-discipline`, `context-budget`), wires them into the right agent/config templates per the PRD §4 diff map, hardens `.claude/settings.local.json` with a deny list and PostToolUse lint hook, adds a `## Dangerous operations` section to `AGENTS.md`, and emits a mirrored `.codex/config.toml` for Codex CLI parity.

## Pre-implementation checklist

- [ ] Grepped codebase for existing equivalents (partials, constants, helpers)
- [ ] Verified no type duplication — shared types imported, not redeclared
- [ ] Confirmed no magic strings — deny patterns live in ONE named constant

## Source-of-truth references

- PRD snippets: `PRD.md` §1.1 (lines 45-55), §1.2 (70-81), §1.3 (95-109), §1.4 (122-168), §1.5 (186-213). Diff map: lines 1196-1218; Epic 1 acceptance: lines 1266-1311.
- Existing partial pattern: `src/templates/partials/dry-rules.md.ejs`, `src/templates/partials/git-rules.md.ejs` (static markdown, no EJS locals unless needed).
- Include syntax: `<%- include('../partials/FILE.md.ejs') %>` (see `architect.md.ejs:79,83`).
- `renderTemplate` (`src/utils/template-renderer.ts`) collapses `\n{3,}` to `\n\n` and trims — spacing around includes is forgiving.
- 200-line cap enforced at `tests/generator/generate-all.test.ts:157` — any agent exceeding 200 rendered lines fails CI.

## Tasks

### Task 1 - Create `untrusted-content.md.ejs` partial [LOGIC] [PARALLEL]
**Files**: `src/templates/partials/untrusted-content.md.ejs`
**Input**: Verbatim snippet from `PRD.md` §1.5, lines 186-213 (the `<untrusted_content_protocol>` block: DATA-not-INSTRUCTIONS source list, STOP triggers, Rule of Two from Meta 2025-10-31).
**Output**: Static EJS partial wrapped with a `## Untrusted content protocol` H2 heading; no EJS locals (pure static content).
**Notes**:
- Hard cap <60 lines per PRD acceptance.
- DRY: sole source of truth for `<untrusted_content_protocol>`; do not inline bullets anywhere else.
- Do not escape angle brackets — `renderTemplate` preserves XML-style tags.
- Include the Meta Rule of Two paragraph verbatim.
- No `include(...)` inside this partial.

### Task 2 - Create `fail-safe.md.ejs` partial [LOGIC] [PARALLEL]
**Files**: `src/templates/partials/fail-safe.md.ejs`
**Input**: Verbatim `<fail_safe>` block from `PRD.md` §1.3, lines 95-109 (pwd / git status / git branch --show-current, ambiguity >10 lines rule, two-strike rule).
**Output**: Static EJS partial with a `## Fail-safe behaviors` H2 heading above the XML-tagged block.
**Notes**:
- Hard cap <40 lines.
- DRY: included by 10 of 10 agents — do not duplicate sentences elsewhere.
- No locals; no interpolation.

### Task 3 - Create `tool-use-discipline.md.ejs` partial [LOGIC] [PARALLEL]
**Files**: `src/templates/partials/tool-use-discipline.md.ejs`
**Input**: Verbatim `<tool_use_discipline>` block from `PRD.md` §1.2, lines 70-81 (search-before-act, no invented imports/paths/packages, slopsquatting clause, parallel tool calls, post-edit type-check).
**Output**: Static EJS partial with `## Tool-use discipline` H2 heading above the XML-tagged block.
**Notes**:
- Hard cap <40 lines.
- Include the phrase "parallel tool calls" verbatim — Task 5 test greps it.
- DRY: referenced by 3 agents (architect, implementer, react-ts-senior).
- No locals.

### Task 4 - Create `context-budget.md.ejs` partial [LOGIC] [PARALLEL]
**Files**: `src/templates/partials/context-budget.md.ejs`
**Input**: Verbatim context-budget block from `PRD.md` §1.1, lines 45-55 ("Treat context as a finite attention budget"; rules for file size, rg vs full reads, linking docs, NOTES.md + /clear, nested-package precedence).
**Output**: Static EJS partial with `## Context budget` H2 heading.
**Notes**:
- Hard cap <30 lines.
- DRY: wired into `AGENTS.md.ejs` and `CLAUDE.md.ejs` only.
- Preserve literal phrase "finite attention budget" (test anchor in Task 5).
- No locals.

### Task 5 - Wire partials into agent templates + root config + update generator test [LOGIC] [TEST]
**Files**:
- `src/templates/config/AGENTS.md.ejs`
- `src/templates/config/CLAUDE.md.ejs`
- `src/templates/agents/architect.md.ejs`
- `src/templates/agents/implementer.md.ejs`
- `src/templates/agents/code-reviewer.md.ejs`
- `src/templates/agents/security-reviewer.md.ejs`
- `src/templates/agents/code-optimizer.md.ejs`
- `src/templates/agents/test-writer.md.ejs`
- `src/templates/agents/e2e-tester.md.ejs`
- `src/templates/agents/reviewer.md.ejs`
- `src/templates/agents/ui-designer.md.ejs`
- `src/templates/agents/react-ts-senior.md.ejs`
- `tests/generator/generate-all.test.ts` (extend, do not replace)

**Input**: Partials produced by Tasks 1-4. Exact diff map (honor strictly — do NOT blanket-include all four everywhere):

| Template file | Partials to include |
|---|---|
| `config/AGENTS.md.ejs` | `context-budget` (Task 7 adds `## Dangerous operations` inline) |
| `config/CLAUDE.md.ejs` | `context-budget` |
| `agents/architect.md.ejs` | `tool-use-discipline` + `fail-safe` + `untrusted-content` |
| `agents/implementer.md.ejs` | `tool-use-discipline` + `fail-safe` + `untrusted-content` |
| `agents/code-reviewer.md.ejs` | `fail-safe` + `untrusted-content` |
| `agents/security-reviewer.md.ejs` | `untrusted-content` + `fail-safe` |
| `agents/code-optimizer.md.ejs` | `fail-safe` |
| `agents/test-writer.md.ejs` | `fail-safe` |
| `agents/e2e-tester.md.ejs` | `fail-safe` |
| `agents/reviewer.md.ejs` | `fail-safe` |
| `agents/ui-designer.md.ejs` | `untrusted-content` + `fail-safe` |
| `agents/react-ts-senior.md.ejs` | `tool-use-discipline` + `fail-safe` + `untrusted-content` |

**Placement rule**: Insert each include immediately after the existing `docs-reference` include and before `## When invoked` (agents), or inside the managed markers (AGENTS.md/CLAUDE.md). Pattern: `<%- include('../partials/FILE.md.ejs') %>` with blank lines above and below.

**Output**: Each agent template renders with mapped safety partials, in mapped order. `generate-all.test.ts` grows a new `describe('Epic 1 safety partials', ...)` block asserting substring anchors:
- `untrusted-content`: `'<untrusted_content_protocol>'`
- `fail-safe`: `'<fail_safe>'`
- `tool-use-discipline`: `'<tool_use_discipline>'` and `'parallel tool calls'`
- `context-budget`: `'finite attention budget'`

Plus negative assertions: partials NOT mapped to a file must NOT appear (e.g., `test-writer.md` must not contain `<tool_use_discipline>`).

**Notes**:
- 200-line cap already enforced at `generate-all.test.ts:157`. Verify rendered line counts for architect, implementer, react-ts-senior, ui-designer (multi-partial agents).
- DRY: include-only — never paste XML blocks.
- Use substring anchors (repo pattern), not Jest snapshots.
- No EJS locals in these includes.

**Depends on**: Tasks 1, 2, 3, 4.

### Task 6 - Harden `settings-local.json.ejs` deny list + PostToolUse hook [SCHEMA] [LOGIC] [TEST]
**Files**:
- `src/generator/permissions.ts` (extend; do not duplicate `buildPermissions`)
- `src/templates/config/settings-local.json.ejs`
- `tests/generator/permissions.test.ts`
- `src/generator/build-context.ts` (wire new returns through context)
- `src/generator/types.ts` (add typed fields `denyList: readonly string[]` and `postToolUseHooks: readonly PostToolUseHook[]`)

**Input**:
- Deny patterns from `PRD.md` §1.4, lines 130-140: `Bash(rm -rf:*)`, `Bash(rm -r:*)`, `Bash(git push --force:*)`, `Bash(git push -f:*)`, `Bash(git reset --hard:*)`, `Bash(git clean -fd:*)`, `Bash(git branch -D:*)`, `Bash(npm publish:*)`, `Bash(pnpm publish:*)`, `Bash(terraform apply:*)`, `Bash(kubectl apply:*)`, `Bash(kubectl delete namespace:*)`, `Edit(.env*)`, `Edit(**/*.key)`, `Edit(**/*.pem)`, `Edit(migrations/**)`.
- PostToolUse hook from §1.4, lines 142-146: `{ matcher: "Edit|Write", command: "<lint-fix-command> || true" }` — derive from `config.commands.lint`; append ` --fix` if not already present; omit hooks block entirely when `commands.lint` is null.

**Output**:
1. Module-level `UPPER_SNAKE_CASE` constant `DENY_PATTERNS` in `permissions.ts` containing the 16 patterns in declared order.
2. Exported `buildDenyList(): string[]` returning a shallow copy of `DENY_PATTERNS`.
3. Exported `buildPostToolUseHooks(input: { lintCommand: string | null }): PostToolUseHook[]` that conditionally emits the lint `--fix` hook.
4. `PostToolUseHook` interface exported from `types.ts`; imported in `permissions.ts` and `build-context.ts`.
5. `GeneratorContext` gains `denyList: readonly string[]` and `postToolUseHooks: readonly PostToolUseHook[]`.
6. `settings-local.json.ejs` rewritten to emit `permissions.allow`, `permissions.deny`, and `hooks.PostToolUse` arrays (valid JSON; omit hooks block when empty).
7. Four new `permissions.test.ts` cases:
   - `buildDenyList` returns 16 patterns in documented order.
   - `buildPostToolUseHooks` emits one hook when `lintCommand` is non-null.
   - Returns empty array when `lintCommand` is null.
   - Does not double-append `--fix`.
8. One `generate-all.test.ts` case: parses rendered `.claude/settings.local.json` and asserts `permissions.deny.includes('Bash(rm -rf:*)')`, `permissions.deny.includes('Edit(.env*)')`, `hooks.PostToolUse[0].matcher === 'Edit|Write'`.

**Notes**:
- DRY: deny list lives in ONE place. Task 8 imports from `permissions.ts`.
- Keep `permissions.ts` under 200 lines (currently 31).
- No `any`; use `PostToolUseHook` interface, `readonly` arrays.
- Functions >2 params use single object param (CLAUDE.md rule).
- Template must NOT hardcode `"npm run lint"` — derive from hook object.

**Depends on**: None structurally; land after Task 5 to minimize test churn.

### Task 7 - Add `## Dangerous operations` section to `AGENTS.md.ejs` [LOGIC] [PARALLEL]
**Files**:
- `src/templates/config/AGENTS.md.ejs`
- `tests/generator/generate-all.test.ts` (one new `it` block)

**Input**: Verbatim block from `PRD.md` §1.4, lines 152-168 (rm -rf, git push --force, DROP/TRUNCATE, kubectl/terraform non-local, npm/pnpm/cargo/pypi publish, writes outside project root, --dry-run preference, four-question pre-flight: what/where/reversibility/blast-radius).

**Output**: New `## Dangerous operations — require explicit confirmation` section inside managed markers of `AGENTS.md.ejs`, between `## Rules` and `<!-- agents-workflows:managed-end -->`. Inline bullet block as static markdown. Test asserts rendered `AGENTS.md` contains `'Dangerous operations'` and `'rm -rf'`.

**Notes**:
- Per diff map, this content is ONLY in `AGENTS.md`; agents get the fail-safe partial via Task 5.
- No EJS interpolation.
- Keep section under 25 lines to preserve 200-line budget.
- Independent of Tasks 1-6.

### Task 8 - Create `codex-config.toml.ejs` mirror + wire generator [LOGIC] [TEST]
**Files**:
- `src/templates/config/codex-config.toml.ejs` (new)
- `src/generator/generate-root-config.ts` (extend `config.targets.codexCli` branch)
- `tests/generator/generate-all.test.ts` (add codex-parity test)

**Input**:
- Deny list from `DENY_PATTERNS` in `permissions.ts` (Task 6). Pass through `GeneratorContext.denyList`.
- Codex `config.toml` schema: top-level `[permissions]` table with `deny = [...]` string array.

**Output**:
1. `codex-config.toml.ejs` renders TOML with a `[permissions]` table whose `deny` array contains the exact same 16 strings. Use same `forEach` + comma pattern as `settings-local.json.ejs`. ≤40 lines.
2. `generate-root-config.ts` emits one `GeneratedFile` with path `.codex/config.toml` when `config.targets.codexCli` is true.
3. New `generate-all.test.ts` test: `expect(paths).toContain('.codex/config.toml')` and parity — every string in Claude `permissions.deny` also appears in Codex `config.toml`.

**Notes**:
- DRY-critical: must render from `context.denyList`, not redeclare.
- `generate-root-config.ts` stays under 200 lines (currently 23).
- No TOML parser dependency — hand-render.
- No `any`.

**Depends on**: Task 6 (needs `DENY_PATTERNS` + `context.denyList`) and Task 5 (test harness).

## Post-implementation checklist

- [ ] `pnpm check-types` - zero errors
- [ ] `pnpm test` - all suites pass (incl. new Epic 1 cases)
- [ ] `pnpm lint` - zero warnings
- [ ] Every agent template renders ≤200 lines
- [ ] Run `code-reviewer` + `security-reviewer` on all modified files — critical/warning findings fixed
- [ ] DRY scan complete — `DENY_PATTERNS` defined once; safety partials referenced via include only

## External errors

<!-- Reserved for errors surfaced during execution that are caused outside Epic 1's scope. Leave empty at plan time. -->
