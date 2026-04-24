# Plan - Epic 9 Agent Permission & Sandbox Hardening
_Branch: `feature/epic-9-permission-sandbox-hardening` | Date: 2026-04-24_

## Context
Ship a committed, deny-first permission policy for Claude Code and Codex so launching either tool from this repo cannot silently commit, push, rewrite history, touch paths outside the workspace, or run destructive commands. This epic is the **hardening gate** for Epic 10: non-interactive mode stays locked until every MUST item here lands and the E9.T15 smoke suite is green on Windows.

## Pre-implementation checklist

- [ ] On branch `feature/epic-9-permission-sandbox-hardening`; tree clean (`git status`).
- [ ] Read `PRD.md` §1.9 (Epic 9, L1776–1912) and §1.9.1 risk register (L358–404).
- [ ] Grepped codebase for existing equivalents (`DENY_PATTERNS`, `DESTRUCTIVE_BASH_PATTERNS`, `buildPermissions`, partials, template paths).
- [ ] Verified no type duplication - shared types imported, not redeclared.
- [ ] Confirmed no magic numbers / no broad `Bash(git:*)` or `--dangerously-skip-permissions` examples land in emitted docs.

## Tasks

### Task 1 - Expand deny + allow patterns [LOGIC]
**Files**: `src/generator/permissions.ts`, `src/generator/permission-constants.ts` (new if `permissions.ts` grows past 200 lines).
**Input**: `PRD.md` E9.T1 consolidated list; §1.9.1 item 10.5; existing `DENY_PATTERNS` (L23–44) and `DESTRUCTIVE_BASH_PATTERNS` (L9–21).
**Output**: `DENY_PATTERNS` superset covering `Bash(git push:*)`, `Bash(git commit:*)`, `Bash(git commit --amend:*)`, `Bash(git rm:*)`, `Bash(sudo:*)`, `Bash(curl:* | sh)`, `Bash(curl:* | bash)`, `Bash(wget:* | sh)`, `Bash(wget:* | bash)`, `Edit(/**)`, `Edit(~/**)`, `Write(/**)`, `Write(~/**)`, `MultiEdit(/**)`, `MultiEdit(~/**)`, and exfil `Bash(Invoke-WebRequest:*)`, `Bash(iwr:*)`, `Bash(Invoke-RestMethod:*)`, `Bash(irm:*)`, `Bash(curl.exe:*)`, `Bash(wget.exe:*)`. `buildPermissions` allow includes `Bash(git status|diff|log|branch|add|checkout|switch|stash|pull:*)`, `Bash(tsc|jest|eslint|prettier|node|npx:*)` (skip duplicates already covered by pnpm glob).
**Notes**: Every existing deny must remain verbatim (E9 acceptance: "no existing deny is dropped"). Keep one source-of-truth constant — extend, do not fork. If file exceeds 200 lines, extract constants to `permission-constants.ts` and import.

### Task 2 - Shared `.claude/settings.json` + sandbox block [TEMPLATE] [LOGIC]
**Files**: `src/templates/config/settings-local.json.ejs` (rename to `settings.json.ejs`), `src/generator/generate-root-config.ts` (L25–26 output path change), `.claude/settings.json` (generated output, tracked).
**Input**: Task 1 deny/allow constants; E9.T2 + E9.T13 schema (`sandbox.mode`, `sandbox.autoAllowBashIfSandboxed`, `sandbox.allowedDomains`).
**Output**: Emits `.claude/settings.json` (shared) with `"defaultMode": "default"`, full deny/allow, existing `hooks.PostToolUse` preserved verbatim, and `"sandbox": { "mode": "workspace-write", "autoAllowBashIfSandboxed": true, "allowedDomains": ["api.github.com","registry.npmjs.org","nodejs.org","raw.githubusercontent.com","objects.githubusercontent.com","pypi.org","files.pythonhosted.org"] }`. Output path switches from `settings.local.json` → `settings.json`.
**Notes**: JSON must parse. `settings.local.json` is no longer emitted by `init`. Preserve `PreToolUse` + `PostToolUse` hooks. No broad `Bash(git:*)` allow.

### Task 3 - Codex config + project.rules template [TEMPLATE]
**Files**: `src/templates/config/codex-config.toml.ejs` (edit), `src/templates/config/codex-project-rules.ejs` (new), `src/generator/generate-root-config.ts` (register new template → `.codex/rules/project.rules`), `.codex/config.toml` (regenerated), `.codex/rules/project.rules` (regenerated).
**Input**: E9.T3 (Unix forbids + toolchain allows), E9.T10 (Windows-native removes), E9.T11 (exfil), E9.T12 (shell wrappers).
**Output**: `codex-config.toml.ejs` emits `approval_policy = "on-failure"`, `sandbox_mode = "workspace-write"`, `network_access = false`, no `writable_roots`. `codex-project-rules.ejs` emits forbid rules for `git push`, `git commit`, `git commit --amend`, `git reset --hard`, `git reset --merge`, `git clean -f`, `git clean -fd`, `git branch -D`, `rm`, `sudo`, `npm publish`, `pnpm publish`, `cargo publish`, `twine upload`, `terraform apply`, `kubectl apply`, `kubectl delete`, `curl | sh|bash`, `wget | sh|bash`, `Remove-Item`, `Remove-ItemProperty`, `del`, `erase`, `rmdir`, `rd`, `ri`, `rm` (PS alias), `Invoke-WebRequest`, `iwr`, `Invoke-RestMethod`, `irm`, `curl.exe`, `wget.exe`, `pwsh -Command|-c|-EncodedCommand`, `powershell -Command|-c|-EncodedCommand`, `cmd /c|/k`, `cmd.exe /c|/k`. Allow rules: `node`, `npm`, `npx`, `pnpm`, `yarn`, `tsc`, `tsx`, `vitest`, `jest`, `eslint`, `prettier`, `python`, `python3`, `pip`, read-only git subcommands (`status|diff|log|branch|add|checkout|switch|stash`). No broad `["git"]` allow; no `curl`/`wget` allow.
**Notes**: Keep each rules file ≤200 lines; split the partial if needed. Every forbid carries a short inline justification. No `--dangerously-bypass-approvals-and-sandbox` anywhere.

### Task 4 - `.gitignore` surgical un-ignore [SCHEMA] [PARALLEL]
**Files**: `.gitignore`, `src/templates/root/gitignore.ejs` (edit if generator emits this file; otherwise direct edit).
**Input**: E9.T4 negation spec.
**Output**: Appends `!/.claude/settings.json`, `!/.codex/config.toml`, `!/.codex/rules/`, and adds `.claude/settings.local.json` to the ignore list. `git check-ignore -v .claude/settings.json` → NOT ignored; `.claude/settings.local.json` → ignored; `.codex/config.toml` → NOT ignored.
**Notes**: PLAN instruction (NOT automated): after Epic 9 merges, user must `git rm --cached .claude/settings.local.json` then commit the ignore update — architect does not perform this.

### Task 5 - Sub-agent caveat + policy-boundaries paragraph [TEMPLATE] [DOC] [PARALLEL]
**Files**: `src/templates/partials/subagent-caveat.md.ejs` (new), `src/templates/config/CLAUDE.md.ejs` (include partial + append ≤8-line boundary paragraph), `src/templates/config/AGENTS.md.ejs` (include partial).
**Input**: E9.T5 (policy-boundary paragraph), E9.T14 (sub-agent caveat verbatim three-sentence copy).
**Output**: Partial contains the three-sentence caveat including GitHub issue links `#25000` and `#43142`. Both CLAUDE.md and AGENTS.md include the partial in the Sub-agent Routing / permission section. CLAUDE.md gains a ≤8-line paragraph describing shared `.claude/settings.json` + `.codex/config.toml` + `.codex/rules/project.rules`, per-developer `.claude/settings.local.json`, `~/.codex/rules/default.rules` prune reminder, and Windows primary-guard note.
**Notes**: PRD E9.T14 references `src/templates/docs/…` — treat as documentation drift; real paths are `src/templates/config/`. Three-sentence caveat must render verbatim.

### Task 6 - Security smoke suite + runbook [TEST]
**Files**: `tests/security/smoke.test.ts` (new), `docs/security-smoke-runbook.md` (new).
**Input**: E9.T15 (17 cases); rendered `.claude/settings.json` + `.codex/rules/project.rules` after Task 2 + 3.
**Output**: Jest automates the 13 must-block cases (`case-G1..G8`, `case-R1..R3`, `case-W4`, `case-N1`) by asserting each denied pattern is present in the rendered policy outputs. Residual / manual cases (`case-W1..W3`, `case-N2`, sub-agent bypass 10.1, Windows sandbox 10.2, settings `bypassPermissions` 10.4) captured in `docs/security-smoke-runbook.md` with reproducible manual steps. Tests run via `pnpm test tests/security`.
**Notes**: Keep `smoke.test.ts` ≤200 lines — split into `smoke-git.test.ts` / `smoke-fs.test.ts` / `smoke-network.test.ts` if needed. Residual cases document expected failure mode; no silent passes. Pure helper logic (pattern lookup) extracted to `src/utils/` with its own Jest test per global rule.

### Task 7 - Generator + hooks test updates [TEST] [PARALLEL]
**Files**: `tests/generator/permissions.test.ts`, `tests/generator/epic-5-hooks.test.ts`, `tests/generator/generate-root-config.test.ts` (new or existing — grep first).
**Input**: Task 1, 2, 3 outputs.
**Output**: New assertions for every Task 1 deny pattern; hook matcher tests updated if `PreToolUse` emit changed; test that `generate-root-config.ts` emits `.claude/settings.json` (not `settings.local.json`) and includes the `sandbox` block with `mode`/`autoAllowBashIfSandboxed`/`allowedDomains`; test that `codex-project-rules.ejs` renders every forbid and allow required by E9.T3/T10/T11/T12.
**Notes**: Use table-driven tests to avoid duplication across deny-pattern cases (DRY). Do not duplicate fixtures — import from production constants where possible.

### Task 8 - Cursor / Copilot / Windsurf partial deltas [DOC]
**Files**: `src/templates/partials/cursor-deny-destructive.md.ejs` (add if missing), `src/templates/partials/copilot-dangerous-ops.md.ejs` (add if missing), `src/templates/partials/windsurf-forbidden-commands.md.ejs` (add if missing) — exact deltas determined by `ls src/templates/partials/` and grep of `src/generator/` for cursor/copilot/windsurf wiring.
**Input**: E9.T6 (Cursor `00-deny-destructive-ops.mdc` with `alwaysApply: true`), E9.T7 (`.github/copilot-instructions.md` §1.4 deny items + prompt frontmatter `tools:` minimization), E9.T8 (`.windsurf/rules/00-forbidden-commands.md` with `activation: always_on`, "Yolo mode forbidden" line).
**Output**: Partials contain §1.4 deny list enumeration verbatim + the no-sandbox caveat (Cursor), branch-protection dependency note (Copilot), Manual/Auto approval-mode requirement (Windsurf). Wired into existing emission if plumbing exists.
**Notes**: If Cursor/Copilot/Windsurf emission plumbing is **not** wired up yet in the generator, DO NOT invent it — record the gap in `## External errors` and limit this task to partials + PRD-required prompt frontmatter edits only.

## Post-implementation checklist

- [ ] `pnpm check-types` - zero errors.
- [ ] `pnpm test` - all suites pass (incl. `tests/security/smoke.test.ts`).
- [ ] `pnpm lint` - zero warnings.
- [ ] `codex execpolicy check --rules .codex/rules/project.rules` exits 0 (manual — requires Codex CLI).
- [ ] `git check-ignore -v` confirms un-ignore negations (Task 4 Done-when).
- [ ] Run `code-reviewer` + `security-reviewer` agents in parallel on all modified files - all critical and warning findings fixed.
- [ ] DRY scan complete - deny patterns emitted from one source-of-truth constant; no duplicated fixtures across tests.
- [ ] E9.T15 13 automated cases green on Windows; residual cases documented in `docs/security-smoke-runbook.md`.
- [ ] Every file ≤200 lines; no `any` types; object-param rule honored for functions with 3+ args.
- [ ] No `--dangerously-skip-permissions` / `--dangerously-bypass-approvals-and-sandbox` in emitted docs or PR body.
- [ ] User-deferred: `git rm --cached .claude/settings.local.json` before committing `.gitignore` change.

## External errors

- **PRD §1.9 E9.T3 specifies `approval_policy = "on-failure"` — Codex CLI deprecated this value.** Current Codex CLI (openai/codex) accepts only `untrusted`, `on-request`, `never`, `granular`. Implementation uses `on-request` (the closest semantic match for the safe interactive posture the PRD describes). PRD needs an update to replace `on-failure` references throughout Epic 9 / Epic 10 with `on-request`. Source: https://developers.openai.com/codex/config-reference.
- **E9.T6 / E9.T7 / E9.T8 emission plumbing not wired in generator.** `src/generator/` has no Cursor (`.cursor/rules/*.mdc`), Copilot (`.github/copilot-instructions.md`, `.github/prompts/*.prompt.md`), or Windsurf (`.windsurf/rules/*.md`) template rendering. Grep of `src/generator/` confirms only `generate-scripts.ts` mentions `cursor` (unrelated — script file for the Cursor IDE task shortcut). Writing orphan partials under `src/templates/partials/` now would not be consumed by anything. Deferred to whichever epic introduces multi-tool config emission (likely Epic 11 per PRD §1.9 references). Epic 9 MUST scope for Claude + Codex is complete.
