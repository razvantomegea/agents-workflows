## /workflow-fix status — 2026-04-28

All findings below were verified against the current code and applied unless
explicitly noted as `[skip]`. Tests + check-types green after every fix batch.

### Inline (high-severity) findings — all applied

- [x] **PRD.md ~2117-2125** — E9.T8 status: removed "Cascade approval-mode README documentation is pending" note; added README §"Per-tool reference" paragraph documenting Manual-or-Auto requirement (Yolo forbidden) and pairing with branch protection.
- [x] **PRD.md ~87-90 / ~2029** — Epic 9/E9.T6–T8 contradiction: rewrote Epic 9 body "Landed on" line to record that E9.T6–T8 landed on `feature/epic-11-multi-ide-targets` once the per-target plumbing existed, removing the now-stale "blocked" wording. Release table row already says shipped 2026-04-28; both states are now consistent.
- [skip] **QA.md line 1 ("docsfile" typo)** — Skipped: line 1 of the QA.md committed to this branch reads "Verify each finding against the current code and only fix it if needed." There is no checklist line about a docs/roadmap file in the current QA.md, so the typo cannot be fixed where it was reported. The CodeRabbit comment is showing a *prior* version of QA.md that no longer exists on this branch — the line has already been removed during the Epic 11 commit. (For reference, that prior line was "Missing roadmap file and docsfile asking/confirmation on update. Only on init it is present".)
- [x] **README.md line 257** — Split `AGENTS.md` (agent-facing universal instructions) and `.agents-workflows.json` (CLI manifest/state surface) into two distinct bullets; added a flag-the-mismatch note for README ↔ code drift.
- [x] **src/cli/update-command.ts ~66-69** — `nonInteractive` now propagates: `promptsSuppressed = Boolean(options.yes || options.noPrompt || options.nonInteractive)`, and the inline `confirm()` at line 105 already gates on `promptsSuppressed`. `resolveUpdateProjectConfig` already returned `params.existing` when `promptsSuppressed`, so it now correctly skips prompts under `--non-interactive`.
- [x] **src/generator/list-partials.ts ~18-35** — Cache now stores `Object.freeze([...partials])` and returns `[...cache]` on every call so callers cannot mutate cached state.
- [x] **src/generator/managed-sentinel.ts ~9-13** — `lastIndexOf` → `indexOf` so the first managed-end sentinel is the split point; user-tail content containing the sentinel is no longer reclassified as managed.
- [x] **src/templates/windsurf/workflow.md.ejs line 2** — Replaced raw `"<%= description %>"` with `<%- jsonString(description) %>` (using the existing template helper) so YAML-special characters are properly escaped.
- [x] **tests/prompt/prompt-flow.test.ts ~1-3** — Added `rm` import and an `afterEach` hook that recursively removes any `mkdtemp`-created tempRoot. Only one mkdtemp location exists in the file (~line 256-263 referenced by QA was the same block).

### Nitpick findings — all applied

- [x] **src/cli/update-command.ts ~145-166** — Moved `resolveUpdateProjectConfig` to its own module `src/cli/resolve-update-project-config.ts`; `update-command.ts` imports + re-exports it for backward compatibility with the existing dynamic-import test.
- [x] **src/generator/copilot/render-prompt-file.ts ~17-42** — Extracted `COPILOT_PROMPTS` and `CopilotPromptDef` to `src/generator/copilot/prompt-registry.ts`. Note: Cursor and Windsurf intentionally retain their own command/workflow registries because their per-target shapes differ (no `argumentHint`/`configKey` for Windsurf workflows) — sharing would force-couple unrelated metadata.
- [x] **src/generator/index.ts ~29-31** — Added optional `discoveredPartials` to `GeneratorContext`. `generateAll()` runs `listPartials()` once and attaches the result; Cursor and Windsurf now read `context.discoveredPartials` (with lazy fallback for callers who build a context outside `generateAll`).
- [x] **src/generator/partial-activation-map.ts ~60-80** — Added `ALWAYS_ON_SLUG_SET` and `MODEL_DECISION_SLUG_SET` (private `ReadonlySet<string>`). `getPartialActivation` and `isKnownActivationSlug` now use `.has()` lookups; the original arrays are still exported for parity tests.
- [x] **src/generator/windsurf/render-workflow-file.ts ~42-43** — Renamed callback param `wf` → `workflow` in both the `.filter()` and `.map()` callbacks.
- [x] **src/prompt/questions.ts line 49** — Renamed `.map((r) => r.trim())` → `.map((rule: string) => rule.trim())`.
- [x] **src/templates/copilot/prompt.md.ejs ~2-4** — All YAML scalar fields (`description`, `name`, `argument-hint`, `model`, each `tools` entry) now emit via `<%- jsonString(...) %>` for safe quoting.
- [x] **tests/generator/generate-copilot-config.test.ts ~18-43** — Imported `GeneratedFile`, typed every `find`/`filter`/`map` callback param explicitly. Extracted shared `TARGETS_COPILOT_OFF` and `TARGETS_COPILOT_ON` constants.
- [x] **tests/generator/generate-cursor-config.test.ts line 10** — Extracted `TARGETS_CURSOR_OFF` and `TARGETS_CURSOR_ON` constants; all four call sites now reference the shared constants.
- [x] **tests/generator/generate-windsurf-config.test.ts ~19-33** — Imported `GeneratedFile` and `PartialEntry`, typed every callback explicitly. Added `TARGETS_WINDSURF_OFF`/`TARGETS_WINDSURF_ON` constants.
- [x] **tests/generator/multi-target-deny-rules.test.ts ~14-45** — Cached `renderAllTargets()` in a single `beforeAll` (throws if undefined); each `it` block now reads from the shared `files` variable.
- [x] **tests/generator/multi-target-parity.test.ts ~8-48** — Renamed `f` → `file`, `p` → `path`; all callbacks now use `(file: GeneratedFile)` and `(path: string)` explicit annotations.
- [x] **tests/generator/target-merge-rerun.test.ts ~27-59** — Refactored the two re-run merge tests into a single `it.each` table-driven test with a typed `MergeRerunCase` interface.
- [x] **tests/prompt/ask-targets.test.ts line 4** — `cliAvailable` now has an explicit `boolean` annotation while preserving the `= false` default.

### Verification

- `pnpm check-types` — clean
- `pnpm test` — 63 suites / 739 tests passing
- `pnpm lint` — to be run by the review-loop step
