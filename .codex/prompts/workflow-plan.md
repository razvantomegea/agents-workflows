---
name: workflow-plan
description: "End-to-end feature planning and execution workflow."
---

Plan and execute a feature or bug fix end-to-end.

## Instructions

### Phase 1 — Branch setup

Create a dedicated branch from up-to-date `main`:

- Features: `feature/<short-kebab-name>`
- Bug fixes: `fix/<short-kebab-name>`
- Epics: `feature/epic-<N>-<short-name>`

```bash
git checkout main && git pull origin main && git checkout -b <branch-name>
```

### Phase 2 — Research & plan

Use the `architect` sub-agent for this phase. Pass it the user's request and relevant context from `CLAUDE.md` and `PRD.md`. The architect agent will:

1. Read `PRD.md`, `CLAUDE.md`, and any other project docs — the planner must read `PRD.md` **first** so the plan reflects documented requirements and non-goals.
2. Analyze the user's request: $ARGUMENTS
3. Grep the codebase for existing components, hooks, utils, types — DRY is non-negotiable.
4. Write a structured plan to `PLAN.md`:
   - Branch name at the top
   - Context (2-3 sentences)
   - Pre-implementation checklist
   - Max 8 tasks with: Files, Input, Output, Notes
   - Tags: `[UI] [LOGIC] [API] [SCHEMA] [TEST]`, `[PARALLEL]` for independent tasks
   - Post-implementation checklist
   - An `## External errors` section at the end (can start empty)
5. Print the plan summary table for the user.

### Phase 3 — Execute all tasks

After writing the plan, **immediately execute every task** in order:

1. For each task in PLAN.md (respecting dependency order):
   - **Route to the correct sub-agent by task tag:**
     - `[TEST]` tasks (unit tests): use the `test-writer` sub-agent.
     - All other tasks: use the `implementer` sub-agent (default).
   - Pass the full task block (Files, Input, Output, Notes) as context.
   - Tasks tagged `[PARALLEL]` with no dependencies: launch their sub-agents in parallel.
   - After each task completes, run the `code-reviewer` sub-agent on all modified files.
   - Apply every critical and warning finding immediately via `implementer`.

   **Per-task verification rules**

   - NEVER run `git stash` or any git working-tree manipulation during verification.
   - Only fix errors in files that the **current task** explicitly modified.
   - If errors appear in files **outside** the current task's scope, record them under **External errors**.

2. **Post-implementation optimization**: After all tasks and reviews, run the `code-optimizer` sub-agent on all modified files. Apply any critical findings via `implementer`.

3. **Final review loop**: Run the `reviewer` sub-agent, passing all modified file paths. The reviewer orchestrates:
   1. `code-reviewer` on all modified files
   2. `implementer` applies all critical/warning findings
   3. `pnpm check-types` — must pass
   4. `pnpm test` — must pass
   Repeat until both checks pass clean.
   Also run `pnpm lint` after the loop passes.

   **External errors policy**

   1. Append a short line to `PLAN.md` under `## External errors`.
   2. Do NOT edit unrelated files.

4. **Mandatory external review**: invoke the `/external-review` slash command after the reviewer loop and lint are clean. This runs CodeRabbit CLI against the diff on the current branch and writes findings to `QA.md`. External-review findings (critical and warning) must be resolved via `/workflow-fix QA.md` (pass `QA.md` as the argument) before the workflow is considered complete. Do NOT skip this gate — it is the final cross-model check required by §1.7 of the PRD.

5. Record final summary inputs: what was implemented, files changed, any open questions, and any external errors.

### Phase 4 — Mark epic done in `PRD.md` (if applicable)

If the user's request referenced a documented epic in `PRD.md` (pattern: `## Epic N — <title>` with `[MUST]` / `[SHOULD]` / `[NICE]` tag, or a copy-pasted epic header):

1. Locate the epic header in `PRD.md`.
2. Mark only PRD checklist items or task headings that are confirmed complete by the completed `PLAN.md` tasks.
3. Leave incomplete or unmatched items unchanged and report the mismatch in the final summary.
4. Append `[DONE YYYY-MM-DD]` (today's date) to the epic header only when every task item under that epic is confirmed complete.
5. Add a one-line `**Landed on** \`<branch-name>\`.` note under the header only when it is not already present.

Skip this phase when the request was not tied to a documented epic.

### Phase 5 — Done

Print a final summary: what was implemented, files changed, documentation items marked done, any unmatched documentation items, any open questions, and any external errors.

The user will review the code and commit when satisfied.

## Git rules

- **NEVER commit or push.** The user decides when to commit.
- Only exception: merging `main` into the feature branch to resolve conflicts.
