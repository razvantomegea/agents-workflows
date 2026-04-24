# AGENTS.md

This file provides guidance to all agents, LLMs, and AI tools when working with code in this repository.

<!-- agents-workflows:managed-start -->

`agents-workflows` — Reusable AI agent configuration framework.

## Stack Context

- Typescript (node)
- Jest (testing)
- Oxlint (linter)
- pnpm (package manager)


## Primary Documentation

- The canonical source of project intent lives in `PRD.md`.
- Read `PRD.md` before planning, implementing, reviewing, or writing tests so your work reflects documented requirements and non-goals.
- When `PRD.md` and code disagree, flag the mismatch in your output instead of silently picking one.




## Context budget

- Load only files, symbols, and recent decisions needed for the current task.
- Keep this file under 200 lines. If a line's removal would not cause
  mistakes, delete it.
- Never load entire files when `rg`/`grep`/`glob` + targeted read suffices.
- Do not paste docs here — link them. Skills hold task-specific knowledge.
- When context reaches ~50% full, write a NOTES.md summary and /clear.
- For nested packages, a closer AGENTS.md wins over an outer one.


## MCP policy

- Prefer CLIs (`gh`, `aws`, `gcloud`) over custom MCP servers when the
  capability exists as a CLI. CLIs are auditable plain text.
- Run MCP servers with the least privilege needed for the task.
- Never run an untrusted MCP server in the same session that has
  access to secrets or network egress (see Rule of Two, §1.5).
- Scope tokens per task, not per session. Expire on completion.
- GitHub MCP tokens: use fine-grained PATs with repo-specific scope.
- Prefer STDIO-on-localhost or OAuth-authenticated Streamable HTTP.
- Log every MCP tool call with (caller, destination, payload summary).


## Session hygiene

- Commit early and often with descriptive messages — `git revert` is
  the agent's real undo button.
- Every agent session starts from a clean tree on a named branch.
- For parallel/competing agent runs, use `git worktree add` — one
  worktree per task — to prevent cross-contamination.
- Use `/rewind` (Claude Code) or `/fork` / `codex resume` (Codex)
  instead of hand-rolled diff snapshots.
- Never try to force determinism through temperature or seed; make
  the test suite the contract.


## Memory discipline

- `/clear` between unrelated tasks. Always.
- AGENTS.md / CLAUDE.md holds project-wide rules only. Put
  task-specific knowledge in `.claude/skills/*/SKILL.md`.
- Never dump docs into AGENTS.md — link to them.
- When context nears 50% full: `/compact Focus on <current sub-task>`,
  or write NOTES.md and `/clear`.
- Two-strike rule: if the agent is corrected twice on the same issue,
  `/clear` and re-prompt with what you learned.


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

## Model routing (verify current model IDs in vendor docs)

| Role           | Preferred model family        | Reasoning effort | Per-tool invocation hint |
|----------------|-------------------------------|------------------|--------------------------|
| architect      | Opus-class (thinking on)      | high             | Claude: Plan Mode · Codex: `/plan` · Cursor: Plan Mode · Copilot: Ask/Agent mode · Windsurf: Cascade Plan |
| implementer    | Sonnet-class / Codex-class    | medium           | Claude: default · Codex: default · Cursor: Agent (Auto) · Copilot: Agent mode · Windsurf: Cascade Write |
| code-reviewer  | Same family as implementer    | medium           | Claude subagent · Codex subagent · Cursor rule (`alwaysApply`) · Copilot prompt file · Windsurf rule (Always On) |
| reviewer       | DIFFERENT family from implementer | high         | Claude subagent · Codex subagent · Cursor BugBot · Copilot Review · Windsurf Cascade (alt-model) |
| external-review| DIFFERENT family, fresh context   | high         | Any CLI (Code Rabbit default) · Cursor BugBot · Copilot PR review agent |
| code-optimizer | Sonnet-class                  | medium           | same as implementer |
| test-writer    | Sonnet-class                  | medium           | same as implementer |
| e2e-tester     | Sonnet-class                  | medium           | same as implementer |
| ui-designer    | Sonnet-class                  | medium           | same as implementer |

Rule: never let the writer be its own final reviewer. A fresh-context
session with a different model family is the cheapest diversity gain
available. This rule applies identically across Claude Code, Codex CLI,
Cursor, VSCode+Copilot, and Windsurf — pick whichever tool's model
picker yields the family swap (e.g., Cursor Agent on Claude Sonnet +
Copilot Agent on GPT-5, or vice versa).

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
- `npm publish`, `pnpm publish`, `cargo publish`, `twine upload`
- Writes outside the project root, modifications to shell rc files,
  installing system packages

Always prefer `--dry-run` / `terraform plan` / `kubectl diff` first.
Always prefer `--force-with-lease` over `--force` when a force push is
unavoidable, and ask first.

Before any destructive operation, state: (1) what changes, (2) where
(env), (3) reversibility, (4) blast radius (count of rows/files/users).

## Tooling / hooks

`agents-workflows` never silently overwrites existing files — re-running `init` / `update` prompts before any write and preserves user-edited sections by default.

The generated `.claude/settings.json` enforces safety at the tool-call layer via Claude Code hooks:

- **PreToolUse `Bash`** — a shell guard runs before every Bash invocation and blocks commands matching the destructive-pattern list (`rm -rf`, `git push --force`, `git reset --hard`, etc.). Exit 2 = blocked with refusal message; exit 0 = allowed.
- **PostToolUse `Edit|MultiEdit|Write`** — runs the configured lint/format command automatically after every file edit.

Review or adjust hook entries in `.claude/settings.json` under the `"hooks"` key. Per-developer overrides go in `.claude/settings.local.json` (gitignored).

## Formatting / linting

- One formatter per language, CI-enforced. Fail on diff.
- `.editorconfig` committed (charset, line endings, indent, final newline).
- Type-check in CI as a lint step: `tsc --noEmit`, `mypy --strict`,
  `pyright`, `cargo check`, `go vet`.
- JS/TS new projects: prefer Biome (single tool). Large legacy repos
  with deep ESLint investment: stay on ESLint+Prettier until Biome
  plugin coverage closes the gap for your stack.
- Treewide formatting: one "apply formatter" commit, added to
  `.git-blame-ignore-revs`.
- Security-focused static analysis beyond linting: CodeQL, Semgrep,
  SonarQube (cognitive complexity), `cargo-audit`, `npm audit`,
  `pip-audit`.


## Deployment rules

- Config via environment. No hardcoded secrets or hostnames. Validate
  required env at boot via a typed schema (zod/pydantic/viper).
- Stateless processes; session state in external store.
- Strict dev/staging/prod parity: same DB engine version, same queue,
  same container base image. No SQLite-in-dev/Postgres-in-prod.
- Feature flags via OpenFeature SDK + a provider (LaunchDarkly, Unleash,
  Flagsmith, ConfigCat, Flipt, GrowthBook). Avoid direct vendor SDKs.
  Flags have owner + removal date in code; clean up quarterly.
- Progressive delivery: canary with metrics-gated promotion (Argo
  Rollouts / Flagger). Blue/green for stateful. Rollback ≤5 min.
- DB migrations: expand-contract (add-new → dual-write → switch-reads →
  drop-old), each phase a separate deploy. `CREATE INDEX CONCURRENTLY`
  on Postgres. `pt-online-schema-change` / `gh-ost` on MySQL.
  `strong_migrations` / `django-safemigrate` / `pgroll` in CI.


<!-- agents-workflows:managed-end -->
