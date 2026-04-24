# QA Review

## CodeRabbit Review - 2026-04-23

> **Warning**: These findings come from an automated tool (CodeRabbit) and may be inaccurate or
> based on incomplete context. Before applying any fix, verify the observation against the actual
> code. Skip findings that are wrong or do not apply.

### .github/workflows/ci.yml
- [ ] [warning] Lines 33–37: Add a CI step to run the linter (`pnpm lint`) in the same job as `Check types` and `Run tests`. Place it before `Run tests` so style issues fail fast.

### src/templates/partials/architect-fail-safe.md.ejs
- [ ] [suggestion] Lines 1–15: File appears to have been converted to CRLF; revert to LF and add a `.gitattributes` rule enforcing LF for `*.md` and `*.ejs`, then `git add --renormalize .`.

### .claude/agents/test-writer.md
- [ ] [warning] Line 40: Doc says tests live in a separate `tests/` directory; project convention is colocated tests (`foo.ts` → `foo.test.ts` next to it). Update the wording.

### .codex/skills/test-writer/SKILL.md
- [ ] [warning] Line 38: Same as above — replace "Separate directory — tests live in `tests/`" with "Colocated tests — place `foo.test.ts` next to `foo.ts`".

### tests/generator/epic-1-safety.test.ts
- [ ] [warning] Lines 29–30: Several `files.find((file) => …)` callbacks use implicit parameter types. Annotate them with the `GeneratedFile` (or correct) type.

### src/templates/partials/stack-context.md.ejs
- [ ] [suggestion] Line 3: `stackItems.forEach(...)` is called without guarding against null/undefined. Wrap in `Array.isArray(stackItems)` or `stackItems != null`.

### src/prompt/detected-ai-flags.ts
- [ ] [warning] Line 7: The callback passed to `detected.aiAgents.agents.find(...)` uses an implicitly typed `candidate` parameter. Add an explicit type annotation (e.g., `candidate: Agent`).

### .claude/agents/ui-designer.md
- [ ] [warning] Lines 19–23: References `README.md` as the canonical-source document; project convention is `PRD.md`. Update both the "read this first" line and the disagreement-handling line.

### .claude/scratchpad/review-task-epic5.md
- [ ] [suggestion] Lines 48–50: W4 finding about CWD-dependent relative path — use `path.resolve(__dirname, '../../src/templates/partials')` to make path resolution Jest-CWD-independent. (Scratchpad file, not shipped product code.)
- [ ] [suggestion] Lines 20–21: Test file `epic-5-hooks.test.ts` declares local interfaces `CommandHook`, `HookEntry`, `SettingsJson` that duplicate types in `src/generator/types.ts`. Import the canonical types instead. (Scratchpad file, not shipped product code.)

### src/templates/partials/testing-patterns.md.ejs
- [ ] [suggestion] Line 26: `<%= testsDir %>` rendered without guarding for `undefined`. Wrap with `<% if (typeof testsDir !== 'undefined') { -%>` or render a fallback.
- [ ] [suggestion] Line 49: `conventions.maxFileLength` rendered without guarding. Wrap in `<% if (conventions.maxFileLength) { -%>` or fall back to a default.

### src/templates/partials/observability.md.ejs
- [x] [warning] Lines 17–20: Claim that the OpenTelemetry profiles signal is "stable, OTel spec 2025" is incorrect — it is currently development/alpha. Soften the wording and add a caution against critical-production use.

### src/templates/governance/oscal-component.json.ejs
- [x] [suggestion] Line 8: `oscal-version` is `"1.1.2"`; updated to `"1.2.1"` (verified latest stable from usnistgov/OSCAL releases). COMPLIANCE.md.ejs and the OSCAL test assertion updated to match.

### PLAN.md
- [x] [suggestion] Line 140: Task 7 lists `tests/detector/__snapshots__/` as a vague pattern. Replaced with explicit `tests/detector/__snapshots__/detect-ai-agents.test.ts.snap`.
- [x] [suggestion] Lines 170–178: Summary-table count for Task 7 reconciled to 3 (matches the 3-item Files list).
