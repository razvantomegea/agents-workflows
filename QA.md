Verify each finding against the current code and only fix it if needed.

Inline comments:
In @.claude/settings.json:
- [x] Line 116: The guard regex in the patterns string only treats whitespace as
token boundaries so separators like ";" or "&&" bypass it; update the patterns
variable (the long string assigned to patterns in the command block) to use
shell-token boundaries instead of only [[:space:]] by replacing each
'(^|[[:space:]])' and '([[:space:]]|$)' with a boundary that includes common
shell separators and multi-char operators (e.g.
'(^|[[:space:]]|;|\||&|\(|\)|<|>|\|\||&&)' and
'([[:space:]]|;|\||&|\(|\)|<|>|\|\||&&|$)') so commands like "true;rm -rf ." or
"true && rm -rf ." are matched.

In `@README.md`:
- [x] Around line 185-207: The fenced code block in README.md that shows the project
tree is missing a language tag which triggers markdownlint; update the opening
fence from ``` to ```text (or ```plaintext) so the block explicitly declares its
language and silences the lint warning for the tree snippet.

In `@tests/generator/epic-16-cross-model-routing.test.ts`:
- [x] Around line 17-59: The failing Epic-16 tests in
tests/generator/epic-16-cross-model-routing.test.ts expect generated docs that
don't exist; either update the generator/templates to emit the exact strings
those tests look for (ensure getRootFileContent/getCommandContent output
includes "## Model routing (Claude + GPT defaults", "Claude", "GPT-5.x",
WRITER_REVIEWER_RULE, "### Stack-aware writer/reviewer defaults", "TypeScript /
React front-end", "Implementer: **GPT-5.x**", "Reviewer + `/external-review`:
**Claude**", and MODEL_SELECTION_HEADING plus the other model-family lines
referenced), or gate/skip this test suite until the template changes are
included (mark the described it(...) blocks as skipped or wrap the suite with a
feature-flag check) so CI is not merge-blocked.

In `@tests/security/smoke.test.ts`:
- [x] Around line 23-31: The test helper expectCodexForbiddenToken currently checks
token presence with substring matching; update it to perform exact token
matching within each forbidden rule block (use PREFIX_RULE_BLOCK_RE and the
function expectCodexForbiddenToken) by splitting or tokenizing the block body
into discrete tokens or using a regex with word boundaries to match the token
exactly (e.g., match whole-word occurrences rather than using
body.includes(token)), then assert that at least one block contains an
exact-token match.

---

Duplicate comments:
In `@AGENTS.md`:
- [x] Around line 213-229: The "Deployment rules" section in AGENTS.md duplicates
content and pushes the file past the 200-line cap; move the entire Deployment
rules block into the new AGENTS-DEPLOYMENT.md document (preserve content and
formatting, including headers like "Deployment rules" and checklist items such
as DB migrations, feature flags, and progressive delivery) and replace the
removed block in AGENTS.md with a concise pointer sentence linking to
AGENTS-DEPLOYMENT.md (e.g., "See AGENTS-DEPLOYMENT.md for deployment checklist
and rules"). Ensure AGENTS.md stays under 200 lines after the change.

In `@tests/generator/codex-project-rules.test.ts`:
- [x] Around line 61-76: Scope each assertion to a single prefix_rule(...) block:
instead of using a broad regex over content, scan content for individual
"prefix_rule(...)" bodies (match with a non-greedy block matcher) and assert
that at least one of those blocks contains both the escapedToken and the
expected decision string; update the two tests that currently use it.each to
parse the blocks from the content and check token+decision inside the same
block, and annotate the callback parameter explicitly as (token: string) so the
it.each token parameter is typed.

---

Nitpick comments:
In `@tests/generator/settings-json-shape.helper.ts`:
- [x] Around line 1-9: The test duplicates the allowed-domain literal
(EXPECTED_ALLOWED_DOMAINS); remove the hard-coded array and import the canonical
list from the single source of truth in your codebase (the export in
src/generator/permission-constants.ts, e.g. the
ALLOWED_DOMAINS/ALLOWED_DOMAIN_LIST export) or a shared test fixture, and use
that imported constant in tests (preserve any readonly/`as const` typing if
required by the tests). Ensure the test file (settings-json-shape.helper.ts)
references the exported symbol name exactly and remove the duplicate literal.

Verify each finding against the current code and only fix it if needed.

Inline comments:
In `@PRD.md`:
- [x] Line 1855: PRD.md currently allowlists "git stash" while the generated
workflows (workflow-plan.md.ejs and workflow-fix.md.ejs) forbid it; resolve the
mismatch by either removing "git stash" from the allow rules in PRD.md’s vetted
entrypoints list so it matches the templates, or if you intend to permit stash,
update the two workflow templates to allow the stash subcommand consistently;
ensure the final PRD text and the templates are in exact agreement and add a
short note in PRD.md flagging that workflow/template behavior must match the
PRD.

In `@src/templates/commands/workflow-plan.md.ejs`:
- [x] Line 47: The template text in workflow-plan.md.ejs incorrectly calls the
`/external-review` step "Phase 4"; update the phrasing so it uses an order-based
reference instead of a hard-coded phase number — e.g., change the clause
mentioning `/external-review` to say it runs in "Phase 3, Step 4" or "the fourth
step of Phase 3 (Step 4)" so the line referencing **Claude** and
`/external-review` accurately points to the step that runs `/external-review`
even when a Phase 4 is absent.

In `@src/templates/config/AGENTS.md.ejs`:
- [x] Line 60: The table row for the ui-designer role currently lists "Claude Opus"
and a GPT-5.x fallback; remove the GPT-5.x fallback so the ui-designer row only
lists Claude Opus as the primary/required actor (keeping the rest of the columns
unchanged) to match the two-phase rule that Claude Opus must handle ui-designer
duties and GPT-5.x is only for Phase B implementation; update the cell that
currently contains "GPT-5.x (UI code from approved design)" to remove the
GPT-5.x text entirely, leaving Claude Opus as the sole entry for the role.

---

Nitpick comments:
In `@src/templates/config/CLAUDE.md.ejs`:
- [x] Line 104: Update the paragraph that mentions `.codex/rules/default.rules` to
list the Windows equivalent path as well (e.g.,
%USERPROFILE%\.codex\rules\default.rules or
C:\Users\<username>\.codex\rules\default.rules), keeping the existing references
to `.claude/settings.json`, `.claude/settings.local.json`, `.codex/config.toml`,
and `.codex/rules/project.rules`; state that `~/.codex/rules/default.rules` is
the Unix path and provide the Windows path explicitly so operators on Windows
know where the per-user accumulated approved prompts live and should be pruned.

Verify each finding against the current code and only fix it if needed.

Inline comments:
In @.codex/rules/project.rules:
- [x] Around line 154-160: The rule using prefix_rule with pattern = ["git",
["status", "diff", "log", "branch", "add", "checkout", "switch", "stash",
"pull"]] incorrectly classifies mutating git commands as "Local / read-only";
update the rule by removing the mutating verbs (add, checkout, switch, stash,
pull) from that pattern and keep only truly read-only verbs (status, diff, log,
branch), or alternatively split into two rules: one explicit allow for read-only
verbs using prefix_rule and a separate, more restrictive rule (or deny) for
mutating verbs; adjust the prefix_rule invocation name and justification if
needed to reflect the tightened scope.

In `@PRD.md`:
- [x] Around line 357-362: The two fenced shell snippets in PRD.md (the blocks
containing the /plugin and /codex commands shown in the diff) lack a language
tag and trigger markdownlint MD040; update each triple-backtick fence to use a
shell language tag by adding "sh" after the opening ``` so the blocks read ```sh
and satisfy the linter (apply the same change to the second occurrence noted in
the comment).

In `@src/generator/permission-constants.ts`:
- [x] Around line 31-50: DESTRUCTIVE_BASH_PATTERNS currently omits the destructive
"git reset --merge" entry, making the Claude deny list and PreToolUse guard
inconsistent with PRD; add "git reset --merge" to the DESTRUCTIVE_BASH_PATTERNS
array and then verify any code paths that consume DESTRUCTIVE_BASH_PATTERNS
(e.g., the shared Claude settings generation and PreToolUse guard logic) still
behave correctly with the new pattern so the deny source remains the single
source of truth.

In `@src/generator/permissions.ts`:
- [x] Around line 95-102: anchorLiteralPattern currently only allows whitespace or
end-of-command after a literal so bundled short flags (e.g., `-rfv`, `-xfd`)
bypass the check; update the matching logic used to build PATTERNS_ALTERNATION
(via anchorLiteralPattern) to accept either whitespace/end OR a sequence of
bundled short flags after the literal (e.g., allow a `-[A-Za-z]+` token
optionally followed by whitespace) or alternatively add a normalization step
before running grep -qE that strips bundled short flags from the command string;
make the change in anchorLiteralPattern (and ensure PATTERNS_ALTERNATION
includes the new pattern) or implement the normalization right before the grep
invocation so bundled flags no longer cause false negatives.

In `@src/templates/commands/external-review.md.ejs`:
- [x] Around line 113-118: Update the paragraph to make clear that the /codex:review
command is an allowlisted, conditional supplement—not a general override of the
CodeRabbit CLI default; explicitly state that /codex:review (Codex Plugin for
Claude Code) may be used only when the diff was authored by Claude and otherwise
CodeRabbit remains the mandatory default, that it follows the same QA.md Step 3
write rules, and reiterate that no file-watch/heartbeat loop between CLIs or
replacing CodeRabbit with MCP handoffs is permitted; keep references to
/codex:review, CodeRabbit, MCP, and QA.md Step 3 to locate the sentence to
change.

In `@src/templates/config/AGENTS.md.ejs`:
- [x] Around line 50-57: The "external-review" row in AGENTS.md.ejs conflicts with
the CodeRabbit-first policy described in
src/templates/commands/external-review.md.ejs; update the external-review row in
AGENTS.md.ejs so its Preferred tool explicitly lists CodeRabbit CLI as the
mandatory default (with other tools listed only as exception/fallbacks), adjust
the Per-tool invocation hint to put "CodeRabbit CLI" first and rephrase/remove
any wording that implies BugBot/Copilot are equal defaults, and ensure the
Preferred/Backup model-family and Reasoning effort values match the
external-review command template.

---

Duplicate comments:
In @.codex/rules/project.rules:
- [x] Around line 116-138: The current prefix_rule entries (the prefix_rule calls
and their pattern arrays) are too permissive: remove mutating package-manager
subcommands ("install", "add", "remove", "up") from the ["pnpm","npm","yarn"]
pattern and restrict tool binaries to non-mutating/read-only forms (for example
only allow "--version" or vetted script entrypoints), and eliminate or narrow
direct binary entries for "tsx", "eslint", and "prettier" (keep only vetted
paths like "dist/index.js" or explicit read-only flags) so the deny-first policy
cannot be bypassed via lifecycle scripts or file-write-capable executables.

In `@src/generator/permission-constants.ts`:
- [x] Around line 163-172: The allowlist constant LOCAL_GIT_ALLOWS contains an entry
permitting 'Bash(git stash:*)' which contradicts the fail-safe policy in PRD.md
§1.3; remove the 'Bash(git stash:*)' entry from LOCAL_GIT_ALLOWS so agents
cannot auto-stash, and ensure any tests or references (e.g., code that reads
LOCAL_GIT_ALLOWS) are updated to reflect the removed permission.

In `@src/templates/config/AGENTS.md.ejs`:
- [x] Line 60: Update the table row for the ui-designer role so it no longer lists
"GPT-5.x" as a fallback: edit the row containing "ui-designer | **Claude Opus**"
to remove the "GPT-5.x (UI code from approved design)" cell, leaving Claude Opus
as the sole model and keep the existing note/exception below that says GPT-5.x
is allowed only for Phase B implementation; ensure the surrounding phrasing
still enforces "MUST run before `implementer` on any UI/UX task".