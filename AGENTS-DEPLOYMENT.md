# AGENTS-DEPLOYMENT.md

Supplemental operational guidance for `agents-workflows` agents.
This document holds tooling hooks, formatting/linting posture, and deployment standards moved from `AGENTS.md` to keep the main agent brief under control.

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
