---
name: workflow-fix
description: "Fix verified QA issues from QA.md."
---

Fix all QA issues listed in QA.md on the current feature branch.

## Instructions

1. Read `QA.md` from the repository root. Each issue may include a description, steps to reproduce, expected vs actual behavior, and affected files.
2. **Critical evaluation**: QA.md observations may not all be correct — some come from automated tools. Before applying any fix, verify the observation against the actual code. Skip incorrect observations and note why.
3. If `QA.md` says "All good" or contains no unchecked issues, skip to step 6.
4. Read `PLAN.md` to understand what was recently implemented and which files were modified.
5. Fix every **verified** issue in `QA.md`, one at a time:
   - Read the relevant files to understand current state.
   - Confirm the issue is real and the suggested fix is correct.
   - Use the `implementer` sub-agent to apply the fix.
   - Mark the issue as done in `QA.md` with `[x]`.
6. Run the mandatory review loop on all modified files:
   1. Run `code-reviewer` and `security-reviewer` in parallel on all modified files
   2. `implementer` applies all critical/warning findings from both reviewers
   3. `pnpm check-types` — must pass
   4. `pnpm test` — must pass
   Repeat until all listed checks pass.
   Also run `pnpm lint` after the loop passes (intentional: final hygiene gate once type-check and tests are green).

   **Verification rules**

   - NEVER run `git stash` or any git working-tree manipulation.
   - Only fix errors in files related to the current QA issue.
   - If `pnpm check-types` or `pnpm test` fails on files **unrelated** to the current QA fixes, **stop the loop immediately** and report the failure as an **unresolved external failure**. Do not fix unrelated files.

7. Record summary inputs: which issues were fixed, which were skipped (and why), files changed.

8. **Update `PRD.md` (if applicable)**: if the QA pass was tied to a documented epic or known bug, mark only the matching PRD checklist items or task headings that are confirmed complete. Append `[DONE YYYY-MM-DD]` to the epic header only when every task item under that epic is confirmed complete. Leave incomplete or unmatched PRD items unchanged and report the mismatch in the final summary. Skip when QA was not tied to a documented epic or bug.
9. Print a final summary: which issues were fixed, which were skipped (and why), files changed, PRD items marked done, any unmatched PRD items, and any unresolved issues.

## Git rules

- **NEVER commit or push.** The user decides when to commit.
- Only exception: merging `main` to resolve conflicts.
