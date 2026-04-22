# Plan - Epic 6: Extended Code Standards
_Branch: `feature/epic-6-extended-standards` | Date: 2026-04-22_

## Context

Epic 6 extends the `agents-workflows` template library with seven new partials (supply-chain, observability, design-principles, refactoring, performance, deployment, concurrency), one MADR ADR seed, one GitHub release workflow, one standalone `SUPPLY_CHAIN.md` governance doc, and expanded Tooling + Deployment sections in `AGENTS.md.ejs`. Covers PRD sections §2.3, §2.7, §2.9, §2.10, §2.11, §2.14, §2.15, §2.16, §2.17 (tasks E6.T1–E6.T9, compressed to 8 plan tasks per workflow cap).

Key pipeline fact discovered during exploration: EJS partials referenced via `<%- include('../partials/xxx.md.ejs') %>` render automatically when the host agent template is generated. **Standalone output files** (new `SUPPLY_CHAIN.md`, `.github/workflows/release.yml`, `docs/decisions/0001-adr-template.md`) do NOT auto-emit — they must be wired into `src/generator/generate-root-config.ts` via explicit `renderTemplate(...)` + `files.push({ path, content })` calls.

## Pre-implementation checklist

- [ ] Read `PRD.md` lines 884–918, 1015–1042, 1071–1101, 1103–1127, 1129–1151, 1213–1239, 1241–1266, 1268–1295, 1297–1322, 1677–1714
- [ ] Read `CLAUDE.md` (files ≤200 lines, no `any`, DRY, Jest only for real logic, sub-agent routing)
- [ ] Grepped `src/templates/` for duplicates — confirmed: only brief one-line mentions exist in `review-checklist.md.ejs` (SBOM, observability, MADR, Ousterhout, Metz) and `security-reviewer.md.ejs` (SBOM bullet). Full partials are safe to add without content collision; cross-reference in notes rather than copy.
- [ ] Confirmed EJS include syntax: `<%- include('../partials/<name>.md.ejs') %>` (verified in `implementer.md.ejs` L11–L36, `architect.md.ejs` L11–L19, `code-optimizer.md.ejs` L11–L21). No context object is required for static partials — only partials that need data (e.g. `stack-context`, `code-style`) pass one.
- [ ] Pipeline impact understood: new partials auto-render when included by an agent template; new standalone files (`SUPPLY_CHAIN.md`, `release.yml`, `0001-adr-template.md`) must be explicitly added to `generateRootConfig` in `src/generator/generate-root-config.ts`.
- [ ] Verified no type duplication — all new `.ts` changes reuse existing `GeneratedFile` / `GeneratorContext` types from `src/generator/types.ts`.
- [ ] Confirmed no magic numbers — budget values in performance partial (170KB, 2.5s, 200ms, 0.1) are literal PRD values, documented inline.

## Tasks

### Task 1 - Supply-chain partial + standalone doc + release workflow [SCHEMA] [LOGIC]
**Files**:
- `src/templates/partials/supply-chain.md.ejs` (new)
- `src/templates/governance/SUPPLY_CHAIN.md.ejs` (new)
- `src/templates/ci/release.yml.ejs` (new, creates `src/templates/ci/` dir)
- `src/templates/agents/security-reviewer.md.ejs` (edit — add `<%- include('../partials/supply-chain.md.ejs') %>`)
- `src/generator/generate-root-config.ts` (edit — emit `SUPPLY_CHAIN.md` and `.github/workflows/release.yml`)

**Input**: PRD §2.3 paste-ready snippet (lines 894–918). E6.T1 acceptance: workflow pins `actions/*` by full 40-char commit SHA; workflow declares default-deny `permissions: {}` at top level and grants only minimum per-job scopes (`contents: read`, `id-token: write` for cosign OIDC).

**Output**:
- Partial containing the PRD §2.3 "Supply-chain rules" and "For published artifacts" blocks (CycloneDX via Syft, cosign keyless, SLSA L2, EU CRA readiness, slopsquatting defense).
- `SUPPLY_CHAIN.md` rendered at repo root of the target project (or `docs/SUPPLY_CHAIN.md` — match existing `docs/GOVERNANCE.md` precedent in `generate-root-config.ts` L33).
- `release.yml` rendered at `.github/workflows/release.yml` of target project, gated behind `config.governance.enabled` (follow existing PR template + governance gating pattern L27).

**Notes**:
- File-size gotcha: partial must stay ≤200 lines; the full PRD snippet is ~25 lines of rules, safely under limit. `SUPPLY_CHAIN.md.ejs` reuses the partial via `<%- include('../partials/supply-chain.md.ejs') %>` to keep DRY — do NOT copy content into both files.
- EJS `actions/checkout@<sha>` strings must be literal; do not accidentally templatize them.
- The existing `security-reviewer.md.ejs` L83 "Dependency and supply chain" section stays — the new partial augments it with build-time signing/SBOM rules. Verify no duplicate bullet phrasing.
- Rendered `release.yml` must be valid YAML after EJS render (no stray `<%` leaking). Use `<%- ... %>` only for project-name interpolation; keep the workflow body verbatim.
- DRY risk: the `SUPPLY_CHAIN.md.ejs` governance doc is a thin wrapper around the partial — that is intentional reuse, not duplication.
- Emit the governance file only when `config.governance.enabled === true` (match GOVERNANCE.md behavior). `release.yml` also governance-gated.

---

### Task 2 - Observability partial [SCHEMA] [PARALLEL]
**Files**:
- `src/templates/partials/observability.md.ejs` (new)
- `src/templates/agents/implementer.md.ejs` (edit — add include after `error-handling-code.md.ejs` L35)
- `src/templates/agents/code-reviewer.md.ejs` (edit — add include after `error-handling-code.md.ejs` L19)

**Input**: PRD §2.7 paste-ready snippet (lines 1026–1042). E6.T2 scope: OTel SDK + OTLP, W3C `traceparent`, SLIs/SLOs, structured logs, PII redaction, low-cardinality labels.

**Output**: Partial rendered in implementer + code-reviewer outputs. Includes: structured-log contract, log levels, PII redaction at logger (allowlist), OTel instrumentation boundaries (HTTP/RPC/DB), SLIs/SLOs per service, label-cardinality rules, optional continuous profiling.

**Notes**:
- `review-checklist.md.ejs` L57–L59 already has a brief "Observability" checklist row mentioning OpenTelemetry — the new partial expands it, does not replace it. Cross-reference in code-reviewer: the checklist row stays for review gating; the partial gives the full standard.
- PARALLEL with Task 3, 4, 5, 7 — all edit disjoint partials + disjoint agent include lines.
- Keep file ≤70 lines (PRD snippet is ~17 lines of bullets).

---

### Task 3 - Design-principles partial [SCHEMA] [PARALLEL]
**Files**:
- `src/templates/partials/design-principles.md.ejs` (new)
- `src/templates/agents/architect.md.ejs` (edit — add include after `subagent-delegation.md.ejs` L19, before `## Planning protocol`)
- `src/templates/agents/code-reviewer.md.ejs` (edit — add include after the Task 2 observability include)

**Input**: PRD §2.9 paste-ready snippet (lines 1083–1101). Content: composition over inheritance, deep modules (Ousterhout), duplication > wrong abstraction (Metz, Rule of Three), locality of behavior (Gross), functional core/imperative shell (Bernhardt), SOLID-as-vocabulary, AHA, data-oriented hot paths.

**Output**: Partial rendered in architect + code-reviewer. Gives both agents the same 2025–2026 design vocabulary.

**Notes**:
- `review-checklist.md.ejs` L43–L45 already has "Rule of Three" and "Ousterhout" one-liners; keep them (they drive checklist gating) and let the partial provide the full rationale. Document this split in the partial header comment.
- PARALLEL with Tasks 2, 4, 5, 7 (disjoint edits).
- Ordering note: include `design-principles` in `code-reviewer.md.ejs` AFTER `observability.md.ejs` to keep Task 2 and Task 3 edits additive with clear insertion points. If parallelized, merge conflicts at the same line may occur — if running in parallel, one task must apply first and the other rebases on the resulting file.

---

### Task 4 - Refactoring + Performance partials [SCHEMA]
**Files**:
- `src/templates/partials/refactoring.md.ejs` (new)
- `src/templates/partials/performance.md.ejs` (new)
- `src/templates/agents/code-optimizer.md.ejs` (edit — add both includes after `error-handling-self.md.ejs` L21)
- `src/templates/agents/ui-designer.md.ejs` (edit — add `performance.md.ejs` include after `accessibility.md.ejs` L19)

**Input**:
- PRD §2.10 snippet (lines 1115–1127): behavior-preserving transforms, preparatory refactoring (Beck), strangler fig, branch-by-abstraction, tagged TODOs, Fowler debt quadrant, Boy Scout Rule.
- PRD §2.11 snippet (lines 1141–1151): profile before optimize, Big-O flagging, web performance budget (JS ≤170KB, LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 at p75), CI budget enforcement, hot-path data-oriented exception.

**Output**: Two separate partials. `refactoring.md.ejs` → code-optimizer only. `performance.md.ejs` → code-optimizer + ui-designer.

**Notes**:
- E6.T5 acceptance: web budget bullet **only emitted when UI framework detected** — wrap that bullet in `<% if (isFrontend || isMobile) { %> ... <% } %>` using the existing `isFrontend`/`isMobile` context flags from `build-context.ts` L14–L17. Verify flag availability in `GeneratorContext` (types.ts L36–L38).
- Combines E6.T4 + E6.T5 into one plan task (both edit `code-optimizer.md.ejs` and are tightly related) — saves one task slot. Apply both include lines in a single edit.
- DRY risk: performance partial's "profile before optimizing" bullet overlaps in spirit with code-optimizer's existing "Measure or reason about performance impact" line in `code-optimizer.md.ejs` L27. Keep the partial authoritative; the existing line stays as process guidance. Document the split.
- Conditional rendering requires the partial's `include(...)` call in `ui-designer.md.ejs` to pass `isFrontend` / `isMobile` explicitly OR rely on top-level context — verify by checking how `accessibility.md.ejs` accesses context (it uses none — top-level context is implicitly available). So no extra data object needed on include.

---

### Task 5 - Concurrency partial [SCHEMA]
**Files**:
- `src/templates/partials/concurrency.md.ejs` (new)
- `src/templates/agents/implementer.md.ejs` (edit — add include after Task 2's observability include, before `## When invoked` L38)

**Input**: PRD §2.17 snippet (lines 1309–1322): shared-nothing default, structured concurrency (TaskGroup / nursery / coroutineScope), cooperative cancellation, scoped deadlines, never-block-event-loop, bounded concurrency, consistent lock ordering, no-lock-across-await.

**Output**: Partial rendered in `implementer.md`. Single-language-agnostic file citing Python 3.11+ TaskGroup, Swift, Kotlin, Java 21, Trio/AnyIO, Go channels.

**Notes**:
- NOT parallel with Task 2: both edit `implementer.md.ejs`. Sequence Task 2 first, then Task 5, so insertion anchors don't clash.
- ≤30 lines expected.

---

### Task 6 - ADR seed template + documentation guidance [SCHEMA] [LOGIC]
**Files**:
- `src/templates/docs/decisions/0001-adr-template.md.ejs` (new, creates `src/templates/docs/decisions/` dir)
- `src/templates/partials/documentation.md.ejs` (new — PRD §2.14 architect snippet)
- `src/templates/agents/architect.md.ejs` (edit — add `documentation.md.ejs` include after `design-principles.md.ejs` from Task 3)
- `src/templates/agents/code-reviewer.md.ejs` (edit — add `documentation.md.ejs` include)
- `src/generator/generate-root-config.ts` (edit — emit `docs/decisions/0001-adr-template.md` on init, gated on a sensible condition — see Notes)

**Input**:
- PRD §2.14 (lines 1213–1239). MADR 4 fields: Context, Decision Drivers, Considered Options, Decision, Consequences. Diátaxis README structure. Comments-explain-why. C4 Levels 1–2.
- E6.T6 acceptance: "MADR 4 template scaffolded on init."

**Output**:
- `docs/decisions/0001-adr-template.md` written to target project root.
- Partial embedded in architect + code-reviewer outputs defining ADR/README/comment/diagram rules.

**Notes**:
- Gating question for the ADR seed emit: PRD says "scaffolded on init" — safest gate is always emit. Alternative: gate on `config.governance.enabled` to match `GOVERNANCE.md` precedent. RECOMMEND: always emit, because MADR scaffolding is lightweight and has no coupling to governance toggle. Confirm with user if in doubt — but default to always-emit in implementation.
- DRY split between partial and ADR template: the `.md.ejs` file is the **filled template skeleton** (headings + placeholder prose per MADR 4); the partial is the **rules for when/how to write ADRs**. No content overlap.
- Ordering with Task 3: this task edits `architect.md.ejs` and `code-reviewer.md.ejs` at include lines that Task 3 also touches. Run Task 3 first, then Task 6 — NOT parallel with Task 3.
- Naming: keep `documentation.md.ejs` (not `adr.md.ejs`) because partial covers ADR + README + comments + C4 diagrams collectively.

---

### Task 7 - Tooling + Deployment partials + wiring into `AGENTS.md.ejs` [SCHEMA]
**Files**:
- `src/templates/partials/tooling.md.ejs` (new — PRD §2.15 snippet)
- `src/templates/partials/deployment.md.ejs` (new — PRD §2.16 snippet)
- `src/templates/config/AGENTS.md.ejs` (edit — add `<%- include('../partials/tooling.md.ejs') %>` and `<%- include('../partials/deployment.md.ejs') %>` before `<!-- agents-workflows:managed-end -->` at L144)

**Input**:
- PRD §2.15 snippet (lines 1252–1266): one-formatter-per-language, `.editorconfig`, type-check-in-CI, Biome-for-new-projects + ESLint-legacy guidance, treewide-format + `.git-blame-ignore-revs`, CodeQL/Semgrep/SonarQube/audit tools.
- PRD §2.16 snippet (lines 1279–1295): env-based config + typed schema, stateless processes, dev/prod parity, OpenFeature + provider, progressive delivery (Argo Rollouts / Flagger), expand-contract migrations.
- E6.T7 + E6.T8 acceptance: Biome-vs-ESLint guidance + CodeQL/Semgrep present; expand-contract migration + OpenFeature + progressive-delivery rules present.

**Output**: Two new partials, both included near the end of `AGENTS.md.ejs`. Keeps `AGENTS.md.ejs` under 200 lines (currently 144 — two include lines add 2 lines).

**Notes**:
- Combines E6.T7 + E6.T8 into one plan task (both edit `AGENTS.md.ejs` — avoids two separate edits to the same file).
- Rationale for partial-based approach: inline sections would push `AGENTS.md.ejs` past 200 lines. Using partials also lets `implementer.md` / other agents include the same content later if desired.
- DRY risk: `AGENTS.md.ejs` L110 already has "Always use `<%= tooling.packageManagerPrefix %>` for running scripts." The new Tooling partial must NOT duplicate that line — scope it to formatters, linters, type-checkers, static analysis.
- `coderabbit-setup.md.ejs` mentions supply-chain curl/sh safety — does not overlap with deployment content.
- The Tooling partial should reference `tooling.linter` / `tooling.formatter` from context ONLY if naming the detected tool adds value; otherwise keep language-agnostic per the PRD snippet.

---

### Task 8 - Verification pass [TEST]
**Files**:
- No new template files. Execution and optional test-file only.
- Possible new: `src/generator/__tests__/generate-root-config.test.ts` (only if generator-output coverage does not already exist — see Notes).

**Input**: All files created/edited in Tasks 1–7.

**Output**: Proof the generator still produces valid output. Specifically:
- `pnpm check-types` passes (zero errors).
- `pnpm test` passes.
- `pnpm lint` clean (Oxlint).
- Manual: run the CLI entry against a fixture StackConfig (governance enabled, frontend framework) and confirm the new files (`SUPPLY_CHAIN.md`, `release.yml`, `0001-adr-template.md`) appear and all partials render without stray `<% %>` leakage.

**Notes**:
- Epic 6 adds **minimal new TypeScript logic** — the only `.ts` changes are 2–3 `files.push({...})` entries in `generate-root-config.ts`. Per CLAUDE.md: "only add Jest tests when there is actual logic to test." If `generate-root-config.ts` already has a snapshot or behavior test, extending the existing coverage is sufficient. If NOT, add one focused Jest test asserting:
  1. `generateRootConfig` emits `SUPPLY_CHAIN.md` + `release.yml` iff `config.governance.enabled === true`.
  2. `generateRootConfig` emits `docs/decisions/0001-adr-template.md` unconditionally (per Task 6 decision).
- Check `src/generator/__tests__/` (or sibling test dir) before authoring — do not duplicate snapshot tests.
- This task is the gate for the external code-review + security-review loop in the post-implementation checklist.

---

## Task summary table

| # | Title | Tags | New files | Edited files |
|---|---|---|---|---|
| 1 | Supply-chain partial + doc + release workflow | `[SCHEMA] [LOGIC]` | `partials/supply-chain.md.ejs`, `governance/SUPPLY_CHAIN.md.ejs`, `ci/release.yml.ejs` | `agents/security-reviewer.md.ejs`, `generator/generate-root-config.ts` |
| 2 | Observability partial | `[SCHEMA] [PARALLEL]` | `partials/observability.md.ejs` | `agents/implementer.md.ejs`, `agents/code-reviewer.md.ejs` |
| 3 | Design-principles partial | `[SCHEMA] [PARALLEL]` | `partials/design-principles.md.ejs` | `agents/architect.md.ejs`, `agents/code-reviewer.md.ejs` |
| 4 | Refactoring + Performance partials | `[SCHEMA]` | `partials/refactoring.md.ejs`, `partials/performance.md.ejs` | `agents/code-optimizer.md.ejs`, `agents/ui-designer.md.ejs` |
| 5 | Concurrency partial | `[SCHEMA]` | `partials/concurrency.md.ejs` | `agents/implementer.md.ejs` |
| 6 | ADR seed + documentation partial | `[SCHEMA] [LOGIC]` | `docs/decisions/0001-adr-template.md.ejs`, `partials/documentation.md.ejs` | `agents/architect.md.ejs`, `agents/code-reviewer.md.ejs`, `generator/generate-root-config.ts` |
| 7 | Tooling + Deployment partials in `AGENTS.md.ejs` | `[SCHEMA]` | `partials/tooling.md.ejs`, `partials/deployment.md.ejs` | `config/AGENTS.md.ejs` |
| 8 | Verification pass | `[TEST]` | (optional) `generator/__tests__/generate-root-config.test.ts` | — |

---

## Post-implementation checklist

- [ ] `pnpm check-types` — zero errors
- [ ] `pnpm test` — all suites pass (existing + any new governance-gating test)
- [ ] `pnpm lint` — zero warnings (Oxlint)
- [ ] Every new/edited file ≤200 lines (measure with `wc -l`)
- [ ] No `any` types introduced in `src/generator/generate-root-config.ts` or any other `.ts` edit
- [ ] Render a fixture StackConfig (governance enabled, frontend framework) and confirm these files appear in generated output:
  - [ ] `docs/SUPPLY_CHAIN.md` (or root `SUPPLY_CHAIN.md` — match decision in Task 1)
  - [ ] `.github/workflows/release.yml`
  - [ ] `docs/decisions/0001-adr-template.md`
- [ ] Render a fixture StackConfig with governance disabled — confirm supply-chain + release.yml are omitted; ADR seed emits per Task 6 gating decision
- [ ] Render a fixture StackConfig with `isFrontend === false` — confirm performance partial's web-budget bullet is suppressed (E6.T5 acceptance)
- [ ] Launch `code-reviewer` agent on all modified files — fix every critical and warning finding
- [ ] Launch `security-reviewer` agent in parallel (focus on `release.yml` SHA pinning, permissions default-deny, OIDC token scope)
- [ ] Launch `code-optimizer` pass on `generate-root-config.ts` — flag any DRY violations introduced
- [ ] External review (fresh-context, different model family) on final diff
- [ ] DRY scan complete — no duplicated content between new partials and existing `review-checklist.md.ejs` / `security-reviewer.md.ejs` bullets

## External errors

_(None recorded. Populate during implementation if generator render, EJS parse, or type-check surfaces an issue requiring escalation.)_
