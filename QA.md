⚠️ Outside diff range comments (1)
src/templates/commands/workflow-fix.md.ejs (1)
24-33: ⚠️ Potential issue | 🟠 Major

Mandatory loop is missing security-reviewer.

The loop currently enforces only code-reviewer; this drops the required security review gate.

Suggested fix
 6. Run the mandatory review loop on all modified files:
-   1. `code-reviewer` on all modified files
-   2. `implementer` applies all critical/warning findings
+   1. `code-reviewer` and `security-reviewer` in parallel on all modified files
+   2. `implementer` applies all critical/warning findings from both reviewers
Based on learnings: After every implementation session, run the code review loop by launching code-reviewer and security-reviewer in parallel, then apply findings and re-verify.

🤖 Prompt for AI Agents
Verify each finding against the current code and only fix it if needed.

In `@src/templates/commands/workflow-fix.md.ejs` around lines 24 - 33, The
mandatory review loop currently runs only `code-reviewer` and `implementer`;
update the workflow text to include `security-reviewer` alongside
`code-reviewer` so the loop runs both reviewers in parallel before applying
findings and re-running checks (ensure references to `commands.typeCheck` and
`commands.test` remain unchanged so typecheck/test steps still show
conditionally), and rephrase the instruction line to: run `code-reviewer` and
`security-reviewer` on all modified files, then have `implementer` apply
critical/warning findings and repeat until all listed checks pass.
🟠 Major comments (21)
.codex/skills/test-writer/SKILL.md-26-27 (1)
26-27: ⚠️ Potential issue | 🟠 Major

Align test-location rule with repository convention.

Line 26 currently enforces tests/, which conflicts with the colocated-test module convention and can lead to inconsistent test placement.

💡 Proposed fix
-- **Separate directory** — tests live in `tests/`.
+- **Module organization** — use folder-based modules with colocated tests and `index.ts` barrel exports.
Based on learnings: Applies to **/*.test.{ts,tsx,js,jsx} : Use folder-based module organization with colocated tests and index.ts barrel exports.

🤖 Prompt for AI Agents
Verify each finding against the current code and only fix it if needed.

In @.codex/skills/test-writer/SKILL.md around lines 26 - 27, The rule text
currently enforces a global tests/ directory ("Separate directory — tests live
in `tests/`.") which conflicts with the repository's colocated-test convention;
update the line to require colocated tests (e.g., "Co-locate tests next to
modules — use *.test.{ts,tsx,js,jsx} and folder-based module organization with
index.ts barrel exports") and remove or replace the reference to `tests/`;
ensure the guidance mentions keeping test files under 200 lines (the existing
"File length" bullet) and explicitly references the glob pattern
**/*.test.{ts,tsx,js,jsx} and the use of index.ts barrel exports so maintainers
know the intended convention.
.claude/settings.local.json-46-49 (1)
46-49: ⚠️ Potential issue | 🟠 Major

Avoid auto-fixing lint on every write/edit hook.

Running pnpm lint --fix after each edit can mutate unrelated files and obscure the actual task diff; || true also hides lint/tooling failures.

💡 Proposed adjustment
-          { "type": "command", "command": "pnpm lint --fix || true" }
+          { "type": "command", "command": "pnpm lint || true" }
🤖 Prompt for AI Agents
Verify each finding against the current code and only fix it if needed.

In @.claude/settings.local.json around lines 46 - 49, The current edit hook runs
"pnpm lint --fix || true" which auto-mutates files and silences failures; change
the hook under "hooks" to run a non-mutating check (e.g., "pnpm lint") or a
staged-only fixer instead, and remove the "|| true" so failures surface;
specifically update the JSON entry containing "matcher": "Edit|MultiEdit|Write"
and the hook object with "command": "pnpm lint --fix || true" to use "command":
"pnpm lint" (or a staged fixer like "pnpm lint:staged") and omit the "|| true"
token.
.claude/agents/code-reviewer.md-28-44 (1)
28-44: ⚠️ Potential issue | 🟠 Major

OWASP Top 10 section is incomplete while labeled as “2025 baseline.”

A06 and A08 are missing, so the checklist does not match the claimed baseline and can under-scope security review.

🤖 Prompt for AI Agents
Verify each finding against the current code and only fix it if needed.

In @.claude/agents/code-reviewer.md around lines 28 - 44, The OWASP checklist
under "### 2. Security (OWASP Top 10 2025 baseline)" is missing A06 and A08
entries; update that section to include A06 (Vulnerable and Outdated Components
/ Security Misconfiguration nuances or the 2025-specific category text) and A08
(Integrity, e.g., Software and Data Integrity Controls or the 2025-specific
category), matching the same terse bullet style as the other items, and include
a short guidance line for each (e.g., recommended controls like dependency
scanning/pinning, integrity verification, runtime protections, and
tamper-resistance) so the checklist truly reflects the full 2025 baseline.
.codex/prompts/workflow-fix.md-19-25 (1)
19-25: ⚠️ Potential issue | 🟠 Major

Mandatory review loop omits security-reviewer.

The workflow enforces code-reviewer but not the parallel security review gate, weakening the fix-validation process.

Based on learnings: After implementation, run code-reviewer and security-reviewer in parallel, apply findings, then re-run type-check and tests.

🤖 Prompt for AI Agents
Verify each finding against the current code and only fix it if needed.

In @.codex/prompts/workflow-fix.md around lines 19 - 25, Update the mandatory
review loop to include the security gate: run code-reviewer and
security-reviewer in parallel on all modified files, then have implementer apply
all critical/warning findings from both reviewers before continuing; after
implementer finishes, run pnpm check-types and pnpm test and repeat the loop
until both type-check and tests pass and both reviewers report no remaining
critical/warnings. Ensure references to the existing steps (code-reviewer,
security-reviewer, implementer, pnpm check-types, pnpm test) are used so the
updated workflow replaces the single code-reviewer step with the parallel
code-reviewer + security-reviewer run and subsequent apply-and-verify cycle.
.claude/agents/test-writer.md-28-29 (1)
28-29: ⚠️ Potential issue | 🟠 Major

Test location rule conflicts with repo test-organization guidance.

Mandating tests/ contradicts the colocated test organization guideline and will produce inconsistent structure across new tests.

Suggested fix
-- **Separate directory** — tests live in `tests/`.
+- **Colocation first** — keep tests colocated with modules using the repository’s folder-based organization.
Based on learnings: For **/*.test.{ts,tsx,js,jsx}, use folder-based module organization with colocated tests and index.ts barrel exports.

🤖 Prompt for AI Agents
Verify each finding against the current code and only fix it if needed.

In @.claude/agents/test-writer.md around lines 28 - 29, Update the "Separate
directory — tests live in `tests/`." rule in .claude/agents/test-writer.md to
remove the hard mandate and instead recommend colocated tests using the glob
pattern **/*.test.{ts,tsx,js,jsx}; note that tests should follow folder-based
module organization and use index.ts barrel exports for modules, while still
keeping an advisory about keeping test files under ~200 lines. Locate the rule
text (the bullet starting "Separate directory") and replace its wording to
reflect the colocated approach and the index.ts barrel export guidance without
changing the other test guidelines.
.codex/skills/ui-designer/SKILL.md-19-21 (1)
19-21: ⚠️ Potential issue | 🟠 Major

Use the same canonical source-of-truth as other agents/skills.

This skill points to README.md, while the rest of the workflow uses PRD.md for intent/non-goals. Keeping different canonical docs will cause inconsistent decisions.

Suggested fix
-- The canonical source of project intent lives in `README.md`.
-- Read `README.md` before planning, implementing, reviewing, or writing tests so your work reflects documented requirements and non-goals.
-- When `README.md` and code disagree, flag the mismatch in your output instead of silently picking one.
+- The canonical source of project intent lives in `PRD.md`.
+- Read `PRD.md` before planning, implementing, reviewing, or writing tests so your work reflects documented requirements and non-goals.
+- When `PRD.md` and code disagree, flag the mismatch in your output instead of silently picking one.
🤖 Prompt for AI Agents
Verify each finding against the current code and only fix it if needed.

In @.codex/skills/ui-designer/SKILL.md around lines 19 - 21, The skill currently
references README.md as the canonical source of project intent; change those
references to PRD.md so this skill uses the same canonical source-of-truth as
other agents/skills — update the bullets that mention "README.md" in SKILL.md to
"PRD.md" (and any surrounding phrasing like "Read `README.md`" or "When
`README.md` and code disagree" to match "PRD.md") ensuring the wording remains
consistent with existing guidance used by other skills.
.claude/agents/architect.md-29-31 (1)
29-31: ⚠️ Potential issue | 🟠 Major

Resolve contradictory execution rules in planning-only mode.

The prompt requires post-edit type-check/tests, but later forbids running test/build/lint commands. This conflict can cause incorrect agent behavior.

Suggested fix
- - After any edit to a typed language, run the type-checker and the
-   narrowest relevant test before declaring progress.
+ - In architect mode, do not edit implementation code; this check is N/A.
+ - If you must validate a plan artifact, use read-only verification only.
Also applies to: 188-191

🤖 Prompt for AI Agents
Verify each finding against the current code and only fix it if needed.

In @.claude/agents/architect.md around lines 29 - 31, The document currently
contradicts itself: the sentence "After any edit to a typed language, run the
type-checker and the narrowest relevant test before declaring progress." in the
tool_use_discipline section conflicts with the later prohibition on running
test/build/lint commands in planning-only mode; fix by clarifying and
reconciling the rules—either (A) update the prohibition to exempt type-checks
and the narrowest relevant test (i.e., allow running local/static type-checks
and targeted tests after edits) or (B) change the post-edit requirement to say
"simulate or reason about expected type-check/test outcomes in planning-only
mode" and only require real execution when not in planning-only; apply the same
change to the duplicate text at lines referenced (188-191) so the
tool_use_discipline and planning-only mode statements are consistent.
.claude/commands/workflow-fix.md-22-25 (1)
22-25: ⚠️ Potential issue | 🟠 Major

These verification rules can deadlock the command.

The workflow says pnpm check-types and pnpm test must pass before completion, but it also forbids fixing unrelated failures. If the branch already has an unrelated red test or type error, the command can neither finish nor remediate it. Please add a stop-and-report path for pre-existing failures, or explicitly scope the pass/fail requirement to regressions caused by the QA fixes.

Also applies to: 29-31

🤖 Prompt for AI Agents
Verify each finding against the current code and only fix it if needed.

In @.claude/commands/workflow-fix.md around lines 22 - 25, The verification loop
that requires `pnpm check-types` and `pnpm test` to pass can deadlock on
pre-existing failures; update the workflow text around the `pnpm check-types` /
`pnpm test` loop (and the repeated-scope at lines referenced 29-31) to add a
stop-and-report path: detect if failures predate the QA fixes and then abort the
loop with a clear report rather than attempting fixes, or alternatively change
the requirement wording to explicitly scope the pass/fail to regressions
introduced by the QA fixes; mention the `pnpm lint` final step remains post-loop
and ensure the new wording references `pnpm check-types`, `pnpm test`, and `pnpm
lint` so readers know the altered flow.
.claude/scripts/cursor-task.sh-43-43 (1)
43-43: ⚠️ Potential issue | 🟠 Major

The file parser is stricter than the documented PLAN.md format.

This only recognizes a single-line **Files**: field. In the same PR, the task contract describes a **Files** section but does not require that exact inline shape, so a valid plan can leave $FILES empty and silently open Cursor at the repo root. Either make the PLAN.md format explicitly single-line here, or parse the full **Files** section and fail hard when it cannot be extracted.

Also applies to: 52-63

🤖 Prompt for AI Agents
Verify each finding against the current code and only fix it if needed.

In @.claude/scripts/cursor-task.sh at line 43, The FILES extraction in
.claude/scripts/cursor-task.sh (variable FILES) only matches a single-line
"**Files**:" and silently yields empty values; update the parser to capture the
entire "**Files**" section (not just the rest of that line) by scanning from the
"**Files**:" header through the following section boundary (empty line or next
"**...**" header), then split on commas/newlines, trim whitespace and backticks,
and set a hard failure (non-zero exit and clear error message) if no files are
found; adjust the logic used around FILES and the related block at lines 52-63
to consume the multi-line block and validate it.
.claude/commands/workflow-fix.md-19-24 (1)
19-24: ⚠️ Potential issue | 🟠 Major

Restore security-reviewer to the mandatory fix loop.

This loop only reruns code-reviewer before type-check/tests. Since workflow-fix applies new code changes, omitting security-reviewer means security regressions introduced during QA remediation never get a final pass.

Based on learnings, After every implementation session, run the code review loop: launch code-reviewer and security-reviewer in parallel, apply all findings, re-run type-check with pnpm check-types, and re-run tests with pnpm test ensuring all suites pass.

🤖 Prompt for AI Agents
Verify each finding against the current code and only fix it if needed.

In @.claude/commands/workflow-fix.md around lines 19 - 24, Restore
security-reviewer into the mandatory review loop in workflow-fix: change the
sequence so that after each implementation session you run code-reviewer and
security-reviewer in parallel (instead of only code-reviewer), then have
implementer apply all critical/warning findings from both reviewers, and only
after applying fixes re-run pnpm check-types and pnpm test and repeat until all
checks pass; update any references to the existing loop where only code-reviewer
was invoked to include security-reviewer alongside code-reviewer.
.codex/scripts/sync-codex.ps1-53-66 (1)
53-66: ⚠️ Potential issue | 🟠 Major

-CopySkills is ignored when .agents\skills is already a link.

If the current skills entry is a junction/symlink pointing at the expected target, this branch exits without honoring -CopySkills. That makes the switch a no-op for the common “linked skills” setup.

♻️ Suggested fix
 if (Test-Path -LiteralPath $agentsSkills) {
   $existing = Get-Item -LiteralPath $agentsSkills
   if ($existing.LinkType -eq 'Junction' -or $existing.LinkType -eq 'SymbolicLink') {
     $target = @($existing.Target)[0]
     $resolvedTarget = if ([System.IO.Path]::IsPathRooted($target)) {
       [System.IO.Path]::GetFullPath($target)
     } else {
       [System.IO.Path]::GetFullPath((Join-Path (Split-Path -Parent $agentsSkills) $target))
     }
     $resolvedProjectSkills = (Resolve-Path -LiteralPath $projectSkills).Path
     if (-not $resolvedTarget.Equals($resolvedProjectSkills, [System.StringComparison]::OrdinalIgnoreCase)) {
       throw "Existing .agents\skills points to '$target', expected '$resolvedProjectSkills'."
     }
+    if ($CopySkills) {
+      Remove-Item -LiteralPath $agentsSkills -Force
+      New-Item -ItemType Directory -Force -Path $agentsSkills | Out-Null
+      Copy-Item -Path (Join-Path $projectSkills '*') -Destination $agentsSkills -Recurse -Force
+    }
   } elseif ($CopySkills) {
🤖 Prompt for AI Agents
Verify each finding against the current code and only fix it if needed.

In @.codex/scripts/sync-codex.ps1 around lines 53 - 66, The script currently
treats an existing junction/symlink ($existing with $existing.LinkType) that
already points to the expected target ($resolvedProjectSkills) as a no-op and
never honors the -CopySkills switch; update the branch that checks if
$resolvedTarget.Equals($resolvedProjectSkills, ...) to first check if
$CopySkills is set and, when true, remove the existing link (use Remove-Item
-LiteralPath $agentsSkills -Force or appropriate junction removal) and then
proceed to the copy logic (the same code path under the elseif ($CopySkills)
block) so that $CopySkills causes the link to be replaced with a copied
directory rather than being ignored.
src/templates/agents/reviewer.md.ejs-23-30 (1)
23-30: ⚠️ Potential issue | 🟠 Major

Re-run the reviewers after type-check/test fixes.

Lines 26-30 only loop back to step 3 after implementer changes. That means fixes made for failing type-checks or tests can ship without another code-reviewer/security-reviewer pass.

♻️ Suggested update
-3. Run type-check: `<%= commands.typeCheck %>`. **If type-check fails:** route errors to `implementer`; never silence with `any` / `@ts-ignore` / `eslint-disable`; re-run until clean.
+3. Run type-check: `<%= commands.typeCheck %>`. **If type-check fails:** route errors to `implementer`; never silence with `any` / `@ts-ignore` / `eslint-disable`; update the modified file list and loop back to step 1.

-4. Run tests: `<%= commands.test %>`. **If any suite fails:** route failures to `implementer`; never delete or weaken tests to pass; loop back to step 3 after fixes.
+4. Run tests: `<%= commands.test %>`. **If any suite fails:** route failures to `implementer`; never delete or weaken tests to pass; update the modified file list and loop back to step 1.
Based on learnings, After every implementation session, run the code review loop: launch code-reviewer and security-reviewer in parallel, apply all findings, re-run type-check with pnpm check-types, and re-run tests with pnpm test ensuring all suites pass.

🤖 Prompt for AI Agents
Verify each finding against the current code and only fix it if needed.

In `@src/templates/agents/reviewer.md.ejs` around lines 23 - 30, The flow
currently only loops back to step 3 after `implementer` changes, which can allow
fixes to type-checks/tests to bypass another `code-reviewer`/`security-reviewer`
pass; update the reviewer template so that after every `implementer` session you
re-invoke `code-reviewer` (and `security-reviewer` in parallel if
`hasSecurityReviewer`) against modified files, apply all findings via
`implementer`, then run `commands.typeCheck` (e.g., `pnpm check-types`) and
`commands.test` (e.g., `pnpm test`) in sequence, looping until reviewers,
type-check and tests are all clean before finishing.
.codex/skills/security-reviewer/SKILL.md-136-139 (1)
136-139: ⚠️ Potential issue | 🟠 Major

Scope the source-to-sink requirement to taint-style findings.

This blanket rule would suppress valid findings for categories this skill explicitly claims to cover, such as hardcoded secrets, weak crypto, missing auth checks, and dependency CVEs, because those often do not have an untrusted-input sink path. Keep the “concrete path” requirement for injection/taint bugs, but allow direct evidence for the other checklist sections.

🤖 Prompt for AI Agents
Verify each finding against the current code and only fix it if needed.

In @.codex/skills/security-reviewer/SKILL.md around lines 136 - 139, Update the
rule that currently reads "Do not raise findings without a concrete code path
from an untrusted source to a sink." in SKILL.md so it only applies to
taint/injection style findings: keep the concrete source-to-sink requirement for
injection/taint bugs, but explicitly allow findings based on direct evidence for
other security categories (hardcoded secrets, weak crypto, missing auth checks,
dependency CVEs) and note that validated upstream controls should still be
referenced rather than re-demanded; edit the bullet to clarify this scoping and
list the exempt categories by name.
.codex/skills/architect/SKILL.md-27-29 (1)
27-29: ⚠️ Potential issue | 🟠 Major

Remove the edit/test instructions from this planning-only skill.

The prompt says this agent produces plans only, but these lines also tell it to edit typed files and run tests/type-checks. That directly conflicts with the later read-only constraints and makes the role boundary ambiguous. Please move those execution steps to implementer/reviewer, or rephrase them as handoff requirements in PLAN.md.

Also applies to: 186-189

🤖 Prompt for AI Agents
Verify each finding against the current code and only fix it if needed.

In @.codex/skills/architect/SKILL.md around lines 27 - 29, Remove the runtime
edit/test directive from the planning-only skill by deleting the sentence inside
the tool_use_discipline section that instructs "After any edit to a typed
language, run the type-checker and the narrowest relevant test before declaring
progress"; instead, move that content into the implementer/reviewer
responsibilities or rephrase it as a handoff requirement in PLAN.md so the
SKILL.md remains read-only/planning-only; also repeat the same change for the
other occurrence referenced (the second identical block).
src/templates/commands/external-review.md.ejs-70-84 (1)
70-84: ⚠️ Potential issue | 🟠 Major

Do not let user confirmation bypass the allowlist.

This section first says only allowlisted commands may run, then tells the agent to “confirm or replace” suspicious or unallowlisted input. That turns the allowlist into a soft check and leaves an approval path for arbitrary shell execution. Unallowlisted or suspicious commands should be rejected outright; the only recovery path should be for the user to provide a different allowlisted command.

🤖 Prompt for AI Agents
Verify each finding against the current code and only fix it if needed.

In `@src/templates/commands/external-review.md.ejs` around lines 70 - 84, The
template external-review.md.ejs currently permits user confirmation to bypass
the allowlist; change the text so unallowlisted or suspicious commands are
rejected outright and the only recovery is for the user to supply a different
allowlisted command. Replace any phrasing like “confirm or replace” or “ask the
user to confirm” with explicit instructions to halt and refuse execution of
non-allowlisted commands, and add a clear statement that confirmation must never
permit execution of an unallowlisted command (i.e., keep the allowlist check in
the execution path for the command parsing and `curl`-flag rejection logic).
.codex/prompts/workflow-plan.md-49-51 (1)
49-51: ⚠️ Potential issue | 🟠 Major

Run security-reviewer alongside code-reviewer per task.

Current per-task gate only runs code-reviewer, which weakens the intended review loop depth.

Based on learnings: After every implementation session, run code review loop: launch code-reviewer and security-reviewer in parallel, apply all findings, re-run type-check and tests.

🤖 Prompt for AI Agents
Verify each finding against the current code and only fix it if needed.

In @.codex/prompts/workflow-plan.md around lines 49 - 51, Update the per-task
review gate so it launches security-reviewer in parallel with code-reviewer
after each task completes (instead of only running code-reviewer), collect and
forward all findings to implementer for immediate application, then re-run
type-check and tests; specifically modify the step that currently invokes
code-reviewer to invoke both code-reviewer and security-reviewer concurrently,
ensure implementer consumes both sets of findings, and add a subsequent
type-check/tests step to the loop.
.codex/prompts/workflow-plan.md-26-27 (1)
26-27: ⚠️ Potential issue | 🟠 Major

Make PRD.md an explicit mandatory read in Phase 2.

This wording leaves PRD.md optional; the workflow should name it directly as required input.

Based on learnings: The canonical source of project intent lives in PRD.md — read it before planning, implementing, reviewing, or writing tests so your work reflects documented requirements and non-goals.

🤖 Prompt for AI Agents
Verify each finding against the current code and only fix it if needed.

In @.codex/prompts/workflow-plan.md around lines 26 - 27, Update Phase 2 of the
workflow to require reading PRD.md explicitly: change the step that currently
lists "Read `CLAUDE.md` and any project docs." (and the subsequent "Analyze the
user's request: $ARGUMENTS" step) so it now names "Read `PRD.md` and `CLAUDE.md`
(PRD.md mandatory) and any other project docs." Ensure the text uses the exact
filename PRD.md and marks it as required before proceeding to the analysis step.
.claude/commands/workflow-plan.md-49-51 (1)
49-51: ⚠️ Potential issue | 🟠 Major

Include security-reviewer in the per-task review gate.

Running only code-reviewer per task delays security findings until later and makes root-cause attribution harder.

Suggested edit
-  - After each task completes, run the `code-reviewer` sub-agent on all modified files.
-  - Apply every critical and warning finding immediately via `implementer`.
+  - After each task completes, run `code-reviewer` and `security-reviewer` in parallel on all modified files.
+  - Apply every critical and warning finding immediately via `implementer`, then re-run both reviewers for that task scope.
Based on learnings: After every implementation session, run the code review loop: launch code-reviewer and security-reviewer in parallel, apply all findings, re-run type-check with pnpm check-types, and re-run tests with pnpm test ensuring all suites pass.

🤖 Prompt for AI Agents
Verify each finding against the current code and only fix it if needed.

In @.claude/commands/workflow-plan.md around lines 49 - 51, The workflow
currently runs only the code-reviewer after each task; update the per-task
review gate to run both code-reviewer and security-reviewer in parallel, then
feed all critical/warning findings to implementer immediately, and after
applying fixes re-run type-checks and tests by invoking pnpm check-types and
pnpm test to ensure all suites pass; update the logic invoking code-reviewer to
also invoke security-reviewer and add the subsequent implementer, pnpm
check-types, and pnpm test steps so the loop enforces security findings and
verification each session.
.claude/commands/workflow-plan.md-26-27 (1)
26-27: ⚠️ Potential issue | 🟠 Major

Make PRD.md an explicit mandatory read in Phase 2.

“Read CLAUDE.md and any project docs” is too loose for requirement-critical planning. Call out PRD.md directly to avoid requirement drift.

Suggested edit
-1. Read `CLAUDE.md` and any project docs.
+1. Read `PRD.md` first, then `CLAUDE.md` and any additional project docs.
Based on learnings: Read PRD.md before planning, implementing, reviewing, or writing tests to ensure work reflects documented requirements and non-goals.

🤖 Prompt for AI Agents
Verify each finding against the current code and only fix it if needed.

In @.claude/commands/workflow-plan.md around lines 26 - 27, Update the Phase 2
reading step that currently says "Read `CLAUDE.md` and any project docs." to
explicitly require reading `PRD.md` by name and mark it as mandatory (e.g.,
"Read `CLAUDE.md`, PRD.md (required), and any other project docs"). Ensure the
wording appears in the Phase 2 instructions and enforces that `PRD.md` must be
read before planning, implementing, reviewing, or writing tests so
requirement-critical work references the documented PRD non-goals and
requirements.
.claude/agents/reviewer.md-70-85 (1)
70-85: ⚠️ Potential issue | 🟠 Major

Enforce lint/format in the actual gate loop, not only in DoD text.

DoD says lint/format must pass, but the actionable loop and terminal status only require type-check + tests.

Suggested edit
 3. Run type-check: `pnpm check-types`. **If type-check fails:** route errors to `implementer`; never silence with `any` / `@ts-ignore` / `eslint-disable`; re-run until clean.
 4. Run tests: `pnpm test`. **If any suite fails:** route failures to `implementer`; never delete or weaken tests to pass; loop back to step 3 after fixes.
+5. Run lint/format checks. **If lint or format fails:** route fixes to `implementer`; re-run until clean.

 <output_format>
-Return total loop iterations, finding counts by category, scratchpad path, and status: `REVIEW COMPLETE - type-check PASS, tests PASS`.
+Return total loop iterations, finding counts by category, scratchpad path, and status: `REVIEW COMPLETE - type-check PASS, tests PASS, lint/format PASS`.
 </output_format>
🤖 Prompt for AI Agents
Verify each finding against the current code and only fix it if needed.

In @.claude/agents/reviewer.md around lines 70 - 85, The reviewer loop and
terminal status currently only enforce type-check and tests (steps
3–4/output_format) while lint/format are only in the DoD text; update the main
gate loop to run linting/formatting (e.g., run `pnpm lint`/`pnpm format` or
whatever project's commands) immediately after tests and/or before declaring
completion (add as a new step between steps 3 and 4 or as step 5) and include
lint/format as required in the terminal status line (change `REVIEW COMPLETE -
type-check PASS, tests PASS` to include lint/format PASS). Refer to the existing
step names/labels ("Run type-check: `pnpm check-types`", "Run tests: `pnpm
test`") and the output_format status string to locate where to insert and
enforce this new lint/format check.
.claude/commands/external-review.md-44-50 (1)
44-50: ⚠️ Potential issue | 🟠 Major

Hard-reject suspicious shell patterns instead of allowing “confirm and proceed.”

For commands flagged as shell-injection/destructive patterns, confirmation should not permit execution; require a sanitized re-run command.

Suggested edit
-If the
-command looks suspicious, halt and ask the user
-to confirm before proceeding; do NOT silently substitute a different tool.
+If the command looks suspicious, halt and refuse execution.
+Ask the user to provide a sanitized command that passes validation; do NOT silently substitute a different tool.
🤖 Prompt for AI Agents
Verify each finding against the current code and only fix it if needed.

In @.claude/commands/external-review.md around lines 44 - 50, Update the policy
text that currently allows "ask the user to confirm before proceeding" to
enforce a hard rejection for commands matching suspicious
shell-injection/destructive patterns: remove language permitting confirmation
and instead state that any command containing patterns like $(...), backtick
substitution, | sh, | bash, rm -rf, >, &&, ;, ||, <, ${...}, or encoded/newline
payloads must be rejected and the user must supply a sanitized re-run; keep the
detection checklist and the instruction "do NOT silently substitute a different
tool" but replace the confirm-and-proceed flow with an explicit requirement for
a corrected command before execution.
🟡 Minor comments (9)
.claude/agents/ui-designer.md-9-9 (1)
9-9: ⚠️ Potential issue | 🟡 Minor

Capitalize framework name in description.

Line 9 should use the proper noun form: React.

💡 Proposed fix
-You are a UI/UX design specialist for the `agents-workflows` project: A react application.
+You are a UI/UX design specialist for the `agents-workflows` project: A React application.
🤖 Prompt for AI Agents
Verify each finding against the current code and only fix it if needed.

In @.claude/agents/ui-designer.md at line 9, Sentence "You are a UI/UX design
specialist for the `agents-workflows` project: A react application." uses a
lowercase framework name; change "react" to the proper noun "React" so the line
reads "... A React application." to correctly capitalize the framework name.
.codex/skills/implementer/SKILL.md-7-7 (1)
7-7: ⚠️ Potential issue | 🟡 Minor

Fix ambiguous role description text.

Line 7 includes none / typescript, which reads like a placeholder leak and weakens instruction clarity.

💡 Proposed fix
-You are a senior none / typescript implementation skill for the `agents-workflows` project: Reusable AI skill configuration framework.
+You are a senior TypeScript implementation skill for the `agents-workflows` project: Reusable AI skill configuration framework.
🤖 Prompt for AI Agents
Verify each finding against the current code and only fix it if needed.

In @.codex/skills/implementer/SKILL.md at line 7, The role description in
SKILL.md contains the ambiguous phrase "none / typescript"; update the role text
to a clear, specific descriptor (e.g., "senior TypeScript implementation skill"
or "senior TypeScript engineer") by editing the sentence that currently reads
"You are a senior none / typescript implementation skill for the
`agents-workflows` project" so it no longer includes "none / typescript" and
uses proper capitalization and wording (reference the SKILL.md role sentence).
src/templates/partials/stack-context.md.ejs-3-5 (1)
3-5: ⚠️ Potential issue | 🟡 Minor

Normalize item before sentinel check and rendering.

On Line 3, values like " none " currently pass the filter because toLowerCase() is evaluated before trimming. Line 4 also renders the untrimmed value.

💡 Proposed fix
-<% stackItems.forEach(function(item) { if (item != null && typeof item === 'string' && item.trim() !== '' && item.toLowerCase() !== 'none') { -%>
-- <%= item %>
-<% } }); -%>
+<% stackItems.forEach(function(item) {
+  if (item != null && typeof item === 'string') {
+    const normalized = item.trim();
+    if (normalized !== '' && normalized.toLowerCase() !== 'none') { -%>
+- <%= normalized %>
+<%  } } }); -%>
🤖 Prompt for AI Agents
Verify each finding against the current code and only fix it if needed.

In `@src/templates/partials/stack-context.md.ejs` around lines 3 - 5, Normalize
the loop variable before checks and rendering: inside the stackItems.forEach
callback (referencing stackItems.forEach and the item variable), call
item.trim() into a new local like normalized (or overwrite item) and use
normalized for the empty and sentinel checks (normalized !== '' and
normalized.toLowerCase() !== 'none') and also render the trimmed value (replace
rendering of <%= item %> with the normalized value) so inputs like " none " are
correctly filtered and displayed trimmed.
.claude/agents/implementer.md-9-9 (1)
9-9: ⚠️ Potential issue | 🟡 Minor

Remove leaked None placeholder from implementer prompt copy.

Line 9 and Line 14 still contain placeholder-like content (none / typescript, - None), which weakens prompt clarity and stack accuracy.

🧹 Suggested fix
-You are a senior none / typescript implementation agent for the `agents-workflows` project: Reusable AI agent configuration framework.
+You are a senior TypeScript implementation agent for the `agents-workflows` project: Reusable AI agent configuration framework.
@@
-- None
Also applies to: 14-14

🤖 Prompt for AI Agents
Verify each finding against the current code and only fix it if needed.

In @.claude/agents/implementer.md at line 9, Remove the leaked "None"
placeholder in the implementer prompt: replace the phrase "You are a senior none
/ typescript implementation agent" with a clear descriptor such as "You are a
senior TypeScript implementation agent" and remove or replace the list entry "-
None" with the appropriate stack label (e.g., "- TypeScript" or delete the
placeholder line) so the prompt no longer contains placeholder text; update the
occurrences of "none / typescript" and "- None" in the implementer prompt copy
accordingly.
.claude/scratchpad/review-task-5.md-37-37 (1)
37-37: ⚠️ Potential issue | 🟡 Minor

Fix inline code span spacing on Line 37 (markdownlint MD038).

Line 37 has a code span with trailing internal space: `### Task `. Remove edge whitespace inside the backticks.

✏️ Suggested fix
-| ✅ pass | `.claude/scripts/run-parallel.sh` | `grep -P` replaced with portable `awk '/^### Task [0-9]+.*\[PARALLEL\]/{match($0,/[0-9]+/); print substr($0,RSTART,RLENGTH)}'`; first-number match safely extracts task ID because `### Task ` prefix contains no digits | PASS |
+| ✅ pass | `.claude/scripts/run-parallel.sh` | `grep -P` replaced with portable `awk '/^### Task [0-9]+.*\[PARALLEL\]/{match($0,/[0-9]+/); print substr($0,RSTART,RLENGTH)}'`; first-number match safely extracts task ID because `### Task` prefix contains no digits | PASS |
🤖 Prompt for AI Agents
Verify each finding against the current code and only fix it if needed.

In @.claude/scratchpad/review-task-5.md at line 37, The markdown has a code span
with trailing internal whitespace ``### Task `` causing markdownlint MD038; edit
the offending markdown line and remove the extra space inside the backticks so
the code span is ``### Task`` (i.e., update the inline code token that contains
`### Task ` to remove the trailing space) and save the file to clear the MD038
warning.
.claude/agents/security-reviewer.md-90-90 (1)
90-90: ⚠️ Potential issue | 🟡 Minor

Use a severity label from the declared output taxonomy.

critical-review is not one of the allowed output severities (critical, high, medium, low, info), which can break structured reporting.

Suggested edit
-- Flag any hand-rolled auth, token verification, or session handling as critical-review.
+- Flag any hand-rolled auth, token verification, or session handling as critical.
Also applies to: 130-130

🤖 Prompt for AI Agents
Verify each finding against the current code and only fix it if needed.

In @.claude/agents/security-reviewer.md at line 90, Replace the invalid severity
label "critical-review" with one of the declared allowed severities (e.g.,
"critical") wherever it appears; search for the string "critical-review" and
update those occurrences (including the instance flagged at or near the comment
containing "Flag any hand-rolled auth, token verification, or session handling
as critical-review") to use a valid taxonomy label ("critical", "high",
"medium", "low", or "info") so structured reporting remains compatible.
.codex/skills/reviewer/SKILL.md-45-46 (1)
45-46: ⚠️ Potential issue | 🟡 Minor

Align TODO guidance with the DoD prohibition.

This file both forbids new TODO/FIXME and suggests adding // TODO(review):; keep one consistent rule.

Also applies to: 79-79

🤖 Prompt for AI Agents
Verify each finding against the current code and only fix it if needed.

In @.codex/skills/reviewer/SKILL.md around lines 45 - 46, The guidance conflicts
with the DoD prohibition: remove the allowance for "// TODO(review):" and make
the rule consistently forbid adding new TODO/FIXME entries; update the SKILL.md
text that currently references TODO/FIXME and the suggested "// TODO(review):"
pattern so it explicitly prohibits any TODO/FIXME (and similar review-only
comments) and apply the same change to the other occurrence in the file to keep
a single consistent rule.
PLAN.md-206-206 (1)
206-206: ⚠️ Potential issue | 🟡 Minor

Use the same DONE marker format as the workflow spec.

This line says append — [DONE], while the workflow instructions define [DONE YYYY-MM-DD]. Keep one format to avoid process drift.

🤖 Prompt for AI Agents
Verify each finding against the current code and only fix it if needed.

In `@PLAN.md` at line 206, Update the checklist item that currently instructs
users to append the `— [DONE]` marker so it uses the canonical workflow marker
format `[DONE YYYY-MM-DD]` instead; specifically replace the `— [DONE]` text in
the checklist entry ("[ ] PRD.md Epic 3 header (PRD.md:1492) ready for user to
append `— [DONE]` marker") with the workflow's `[DONE YYYY-MM-DD]` form to
ensure consistency with the workflow spec.
.claude/agents/reviewer.md-45-46 (1)
45-46: ⚠️ Potential issue | 🟡 Minor

Resolve the TODO policy conflict.

Line 81 encourages // TODO(review):, but Line 45 disallows introducing TODO/FIXME unless explicitly approved with rationale.

Also applies to: 81-81

🤖 Prompt for AI Agents
Verify each finding against the current code and only fix it if needed.

In @.claude/agents/reviewer.md around lines 45 - 46, Update the conflicting
guidance so the "TODO(review):" suggestion complies with rule 7; specifically,
change the encouragement of using "// TODO(review):" to require any
TODO/FIXME/@ts-ignore/any/console.log/commented-out code be explicitly approved
and accompanied by a rationale comment (e.g., "// reason: ...") and approval
metadata, and adjust the reviewer.md sentence that mentions "TODO(review):" to
reference this approval+reason pattern to make it consistent with the rule text
that disallows TODO/FIXME unless approved.
🧹 Nitpick comments (10)
.claude/scripts/run-parallel.sh (2)
25-25: Quote variable to prevent globbing.

The unquoted $PARALLEL_TASKS in the echo could cause issues if task numbers happen to match glob patterns (unlikely but defensive coding).

🛡️ Proposed fix
-echo "[$TIMESTAMP] Starting parallel tasks: $(echo $PARALLEL_TASKS | tr '\n' ', ')" | tee -a "$LOG_FILE"
+echo "[$TIMESTAMP] Starting parallel tasks: $(echo "$PARALLEL_TASKS" | tr '\n' ', ')" | tee -a "$LOG_FILE"
🤖 Prompt for AI Agents
Verify each finding against the current code and only fix it if needed.

In @.claude/scripts/run-parallel.sh at line 25, The echo command that logs
PARALLEL_TASKS uses an unquoted variable which can trigger shell
globbing/word-splitting; update the echo invocation so $PARALLEL_TASKS is quoted
(and preserve the use of tr) when building the message — i.e., reference
TIMESTAMP, PARALLEL_TASKS and LOG_FILE and ensure PARALLEL_TASKS is wrapped in
quotes to prevent globbing and splitting before piping to tr and tee.
27-31: Consider capturing background job PIDs for better error handling.

The current wait (line 33) waits for all background jobs but doesn't capture individual exit statuses. If a task fails, the script still reports success.

♻️ Proposed improvement for error tracking
+PIDS=()
 for TASK_NUM in $PARALLEL_TASKS; do
   echo "[$TIMESTAMP] Launching Task ${TASK_NUM}..." | tee -a "$LOG_FILE"
   bash "${SCRIPT_DIR}/cursor-task.sh" "$TASK_NUM" &
+  PIDS+=($!)
   sleep 1
 done

-wait
+FAILED=0
+for PID in "${PIDS[@]}"; do
+  wait "$PID" || ((FAILED++))
+done
+
+if [[ $FAILED -gt 0 ]]; then
+  echo "[$COMPLETED_TIMESTAMP] WARNING: $FAILED task(s) failed." | tee -a "$LOG_FILE"
+fi
🤖 Prompt for AI Agents
Verify each finding against the current code and only fix it if needed.

In @.claude/scripts/run-parallel.sh around lines 27 - 31, The loop launching
background jobs for TASK_NUM over PARALLEL_TASKS should capture each child PID
so you can detect individual failures; modify the block that calls bash
"${SCRIPT_DIR}/cursor-task.sh" "$TASK_NUM" & to save the PID (e.g., pids+=( $!
)) and associated TASK_NUM, then replace the single wait with iterating over the
saved PIDs, calling wait <pid> for each, checking its exit status, and logging
failures to LOG_FILE using TIMESTAMP and TASK_NUM context; if any wait returns
non-zero, exit the parent script with a non-zero status to signal overall
failure.
tests/generator/generate-all.test.ts (1)
1-211: File exceeds the 200-line limit.

This test file is 211 lines, slightly over the 200-line guideline. Consider extracting related test groups (e.g., the monorepo/workspace tests or the docsFile tests) into a separate colocated test file.

Based on learnings: "Keep files under 200 lines"

🤖 Prompt for AI Agents
Verify each finding against the current code and only fix it if needed.

In `@tests/generator/generate-all.test.ts` around lines 1 - 211, The test file
generate-all.test.ts exceeds the 200-line guideline; split it into smaller
colocated test files by grouping related "it" blocks (e.g., move the
monorepo/workspace tests that reference "renders a Workspaces section in
CLAUDE.md when config.monorepo.isRoot is true" and "omits the Workspaces section
for single-package projects" into tests/generator/generate-workspaces.test.ts,
and move docsFile-related tests like "injects docs reference into CLAUDE.md,
AGENTS.md, and every agent when docsFile is set" and "omits docs reference when
docsFile is null" into tests/generator/generate-docs-ref.test.ts), keeping the
main file with core rendering checks (the describe('generateAll') block and
remaining it blocks such as apostrophes, frontmatter, agent rendering); update
any imports/fixtures so each new file imports makeStackConfig and generateAll
and ensure each new test file passes individually.
.codex/skills/code-reviewer/SKILL.md (1)
17-214: Consider centralizing reviewer checklist content to avoid drift.

This file and .claude/agents/code-reviewer.md duplicate almost the same policy text. A shared partial/source would reduce maintenance divergence.

🤖 Prompt for AI Agents
Verify each finding against the current code and only fix it if needed.

In @.codex/skills/code-reviewer/SKILL.md around lines 17 - 214, The reviewer
notes duplicate policy text between .codex/skills/code-reviewer/SKILL.md and
.claude/agents/code-reviewer.md; fix by extracting the common "Review checklist"
content into a single canonical source (e.g., a new file like
REPO_REVIEW_CHECKLIST.md or a shared partial) and update SKILL.md and
code-reviewer.md to reference or include that canonical file instead of
duplicating text; ensure unique identifiers in the diff such as the "Review
checklist" header and the files SKILL.md and code-reviewer.md are updated to
point to the shared source and remove the duplicated blocks.
.codex/prompts/workflow-fix.md (1)
19-25: Simplify duplicated reviewer execution between step 6 and step 7.

code-reviewer is run in step 6 and again in step 7.1. Consolidating into one review loop will make execution clearer and avoid redundant passes.

🤖 Prompt for AI Agents
Verify each finding against the current code and only fix it if needed.

In @.codex/prompts/workflow-fix.md around lines 19 - 25, Consolidate the
duplicated `code-reviewer` execution by removing the standalone step 6 and
incorporating its intent into the review loop in step 7: keep a single review
loop that runs `code-reviewer` on all modified files, then `implementer` to
apply critical/warning findings, followed by `pnpm check-types` and `pnpm test`,
repeating until all checks pass; update the numbered steps to reflect that
`code-reviewer` is only invoked within the reviewer loop and remove the
redundant separate invocation.
.codex/prompts/external-review.md (1)
26-27: Minor naming inconsistency: "CodeRabbit" vs "Code Rabbit".

The document uses both "CodeRabbit" (line 26 in coderabbit review) and "Code Rabbit CLI" (lines 51, 55). The official branding appears to be "CodeRabbit" (one word). Consider standardizing to "CodeRabbit CLI" for consistency with the command syntax.

📝 Suggested consistency fix
-When no terminal command is supplied, the default tool is the **Code Rabbit CLI**
-(`coderabbit review` or vendor-current equivalent — verify availability via
-`coderabbit --version`).
+When no terminal command is supplied, the default tool is the **CodeRabbit CLI**
+(`coderabbit review` or vendor-current equivalent — verify availability via
+`coderabbit --version`).

-If Code Rabbit CLI is not installed, halt and instruct the user to either install it or
+If CodeRabbit CLI is not installed, halt and instruct the user to either install it or
Also applies to: 51-56

🤖 Prompt for AI Agents
Verify each finding against the current code and only fix it if needed.

In @.codex/prompts/external-review.md around lines 26 - 27, Standardize branding
by replacing "Code Rabbit" with "CodeRabbit" across the document and use
"CodeRabbit CLI" where a product name is needed; update the command examples
`coderabbit review` and `coderabbit --version` and the occurrences around lines
referenced (the header/text that says "Code Rabbit CLI") to read "CodeRabbit" or
"CodeRabbit CLI" as appropriate so the command syntax and branding match.
tests/generator/epic-3-review-depth.test.ts (1)
31-37: Function with >2 parameters should use a single object parameter.

Per coding guidelines, getFileContent has 3 parameters and should use an object parameter instead.

♻️ Suggested refactor
-const getFileContent = (files: GeneratedFile[], filePath: string, label: string): string => {
-  const file = files.find((f: GeneratedFile) => f.path === filePath);
+interface GetFileContentParams {
+  files: GeneratedFile[];
+  filePath: string;
+  label: string;
+}
+
+const getFileContent = ({ files, filePath, label }: GetFileContentParams): string => {
+  const file = files.find((f: GeneratedFile) => f.path === filePath);
   if (!file) {
     throw new Error(`${label} not found: ${filePath}`);
   }
   return file.content;
 };

-const getAgentContent = (files: GeneratedFile[], agentName: string): string =>
-  getFileContent(files, `.claude/agents/${agentName}.md`, 'Agent file');
+const getAgentContent = (files: GeneratedFile[], agentName: string): string =>
+  getFileContent({ files, filePath: `.claude/agents/${agentName}.md`, label: 'Agent file' });

-const getCommandContent = (files: GeneratedFile[], commandName: string): string =>
-  getFileContent(files, `.claude/commands/${commandName}.md`, 'Command file');
+const getCommandContent = (files: GeneratedFile[], commandName: string): string =>
+  getFileContent({ files, filePath: `.claude/commands/${commandName}.md`, label: 'Command file' });

-const getRootFileContent = (files: GeneratedFile[], fileName: string): string =>
-  getFileContent(files, fileName, 'Root file');
+const getRootFileContent = (files: GeneratedFile[], fileName: string): string =>
+  getFileContent({ files, filePath: fileName, label: 'Root file' });
As per coding guidelines: "Functions with more than 2 parameters must use a single object parameter."

🤖 Prompt for AI Agents
Verify each finding against the current code and only fix it if needed.

In `@tests/generator/epic-3-review-depth.test.ts` around lines 31 - 37, The
getFileContent function currently accepts three parameters (files, filePath,
label); refactor it to accept a single object parameter (e.g., { files,
filePath, label }) and update its TypeScript signature accordingly, then update
all call sites in the test to pass an object with those named properties;
preserve existing behavior (finding GeneratedFile by path and throwing
Error(`${label} not found: ${filePath}`) when missing) and ensure types still
reference GeneratedFile and string for filePath/label.
PRD.md (3)
2037-2047: Consider adding a language identifier to the fenced code block.

The isolation selector UI mockup lacks a language identifier, which triggers a markdown lint warning. Since this is a CLI prompt mockup, consider using text or plaintext as the language.

📝 Suggested fix
      Where are you running the agent? (this affects risk)
-       > devcontainer   (.devcontainer / Dev Containers / Codespaces)
+```text
+       > devcontainer   (.devcontainer / Dev Containers / Codespaces)
        > docker         (other container runtime)
        ...
+```
🤖 Prompt for AI Agents
Verify each finding against the current code and only fix it if needed.

In `@PRD.md` around lines 2037 - 2047, Add a language identifier to the fenced
code block in the isolation selector UI mockup (the triple-backtick block shown
around the choices list) by changing the opening fence from ``` to ```text (or
```plaintext) so the markdown linter stops warning; update the block surrounding
the lines starting with "> devcontainer ..." and the closing ``` remains
unchanged.
2391-2391: Spaces inside inline code spans.

The markdown linter flags spaces inside code spans. Line 2391 contains patterns like `| Implementation | \`implementer\` |` where the table syntax within the code span may be causing the warning. This is a stylistic lint rather than a functional issue, but cleaning it up would silence the warnings.

🤖 Prompt for AI Agents
Verify each finding against the current code and only fix it if needed.

In `@PRD.md` at line 2391, Remove the hasReactTsSenior conditional and its
react-ts-senior table row, update the existing Implementation row that currently
uses `implementer` so it outputs the optional variant label when
implementerVariant is non-`generic` (e.g., render "(implementerVariant variant)"
inline with the implementer cell), ensure you leave the Model routing table's
implementer row unchanged, and fix markdown by removing any spaces inside inline
code spans (no spaces between backticks and content) so linter warnings for code
spans go away; remove all references to hasReactTsSenior from the template
context.
285-300: Minor: Inconsistent casing in model-routing table.

Line 285 uses "CodeRabbit CLI" but line 299 references "CodeRabbit CLI" in the mandate paragraph. This is consistent, but note the .codex/prompts/external-review.md file in this PR uses "Code Rabbit CLI" (two words) in some places. Consider aligning the casing across all documents.

🤖 Prompt for AI Agents
Verify each finding against the current code and only fix it if needed.

In `@PRD.md` around lines 285 - 300, Standardize the product docs to use a single
token for the reviewer name: search for "CodeRabbit CLI" and "Code Rabbit CLI"
and replace all occurrences so they match (use "CodeRabbit CLI" to align with
the PRD.md table and mandate paragraph), updating the table entry, the mandate
paragraph, and any other references; run a repo-wide search to ensure there are
no remaining mismatched instances of either token.