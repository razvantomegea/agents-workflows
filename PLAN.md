# PLAN — Epic 4: Code Standards Enforcement

Branch: feature/epic-4-code-standards-enforcement

## Context

Epic 4 delivers five new partial templates (security, error-handling-code, api-design, accessibility) plus an expanded git-rules and a reinforced testing-patterns partial, so that generated implementer / code-reviewer / security-reviewer / test-writer / e2e-tester / ui-designer agents ship OWASP 2025, Conventional Commits 1.0, tiered-testing, API-design, and WCAG 2.2 AA defaults. All six partials slot into existing agent templates via the standard `<%- include('../partials/foo.md.ejs') %>` syntax already used throughout `src/templates/agents/`. The framework detector already distinguishes all seven required backends (express, fastify, hono, nestjs, fastapi, django, flask), so no detector extension is needed; conditional API-design rendering will key off a new `isBackend` flag derived in `build-context.ts` alongside existing `isFrontend` / `isReact` flags using the same pattern as `src/constants/frameworks.ts`.

## Pre-implementation checklist

- [ ] PRD §2.2, §2.4, §2.5, §2.6, §2.8, §2.12 read (lines 843, 920, 953, 984, 1044, 1153)
- [ ] Existing partial include syntax confirmed: `<%- include('../partials/<name>.md.ejs'[, { locals }]) %>` (per `code-reviewer.md.ejs` lines 11–21)
- [ ] Framework detector surface understood: `detectFramework` in `src/detector/detect-framework.ts` already returns all 7 backend values; E4.T5 conditional flag hooks in via a new `BACKEND_FRAMEWORKS` list in `src/constants/frameworks.ts` + `isBackend` flag in `src/generator/build-context.ts` (same pattern as `isFrontend`)
- [ ] Test harness for rendered templates located: `tests/generator/epic-*.test.ts` use `generateAll(makeStackConfig(overrides))` from `tests/generator/fixtures.ts` and assert against the returned `GeneratedFile[]`
- [ ] Grepped codebase for existing equivalents — the 4 new partial filenames (`security-defaults.md.ejs`, `error-handling-code.md.ejs`, `api-design.md.ejs`, `accessibility.md.ejs`) are confirmed not present under `src/templates/partials/`; `git-rules.md.ejs` and `testing-patterns.md.ejs` exist and will be edited in place
- [ ] Verified no type duplication — the one new type surface (`isBackend` in `GeneratorContext`) is added once in `src/generator/types.ts` and imported where needed
- [ ] Confirmed no magic numbers — line caps (<120, ≤80, <50) are enforced in tests only; no hardcoded numeric constants leak into runtime code

## Tasks

### T1 — [LOGIC] Create security-defaults partial and wire into implementer + security-reviewer

- **Files**:
  - `src/templates/partials/security-defaults.md.ejs` (NEW)
  - `src/templates/agents/implementer.md.ejs` (EDIT — add include)
  - `src/templates/agents/security-reviewer.md.ejs` (EDIT — add include)
- **Input**: PRD §2.2 paste-ready snippet at lines 855–882 (input validation allowlist schema, OAuth 2.1 / PKCE / JWT `alg` allowlist, Argon2id m=19456/t=2/p=1, WebAuthn, secrets/workload identity, CSP Level 3 with nonces, `__Host-` cookies, IETF `RateLimit` headers, RFC 9457 Problem Details, log PII redaction, OWASP LLM Top 10 2025 — LLM07/LLM08/LLM10).
- **Output**: A partial with a `## Security defaults (OWASP 2025 baseline)` heading and a `<security_defaults>` tagged block wrapping the bullet list; rendered length **<120 lines**. Included in `implementer.md.ejs` (between `<%- include('../partials/untrusted-content.md.ejs') %>` and `<%- include('../partials/definition-of-done.md.ejs') %>`, near line 25/27) and in `security-reviewer.md.ejs` (after `<%- include('../partials/fail-safe.md.ejs') %>` at line 17, before `## When invoked`).
- **Notes**: Touches `implementer.md.ejs` — **serializes with T3 and T5** on that file. Do not duplicate bullets already present in `security-reviewer.md.ejs` "Security checklist" section (injection/authn/secrets/input/crypto are already listed there) — the new partial adds the OWASP-2025-specific details (Argon2id params, OAuth 2.1 RFC 9700, CSP L3 with nonces, `__Host-` prefix, RFC 9457, IETF `RateLimit` draft-10, LLM Top 10 2025). DRY risk: the overlap is intentional (partial is the canonical source; trimming the existing inline checklist is out of scope here). Keep the partial stack-agnostic (no `<%= stack.database %>` interpolation) to match `git-rules.md.ejs` style.
- **Depends on**: none

### T2 — [LOGIC] [PARALLEL] Expand git-rules partial

- **Files**:
  - `src/templates/partials/git-rules.md.ejs` (EDIT)
- **Input**: PRD §2.6 paste-ready snippet at lines 996–1013: Conventional Commits 1.0 types `feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert`, `!` and `BREAKING CHANGE:` footer, subject ≤72 chars imperative, trunk-based with short-lived branches (<24h), PR ≤400 LOC cap with stacked-PR escape hatch (Graphite/ghstack/git-town), Sigstore/gitsign, agents commit to branches never `main`, pre-commit hooks for secret scanning (gitleaks/trufflehog) with <10s budget.
- **Output**: `git-rules.md.ejs` keeps its existing "Git Rules" and "Branch Convention" sections and adds new subsections: "Conventional Commits 1.0" (listing all 11 types inline), "Trunk-based development" (short-lived branches, no GitFlow, feature flags), "PR size cap" (≤400 LOC, stack otherwise), "Commit signing" (GPG/SSH/Sigstore gitsign), "Agent branch rule" (reinforces existing "NEVER commit or push"). **Rendered length ≤80 lines.**
- **Notes**: Only consumer today is `architect.md.ejs:86`, so the Epic-4 tests assert against `architect.md`. Merge the paste-ready bullets into the existing structure instead of appending a second "Git Rules" heading. Keep `<%= mainBranch %>` interpolation intact. DRY risk: the "agents commit to a branch, never to `main`" rule already exists in the first bullet of the partial — reinforce with a cross-reference, do not duplicate. Parallel-safe because it touches only `git-rules.md.ejs`; no shared agent file with T1/T3/T5.
- **Depends on**: none

### T3 — [LOGIC] Create error-handling-code partial and wire into implementer + code-reviewer

- **Files**:
  - `src/templates/partials/error-handling-code.md.ejs` (NEW)
  - `src/templates/agents/implementer.md.ejs` (EDIT — add include)
  - `src/templates/agents/code-reviewer.md.ejs` (EDIT — add include)
- **Input**: PRD §2.8 paste-ready snippet at lines 1056–1069: expected-failure → typed return; programmer-error → fail loudly; `Error.cause` (JS) / `%w` (Go) / `thiserror`/`anyhow` (Rust) / chaining (Python/Java); "parse, don't validate" with Zod/pydantic/JSON Schema 2020-12 at ingress; no silent-catch (`catch (e) {}`, `except: pass`) — intentional catches require `// reason:` comment; Result/Either/discriminated-union preferred for business logic.
- **Output**: A partial with `## Error handling (produced code)` heading and an `<error_handling_code>` tagged block (distinct from existing `<error_handling_self>` in `error-handling-self.md.ejs`). Rendered length **<50 lines**. Included in `implementer.md.ejs` adjacent to the existing `error-handling-self` include at line 28 (place **after** it to group the two error-handling concerns) and in `code-reviewer.md.ejs` after `<%- include('../partials/docs-reference.md.ejs', { docsFile }) %>` at line 17, before fail-safe at line 19.
- **Notes**: Touches `implementer.md.ejs` — **serializes with T1 and T5** on that file. Keep the tag name `<error_handling_code>` distinct from `<error_handling_self>` (the self-partial covers what the agent does when its own commands fail; this new partial covers how produced code should handle runtime errors). DRY risk: the "never silent-catch" rule overlaps with `error-handling-self.md.ejs:7` — reinforce with different framing (self = suppressions in agent's own work; code = runtime catches in generated code). Do not repeat the `// reason:` comment convention verbatim; link it conceptually.
- **Depends on**: T1, T5 (all three touch `implementer.md.ejs`)

### T4 — [LOGIC] [PARALLEL] Enrich testing-patterns + e2e-tester with tiered testing and a11y smoke

- **Files**:
  - `src/templates/partials/testing-patterns.md.ejs` (EDIT)
  - `src/templates/agents/e2e-tester.md.ejs` (EDIT — a11y smoke section only; the a11y partial include is T6)
- **Input**:
  - PRD §2.5 snippet at lines 965–981: tiered testing (static/unit/integration/E2E-smoke), Dodds trophy for UI vs. pyramid for services vs. honeycomb for microservices, branch-coverage target 70–85% on business logic, mutation testing (Stryker/PIT) quarterly 60–80% score, property-based testing (fast-check / Hypothesis / proptest) for parsers/serializers/pure algebra, Pact for ≥3-service architecture, one logical assertion per test, no flakiness in main.
  - PRD §2.12 a11y smoke elements for `e2e-tester.md.ejs` (lines 1175–1177): keyboard-only traversal, 400% zoom, screen reader (NVDA + VoiceOver), reduced motion.
- **Output**:
  - `testing-patterns.md.ejs` gains a stack-agnostic "Testing tiers and targets" section that **always renders** (above or outside the existing `testFramework`-conditional branches) and contains: trophy/pyramid/honeycomb, 70–85% branch-coverage target, mutation-testing cadence, property-based testing use-cases, Pact note. Rendered `test-writer.md` must contain the literal strings `70`, `85`, `mutation`, `property-based`, `Pact`, `trophy`, and `pyramid`.
  - `e2e-tester.md.ejs` gains a new `## Accessibility smoke` section (before the `<output_format>` block near line 53) listing: keyboard-only traversal, visible-focus check, 400% zoom, screen-reader smoke (NVDA + VoiceOver), `prefers-reduced-motion` respect.
- **Notes**: Parallel-safe with T1/T3/T5 (different files). **Serializes with T6** on `e2e-tester.md.ejs`. DRY risk: T6 will also touch `e2e-tester.md.ejs` with a WCAG include — this T4 section must reference the T6 partial ("see Accessibility section above") rather than duplicating contrast/target-size bullets. Coordinate ordering: T6's include lands above T4's smoke section.
- **Depends on**: none (parallel with T1, T2, T3, T5; serializes with T6 on e2e-tester only)

### T5 — [LOGIC] Create api-design partial with conditional include + add isBackend flag

- **Files**:
  - `src/templates/partials/api-design.md.ejs` (NEW)
  - `src/constants/frameworks.ts` (EDIT — add `BACKEND_FRAMEWORKS` constant + `isBackendFramework` helper, mirroring `FRONTEND_FRAMEWORKS`/`isFrontendFramework`)
  - `src/generator/build-context.ts` (EDIT — derive and expose `isBackend`)
  - `src/generator/types.ts` (EDIT — add `isBackend: boolean` to `GeneratorContext`)
  - `src/templates/agents/implementer.md.ejs` (EDIT — conditional include wrapped in `<% if (isBackend) { %> ... <% } %>`)
- **Input**: PRD §2.4 paste-ready snippet at lines 932–951: OpenAPI 3.1 / AsyncAPI 3.0 schema-first, URL-major versioning with `Sunset`/`Deprecation` headers ≥6 months, cursor/keyset pagination with opaque base64 cursor, `Idempotency-Key` header with 24h replay cache, RFC 9457 `application/problem+json` with `traceId`, IETF `RateLimit` + `RateLimit-Policy` headers, HMAC-SHA256 webhook signatures with timestamp replay defense, GraphQL persisted queries / depth limit / cost analysis / disabled introspection in prod / federation v2.
- **Output**:
  - `BACKEND_FRAMEWORKS` constant in `src/constants/frameworks.ts` containing exactly `['express', 'fastify', 'hono', 'nestjs', 'fastapi', 'django', 'flask']`.
  - `isBackendFramework(framework: string | null): boolean` helper mirroring `isFrontendFramework`.
  - `isBackend: boolean` field on `GeneratorContext` wired from `build-context.ts`.
  - `api-design.md.ejs` partial with `## API design` heading + `<api_design>` tagged block. No line cap specified in PRD — aim for ≤80 lines.
  - Conditional include in `implementer.md.ejs`: `<% if (isBackend) { %>\n<%- include('../partials/api-design.md.ejs') %>\n<% } %>`, placed after the T1 security-defaults include (security before API design — matches §2.2 → §2.4 PRD order).
- **Notes**: Touches `implementer.md.ejs` — **serializes with T1 and T3** on that file. Detector confirmed in `src/detector/detect-framework.ts:9–31` to already distinguish all 7 backends with confidence ≥0.8 — **no detector extension needed, no separate LOGIC sub-task**. Fixture caveat: `makeStackConfig` currently sets `framework: 'nextjs'` so default tests get `isBackend: false`; T7 parameterizes via `overrides.stack.framework` for backend variants. DRY risk: follow the existing `FRONTEND_FRAMEWORKS` / `isFrontendFramework` shape exactly — do not invent a new list/helper pattern.
- **Depends on**: T1 (implementer.md.ejs serialization — T1 adds the security-defaults include; T5 adds the api-design include immediately after it)

### T6 — [LOGIC] Create accessibility partial and wire into ui-designer + e2e-tester

- **Files**:
  - `src/templates/partials/accessibility.md.ejs` (NEW)
  - `src/templates/agents/ui-designer.md.ejs` (EDIT — add include)
  - `src/templates/agents/e2e-tester.md.ejs` (EDIT — add include)
- **Input**: PRD §2.12 paste-ready snippet at lines 1165–1181: semantic HTML first; ARIA 1.3 augmentation; keyboard operability with visible focus (SC 2.4.11); target size ≥24×24 CSS px (SC 2.5.8 AA); respect `prefers-reduced-motion` / `prefers-color-scheme` / `prefers-contrast`; contrast WCAG 2 (4.5:1 normal / 3:1 large / 3:1 non-text UI); automated tools (axe-core / Lighthouse / Pa11y catch ~30–40%) + mandatory manual split (keyboard traversal, NVDA + VoiceOver, 400% zoom, reduced motion); WCAG 3.0 Working Draft note (do not cite for compliance); European Accessibility Act enforcement since June 28 2025 (EN 301 549 + accessibility statement).
- **Output**: A partial with `## Accessibility (WCAG 2.2 AA baseline)` heading and an `<accessibility>` tagged block. Included in `ui-designer.md.ejs` after `<%- include('../partials/fail-safe.md.ejs') %>` at line 17, before `## When invoked`. Included in `e2e-tester.md.ejs` after `<%- include('../partials/fail-safe.md.ejs') %>` at line 15, before `## When invoked` (and before T4's new smoke section). The rendered `ui-designer.md` ships the full WCAG 2.2 AA checklist (target-size 24×24, focus, reduced-motion, contrast, automated+manual split, EAA note).
- **Notes**: **Serializes with T4** on `e2e-tester.md.ejs`. T4 adds a narrow a11y *smoke checklist*; T6 wires the broader WCAG 2.2 AA partial. Coordinate order: T6's include lands **above** T4's `## Accessibility smoke` section, and T4's section references the partial rather than duplicating bullets. DRY risk: `ui-designer.md.ejs` already has a bare "Check accessible labels, contrast, focus management" bullet at line 39 — keep that bullet but let the T6 partial supersede detail; do not copy-paste bullets between the partial and the inline checklist.
- **Depends on**: T4 (e2e-tester.md.ejs serialization)

### T7 — [TEST] [PARALLEL] Tests for all new/changed partials + framework detector + cap bump

- **Files**:
  - `tests/generator/epic-4-standards.test.ts` (NEW — consolidated coverage for T1–T6)
  - `tests/detector/detect-framework.test.ts` (NEW — per PRD E4.T5 done-when clause)
  - `tests/generator/generate-all.test.ts` (EDIT — raise the rendered-agent line cap to accommodate Epic 4 content expansion; follow E3.T1 precedent that raised code-reviewer to 250)
- **Input**: Rendered output from `generateAll(makeStackConfig({ stack: { ... framework: <backend|frontend> } }))` plus direct `detectFramework(projectRoot)` runs against fixture project directories.
- **Output**:
  - `epic-4-standards.test.ts` asserts:
    - **T1**: `implementer.md` and `security-reviewer.md` both contain `<security_defaults>` tag, `Argon2id`, `OAuth 2.1`, `CSP`, `__Host-`, `RFC 9457`, `LLM07`; partial source file on disk is ≤120 lines (read with fs).
    - **T2**: `architect.md` contains all 11 Conventional Commits types (`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`) and contains `400`, `Sigstore`, `gitsign`, `trunk`, `BREAKING CHANGE`; partial source file on disk ≤80 lines.
    - **T3**: `implementer.md` and `code-reviewer.md` both contain `<error_handling_code>` tag, `Error.cause`, `parse, don't validate`, `reason:`; partial source file on disk <50 lines.
    - **T4**: `test-writer.md` contains `70`, `85`, `mutation`, `property-based`, `Pact`, `trophy`, `pyramid`; `e2e-tester.md` contains `keyboard`, `400%`, `zoom`, `NVDA`, `VoiceOver`, `prefers-reduced-motion`.
    - **T5**: when `framework` is one of `['express', 'fastify', 'hono', 'nestjs', 'fastapi', 'django', 'flask']`, `implementer.md` contains `<api_design>`, `OpenAPI 3.1`, `RFC 9457`, `Idempotency-Key`, `RateLimit`, `persisted queries`. When `framework` is `nextjs` / `react` / `vue` / null, `implementer.md` does **not** contain `<api_design>`.
    - **T6**: `ui-designer.md` and `e2e-tester.md` both contain `<accessibility>` tag, `WCAG 2.2`, `24×24` (or `24x24`), `SC 2.5.8`, `prefers-reduced-motion`, `axe-core`, `EAA` (or `European Accessibility Act`).
  - `detect-framework.test.ts` asserts `detectFramework` returns the correct `value` for mock project roots with each of: `express`, `fastify`, `hono`, `@nestjs/core` (nestjs), `fastapi` (pyproject), `django` (pyproject), `flask` (pyproject). Use the fixture pattern from `tests/detector/detect-language.test.ts`.
- **Notes**: Use `tests/generator/fixtures.ts::makeStackConfig` for rendered-template tests. For T5 backend variants pass `overrides.stack = { ..., framework: 'express' }` etc. Keep each test file ≤200 LOC per CLAUDE.md rule; split `epic-4-standards.test.ts` into focused `describe` blocks per sub-task. DRY risk: do not duplicate the `getAgentContent` / `assertInclusion` / `extractTaggedBlock` helpers already local to `tests/generator/epic-2-quality.test.ts` — if reused verbatim here, extract to `tests/generator/agent-content.helpers.ts` (one-file helper module); otherwise re-declare locally and flag as tech-debt. `[PARALLEL]` marker is relative to other test files only — this task still depends on T1–T6 being complete.
- **Depends on**: T1, T2, T3, T4, T5, T6

## Post-implementation checklist

- [ ] All new partials ≤ their line caps: `security-defaults.md.ejs` <120, `error-handling-code.md.ejs` <50, `git-rules.md.ejs` ≤80
- [ ] No `any` types introduced in TS sources (detector, generator, tests)
- [ ] `pnpm check-types` — zero errors
- [ ] `pnpm test` — all suites pass (including the two new test files)
- [ ] `pnpm lint` — zero warnings
- [ ] Run `code-reviewer` agent on all modified files — all critical and warning findings fixed
- [ ] Run `security-reviewer` agent in parallel with `code-reviewer` — findings triaged
- [ ] DRY scan complete — grep for duplicated OWASP content (`OAuth 2.1`, `Argon2id`, `RFC 9457`) across partials; grep for duplicated Conventional Commits type lists; grep for duplicated WCAG bullets between `accessibility.md.ejs` and inline a11y sections
- [ ] No duplicated code across modified files (e.g., `e2e-tester.md.ejs` a11y smoke does not repeat `accessibility.md.ejs` bullets; `implementer.md.ejs` error-handling sections remain conceptually distinct — self vs. code)
- [ ] Manual render sanity check: run the generator against a backend fixture (e.g. Express) and a frontend fixture (e.g. Next.js); confirm API-design partial conditionally appears / disappears

## External errors

- [security-reviewer, T2/T4 review] Pre-existing prompt-injection surface in `src/utils/template-renderer.ts` (`identityEscape` makes `<%= %>` equivalent to `<%- %>`) and unvalidated string fields in `src/schema/` (`project.name`, `project.description`, `testsDir`, `tooling.e2eFramework`). Out of Epic 4 scope — file not modified by any Epic 4 task. Recommend filing a new epic for schema hardening.
- [security-reviewer, T1 review] Reviewer suggested extending PRD §2.2 paste-ready snippet with: HS256 shared-secret warning, OAuth 2.1 ROPC deprecation, CSRF stack-agnostic rule, LLM06 (system-prompt leakage), LLM09 (vector/embedding weaknesses). These go beyond the PRD §2.2 paste-ready snippet (lines 853–882). Epic 4 honors the PRD verbatim; file as a PRD amendment proposal for a future epic if desired.
- [security-reviewer, T5 review] Framework value is not case-normalized before the `BACKEND_FRAMEWORKS`/`FRONTEND_FRAMEWORKS` allow-list checks in `src/constants/frameworks.ts`. Fix requires normalizing at the schema boundary in `src/schema/stack-config.ts` (`z.string().trim().toLowerCase()`). Out of Epic 4 scope — T5 does not touch the schema file. Recommend a dedicated schema-hardening epic.
- [code-reviewer, T5 review] PRD §2.4 says API-design rules also belong in the `code-reviewer.md` checklist (PRD line 928). PLAN.md T5 does not extend `src/generator/review-checklist-rules.ts` with a backend-gated tag/rule. Out of T5 file scope; file as a follow-up Epic 4 extension or a new epic.
