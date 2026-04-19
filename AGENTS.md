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

- The canonical source of project intent lives in `PRD.md`.
- Read `PRD.md` before planning, implementing, reviewing, or writing tests so your work reflects documented requirements and non-goals.
- When `PRD.md` and code disagree, flag the mismatch in your output instead of silently picking one.




## Context budget

Treat context as a finite attention budget, not a storage tank. Every token
you load competes with reasoning quality (context rot is real; see Chroma
2025). Rules:
- Keep this file under 200 lines. If a line's removal would not cause
  mistakes, delete it.
- Never load entire files when `rg`/`grep`/`glob` + targeted read suffices.
- Do not paste docs here — link them. Skills hold task-specific knowledge.
- When context reaches ~50% full, write a NOTES.md summary and /clear.
- For nested packages, a closer AGENTS.md wins over an outer one.


## Sub-agent Routing

| Task | Agent |
|---|---|
| Architecture, planning | `architect` |
| Implementation | `implementer` |
| Code review (after every file edit) | `code-reviewer` |
| Security review (parallel to code review) | `security-reviewer` |
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

1. **Launch `code-reviewer` and `security-reviewer` in parallel** on all modified files.
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

## Dangerous operations — require explicit confirmation

NEVER execute without the user typing "yes" in the current session:
- `rm -rf`, `rm -r` on any directory
- `git push --force` / `--force-with-lease` on shared branches
- `git reset --hard`, `git clean -fd`, `git branch -D`
- `DROP`, `TRUNCATE`, `DELETE`/`UPDATE` without `WHERE`
- `kubectl`/`terraform` targeting any non-local context
- `npm publish`, `pnpm publish`, `cargo publish`, `pypi upload`
- Writes outside the project root, modifications to shell rc files,
  installing system packages

Always prefer `--dry-run` / `terraform plan` / `kubectl diff` first.
Always prefer `--force-with-lease` over `--force` when a force push is
unavoidable, and ask first.

Before any destructive operation, state: (1) what changes, (2) where
(env), (3) reversibility, (4) blast radius (count of rows/files/users).

<!-- agents-workflows:managed-end -->
