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

- Never commit or push unless the user explicitly asks.
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

**Sub-agent deny-bypass caveat.** Claude sub-agents spawned via the `Task` tool do not enforce `permissions.deny` (tracked upstream: [#25000](https://github.com/anthropics/claude-code/issues/25000), [#43142](https://github.com/anthropics/claude-code/issues/43142)). Do not route destructive operations (`git push`, `rm -rf`, `git reset --hard`) through sub-agents — keep them on the main agent where hooks and denies apply. Always review `git diff` and the session transcript before committing; the deny list is defense-in-depth only.

## Model routing (Claude + GPT defaults; verify current model IDs in vendor docs)

| Role           | Preferred model family                                      | Backup model family                       | Reasoning effort | Per-tool invocation hint |
|----------------|-------------------------------------------------------------|-------------------------------------------|------------------|--------------------------|
| architect      | Claude (Opus / latest Sonnet, thinking on)                  | GPT-5.x (high-reasoning mode)             | high             | Claude: Plan Mode · Codex: `/plan` · Cursor: Plan Mode · Copilot: Ask/Agent mode · Windsurf: Cascade Plan |
| implementer    | TS/React/Three.js: GPT-5.x (Codex) · Python/infra: Claude   | Opposite family of the writer             | medium           | Claude: default · Codex: default · Cursor: Agent (Auto) · Copilot: Agent mode · Windsurf: Cascade Write |
| code-reviewer  | Same FAMILY as implementer                                  | —                                         | medium           | Claude subagent · Codex subagent · Cursor rule (`alwaysApply`) · Copilot prompt file · Windsurf rule (Always On) |
| reviewer       | DIFFERENT FAMILY from implementer (Claude ↔ GPT-5.x)        | —                                         | high             | Claude subagent · Codex subagent · Cursor BugBot · Copilot Review · Windsurf Cascade (alt-model) |
| external-review| CodeRabbit CLI mandatory default; different-family reviewer for exception/fallbacks | Cursor BugBot / Copilot PR review only when CodeRabbit is unavailable | high | CodeRabbit CLI first � `/codex:review` only for Claude-authored diffs � Cursor BugBot / Copilot PR review fallback |
| code-optimizer | Same family as implementer                                  | Opposite family for risky refactors       | medium           | same as implementer |
| test-writer    | Claude (test strategy)                                      | GPT-5.x (boilerplate test code)           | medium           | same as implementer |
| e2e-tester     | Claude                                                      | GPT-5.x                                   | medium           | same as implementer |
| ui-designer    | **Claude Opus** (UX thinking / a11y / design-system; adaptive thinking on) | - | high           | MUST run before `implementer` on any UI/UX task |

Rule: never let the writer be its own final reviewer. The `reviewer`
role MUST run on a different model FAMILY than the implementer —
Claude ↔ GPT-5.x is the cheapest diversity gain available. This rule
applies identically across Claude Code, Codex CLI, Cursor,
VSCode+Copilot, and Windsurf — pick whichever tool's model picker
yields the family swap (e.g., Cursor Agent on Claude Sonnet + Copilot
Agent on GPT-5.x, or vice versa).

### Stack-aware writer/reviewer defaults

This workspace is a **typescript** codebase where GPT-5.x leads on rapid implementation. Implementer: **GPT-5.x**. Reviewer + `/external-review`: **Claude**. Architect + test strategy: **Claude**.

### Cross-stack primary / secondary map

**Primary** writes; **Secondary** runs `reviewer` + `/external-review`. Writer and reviewer MUST stay different families.

| Stack / language                                | Primary (implementer) | Secondary (reviewer + cross-check) |
|-------------------------------------------------|------------------------|------------------------------------|
| Plain JS / TS (libs, CLIs, Node backends)       | GPT-5.x                | Claude                             |
| React / Next.js / React Native / Remix          | GPT-5.x                | Claude                             |
| Three.js / WebGL / canvas / shaders             | GPT-5.x                | Claude                             |
| Vue / Svelte / Solid / Angular                  | GPT-5.x                | Claude                             |
| Python (FastAPI / Django / Flask / data)        | Claude                 | GPT-5.x                            |
| C++ / systems / low-level                       | Tie (see notes)        | Opposite family of writer          |
| Java (Spring, enterprise OO)                    | Claude                 | GPT-5.x                            |
| C# / .NET (ASP.NET Core, LINQ)                  | GPT-5.x                | Claude                             |
| Go (services, CLIs, concurrency)                | GPT-5.x                | Claude                             |
| Rust (ownership, lifetimes, refactors)          | Claude                 | GPT-5.x                            |
| PHP (Laravel, Symfony)                          | GPT-5.x                | Claude                             |
| Ruby / Rails                                    | Claude                 | GPT-5.x                            |
| Swift / iOS (SwiftUI, UIKit)                    | GPT-5.x                | Claude                             |
| Kotlin / Android (coroutines, flows)            | GPT-5.x                | Claude                             |

For C++ / low-level work, neither family is authoritative: every change MUST be validated by the compiler, sanitizers, and tests. Prefer GPT-5.x for implementation drafts; prefer Claude for understanding legacy / template code and concurrency invariants.

**UI/UX two-phase exception.** UI work resolves to two different models: **Phase A — design thinking / planning** (flows, IA, UX heuristics, a11y, design-system decisions) runs on **Claude Opus** with adaptive thinking on; **Phase B — UI implementation** (component code, Tailwind, Three.js, SwiftUI) runs on **GPT-5.x (Codex)** taking Opus's approved notes as input. The `ui-designer` role MUST run on Claude Opus and MUST precede the `implementer` on any UI/UX task. See PRD §1.7.1 for the full rationale.

### Cross-model handoff setup (how Claude invokes Codex and vice versa)

The Claude ↔ GPT-5.x rotation is NOT driven by file watching. Three mechanisms, in preference order (PRD §1.7.2):

1. **Codex Plugin for Claude Code (MCP)** — install once: `/plugin marketplace add openai/codex-plugin-cc` → `/plugin install codex@openai-codex` → `/codex:setup`. Claude then calls Codex via `/codex:delegate <task>` (implementation) and `/codex:review` (opposite-family reviewer).
2. **`claude -p` inside Codex** — from a Codex session, shell out via `claude -p "<prompt>"`; allowlisted in `.codex/rules/project.rules`.
3. **Subprocess fallback** — `Bash(codex exec "<prompt>")` from Claude Code; `Bash(codex exec:*)` and `Bash(claude -p:*)` are allowlisted in generated `.claude/settings.json`; all §1.9 denies remain in force.

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

## Deployment Rules

See `AGENTS-DEPLOYMENT.md` for deployment checklist and rules.

<!-- agents-workflows:managed-end -->
