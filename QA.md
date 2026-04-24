# QA Review

## CodeRabbit Review - 2026-04-24

> **Warning**: These findings come from an automated tool (CodeRabbit) and may be inaccurate or
> based on incomplete context. Before applying any fix, verify the observation against the actual
> code. Skip findings that are wrong or do not apply.

### src/templates/config/codex-config.toml.ejs
- [x] [critical] `approval_policy = "on-failure"` IS deprecated — CodeRabbit was correct. Current Codex CLI accepts only `untrusted`, `on-request`, `never`, `granular`. Switched to `on-request`. PRD mismatch logged under External errors in PLAN.md.

### README.md
- [x] [minor] Line 14 — replaced `.claude/settings.local.json` with `.claude/settings.json`.
- [x] [minor] Line 231 — replaced `settings-local.json.ejs` with `settings.json.ejs`, added `codex-project-rules.ejs`.

### src/templates/config/codex-project-rules.ejs
- [x] [minor] Added `"pull"` to the local-git allow rule (also regenerated in `.codex/rules/project.rules`).
- [x] [minor] Added `"yarn"` to the publish deny rule (also regenerated in `.codex/rules/project.rules`).
- [x] [major] Added an inline comment in the template and the regenerated `.codex/rules/project.rules` explaining why plain `curl`/`wget` remain allowed (PRD E9.T11 non-goal).

### .gitignore
- [x] [minor] **Skipped** — CodeRabbit's suggested blanket `.codex/` ignore would break existing tracked files (`.codex/skills/`, `.codex/prompts/`, `.codex/scripts/`). Current negations are correct; no broad ignore exists to negate against.

### AGENTS.md
- [x] [minor] Hand-edited `AGENTS.md` to reference `.claude/settings.json` + per-developer override note. Template was already fixed earlier in the epic.


 External errors / open items

  1. PRD drift: PRD specifies approval_policy = "on-failure" but current Codex CLI deprecated that value — implementation uses "on-request". PRD
   text needs updating across Epic 9/Epic 10 references.
  2. E9.T6 / T7 / T8 not shipped: Cursor / Copilot / Windsurf emission plumbing does not exist in src/generator/ yet. Recorded in PLAN External 
  errors; belongs to the epic that introduces multi-tool config emission.
  3. User-deferred action: run git rm --cached .claude/settings.local.json before committing so the now-gitignored per-developer cache is       
  untracked. Not automated by this epic.