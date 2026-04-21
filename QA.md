# QA Review

## CodeRabbit Review - 2026-04-21

> **Warning**: These findings come from an automated tool (CodeRabbit) and may be inaccurate or
> based on incomplete context. Before applying any fix, verify the observation against the actual
> code. Skip findings that are wrong or do not apply.

### src/templates/partials/security-defaults.md.ejs
- [x] [critical] Line 11 — the rate-limiting bullet cites `draft-10` as if it were a finalized spec. Reframed to name `draft-ietf-httpapi-ratelimit-headers-10` as an expired Internet-Draft and pointed to `Retry-After` (RFC 7231) for ratified behavior.

### .claude/settings.local.json
- [ ] [major] Lines 9–11 — permission rule `Bash(node *)` is overly permissive. **BLOCKED by self-modification guard** — Claude Code denied the edit because this file configures its own permissions. User action needed: manually narrow `Bash(node *)` to `Bash(node --experimental-vm-modules node_modules/jest/bin/jest.js *)` and remove the debug-specific `Bash(node --experimental-vm-modules node_modules/jest/bin/jest.js tests/generator/generate-all.test.ts --verbose)` entry.

### src/templates/partials/coderabbit-setup.md.ejs
- [x] [minor] Line 48 — replaced single `sha256sum` line with platform-specific `sha256sum` (Linux) / `shasum -a 256` (macOS) variants.

### .codex/rules/project.rules
- [ ] [skip] [minor] Lines 1–53 — CRLF line endings + missing trailing newline. Out of Epic 4 scope; cosmetic formatting. Skipped — can be handled by a repo-wide line-ending pass in a separate task.

### .codex/skills/test-writer/SKILL.md
- [ ] [skip] [minor] Line 26 — CodeRabbit suggests rewriting to match colocated-test convention. False positive — this project's convention is `tests/` directory (not colocated); the line already reflects reality. No change needed.

### .codex/skills/implementer/SKILL.md
- [x] [minor] Line 7 — replaced "senior none / typescript implementation skill" placeholder with "senior TypeScript implementation skill"; removed the empty `- None` line from the Stack Context list.

### .claude/commands/workflow-fix.md
- [x] [minor] Line 12 — updated "skip to step 6" → "skip to step 7" to align with the Codex counterpart.
