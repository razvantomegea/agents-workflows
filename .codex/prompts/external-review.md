---
name: external-review
description: "Run an external review tool and write findings to QA.md."
---

Run an external code review on the current branch diff. **CodeRabbit CLI** (also called Code Rabbit CLI) is the mandatory default external reviewer. It runs cross-platform (Windows via WSL Ubuntu, Linux, macOS) and its findings land in `QA.md` for `/workflow-fix` to address.

## Step 1 - Verify prerequisites

- Confirm the current branch is NOT `main`. If it is, abort:
  `Cannot run CodeRabbit review on main. Switch to a feature branch first.`
- The review covers all changes on the current branch compared to `main`.
- Verify `cr --version` works (use the platform-appropriate invocation from Step 2). If it fails,
  abort and point the user to the install block in Step 2.

## Step 2 - Run CodeRabbit

## CodeRabbit CLI setup

CodeRabbit CLI binary is `coderabbit` with `cr` as the short alias. The sections below cover install, authentication, version check, and invocation per platform. Emit all three platforms; users pick the one that matches their host.

> **Supply-chain note:** the `curl ... | sh` installer is pulled from `cli.coderabbit.ai` (the CodeRabbit vendor domain) over HTTPS with `-fsSL` (fail-on-error, follow-redirects, silent, show-errors). On macOS prefer `brew install coderabbit` so Homebrew handles pinning and verification. `main` is pre-validated by the `safeBranch` schema (`[a-zA-Z0-9._/-]+` only), so embedding it inside a double-quoted `bash -lc` string is shell-safe.

### Windows (WSL Ubuntu)

> CodeRabbit CLI does not ship a native Windows binary. Run it inside WSL Ubuntu so the POSIX shell is available.

**Install (one-time):**

```bash
wsl -d Ubuntu -- bash -lc 'curl -fsSL https://cli.coderabbit.ai/install.sh | sh'
```

The installer drops the binary at the WSL user's `~/.local/bin/cr` (for example `/home/<user>/.local/bin/cr`) — **not** `/root/.local/bin/cr`. Always use `bash -lc` so the login shell sources the user's PATH.

**Authenticate (one-time):**

```bash
wsl -d Ubuntu -- bash -lc 'cr auth login'
```

**Verify installation:**

```bash
wsl -d Ubuntu -- bash -lc 'cr --version'
```

**Run the review:**

```bash
wsl -d Ubuntu -- bash -lc "cd /mnt/c/Projects/<repo-name> && cr review --agent --base main --config CLAUDE.md"
```

Substitute the correct `/mnt/c/...` path for your repo. Pass `/mnt/c/...` **directly** — do NOT pipe through `wslpath -a` (it double-prefixes paths that are already WSL-style).

### Linux / macOS

**Install (one-time):**

```bash
curl -fsSL https://cli.coderabbit.ai/install.sh | sh
```

macOS alternative via Homebrew:

```bash
brew install coderabbit
```

**Authenticate (one-time):**

```bash
cr auth login
```

**Verify installation:**

```bash
cr --version
```

**Run the review:**

```bash
cr review --agent --base main --config CLAUDE.md
```

### Sources

- https://www.coderabbit.ai/cli
- https://docs.coderabbit.ai/cli
- https://cli.coderabbit.ai/install.sh
- https://formulae.brew.sh/cask/coderabbit

Capture the full output. If the command fails, report the error and abort.

## Step 3 - Format QA.md

If there are no findings, overwrite `QA.md` (do NOT append) with:

```markdown
> **Warning**: These findings come from an automated tool (CodeRabbit) and may be inaccurate or
> based on incomplete context. Before applying any fix, verify the observation against the actual
> code. Skip findings that are wrong or do not apply.
All good!
```

Then stop.

Otherwise, overwrite `QA.md` (do NOT append) with the following structure:

```markdown
# QA Review

## CodeRabbit Review - YYYY-MM-DD

> **Warning**: These findings come from an automated tool (CodeRabbit) and may be inaccurate or
> based on incomplete context. Before applying any fix, verify the observation against the actual
> code. Skip findings that are wrong or do not apply.

### path/to/file.tsx
- [ ] [severity] Description of finding...

### path/to/another-file.ts
- [ ] [severity] Description of finding...
```

Group findings by file. Use severity tags when CodeRabbit provides them (`[critical]`, `[warning]`,
`[suggestion]`). Default to `[suggestion]` when the severity is missing.

## Step 4 - Summary

Print total findings count, breakdown by file, and:
`Run /workflow-fix QA.md to address these findings (recommended: use Codex CLI).`

## Advanced: terminal-command override

Use this path only when CodeRabbit CLI is unavailable or an alternative reviewer is required. Pass
the override command after the slash command, e.g.
`/external-review coderabbit review --base main`.

When a terminal command is supplied, parse it and allow execution only when the binary and first
subcommand (or first flag for flag-first CLIs such as `curl`) are explicitly allowlisted.
Allowed pairs:
- `coderabbit review` (or the short alias `cr review`)
- `coderabbit --version` (or `cr --version`)
- `git diff`
- `git show`
- `gh pr view`
- `gh pr diff`
- `curl --head` (HTTPS URL only)
- `curl --silent` (HTTPS URL only)

If the binary/subcommand pair is not allowlisted, reject the command outright - do not execute
it and do NOT silently substitute a different tool. Instruct the user to provide a different
command that uses an allowlisted binary/subcommand pair.

For allowlisted commands, validate the **entire token list** before execution - not just the
binary/subcommand pair. If any forbidden token appears, reject the command and ask for a
sanitized override instead of executing the original input.

Apply token-level restrictions:
- `curl`: reject any command containing write/upload/request-body flags anywhere in the token list
  (`--data`, `--data-binary`, `--upload-file`, `-T`, `--form`, `-F`, `-o`, `-O`, `--output`,
  `--config`, `--unix-socket`) and reject any non-HTTPS URL token.
- `git`, `gh`, `coderabbit` / `cr`: reject write/output/piping/exec flags or arguments anywhere
  in the token list (for example `--output`, `-o`, `--output-file`, redirection-like output args,
  or any token that implies command execution or file writes).

Before executing any user-supplied command, verify it does not contain shell metacharacters
that suggest command substitution, piping to a shell, or destructive operations
(e.g. `$(...)`, backtick substitution, `| sh`, `| bash`, `rm -rf`, `>`,
`&&` chained destructive ops, `;`, `||`, `<`, `${...}`, or encoded/newline payloads). If the
command looks suspicious, reject it outright - do NOT silently substitute a different tool.
Instruct the user to provide a sanitized command that does not contain metacharacters.

## Cross-model requirement

The external review tool **must** run on a different model family than the implementer and
code-reviewer used for the diff. Family parity between the writer and the final reviewer is
forbidden. See Section 1.7 of the project PRD for the full model-routing rationale.

## AI-authored code (Thoughtworks Radar v33 — "Hold" on AI complacency)

<ai_complacency_guard>
When reviewing AI-generated code, verify explicitly:
- Correctness: tests fail on wrong behavior (not vacuous).
- No hallucinated imports, APIs, or package names.
- No mocking-the-SUT or testing-the-mock anti-patterns.
- No `any` / `@ts-ignore` / `eslint-disable` added to pass CI.
- A human read and understood every line before approval.
- Never auto-merge on AI approval alone.
</ai_complacency_guard>

## Rules

- `NEVER commit or push.`
- `Always overwrite QA.md completely (previous content is not preserved).`
- `Always include the automated-tool accuracy warning in QA.md.`
