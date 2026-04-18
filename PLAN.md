# Plan - React+TS Senior Agent
_Branch: `feature/react-ts-senior-agent` | Date: 2026-04-18_

## Context

Add an optional `react-ts-senior` agent that emits only when `stack.framework` is any React-based framework (`react`, `nextjs`, `expo`, `react-native`, `remix`) and `stack.language` is `typescript`. The template must be parameterized through the existing `GeneratorContext` so it adapts across all React frameworks — no Tamagui/Zustand/Expo Router specifics. Selection is threaded through schema defaults, prompt flow, build-context, agent generator, routing tables, and tests, reusing existing partials (`code-style`, `dry-rules`, `file-organization`, `docs-reference`, `stack-context`) to avoid duplication with `implementer.md.ejs`.

## Pre-implementation checklist

- [ ] Grepped codebase for existing equivalents (components, hooks, utils, types, constants)
- [ ] Verified no type duplication - shared types imported, not redeclared
- [ ] Confirmed no magic numbers - all values reference design tokens or named constants
- [ ] Confirmed `isReactFramework` from `src/constants/frameworks.ts` is the single gate (do not inline the React framework list)
- [ ] Confirmed existing partials under `src/templates/partials/` are reused instead of duplicated in the new template

## Tasks

### Task 1 - Extend StackConfig schema with `reactTsSenior` agent flag [SCHEMA]
**Files**: `src/schema/stack-config.ts`
**Input**: Existing `agents` z.object in `stackConfigSchema`.
**Output**: Adds `reactTsSenior: z.boolean().default(false)` to the `agents` object. Default `false` is intentional — default enablement for React+TS stacks is computed at config-build time (Task 4), not baked into the zod default (which has no access to stack language/framework).
**Notes**: Keep ordering consistent. Type must be `boolean`. DRY: do not introduce a parallel list of agent keys.

### Task 2 - Add agent definition and generator wiring [LOGIC]
**Files**: `src/generator/generate-agents.ts`
**Input**: `AGENT_DEFINITIONS` array (lines 11-21).
**Output**: Adds `{ key: 'reactTsSenior', templateFile: 'agents/react-ts-senior.md.ejs', outputName: 'react-ts-senior.md' }`. Emission remains gated by `config.agents[agent.key]`.
**Notes**: Place entry right after `implementer`. DRY: do not duplicate skill-conversion path — `convertToSkill` already runs for every entry.

### Task 3 - Thread `hasReactTsSenior` through GeneratorContext [LOGIC]
**Files**: `src/generator/types.ts`, `src/generator/build-context.ts`
**Input**: `GeneratorContext` interface and `buildContext`.
**Output**: Adds `hasReactTsSenior: boolean` to `GeneratorContext` (next to `hasUiDesigner`, `hasE2eTester`, `hasSecurityReviewer`) and populates it as `config.agents.reactTsSenior` in `buildContext`.
**Notes**: Flag is a pure mirror of the config. React+TS eligibility lives in prompt defaults (Task 4). DRY: reuse existing `isReact` / `isTypescript` derivations.

### Task 4 - Prompt flow: default + checkbox gating [LOGIC]
**Files**: `src/prompt/questions.ts`, `src/prompt/prompt-flow.ts`
**Input**: `askAgentSelection(isFrontend)`, `runPromptFlow` call site + agents mapping, `createDefaultConfig` agents block.
**Output**:
  - Change `askAgentSelection` signature to a single object parameter `{ isFrontend: boolean; isReactTs: boolean }` (complies with CLAUDE.md >2 params rule).
  - When `isReactTs` is true, append choice `{ name: 'react-ts-senior — Senior React + TypeScript implementation agent', value: 'reactTsSenior', checked: true }`; otherwise omit entirely.
  - In `runPromptFlow`, compute `const isReactTs = isReactFramework(stack.framework) && stack.language === 'typescript';` and pass `{ isFrontend, isReactTs }` to `askAgentSelection`. Map `reactTsSenior: selectedAgents.includes('reactTsSenior')` into agents.
  - In `createDefaultConfig`, compute the same `isReactTs` and set `reactTsSenior: isReactTs` in agents.
**Notes**: Import `isReactFramework`. Do not inline React framework list. DRY: same expression in two callers — acceptable; extract helper only if a third caller appears.

### Task 5 - Create parameterized `react-ts-senior` agent template [UI]
**Files**: `src/templates/agents/react-ts-senior.md.ejs` (new)
**Input**: Reference `C:\Projects\ieftinake\.claude\agents\react-ts-senior.md`; existing `implementer.md.ejs` for structure; partials under `src/templates/partials/`.
**Output**: New EJS template:
  - Frontmatter: `name: react-ts-senior`, description "senior React + TypeScript implementation agent", `tools: Read, Edit, Write, Bash, Grep, Glob`, `model: sonnet`, `color: green`.
  - Opening: `You are a senior <%= stack.framework %> + TypeScript implementation agent for the <%= project.name %> project: <%= project.description %>.`
  - Includes partials: `stack-context`, `code-style` (emits React rules via `isReact`), `dry-rules`, `file-organization`, `docs-reference`.
  - Specific sections (generalized — no Tamagui/Zustand/Expo Router):
    - **Component Conventions**: arrow components, `Readonly<>` props, one public per file, extract JSX >30 lines, no thin wrappers, `<%= conventions.maxFileLength %>` max.
    - **Hook & Performance Conventions**: `useCallback` for handlers, `useMemo` for derived values.
    - **TypeScript Conventions**: no `any`, explicit param types, >2 params → `Readonly<>` object, discriminated unions, no redundant aliases.
    - **Testing Conventions**: colocated (`foo.ts → foo.test.ts`) or under `testsDir`, framework from `<%= testFramework %>`, push logic into pure functions.
    - **Workflow** (6 steps) and **Boundaries**.
  - Closing `<output_format>`, `<constraints>`, `<uncertainty>` blocks matching other agents (required by existing tests).
**Notes**: Must stay under 200 lines. Reuse partials — do NOT inline code-style/DRY rules. No Tamagui/Zustand/Expo Router/Supabase references.

### Task 6 - Routing tables in AGENTS.md and CLAUDE.md [UI]
**Files**: `src/templates/config/AGENTS.md.ejs`, `src/templates/config/CLAUDE.md.ejs`
**Input**: Sub-agent Routing tables.
**Output**: In both files, add conditional row immediately after the generic Implementation row:
  ```ejs
  <% if (hasReactTsSenior) { -%>
  | Implementation (React + TypeScript) | `react-ts-senior` |
  <% } -%>
  ```
**Notes**: Keep alignment consistent with other conditional rows. Do not remove generic `implementer` row.

### Task 7 - Tests: emission gating + template content [TEST] [PARALLEL]
**Files**: `tests/generator/generate-all.test.ts`, `tests/generator/fixtures.ts` (if exists)
**Input**: Existing `generateAll` test suite and helper factory.
**Output**:
  - Helper/fixture updates: set `reactTsSenior: true` where stack is nextjs+typescript so happy-path test covers it.
  - New test: `emits react-ts-senior.md only when agents.reactTsSenior is true` — runs `generateAll` with flag on (assert `.claude/agents/react-ts-senior.md` present, content includes `React + TypeScript`, `Readonly`, `useCallback`, `useMemo`, project name interpolated, no Tamagui/Zustand literals) and off (file absent).
  - Assert rendered file ≤200 lines.
  - Confirm `expectedAgentCount` in `renders modernized agent frontmatter` test remains correct after adding the new flag.
**Notes**: Keep each test ≤30 lines. Reuse config factories.

### Task 8 - Prompt-flow unit coverage for defaults [TEST] [PARALLEL]
**Files**: `tests/prompt/prompt-flow.test.ts` (grep first; create if absent)
**Input**: `createDefaultConfig` from `src/prompt/prompt-flow.ts` and existing `DetectedStack` fixtures.
**Output**:
  1. `createDefaultConfig defaults reactTsSenior to true when stack is React + TypeScript` — `framework: 'nextjs'`, `language: 'typescript'`; expect `true`.
  2. `createDefaultConfig defaults reactTsSenior to false for non-React or non-TS stacks` — `{ framework: 'express', language: 'typescript' }` and `{ framework: 'nextjs', language: 'javascript' }`; expect `false`.
**Notes**: Grep existing prompt tests first and append if possible. Keep tests simple.

## Post-implementation checklist

- [ ] `pnpm check-types` - zero errors
- [ ] `pnpm test` - all suites pass
- [ ] `pnpm lint` - zero warnings
- [ ] Run `code-reviewer` agent on all modified files - all critical and warning findings fixed
- [ ] DRY scan complete - no duplicated code across modified files
- [ ] Rendered `react-ts-senior.md` under 200 lines
- [ ] Routing row appears in both `AGENTS.md` and `CLAUDE.md` only when `hasReactTsSenior` is true
- [ ] No Tamagui / Zustand / Expo Router / Supabase / i18n-namespace literals in the new template

## External errors

- `src/prompt/prompt-flow.ts` exceeds the 200-line limit (283 lines) — pre-existing. Refactor to split `resolveCommands` and `createDefaultConfig` into sibling files; not addressed in this PR.
- `src/prompt/prompt-flow.ts` `resolveCommands` has 5 positional parameters — pre-existing violation of the ">2 params → object param" rule. Not addressed in this PR.
- `tests/prompt/prompt-flow.test.ts` exceeds the 200-line limit (~296 lines after additions) — pre-existing. Split into `prompt-flow.test.ts` and `framework-constants.test.ts`; not addressed in this PR.
