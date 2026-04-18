# AGENTS.md

This file provides guidance to all agents, LLMs, and AI tools when working with code in this repository.

<!-- agents-workflows:managed-start -->

`agents-workflows` — Reusable AI agent configuration framework.

## Stack Context

- Typescript (node)
- None
- Jest (testing)
- Oxlint (linter)
- pnpm (package manager)

## Primary Documentation

- The canonical source of project intent lives in `README.md`.
- Read `README.md` before planning, implementing, reviewing, or writing tests so your work reflects documented requirements and non-goals.
- When `README.md` and code disagree, flag the mismatch in your output instead of silently picking one.

## Sub-agent Routing

| Task | Agent |
|---|---|
| Architecture, planning | `architect` |
| Implementation | `implementer` |
| Code review (after every file edit) | `code-reviewer` |
| Review loop orchestration | `reviewer` |
| Optimization pass | `code-optimizer` |
| Unit tests | `test-writer` |

## Planning Workflow

- For complex work, require a simple, explicit `PLAN.md` task breakdown before any implementation starts.
- `PLAN.md` is the single source of truth for current work.
- Each task must name exact file paths.
- Tasks are tagged: `[UI] [LOGIC] [API] [SCHEMA] [TEST]`.
- Tasks marked `[PARALLEL]` can be executed simultaneously.

## Git & Branch Rules

- **Always start on a dedicated branch** before any implementation.
- **NEVER commit or push** unless the user explicitly asks.

## Code Review Workflow

After every implementation session, run the following loop:

1. **Launch `code-reviewer` agent** on all modified files.
2. **Apply every finding** — every critical and warning must be fixed.
3. **Re-run type-check** — `pnpm check-types`.
4. **Re-run tests** — `pnpm test`. All suites must pass.

This loop is mandatory.

## Code Style

- Always add explicit type annotations to function parameters — never rely on implicit inference.
- No `any` types — use explicit types, discriminated unions, or generics.
- Functions with more than 2 parameters must use a single object parameter.
- Name module-level constants in UPPER_SNAKE_CASE.
- Do not create thin wrapper components that only forward props.
- Avoid redundant type aliases.
- Use descriptive variable names in `.map()` callbacks.
- Avoid hardcoded styling — use theme variables or design tokens.
- Keep files under 200 lines.

## File Organization

- Keep business logic in `src/utils/` and hooks — keep UI components thin.
- One public component/helper per file.
- Use folder-based module organization with colocated tests and `index.ts` barrel exports.

## DRY and Reusability

- Before writing any code, grep the codebase first.
- Same function + different appearance = extend via props/params, not copy.
- Any code appearing in 2+ places must be extracted.

## Rules

- Always use `pnpm` for running scripts.
- Always do what is asked. If something is unclear, ask clarifying questions.
- Never read `.env` files.
- Search the web when library behavior or APIs are uncertain.

<!-- agents-workflows:managed-end -->
