# QA Review

## CodeRabbit Review - 2026-04-24

> **Warning**: These findings come from an automated tool (CodeRabbit) and may be inaccurate or
> based on incomplete context. Before applying any fix, verify the observation against the actual
> code. Skip findings that are wrong or do not apply.

### src/templates/config/codex-config.toml.ejs
- [x] [critical] `approval_policy = "on-failure"` IS deprecated — CodeRabbit was correct. Current Codex CLI accepts only `untrusted`, `on-request`, `never`, `granular`. Switched to `on-request`. PRD mismatch logged under External errors in PLAN.md.

### README.md
- [x] [minor] Line 14 — replaced `.claude/settings.local.json` with `.claude/settings.json`.
- [x] [minor] Line 231 — replaced `settings-local.json.ejs` with `settings.json.ejs`, added `codex-project-rules.ejs`.

### src/templates/config/codex-project-rules.ejs
- [x] [minor] Added `"pull"` to the local-git allow rule (also regenerated in `.codex/rules/project.rules`).
- [x] [minor] Added `"yarn"` to the publish deny rule (also regenerated in `.codex/rules/project.rules`).
- [x] [major] Added an inline comment in the template and the regenerated `.codex/rules/project.rules` explaining why plain `curl`/`wget` remain allowed (PRD E9.T11 non-goal).

### .gitignore
- [x] [minor] **Skipped** — CodeRabbit's suggested blanket `.codex/` ignore would break existing tracked files (`.codex/skills/`, `.codex/prompts/`, `.codex/scripts/`). Current negations are correct; no broad ignore exists to negate against.

### AGENTS.md
- [x] [minor] Hand-edited `AGENTS.md` to reference `.claude/settings.json` + per-developer override note. Template was already fixed earlier in the epic.


## External errors / open items

  1. PRD drift: PRD specifies approval_policy = "on-failure" but current Codex CLI deprecated that value — implementation uses "on-request". PRD
   text needs updating across Epic 9/Epic 10 references.
  2. E9.T6 / T7 / T8 not shipped: Cursor / Copilot / Windsurf emission plumbing does not exist in src/generator/ yet. Recorded in PLAN External 
  errors; belongs to the epic that introduces multi-tool config emission.
  3. User-deferred action: run git rm --cached .claude/settings.local.json before committing so the now-gitignored per-developer cache is       
  untracked. Not automated by this epic.

  Verify each finding against the current code and only fix it if needed.

Inline comments:
In @.claude/settings.json:
- [x] Around line 72-77: The PreToolUse guard is out-of-sync with the deny list
array (the entries like "Bash(Invoke-WebRequest:*)", "Bash(iwr:*)",
"Bash(Invoke-RestMethod:*)", "Bash(irm:*)", "Bash(curl.exe:*)",
"Bash(wget.exe:*)"), so extract the shared pattern source used for the deny list
into a single reusable value and derive the PreToolUse regex from that same
source (remove duplication and construct the guard dynamically from the
deny-list patterns), updating the PreToolUse guard generation code so it uses
the shared pattern instead of a hard-coded regex; apply the same refactor for
the other guard block referenced around the second instance (lines ~93-99) so
both guards are driven from the same source.

In @.codex/rules/project.rules:
- [x] Around line 116-128: The current prefix_rule entries (prefix_rule with pattern
=
[["node","npm","npx","pnpm","yarn","tsc","tsx","vitest","jest","eslint","prettier"]]
and the Python one pattern = [["python","python3","pip"]]) create unsafe "escape
hatches" by allowing arbitrary interpreter/package-runner subcommands; replace
these blanket prefix_rule entries with explicit, exact-match rules that only
permit approved top-level scripts/subcommands (e.g., specific npm scripts, pnpm
dlx targets, tsc/ts node CLI invocations the repo authorizes) or use prefix_rule
only for a vetted small set of safe subcommands, and remove the raw
interpreter/package names as unconditional prefixes. Locate and update the two
prefix_rule blocks named above to enforce exact command patterns instead of
allowing the raw interpreters/package runners.

In `@AGENTS.md`:
- [x] Around line 26-34: The AGENTS.md managed section exceeds the 200-line context
budget; trim its deployment/tooling material into a separate doc and replace
that content with short links and a 1–2 sentence summary so AGENTS.md stays
concise (<200 lines). Locate the long "deployment/tooling" content in AGENTS.md,
extract it into a new adjacent doc (e.g., AGENTS-DEPLOYMENT.md or TOOLING.md),
add a brief pointer line in AGENTS.md linking to the new doc, keep the "Context
budget" bullets and NOTES.md-/clear guidance intact, and verify the final
AGENTS.md length is under 200 lines.
- [x] Around line 52-54: The document contains two conflicting rules — the “Commit
early and often with descriptive messages — `git revert` is the agent's real
undo button.” rule and the later “never commit or push unless the user
explicitly asks” guidance — causing ambiguity; replace both occurrences with a
single consistent rule that unambiguously states “Never commit or push unless
the user explicitly asks,” remove the “Commit early and often…” sentence, and
update any related wording to match this single directive so both the earlier
and later sections use the exact same prohibition.

In `@PLAN.md`:
- [x] Around line 23-64: PLAN.md uses non-standard task tags like [TEMPLATE] and
[DOC], which breaks the repo's plan contract; update each Task header (e.g.,
"Task 2 - Shared `.claude/settings.json`...", "Task 3 - Codex config...",
through Task 8) in PLAN.md to use only the repo-standard tags [UI] [LOGIC] [API]
[SCHEMA] [TEST] and ensure each task still names exact file paths and required
outputs; keep the original task text and file lists intact but replace every
occurrence of non-standard tags (e.g., [TEMPLATE], [DOC], [PARALLEL]) with the
appropriate combination of the allowed tags and verify Task 2..Task 8 headers
and notes render the exact file paths and schema/behavior requirements.

In `@PRD.md`:
- [x] Around line 1778-1779: The PRD still contains contradictory values for Epic
9's approval policy: update every remaining occurrence of approval_policy =
"on-failure" in the Epic 9 section (references to
feature/epic-9-permission-sandbox-hardening, E9.T1–T5, E9.T6–T8, acceptance
criteria and task details) to approval_policy = "on-request" so the document is
consistent; search for the literal string approval_policy = "on-failure" within
the Epic 9 block and replace it, adjust surrounding wording if needed to match
the already-updated note, and verify the acceptance criteria and task
descriptions no longer conflict.

In `@QA.md`:
- [x] Line 28: The line "External errors / open items" is missing a Markdown heading
marker; update that line to be a proper heading (e.g., prepend "## ") so it
renders consistently as a section header in QA.md and matches other headings in
the document.

In `@README.md`:
- [x] Around line 173-180: The README's "What gets written" and generated-workspace
inventory tables omit the new Codex policy files; update the Codex row(s) to
include `.codex/config.toml` in the output paths list and add
`.codex/rules/project.rules` to the generated-workspace inventory entries (the
same sections around the existing Codex entries like `.codex/skills/*/SKILL.md`
and `.codex/prompts/*.md`), ensuring both filenames are added consistently
wherever Codex outputs are enumerated (also mirror the change in the parallel
block at lines referenced as 253-264).

In `@src/generator/permission-constants.ts`:
- [x] Around line 120-127: TOOLCHAIN_ALLOWS currently contains broad entries
('Bash(node:*)' and 'Bash(npx:*)') that reopen a policy escape hatch; remove
those wildcard interpreter/package-runner entries from permission-constants.ts
and replace them with explicit, repo-approved command entrypoints (e.g., the
exact scripts or binaries you want allowed) so generated allowlists from
permissions.ts only auto-approve known safe commands rather than raw
interpreters; update TOOLCHAIN_ALLOWS to list those explicit entrypoint strings
and adjust any tests or generation code in permissions.ts that assume node/npx
wildcards.

In `@src/generator/permissions.ts`:
- [x] Around line 53-61: The loop that appends toolchain entries from
TOOLCHAIN_ALLOWS may add high-risk wildcard commands like Bash(node:*) and
Bash(npx:*), weakening deny-first hardening; update the loop in permissions.ts
(the block iterating TOOLCHAIN_ALLOWS and using isCoveredByGlob, match, command,
perms, prefix) to explicitly skip commands equal to "node" or "npx" (and any
other agreed high-risk tool names) before pushing to perms so wildcard
allowances for those runtimes are not granted while leaving other allowed
toolchain entries unchanged.

In `@src/templates/config/codex-project-rules.ejs`:
- [x] Around line 102-111: The first prefix_rule's pattern currently lists "pwsh"
and "powershell" but not their .exe forms, leaving "pwsh.exe" and
"powershell.exe" able to bypass the rule; update the first prefix_rule (the one
with decision="forbidden" and justification about opaque script-body) so the
command-name array includes the executable variants (e.g., add "pwsh.exe" and
"powershell.exe" alongside "pwsh" and "powershell") so both bare and .exe
launchers are matched; keep the rest of the pattern structure (the second array
with "-Command", "-c", "-EncodedCommand") unchanged.

In `@tests/generator/codex-project-rules.test.ts`:
- [x] Around line 78-112: Change the tests to assert the full rule shape (the
surrounding pattern = ... plus decision = "forbidden"/"allow") instead of raw
token presence; for each token array (E9_T10_TOKENS, E9_T11_TOKENS,
E9_T12_TOKENS, E9_T3_GIT_TOKENS, E9_T3_INFRA_TOKENS, ALLOW_TOKENS) update the
it.each blocks to build and assert a regex or string that includes the pattern
assignment and the corresponding decision (e.g., match "pattern = ...<token>..."
together with 'decision = "forbidden"' for forbid lists and 'decision = "allow"'
for allow lists), referencing the existing test variable content and the token
parameter so the test verifies the rule structure (pattern + decision) rather
than just token presence.

In `@tests/security/smoke.test.ts`:
- [x] Around line 17-22: The test currently loads codexRules from the template and
builds denyList from in-memory constants (codexRules, denyList,
guardAlternation), so it never verifies the actual emitted policy files; change
the test to read the generated outputs produced by the generator (e.g., the
emitted .codex/rules/project.rules and .claude/settings.json or the generator's
output directory used by the fixture) instead of
src/templates/config/codex-project-rules.ejs and buildDenyList(), and
reconstruct guardAlternation from the actual emitted rule values; update
references in the test to use the file-read results and any helper that parses
the generated deny list so the assertions exercise the real artifacts.

---

Nitpick comments:
In `@src/generator/permission-constants.ts`:
- [x] Around line 95-97: The map callback for DESTRUCTIVE_BASH_PATTERNS in
DENY_PATTERNS uses an implicitly typed parameter `p`; update the callback to add
an explicit type annotation (e.g., `(p: string) => ...`) so the parameter
complies with the repo's TypeScript parameter-annotation rule while preserving
the existing transformation and the readonly string[] type for DENY_PATTERNS.

In `@src/generator/permissions.ts`:
- [x] Around line 73-76: The alternation PATTERNS_ALTERNATION is built by joining
raw entries from DESTRUCTIVE_BASH_PATTERNS and PRE_TOOL_USE_PATTERN_EXTRAS into
a regex, which is unsafe if any literal contains regex metacharacters; before
joining, map both arrays through an escaping helper (e.g., escapeRegexLiteral)
that replaces /[.*+?^${}()|[\]\\]/g with an escaped version, then join the
escaped results with '|' so PATTERNS_ALTERNATION is constructed from safely
escaped literals.

In `@src/templates/config/settings.json.ejs`:
- [x] Around line 18-26: Extract the hardcoded allowedDomains array from
settings.json.ejs into the generator context: create an ALLOWED_DOMAINS export
in permission-constants.ts containing the current domain list, add that constant
to the object returned by buildContext so it is exposed to templates, and update
settings.json.ejs to read allowedDomains from the context (e.g., using the
allowedDomains template variable) instead of the hardcoded list so different
stacks can supply their own domains.

In `@tests/generator/epic-1-safety.test.ts`:
- [x] Around line 131-143: The assertions validating settings.json's top-level shape
in the test "settings.json JSON parses and has required top-level shape" are
duplicated in epic-5-hooks.test.ts; extract the shared checks into a single test
helper (e.g., assertSettingsJsonShape or validateSettingsJson) and call it from
both epic-1-safety.test.ts and epic-5-hooks.test.ts: the helper should accept
the parsed settings (or the GeneratedFile content) and assert
permissions.defaultMode === 'default', sandbox.mode === 'workspace-write', and
sandbox.allowedDomains length is 7; then replace the duplicated expect(...)
blocks in the test that uses generateAll/makeStackConfig and in the other test
with a call to the new helper.

In `@tests/generator/epic-5-hooks.test.ts`:
- [x] Around line 73-75: The test currently asserts
parsedSettings.sandbox.allowedDomains has length 7 which is brittle; update the
test in epic-5-hooks.test.ts to either assert a minimum required number (e.g.,
expect(parsedSettings.sandbox.allowedDomains.length).toBeGreaterThanOrEqual(MIN_REQUIRED))
or compare against a shared constant exported from permission-constants.ts
(e.g., EXPECTED_ALLOWED_DOMAINS_COUNT) instead of a hardcoded 7, ensuring you
import the constant if used and replace the toHaveLength(7) assertion
accordingly.

### QA pass status notes
- [x] Superseded in follow-up: AGENTS length issue was real and is now fixed by moving deployment/tooling details to `AGENTS-DEPLOYMENT.md` (AGENTS is under 200 lines).
- [x] Skipped sub-point as not applicable: .claude/settings.json has one PreToolUse guard block, not two.
- [x] Partially applied nitpick on regex escaping: escaped literal deny commands; retained regex fragments for pipe-to-shell detection by design.
## Patch Follow-up - 2026-04-24

- [x] `AGENTS.md` reduced below 200 lines by moving tooling/deployment-heavy guidance to `AGENTS-DEPLOYMENT.md`; `AGENTS.md` now contains a short pointer and summary.
- [x] Remaining safe-default posture contradictions in `PRD.md` were normalized from `approval_policy = "on-failure"` to `approval_policy = "on-request"` for Epic 9/10 references.
- [x] QA status notes updated for this follow-up pass with only verified fixes marked complete.
- [x] Reviewer critical fixed: removed `run`/`exec` from package-manager allowlist in `src/templates/config/codex-project-rules.ejs` and regenerated `.codex/rules/project.rules`.
- [x] Reviewer warning fixed: escaped dynamic token interpolation in regex assertions in `tests/generator/codex-project-rules.test.ts`.
- [x] Reviewer critical fixed: removed `dlx` from package-manager allow subcommands in Codex project rules.
- [x] Reviewer critical fixed: removed Python `-m` runtime allowance; Python allow rule is now version-check only.

## Final review-loop fixes — 2026-04-24

- [x] **[security][critical]** PreToolUse guard now blocks PowerShell / cmd wrappers and raw-interpreter eval flags. Added `pwsh|powershell[.exe] -Command|-c|-EncodedCommand`, `cmd[.exe] /c|/k`, `node -e|--eval`, `python[3] -c|-m` to `RAW_INTERPRETER_PATTERNS` → folded into `BASH_DENY_COMMAND_PATTERNS` so both the Claude deny list and the grep alternation guard gain coverage (§1.9.1 item 10.5 raw-socket bypass).
- [x] **[security][critical]** Guard alternation now word-anchored. `iwr` / `irm` / other short literal aliases no longer substring-match inside `firmware`, `confirm`, etc. New helper `anchorLiteralPattern` wraps each escaped literal in `(^|[[:space:]])…([[:space:]]|$)` before joining the alternation.
- [x] **[dry][warning]** Removed duplicated `escapeRegexLiteral`. Exported from `permission-constants.ts`; re-exported from `permissions.ts` and imported by `tests/generator/codex-project-rules.test.ts`.
- [x] **[type][warning]** Narrowed `buildPermissions` call site in `build-context.ts` — now passes `{ tooling, commands }` instead of full `StackConfig`, matching the declared `PermissionsInput` contract.
- [x] **[dry][warning]** Removed duplicate `Bash(npm publish:*)`, `Bash(iwr:*)`, etc. from `EXTRA_DENY_PATTERNS` (they are already derived from `BASH_DENY_COMMAND_PATTERNS`). `.claude/settings.json` regenerated — deny list has no repeated entries.
- [x] **[nitpick]** Updated `LOCAL_GIT_ALLOWS` comment to accurately describe `pull`/`add` as local-state mutating (not strictly read-only).
- [x] Regenerated `.claude/settings.json` via `pnpm dev update -y` so the committed artifact matches the new source-of-truth constants.
