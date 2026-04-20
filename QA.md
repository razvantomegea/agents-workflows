Verify each finding against the current code and only fix it if needed.

Inline comments:
In `@QA.md`:
- Line 1: QA.md currently says "All good!" which must be replaced with
verifiable gate results; update QA.md to list each gate (e.g., Code Review,
Security Scan, Type-check, Unit Tests, Integration Tests, Linter), the exact
command or CI job name used to run it, the pass/fail status for each, links or
artifact names (build IDs, test report URLs, SCA/vulnerability report IDs),
timestamp and reviewer initials/PR reviewer, and any outstanding actions; locate
the placeholder "All good!" in QA.md and replace it with that structured
evidence so audits can reproduce and verify the completion criteria.

In `@src/templates/agents/architect.md.ejs`:
- Around line 41-43: The EXPLORE step in the architect template omits an
explicit instruction to read/verify PRD.md; update the EXPLORE bullet to require
reading PRD.md (e.g., "EXPLORE: read PRD.md and CLAUDE.md...") and add a
consistency check ensuring proposed components, hooks, utils, types, constants,
and patterns align with PRD.md; keep the existing conditional pieces (`<% if
(componentsDir) { %>` and `<% if (localeRules.length > 0) { %>`) and ensure the
PLAN bullets still reference `PLAN.md` pre- and post-implementation checklists.

In `@src/templates/agents/implementer.md.ejs`:
- Around line 27-30: The TDD discipline partial (<%-
include('../partials/tdd-discipline.md.ejs') %> / symbol <tdd_discipline>)
conflicts with the current "When invoked" sequence that performs "implement"
before "add/update tests"; reorder the steps in
src/templates/agents/implementer.md.ejs so the TDD step (add/update failing
tests) appears before any "implement" or "fix code" step, or move the <%-
include('../partials/tdd-discipline.md.ejs') %> include to precede the
implementation section; update the sequence language to reflect "add/update
tests (failing) -> implement -> run tests" to enforce failing-test-first
behavior.

In `@tests/generator/epic-2-quality.test.ts`:
- Line 23: The test callbacks use inferred parameter types; update the arrow
functions used with files.find and .filter to declare explicit parameter types:
change the find callback parameter to (file: GeneratedFile) when computing
agentFile and change the filter callback parameter to (name: string) for the
name-based filter; ensure the GeneratedFile type is imported/available in the
scope where these callbacks are defined (so the test compiles with explicit
typings).

---

Nitpick comments:
In `@src/templates/partials/tdd-discipline.md.ejs`:
- Around line 3-10: Add an explicit first checklist bullet to the existing
tdd_discipline block that requires reading PRD.md before authoring tests; update
the <tdd_discipline> list (the template fragment labeled tdd_discipline) to
insert a top item like "Read PRD.md before planning, implementing, reviewing, or
writing tests" so requirements and non-goals are referenced up front and precede
the current bullets.