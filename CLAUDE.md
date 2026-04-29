# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

<!-- agents-workflows:managed-start -->

`agents-workflows` — Reusable AI agent configuration framework — install battle-tested Claude Code agents, Codex skills, and workflow commands into any project.

## Stack Context

- Typescript (node)
- Jest (testing)
- Oxlint (linter)
- pnpm (package manager)

## Project Structure

Use this map for quick orientation. Folder descriptions are generated only from configured project roles, not inferred from a filesystem crawl.

```text
.
|-- src/    # source root
|-- src/utils/    # utilities and business logic
|-- tests/    # tests
```

## Primary Documentation

- The canonical source of project intent lives in `README.md`.
- Read `README.md` before planning, implementing, reviewing, or writing tests so your work reflects documented requirements and non-goals.
- When `README.md` and code disagree, flag the mismatch in your output instead of silently picking one.

## Context budget

- Load only files, symbols, and recent decisions needed for the current task.
- Never load entire files when `rg`/`grep`/`glob` + targeted read suffices.
- Do not paste docs here — link them. Skills hold task-specific knowledge.
- When context reaches ~50% full, write a NOTES.md summary and /clear.
- For nested packages, a closer AGENTS.md wins over an outer one.

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
| Architecture, planning | `architect` (opus) |
| Implementation | `implementer` |
| Code review (after every file edit) | `code-reviewer` |
| Security review (parallel to code review) | `security-reviewer` |
| Review loop orchestration (post-task) | `reviewer` |
| Optimization pass | `code-optimizer` |
| Unit tests | `test-writer` |

Use sub-agents with independent, single, simple tasks as much as possible.

**Sub-agent deny-bypass caveat.** Claude sub-agents spawned via the `Task` tool do not enforce `permissions.deny` (tracked upstream: [#25000](https://github.com/anthropics/claude-code/issues/25000), [#43142](https://github.com/anthropics/claude-code/issues/43142)). Do not route destructive operations (`git push`, `rm -rf`, `git reset --hard`) through sub-agents — keep them on the main agent where hooks and denies apply. Always review `git diff` and the session transcript before committing; the deny list is defense-in-depth only.

## Planning Workflow

- For complex work, require a simple, explicit `PLAN.md` task breakdown before any implementation starts.
- `PLAN.md` is the single source of truth for current work.
- Each task in `PLAN.md` must name exact file paths, never vague module descriptions.
- **Always start on a dedicated branch** from up-to-date `main`:
  - Features: `feature/<short-kebab-name>`
  - Bug fixes: `fix/<short-kebab-name>`
- **NEVER commit or push** unless the user explicitly asks.
- **Never advance a plan step or begin implementation** until ≥95% confident about scope and approach — ask clarifying questions until that threshold is met.

## Code Review Workflow

After every implementation session, run the following loop before considering the task done:

1. **Launch `code-reviewer` and `security-reviewer` in parallel** — pass the list of all modified files and the task context to both.
2. **Apply every finding** using the `implementer` agent — every critical and warning finding must be fixed.
3. **Re-run type-check** — `pnpm check-types`. Fix any new errors.
4. **Re-run tests** — `pnpm test`. All suites must pass.
5. **Re-run lint** — `pnpm lint`. Must complete with zero warnings.

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

## File Organization

- Keep business logic in `src/utils/` and hooks — keep UI components thin.
- One public component/helper per file.
- Use folder-based module organization with colocated tests and `index.ts` barrel exports.

## DRY and Reusability

DRY and reusability are critical principles — enforced without exception:

- Before writing any component, function, hook, constant, or type, grep the codebase first.
- Same function + different appearance = extend via props/params, not copy.
- Any code appearing in 2+ places must be extracted into a shared module.

## Rules

- Always use `pnpm` for running scripts.
- Ask clarifying questions aggressively — as many as needed, until ≥95% confident — before acting on any ambiguous requirement. Never proceed with less than 95% confidence in scope or approach.
- Prioritize root-cause fixes over superficial patches.
- Never read `.env` files.
- Search the web when library behavior or APIs are uncertain.

## Shared agent policy

The shared, committed policy lives in `.claude/settings.json`, `.codex/config.toml`, and `.codex/rules/project.rules` — every contributor inherits them. `.claude/settings.local.json` is a per-developer cache and stays gitignored. Codex per-user approvals accumulate in `~/.codex/rules/default.rules` on Unix and `%USERPROFILE%\.codex\rules\default.rules` on Windows - prune them quarterly. On Windows hosts, permission rules are the primary guard; kernel sandbox primitives (Linux seccomp / macOS sandbox-exec) do not apply.

## Host hardening (operator-side, applies on every OS)

These complement the command-layer denies — see PRD §1.9.2 for full rationale. Each item lists OS-specific guidance; the **rule** itself applies regardless of OS.

- **Avoid cross-OS / cross-volume access.** Run inside the native filesystem of whichever OS executes the agent. `workspace-write` does not restrict reads, so a prompt-injected agent reaching across mounts can read host secrets.
  - WSL2: `~/Projects/...`, not `/mnt/c/`.
  - macOS: local APFS, not `/Volumes/...` or SMB shares.
  - Linux: local disk, not `/mnt/...`, `sshfs`, or NFS unless explicitly trusted.
  - Windows-native: `%USERPROFILE%\Projects\...`, not UNC paths.
  - Container hosts (Docker / Podman): bind-mount only the project subtree — never `$HOME`. Mounting `$HOME` into a sandboxed agent exposes SSH keys, cloud credentials, and browser profiles.
- **Use sandboxing.** Prefer Claude Code's `/sandbox` for ad-hoc runs (cross-platform). For full sessions, prefer devcontainer / Docker / Podman / Codespaces. OS-native primitives where they apply: Linux seccomp / Landlock, macOS `sandbox-exec`, Windows AppContainer / WDAC. Kernel sandbox primitives do not apply on Windows-native hosts — rules and `/sandbox` are the available controls there. Trust ladder ordering (`/sandbox` < `workspace-write` < devcontainer < disposable VM) compares **write** isolation; for **read** isolation, `/sandbox` adds syscall-filtered read restriction that `workspace-write` does not, so combine the two when read-exfil is the threat.
- **No privilege escalation, any OS.** Never run the harness under `sudo` / `doas` / `su` (Linux/macOS) or "Run as administrator" / elevated PowerShell / `runas /user:Administrator` (Windows). Use a non-privileged user account for daily development:
  - WSL2 / Linux: non-root user with user-scope tooling (nvm / fnm / mise).
  - macOS: standard (non-Admin) user; Homebrew installed once under that user. On Apple Silicon, the initial `/opt/homebrew` setup prompts for `sudo` once — subsequent `brew install` must not require `sudo`. If a later `brew install` prompts for `sudo`, stop and reinstall Homebrew under the correct user.
  - Windows-native: standard (non-Administrator) user; user-scope installs (winget `--scope user`, fnm, Volta). If a UAC consent prompt appears during an agent session, decline and investigate before continuing — it is a red flag, not a routine confirmation.
- **Enterprise endpoint monitoring.** Org-managed devices: install the org-mandated EDR for the host OS so the agent's process is observable alongside other workloads:
  - Windows + WSL2: Microsoft Defender for Endpoint **plus the MDE WSL plug-in**.
  - macOS: Defender for Endpoint for macOS, CrowdStrike Falcon, SentinelOne, etc.
  - Linux: Defender for Endpoint for Linux, Falcon Sensor for Linux, auditd-based agents, etc.

## Semi-autonomous non-interactive mode — security disclosure

### What non-interactive mode does

- Codex runs with `approval_policy = "never"`. All approval prompts are skipped.
- Claude runs with `defaultMode = "acceptEdits"`. File edits and basic
  filesystem ops (`mkdir`, `touch`, `mv`, `cp`) auto-approve in the working
  directory; **Bash commands still prompt** unless they match a rule in
  `permissions.allow`. To get truly headless Claude sessions, pair
  `acceptEdits` with the Epic 9 Bash allow-list — never with
  `bypassPermissions` or `--dangerously-skip-permissions`, which are the
  same dangerous mode in two delivery surfaces.

### What it does NOT relax

- Deny rules in `.claude/settings.json` and forbid rules in `.codex/rules/project.rules`
  still block destructive/forbidden commands.
- The `workspace-write` sandbox still applies (subject to PRD §1.9.1 item 10.2 on Windows).

### Known risks (PRD §1.9.1)

1. **Claude sub-agent deny-bypass.** `Task` tool sub-agents ignore `permissions.deny`
   (Anthropic #25000, #43142). Do not route destructive ops through sub-agents.

2. **Codex Windows sandbox instability.** Workspace-write is unstable on Windows
   (OpenAI #15850 + dupes). Rules are the primary guard there, not the sandbox.

3. **PowerShell wrapper prefix_rule bypass.** `pwsh -Command` / `cmd /c` body is
   opaque to prefix_rule (OpenAI #13502). Mitigated by E9.T12 forbid rules.

4. **Network exfiltration surface.** `network_access = true` plus prompt injection via
   README / issue body / sourcemap can exfiltrate secrets via `curl` / `iwr`.
   Mitigated by E9.T11 denies and E9.T13 `allowedDomains`; residual via `node -e`
   raw sockets.

### Recommendation — isolation environments

Run the agent in an isolated environment when non-interactive mode is enabled:

- devcontainer / Dev Containers / GitHub Codespaces
- Docker / Podman container
- Local VM (UTM / Parallels / Hyper-V / WSL2) or cloud VM / VPS
- Clean dedicated workstation (no personal files, SSH keys, or browser profiles)

### If you run on your primary OS

A prompt-injected agent can read `~/.ssh/*`, `~/.aws/credentials`,
`~/.config/gh/hosts.yml`, browser profile cookies, Windows `%APPDATA%`, etc.
Workspace-write only restricts WRITES, not reads.

Codex CLI is unsupported on Windows-native hosts — use WSL2 or a devcontainer (see README "Codex on Windows hosts").

### Manual review is still required

Always run `git diff` and review changes before committing. The deny list is
defense-in-depth only — especially for sub-agent calls.

<!-- agents-workflows:managed-end -->
