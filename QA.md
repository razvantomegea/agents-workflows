Verify each finding against the current code and only fix it if needed.

Inline comments:
In @.claude/settings.json:
- Line 116: The guard regex in the patterns string only treats whitespace as
token boundaries so separators like ";" or "&&" bypass it; update the patterns
variable (the long string assigned to patterns in the command block) to use
shell-token boundaries instead of only [[:space:]] by replacing each
'(^|[[:space:]])' and '([[:space:]]|$)' with a boundary that includes common
shell separators and multi-char operators (e.g.
'(^|[[:space:]]|;|\||&|\(|\)|<|>|\|\||&&)' and
'([[:space:]]|;|\||&|\(|\)|<|>|\|\||&&|$)') so commands like "true;rm -rf ." or
"true && rm -rf ." are matched.

In `@README.md`:
- Around line 185-207: The fenced code block in README.md that shows the project
tree is missing a language tag which triggers markdownlint; update the opening
fence from ``` to ```text (or ```plaintext) so the block explicitly declares its
language and silences the lint warning for the tree snippet.

In `@tests/generator/epic-16-cross-model-routing.test.ts`:
- Around line 17-59: The failing Epic-16 tests in
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
- Around line 23-31: The test helper expectCodexForbiddenToken currently checks
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
- Around line 213-229: The "Deployment rules" section in AGENTS.md duplicates
content and pushes the file past the 200-line cap; move the entire Deployment
rules block into the new AGENTS-DEPLOYMENT.md document (preserve content and
formatting, including headers like "Deployment rules" and checklist items such
as DB migrations, feature flags, and progressive delivery) and replace the
removed block in AGENTS.md with a concise pointer sentence linking to
AGENTS-DEPLOYMENT.md (e.g., "See AGENTS-DEPLOYMENT.md for deployment checklist
and rules"). Ensure AGENTS.md stays under 200 lines after the change.

In `@tests/generator/codex-project-rules.test.ts`:
- Around line 61-76: Scope each assertion to a single prefix_rule(...) block:
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
- Around line 1-9: The test duplicates the allowed-domain literal
(EXPECTED_ALLOWED_DOMAINS); remove the hard-coded array and import the canonical
list from the single source of truth in your codebase (the export in
src/generator/permission-constants.ts, e.g. the
ALLOWED_DOMAINS/ALLOWED_DOMAIN_LIST export) or a shared test fixture, and use
that imported constant in tests (preserve any readonly/`as const` typing if
required by the tests). Ensure the test file (settings-json-shape.helper.ts)
references the exported symbol name exactly and remove the duplicate literal.