Verify each finding against the current code and only fix it if needed.

Inline comments:
In @.claude/settings.json:
- [x] Line 3: The current settings only set "defaultMode": "acceptEdits" but do not
enforce the stricter policy; update the configuration to explicitly disable
sandboxed Bash auto-approval and block bypass mode by adding or updating
"autoAllowBashIfSandboxed": false and "disableBypassPermissionsMode": "disable"
alongside the existing "defaultMode":"acceptEdits" so that acceptEdits cannot be
circumvented.
  - Verified with current Claude Code docs: the root safe branch uses
    `"defaultMode": "default"`, but the missing bypass kill-switch and sandboxed
    Bash auto-approval setting were real. Fixed in the template and regenerated
    `.claude/settings.json`.

In `@PLAN.md`:
- [x] Line 115: The PLAN.md line saying "3. **Known risks (4 items...)" is
inconsistent with Task 5's "5 short risk titles" count and violates the repo
guideline requiring exact task tagging and file paths; update either the Known
risks count or Task 5 so both state the same number (preferably change Task 5 to
"4 short risk titles"), and edit Task 5 to include exact target file paths and
required tags (e.g., add "[UI] [LOGIC] [API] [SCHEMA] [TEST]" and mark as
"[PARALLEL]" only if it can run concurrently), ensuring PLAN.md remains the
single source of truth.

In `@src/generator/permission-constants.ts`:
- [x] Around line 152-154: The wrapper deny list currently expands only
SANDBOX_INNER_DENIES, which misses the full host deny surface; update the
expansion to use the full BASH_DENY_COMMAND_PATTERNS instead of
SANDBOX_INNER_DENIES when building SANDBOX_WRAPPER_DENIES (and apply the same
change to the other wrapper-deny constant(s) referenced later). Locate the
expandWrapper call(s) and replace the second argument from SANDBOX_INNER_DENIES
to BASH_DENY_COMMAND_PATTERNS so wrappers mirror the complete BASH deny
patterns.
- [x] Around line 258-261: The entry 'git branch' in the wrapper allowlist breaks
the read-only inspection boundary because `git branch` permits mutating
subcommands; remove or replace that entry so the allowlist only permits
non-mutating inspection forms (e.g., replace 'git branch' with a restrictive
form like 'git branch --list' or specific safe flags), updating the
permission-constants.ts allowlist where the array contains 'git status', 'git
diff', 'git log', 'git branch' and ensuring no broad 'git branch' pattern
remains.

---

Nitpick comments:
In @.claude/settings.json:
- [x] Around line 4-395: The .claude/settings.json allow/deny lists are duplicated
from the generator; replace the manual duplication by deriving them from the
single source of truth in src/generator/permission-constants.ts (and its
consumer src/generator/permissions.ts): either add a build step that
exports/generates .claude/settings.json from the permission constants or
implement a parity unit test that fails if .claude/settings.json differs from
the constants; to do this, extract the canonical patterns into a shared module
(e.g., permission-constants) used by the generator and by the new
generator/script/test that writes/verifies .claude/settings.json so future
changes are made in one place only.

In `@PRD.md`:
- [x] Line 2128: Header line "## Epic 10 — Semi-Autonomous Non-Interactive Workflow
Mode [MUST] [Done 2026-04-26]" uses inconsistent casing for the status tag;
change the "[Done 2026-04-26]" token to uppercase "[DONE 2026-04-26]" so it
matches the file's convention (look for the exact header string "## Epic 10 —
Semi-Autonomous Non-Interactive Workflow Mode [MUST] [Done 2026-04-26]" and
update the status tag).

In `@src/templates/partials/deployment.md.ejs`:
- [ ] Skipped: Around line 18-97: The deployment policy content in the deployment.md.ejs
template duplicates AGENTS-DEPLOYMENT.md (e.g., sections like "Observability and
SLOs", "Secrets management"), so extract the canonical policy into one source
and have the other include or render from it; update deployment.md.ejs to pull
content via a shared partial or generator (or replace with an include of the
canonical markdown) and remove the duplicated hard-coded blocks, ensuring
references/links and any templating variables are preserved so both places
render the same single-source content.
  - Not verified: `AGENTS-DEPLOYMENT.md` is generated from
    `src/templates/config/AGENTS-DEPLOYMENT.md.ejs`, which includes
    `src/templates/partials/deployment.md.ejs`. The partial is already the
    canonical source; the root file is generated output.

In `@tests/generator/permissions.test.ts`:
- [x] Around line 219-223: The test callback passed to it.each currently relies on
implicit typing for the parameter named pattern; update the callback signature
to include an explicit TypeScript type (e.g., change (pattern) => ... to
(pattern: string) => ...) so the rule requiring annotated function parameters is
satisfied for the it.each call referencing SANDBOX_WRAPPER_BYPASS_REQUIRED in
the test suite.
