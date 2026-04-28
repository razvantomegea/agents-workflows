# PLAN.md

**Branch:** `feature/epic-13-stack-aware-implementer`

## Context

Epic 13 replaces the single generic `implementer` agent with one of 13 stack-specific variants chosen by detection at config time, while keeping the emitted filename `implementer.md` (Claude) / `.codex/skills/implementer/SKILL.md` (Codex) so every downstream reference stays valid. The legacy additive `reactTsSenior` agent is removed (template deleted, schema field migrated, stale files safe-deleted on `update`); `ui-designer` is hidden — not just unchecked — for pure-backend stacks. New JVM (Spring Boot) and .NET (ASP.NET Core) detectors land alongside a new `implementer-core.md.ejs` partial that holds the shared body so each variant template stays a thin wrapper.

## Pre-implementation checklist

- [ ] Read PRD §Epic 13 (lines 2635–2724) and §1.19.
- [ ] Read CLAUDE.md (per-user + per-project rules: ≤200 lines per file, DRY, no `any`, simple Jest tests for moved logic).
- [ ] Verify branch is `feature/epic-13-stack-aware-implementer` and tree is clean.
- [ ] Confirm `pnpm test`, `pnpm check-types`, `pnpm lint` pass on `main` baseline.
- [ ] Capture a snapshot of today's `implementer.md.ejs` rendered against `tests/generator/fixtures.ts:makeStackConfig()` BEFORE deleting the file — this is the byte-identical baseline for the `generic` variant in T8.
- [ ] Grep for every `reactTsSenior` / `react-ts-senior` / `hasReactTsSenior` / `supportsReactTsStack` reference in `src/`, `tests/`, `.claude/`, `.codex/`, `README.md`, `PRD.md` so nothing is missed across tasks.

## Tasks

### T1 — Detector enrichments and framework constants [LOGIC] [SCHEMA] [PARALLEL]

- **Files**: `src/detector/detect-framework.ts`, `src/detector/detect-jvm-framework.ts` (new), `src/detector/detect-dotnet-framework.ts` (new), `src/constants/frameworks.ts`.
- **Input**: existing `Detection` type, existing `BACKEND_FRAMEWORKS`, an unused `pom.xml` / `build.gradle` / `build.gradle.kts` / `*.csproj` reader path. Read `package.json`/`pyproject.toml` paths already exist; the JVM and .NET detectors must read raw text via `node:fs/promises` plus the `glob` dep already used elsewhere for `*.csproj`.
- **Output**:
  - `detectJvmFramework(projectRoot)` returns `{ value: 'spring-boot', confidence: 0.9 }` when `pom.xml` contains `<artifactId>spring-boot-starter` or any `build.gradle*` contains `org.springframework.boot`; otherwise `{ value: null, confidence: 0 }`.
  - `detectDotnetFramework(projectRoot)` returns `{ value: 'aspnetcore', confidence: 0.9 }` when the first `*.csproj` reference contains `Microsoft.AspNetCore.`; otherwise `{ value: null, confidence: 0 }`.
  - `detectFramework` chains the two new detectors after the existing pyproject branch (return the first hit, then fall back to `{ value: null, confidence: 0 }`).
  - `BACKEND_FRAMEWORKS` extended with `'spring-boot'` and `'aspnetcore'`; the `PACKAGE_JSON_BACKEND_CONFIDENCE` map in `detect-framework.ts` adjusted to cover the two new keys (value `0.9` even though they are detected outside `package.json`, to keep the typed map exhaustive).
  - New helper `isFullstackJsFramework(framework)` listing `'nextjs' | 'nuxt' | 'remix' | 'sveltekit'` exported from `src/constants/frameworks.ts`. Existing `isReactFramework`, `isFrontendFramework`, `isBackendFramework`, `isMobileFramework`, `supportsReactTsStack` unchanged.
- **Notes**:
  - Maps to PRD E13.T1.
  - **DRY**: do not copy the regex-test pattern between the two new detectors — extract a shared `matchesAny(text, needles[])` helper into the new file that both consume (keep it under 10 lines so it stays Locality-of-Behavior local).
  - PRD E13.T1 specifies Maven + Gradle (incl. `.kts`) Spring Boot detection; the `.csproj` scan must use the FIRST `.csproj` returned by glob to keep determinism.
  - Per the user's global rule "Move logic into simple functions and always add Jest tests for them," each new pure helper (`matchesAny`, `detectJvmFramework`, `detectDotnetFramework`) gets a small Jest test. Tests are added in T8 (no new tests in this task — colocated detector tests already live under `tests/detector/`).
  - File-size cap: keep `detect-jvm-framework.ts` and `detect-dotnet-framework.ts` ≤80 lines each (well under the 200-line CLAUDE.md cap).
  - **No `any`** — use `string` for raw file content, `Detection` for return type.
  - This task can run in parallel with T2 — they touch disjoint files. Both must merge before T3.

### T2 — Schema migration, routing helper, fixtures helper update [SCHEMA] [LOGIC] [PARALLEL]

- **Files**: `src/schema/stack-config.ts`, `src/schema/manifest.ts`, `src/generator/implementer-routing.ts` (new), `tests/generator/fixtures.ts`.
- **Input**: existing `stackConfigSchema.agents` shape with `reactTsSenior: z.boolean().default(false)` (line 123); existing `manifestSchema` that nests `stackConfigSchema`; existing `makeStackConfig` helper at `tests/generator/fixtures.ts:77` that bakes `reactTsSenior: true` into base agents (lines 82, 109–114); the new `BACKEND_FRAMEWORKS` from T1.
- **Output**:
  - `IMPLEMENTER_VARIANTS = ['generic', 'typescript', 'javascript', 'react-ts', 'node-ts-backend', 'python', 'go', 'rust', 'java-spring', 'dotnet-csharp', 'vue', 'angular', 'svelte'] as const` exported from `stack-config.ts`. Add `type ImplementerVariant = (typeof IMPLEMENTER_VARIANTS)[number]`.
  - In `agents`: `implementerVariant: z.enum(IMPLEMENTER_VARIANTS).default('generic')` REPLACES `reactTsSenior`.
  - `agents` wrapped in a `z.preprocess` (or a small exported `migrateLegacyAgents(raw): unknown` helper invoked from the schema) that, when input is a plain object, (a) maps `reactTsSenior: true` → `implementerVariant: 'react-ts'` ONLY when no `implementerVariant` already exists, (b) strips ANY key matching `/Senior$/` whose value is boolean (defensive: covers any future `*Senior` flag drift — encoded per constraint #10), (c) leaves all other keys untouched.
  - `src/generator/implementer-routing.ts` exports `getApplicableImplementerVariant(detected: DetectedStack): ImplementerVariant` with this exhaustive ORDER-SENSITIVE mapping (document the order in a leading comment):
    1. `framework === 'spring-boot'` → `'java-spring'`
    2. `framework === 'aspnetcore'` → `'dotnet-csharp'`
    3. `framework ∈ {'vue','nuxt'}` → `'vue'`
    4. `framework === 'angular'` → `'angular'`
    5. `framework === 'sveltekit'` → `'svelte'`
    6. `supportsReactTsStack(framework, language)` → `'react-ts'` (covers React/Next/Expo/RN/Remix on TS — mobile included per non-goal §Epic 13)
    7. `language === 'typescript' && framework ∈ {'nestjs','express','fastify','hono'}` → `'node-ts-backend'`
    8. `language === 'python'` → `'python'`
    9. `language === 'go'` → `'go'`
    10. `language === 'rust'` → `'rust'`
    11. `language === 'typescript' && framework === null` → `'typescript'` (Epic 17 body)
    12. `language === 'javascript' && framework === null` → `'javascript'` (Epic 17 body)
    13. otherwise → `'generic'`
  - `tests/generator/fixtures.ts:makeStackConfig` updated: `baseAgents.reactTsSenior` removed; new field `implementerVariant: 'react-ts'` (default keeps the current Next.js+TS fixture's behaviour). The trailing `?? supportsReactTsStack(...)` re-derivation block (lines 109–114) is deleted; tests that need a different variant pass `overrides.agents.implementerVariant`.
- **Notes**:
  - Maps to PRD E13.T2.
  - The migration preprocess MUST keep all other keys including future ones — encode constraint #10 in a unit test (T8) that asserts `barNonSenior: true` is preserved while `fooSenior: true` is stripped.
  - `manifestSchema` does NOT need its own preprocess — wrapping `agents` inside `stackConfigSchema` makes both `init`-loaded and `update`-loaded paths benefit. Verify by reading `src/schema/manifest.ts` (it just nests `stackConfigSchema`).
  - **DRY**: `IMPLEMENTER_VARIANTS` is the single source of truth consumed by Zod (`z.enum(...)`), the prompt question (T4), and the routing helper.
  - **No `any`** — use `unknown` in the preprocess input, narrow with `typeof === 'object'` and `Record<string, unknown>` casts only after guards.
  - Per the user's global rule, `migrateLegacyAgents` and `getApplicableImplementerVariant` are simple pure functions — Jest tests for both land in T8 (covers every `(language, framework)` row plus the legacy-manifest preprocess case).
  - This task can run in parallel with T1 — disjoint files. Both must merge before T3.

### T3 — Shared `implementer-core.md.ejs` partial + 13 variant wrappers + legacy template/test deletes [TEMPLATE] [API]

- **Files**:
  - New: `src/templates/partials/implementer-core.md.ejs`.
  - New (13): `src/templates/agents/implementer-variants/generic.md.ejs`, `.../typescript.md.ejs`, `.../javascript.md.ejs`, `.../react-ts.md.ejs`, `.../node-ts-backend.md.ejs`, `.../python.md.ejs`, `.../go.md.ejs`, `.../rust.md.ejs`, `.../java-spring.md.ejs`, `.../dotnet-csharp.md.ejs`, `.../vue.md.ejs`, `.../angular.md.ejs`, `.../svelte.md.ejs`.
  - Deleted: `src/templates/agents/implementer.md.ejs`, `src/templates/agents/react-ts-senior.md.ejs`, `tests/generator/react-ts-senior.test.ts`.
- **Input**: today's `src/templates/agents/implementer.md.ejs` (76 lines) — confirmed via grep to include 18 partial-include sites in this exact order: `stack-context`, `code-style`, `dry-rules`, `file-organization`, `docs-reference`, `tool-use-discipline`, `fail-safe`, `untrusted-content`, `security-defaults`, `api-design` (gated on `isBackend`), `definition-of-done`, `error-handling-self`, `error-handling-code`, `observability`, `concurrency`, `i18n` (gated on `hasI18n`), `tdd-discipline`, `polyglot-monorepo` (with `isPolyglot` arg). Today's `react-ts-senior.md.ejs` (78 lines) — Component & Hook Details + TypeScript Specifics + Testing + Workflow + Boundaries blocks (the body to migrate into the `react-ts` variant).
- **Output**:
  - `implementer-core.md.ejs` extracts the shared block (every partial include in the existing order + the When-invoked / Checklist / `<output_format>` / `<constraints>` / `<uncertainty>` blocks) and accepts a `specificsBlock` parameter (default empty string) which the variants inject between `untrusted-content` and `security-defaults` (matches the existing implementer's "specifics belong before the security/api-design block" implicit ordering). Cap: ≤120 lines.
  - Each variant template = YAML frontmatter (`name: implementer` — never `python-senior` etc., constant across all 13; `description` references the variant stack; `tools: Read, Edit, Write, Bash, Grep, Glob`; `model: sonnet`; `color: green`) + one-line header + `<%- include('../../partials/implementer-core.md.ejs', { specificsBlock: '...' }) %>` + an inline `specificsBlock` literal.
  - **`generic.md.ejs`**: `specificsBlock` is the empty string. Body MUST render byte-identical to today's `implementer.md.ejs` against the captured baseline (T8 asserts this; if it diverges, fix the partial, not the test).
  - **Tier-1 specifics blocks (≤30 lines each, real content this epic owns)**: `react-ts` (port from `react-ts-senior.md.ejs` — Component & Hook Details, TypeScript Specifics, Testing, Boundaries — slightly trimmed to fit), `node-ts-backend` (NestJS DTOs/guards/interceptors + Express/Fastify/Hono routing patterns + jest+supertest), `python` (`async def` + type hints + Pydantic + pytest), `go` (`error` returns + `context.Context` + `go test`), `rust` (`Result` + `?` + ownership + `cargo test`), `java-spring` (`@RestController` + DI + JUnit + `@SpringBootTest`), `dotnet-csharp` (minimal APIs vs controllers + xUnit + `WebApplicationFactory`), `svelte` (runes + `+page.server.ts` load functions + Vitest + `@testing-library/svelte`).
  - **Epic-17 placeholder specifics blocks (≤120 lines wrapper cap, ≤80 lines specificsBlock cap)**: `typescript`, `javascript`, `vue`, `angular` get a minimal placeholder block with this exact body: `## Stack Specifics\n\n> Detailed body (citation-backed, top-5 anti-patterns) lands in Epic 17.` — this lets Epic 17 fill the body without touching the wrapper.
  - Tier-1 wrapper cap: ≤40 lines per file.
- **Notes**:
  - Maps to PRD E13.T3 + E13.T4.
  - **CRITICAL — PRD vs code drift flagged in handoff**: PRD E13.T3 lists 11 partial includes; the current file actually has **18** includes. The `generic` byte-identical guarantee (constraint #9) requires extracting **all 18** (including `api-design` and `i18n` with their conditionals, `polyglot-monorepo` with its `isPolyglot` arg). Encode this in the partial; the implementer's handoff message must explicitly flag the PRD drift so PRD §Epic 13 can be amended.
  - The `name: implementer` invariant (constraint #8) makes the existing `convertToSkill` and AGENTS.md routing references work without ANY change. Do NOT introduce `name: python-senior` etc. — `description` carries the variant identity.
  - **DRY**: the 13 variant wrappers are near-identical scaffolding. Resist any temptation to template-of-templates them — they are leaf templates and copy-paste-with-substitution is the right shape (Locality of Behavior; AHA / rule of three). Each variant body lives in exactly one file; no shared "stack specifics partials" between variants.
  - File deletes — do them as part of this task so subsequent tasks never see them.
  - The `tests/generator/react-ts-senior.test.ts` deletion is mandatory — the new test surface lives in T8's `stack-aware-agents.test.ts`. Without this delete, T8 fails (the template path it references no longer exists).
  - Locale rules / `docsFile` / `mainBranch` / paths context unchanged — `implementer-core.md.ejs` consumes them via the `GeneratorContext` already.

### T4 — Prompt flow + default-config wiring [UI] [LOGIC]

- **Files**: `src/prompt/questions.ts`, `src/prompt/prompt-flow.ts`, `src/prompt/default-config.ts`, `src/prompt/ask-implementer-variant.ts` (new sibling, mirrors `ask-targets.ts` / `ask-governance.ts` pattern).
- **Input**: existing `askAgentSelection({ isFrontend, isReactTs })` at `questions.ts:205` (the `isReactTs`-gated `react-ts-senior` row at line 213); existing `runPromptFlow` at `prompt-flow.ts:73–75`/`145` (computes `isReactTs` via `supportsReactTsStack`, threads `reactTsSenior` into `agents`); existing `createDefaultConfig` at `default-config.ts:28`/`85` (sets `reactTsSenior: isReactTs`); the new `getApplicableImplementerVariant` from T2 and `isFrontendFramework` from T1/`constants/frameworks.ts`.
- **Output**:
  - `askAgentSelection`: drop the `isReactTs` parameter (signature becomes `Readonly<{ isFrontend: boolean }>`); remove the spread that adds the `react-ts-senior` row; gate the `ui-designer` row by EXCLUDING it from the choices array when `!isFrontend` (hidden, not just unchecked — per Epic 13 spec).
  - New `src/prompt/ask-implementer-variant.ts` exports `askImplementerVariant(detected: DetectedStack): Promise<ImplementerVariant>` — single-select `select` prompt (use `@inquirer/prompts` `select`); choices are the 13-variant enum with inline labels (`generic — Stack-agnostic baseline`, `typescript — Plain TS (Epic 17 body)`, `react-ts — React + TypeScript`, `node-ts-backend — Node TS backend (Nest/Express/Fastify/Hono)`, etc.); default is `getApplicableImplementerVariant(detected)`. Re-export from `questions.ts` (matches the existing pattern at lines 240–245).
  - `runPromptFlow`:
    - Drop the `const isReactTs = supportsReactTsStack(...)` line (line 74).
    - Call `askImplementerVariant(detected)` after `askStack` and before `askAgentSelection({ isFrontend })` (so language/framework are confirmed first).
    - Replace `reactTsSenior: selectedAgents.includes('reactTsSenior')` (line 145) with `implementerVariant: variantFromPrompt`.
    - Remove `supportsReactTsStack` from the import list when no longer used.
  - `createDefaultConfig`:
    - Drop the `const isReactTs = supportsReactTsStack(...)` line (line 28).
    - Replace `reactTsSenior: isReactTs` (line 85) with `implementerVariant: getApplicableImplementerVariant(detected)`.
    - `uiDesigner: isFrontend` unchanged.
- **Notes**:
  - Maps to PRD E13.T5 + E13.T6.
  - **DRY**: variant choice labels live ONLY inside `ask-implementer-variant.ts` for now. If/when another consumer needs the same human-readable labels, extract a `VARIANT_LABELS` const colocated with `IMPLEMENTER_VARIANTS` in `schema/stack-config.ts` (rule of three; do not pre-extract).
  - Per the user's global rule, `askImplementerVariant` is a thin Inquirer wrapper but the *default-resolution* logic lives in `getApplicableImplementerVariant` (T2, with Jest tests in T8). No new Jest tests in this task — prompt flow is exercised by `tests/prompt/prompt-flow.test.ts` (kept as-is; updated only in T8 if its assertions reference `reactTsSenior`).
  - File-size: `questions.ts` is currently 246 lines — adding ~30 lines for `askImplementerVariant` would push it past the 200-line cap. Hence the new sibling file (matches `ask-targets.ts`, `ask-governance.ts`, `ask-isolation.ts`). `ask-implementer-variant.ts` ≤80 lines.
  - **No `any`** — explicit `ImplementerVariant` return type and explicit `Readonly<{ name: string; value: ImplementerVariant }>` choice element type.
  - This task depends on T1+T2 (needs both the routing helper and the new framework constants).

### T5 — Generator routing + build-context + types + AGENTS.md.ejs cleanup [LOGIC] [TEMPLATE]

- **Files**: `src/generator/generate-agents.ts`, `src/generator/build-context.ts`, `src/generator/types.ts`, `src/templates/config/AGENTS.md.ejs`.
- **Input**: existing `AGENT_DEFINITIONS` at `generate-agents.ts:12` (with the `reactTsSenior` row at line 15); existing `buildContext` at `build-context.ts:39, 78` (derives `hasReactTsSenior`); `types.ts:63` (`hasReactTsSenior: boolean` interface field); `AGENTS.md.ejs` lines 31–33 (`<% if (hasReactTsSenior) { -%>` row).
- **Output**:
  - `generate-agents.ts`:
    - Remove the `reactTsSenior` row from `AGENT_DEFINITIONS`.
    - Inside `generateAgents`, when `agent.key === 'implementer'`, resolve `templateFile = \`agents/implementer-variants/${config.agents.implementerVariant}.md.ejs\`` before `renderTemplate`. Output name stays `implementer.md` for both Claude and Codex paths.
    - Add a fail-fast invariant: if the resolved variant template path does not exist on disk (use `fileExists` from `src/utils/`, or wrap `renderTemplate`'s missing-file error with a clearer message), throw `new Error(\`Missing implementer variant template: ${templateFile}\`)`. Catches schema/template drift early.
    - `convertToSkill` path unchanged — produces `.codex/skills/implementer/SKILL.md` regardless of variant.
  - `build-context.ts`: drop the `hasReactTsSenior` derivation (line 39) and the `hasReactTsSenior` field on the returned object (line 78). Drop `supportsReactTsStack` from the import list. Add a passthrough `implementerVariant: config.agents.implementerVariant` to the returned context.
  - `types.ts`: drop `hasReactTsSenior: boolean` from the `GeneratorContext` interface (line 63). Add `implementerVariant: ImplementerVariant` so `AGENTS.md.ejs` can render the variant label. Import the type from `../schema/stack-config.js`.
  - `AGENTS.md.ejs`:
    - Delete the `<% if (hasReactTsSenior) { -%> | Implementation (React + TypeScript) | \`react-ts-senior\` | <% } -%>` block at lines 31–33.
    - Change `| Implementation | \`implementer\` |` to render with an optional variant label: `| Implementation | \`implementer\`<% if (implementerVariant !== 'generic') { %> (<%= implementerVariant %> variant)<% } %> |`.
- **Notes**:
  - Maps to PRD E13.T7 + E13.T10.
  - The static `AGENT_DEFINITIONS` shape stays but the implementer's `templateFile` is now a special case inline in `generateAgents`. Alternative considered: promote `templateFile` to `string | (cfg: StackConfig) => string`. Either is fine — pick the inline-special-case approach to keep the type signature simple (Ousterhout's "deep modules"; no premature abstraction).
  - The fail-fast invariant covers Epic 13's startup-error requirement (E13.T7 acceptance criterion).
  - **DRY**: the `(${variant} variant)` rendering pattern lives ONLY in AGENTS.md.ejs for now. If/when another template needs the same label, extract a `partials/variant-label.md.ejs` partial.
  - **No `any`** — `templateFile: string` retained; the dynamic resolution returns a `string`.
  - File-size: `generate-agents.ts` grows from 47 to ~70 lines (well under 200); `build-context.ts` shrinks; `types.ts` net-zero (one field swapped).
  - Depends on T2 (needs `ImplementerVariant`) and T3 (the variant template files must exist for the fail-fast check to pass during normal runs).

### T6 — Update-command stale-file safe delete [LOGIC]

- **Files**: `src/cli/update-command.ts`, `src/installer/safe-delete-stale-files.ts` (new), `src/installer/index.ts` (export the new helper).
- **Input**: existing `updateCommand` (`update-command.ts:28`); existing `backupExistingFiles` from `src/installer/index.ts` (Epic 7 backup path); existing `confirm` from `@inquirer/prompts`; existing `fileExists` from `src/utils/`; the shape `GeneratedFile` already accepted by `backupExistingFiles`.
- **Output**:
  - New helper `safeDeleteStaleFiles({ projectRoot, candidates, suppressed })` that for each candidate path:
    1. Returns early if `!await fileExists(absolutePath)`.
    2. Calls `backupExistingFiles(projectRoot, [{ path, content: '' }])` so a copy lands in `.agents-workflows-backup/` per Epic 7 semantics. Verify by reading `src/installer/backup.ts` first — adjust the call shape if the helper signature differs.
    3. If `suppressed === false`, asks `await confirm({ message: \`Removing stale file replaced by implementer variant: ${path}. Delete?\`, default: false })`. If user answers no, log a warning via `logger.warn` and `continue`.
    4. If `suppressed === true` OR user answered yes, `await fs.rm(absolutePath)` and `logger.info(\`Removed stale: ${path}\`)`.
  - Exported const `STALE_IMPLEMENTER_VARIANT_FILES = ['.claude/agents/react-ts-senior.md', '.codex/skills/react-ts-senior/SKILL.md'] as const` from the new file.
  - `updateCommand`: invoke `safeDeleteStaleFiles({ projectRoot, candidates: STALE_IMPLEMENTER_VARIANT_FILES, suppressed: promptsSuppressed })` AFTER the diff has been computed and the user has confirmed `proceed`, INSIDE the `withSafetySession` callback, immediately after `backupExistingFiles(projectRoot, changedFiles)` and BEFORE `writeGeneratedFiles`.
- **Notes**:
  - Maps to PRD E13.T8.
  - **Constraint #5 — never hard-delete without confirmation; `--yes` skips the prompt but the backup still runs.** The `suppressed` flag controls only the prompt, never the backup. This is the Epic 7 safe-delete contract.
  - Idempotent — if the files don't exist, it's a no-op. `update --yes` against a fresh tree produces zero log output for this helper.
  - **DRY**: the const list is the single source for "files Epic 13 superseded." If Epic 8 adds tier-2 variant supersessions, append to this list, never duplicate the helper.
  - Per the user's global rule, `safeDeleteStaleFiles` is pure logic above the FS layer — Jest tests for it land in T8 (uses the temp-dir pattern from `tests/installer/backup.test.ts`; verify which by reading that file before writing the test).
  - File-size: `update-command.ts` is currently 158 lines; adding 1–2 lines stays under cap. `safe-delete-stale-files.ts` ≤80 lines.
  - **No `any`** — explicit `Readonly<{ projectRoot: string; candidates: readonly string[]; suppressed: boolean }>` param.
  - Depends on T3 (the templates the stale files are being replaced by must exist) but is otherwise independent of T4/T5.

### T7 — README stack matrix + migration paragraph + remove every `react-ts-senior.md` reference [DOCS] [PARALLEL]

- **Files**: `README.md` (only). Do NOT touch `PRD.md` — Phase 4 of `/workflow-plan` stamps the Epic 13 header.
- **Input**: existing README.md "Generated agents" table at lines 91–105 (currently lists `react-ts-senior` as row 3); existing "Supported stacks" table at lines 79–89; line 12 in the "What it does" bullet list (also references `react-ts-senior`); the 13-variant enum and routing rules from T2.
- **Output**:
  - Drop the `react-ts-senior` row from the "Generated agents" table.
  - Replace the `implementer` row's role text with: `Primary code writing agent — one of 13 stack-aware variants chosen at config time` (model column unchanged).
  - Update line 12 ("Up to 10 specialized agents: ...") to remove `react-ts-senior` and adjust the count to 9.
  - Add a NEW section `### Stack matrix` immediately after "Generated agents" that renders a table with columns `Detected stack`, `Variant`, `Notes`. Rows cover every variant: `(language, framework)` → variant value. Mobile (Expo, React Native) explicitly noted as routing to `react-ts`. Polyglot/unknown row maps to `generic`.
  - Add a one-paragraph migration note immediately under the Stack matrix: "The emitted filename is always `.claude/agents/implementer.md` and `.codex/skills/implementer/SKILL.md`; the active variant is recorded in `.agents-workflows.json` under `agents.implementerVariant`. Existing manifests carrying the legacy `reactTsSenior: true` field migrate automatically on first `update` to `implementerVariant: 'react-ts'`; any pre-existing `.claude/agents/react-ts-senior.md` and `.codex/skills/react-ts-senior/SKILL.md` are removed via the Epic 7 safe-delete confirmation flow (`--yes` skips the prompt; a backup is always written first)."
  - Grep README for any other `react-ts-senior` reference and replace with `implementer` variant language.
- **Notes**:
  - Maps to PRD E13.T11.
  - **DRY**: do not duplicate the variant list — the Stack matrix table is the single doc reference. The Generated-agents table refers users to the matrix.
  - Constraint #6: the README must contain ZERO `react-ts-senior` references after this task, EXCEPT inside the migration paragraph as `react-ts-senior.md` / `reactTsSenior: true` legacy citations. This is the only allowed mention.
  - Stack matrix LOC: keep the table ≤25 rows, ~40 lines total including paragraph.
  - This task can be authored in parallel with T6 — disjoint files. Both must merge before T8.
  - No code changes; no Jest tests. Excluded from the test-writer routing.

### T8 — Stack-aware agents test suite + 8 new fixtures + 1 fixture rename + per-helper unit tests [TEST]

- **Files**:
  - New: `tests/generator/stack-aware-agents.test.ts`.
  - New fixtures (each ≤30 LOC, total <300 LOC): `tests/fixtures/backend-go/`, `tests/fixtures/backend-rust/`, `tests/fixtures/backend-java-spring/`, `tests/fixtures/backend-dotnet/`, `tests/fixtures/frontend-vue/`, `tests/fixtures/frontend-angular/`, `tests/fixtures/frontend-svelte/`, `tests/fixtures/backend-node-nestjs/`. Plus a fixture rename: `tests/fixtures/python-fastapi/` → `tests/fixtures/backend-python-fastapi/` (use `git mv` to preserve history). Update the only consumer (`tests/detector/__snapshots__/` if any) — verify via grep before renaming.
  - New tests for the small pure helpers from T1/T2/T6: `tests/detector/detect-jvm-framework.test.ts`, `tests/detector/detect-dotnet-framework.test.ts`, `tests/generator/implementer-routing.test.ts`, `tests/installer/safe-delete-stale-files.test.ts`. Existing `tests/schema/stack-config.test.ts` extended (or sibling `tests/schema/stack-config-migration.test.ts` added) to cover the legacy-manifest preprocess.
- **Input**: the captured byte-identical baseline from the pre-implementation checklist (snapshot file `tests/generator/__snapshots__/stack-aware-agents.test.ts.snap` for the `generic` variant); the 13 variant templates from T3; the fixtures, helpers, and `STALE_IMPLEMENTER_VARIANT_FILES` from prior tasks; the existing `findFile` / `getContent` / `makeStackConfig` / `makeDetectedStack` helpers in `tests/generator/fixtures.ts`.
- **Output** — `stack-aware-agents.test.ts` MUST assert all of the following, one `describe` per concern:
  - **(a) Variant routing**: `getApplicableImplementerVariant` returns the expected enum value for each fixture's `DetectedStack`. One assertion per fixture covering every variant except `typescript`/`javascript` (those need synthetic `framework=null` detected stacks built inline via `makeDetectedStack`).
  - **(b) `createDefaultConfig` wiring**: each fixture's `createDefaultConfig(detect(fixturePath))` produces `agents.implementerVariant === <expected>` and DOES NOT contain a `reactTsSenior` key (`Object.keys(config.agents)` check).
  - **(c) Filename invariant**: across every fixture × `targets ∈ {claudeCode, codexCli}`, exactly one `implementer.md` (or `.codex/skills/implementer/SKILL.md`) appears in the generated file list, and zero file paths match `/-senior\.md$/` or `/\/react-ts-senior\//`.
  - **(d) Variant body content**: the Python fixture's `implementer.md` contains `async def`/`Pydantic`/`pytest`; the Rust fixture's contains `Result`/`?`/`cargo test`; the Go fixture's contains `context.Context`/`go test`; the Spring fixture's contains `@RestController`/`JUnit`; the .NET fixture's contains `WebApplicationFactory`/`xUnit`; the React-TS fixture's body is a superset of today's `react-ts-senior.md` content (assert `Readonly<`, `useCallback`, `useMemo`, `Component & Hook Details` substrings — same anchors as the deleted test). The Vue/Angular/TypeScript/JavaScript fixtures' bodies contain the Epic-17 placeholder string `Detailed body (citation-backed, top-5 anti-patterns) lands in Epic 17.`.
  - **(e) `ui-designer` gating**: `ui-designer.md` is ABSENT from every backend fixture's generated file list and PRESENT for every frontend fixture; the backend AGENTS.md emitted text does not contain the `ui-designer` row.
  - **(f) Legacy manifest migration**: `manifestSchema.parse({ ...validManifest, config: { ...validConfig, agents: { ...rest, reactTsSenior: true /* no implementerVariant */ } } })` succeeds, `result.config.agents.implementerVariant === 'react-ts'`, and `'reactTsSenior' in result.config.agents === false`. Plus a defensive case: a fake `fooSenior: true` is silently stripped, `barNonSenior: true` is preserved.
  - **(g) Generic byte-identical**: the rendered `implementer.md` for the existing `nextjs-app` fixture under `agents.implementerVariant: 'generic'` matches the captured baseline snapshot exactly (use Jest `toMatchSnapshot` against the pre-T3 baseline file checked in earlier).
- **Notes**:
  - Maps to PRD E13.T9.
  - Each new fixture ships only the minimal manifest needed for detection: `backend-go` = `go.mod` + one `.go` file; `backend-rust` = `Cargo.toml`; `backend-java-spring` = `pom.xml` with `<artifactId>spring-boot-starter-web</artifactId>`; `backend-dotnet` = `Project.csproj` with `<PackageReference Include="Microsoft.AspNetCore.App" />`; `frontend-vue` = `package.json` with `vue` dep; `frontend-angular` = `package.json` with `@angular/core`; `frontend-svelte` = `package.json` with `@sveltejs/kit`; `backend-node-nestjs` = `package.json` with `@nestjs/core`. Stay strictly under 30 LOC per fixture.
  - **DRY**: the test helpers (build a `DetectedStack` for a fixture path, generate, find the implementer file) MUST be extracted into a shared factory inside the test file or `tests/generator/fixtures.ts` — copy-paste across 9 fixtures is forbidden by both the global rule and CLAUDE.md.
  - Per the user's global rule, the four small-helper tests (JVM detector, .NET detector, routing, safe-delete) MUST be simple Jest assertions — one happy path + one negative per file, no elaborate scenarios.
  - **No `any`** — explicit `DetectedStack`/`StackConfig`/`GeneratedFile` types throughout; tests fail-loud on missing files via `getContent()`.
  - File-size: target ≤200 lines for `stack-aware-agents.test.ts`; if assertions push past that, split (g) into a sibling `generic-byte-identical.test.ts`.
  - This task is LAST. Tagged `[TEST]` so it routes to `test-writer`, not `implementer`.

## Post-implementation checklist

- [ ] `pnpm check-types` clean
- [ ] `pnpm test` clean (including the new `stack-aware-agents.test.ts` and per-helper unit tests)
- [ ] `pnpm lint` clean
- [ ] code-reviewer + security-reviewer pass with no critical/warning findings
- [ ] code-optimizer pass surfaces no critical findings
- [ ] `/external-review` produces empty/clean QA.md
- [ ] No `react-ts-senior.md` artifacts remain in `src/`, `dist/`, fixtures, snapshots (grep returns empty)
- [ ] No `reactTsSenior` / `hasReactTsSenior` symbol remains in `src/` or `tests/` outside the legacy-migration test fixture (grep returns empty save for those allowed sites)
- [ ] README "Stack matrix" section renders correctly; `react-ts-senior` only appears inside the migration paragraph as a legacy citation
- [ ] PRD Epic 13 header marked `[DONE 2026-04-28]` with `Landed on feature/epic-13-stack-aware-implementer` (Phase 4 of `/workflow-plan`, not done by this plan)

## External errors

(empty — populate during execution if errors surface in unrelated files)
