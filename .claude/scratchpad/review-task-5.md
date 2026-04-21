# Review Task 5 — QA-fix iteration (epic-3-code-review-depth)

**Date:** 2026-04-21
**Branch:** feature/epic-3-code-review-depth
**Loop iteration:** 1

## Task context

Fixed QA issues in command docs, scripts, rules/skills/templates:
- Remove redundant workflow-fix review step + clarify lint placement
- Replace grep -P with awk extraction (macOS portability)
- Block terraform destroy
- Remove stack-context None placeholder
- Add OWASP A06/A08 and template parity

## Modified files

1. `.claude/commands/workflow-fix.md`
2. `.claude/scripts/run-parallel.sh`
3. `.codex/rules/project.rules`
4. `.codex/skills/code-reviewer/SKILL.md`
5. `QA.md`
6. `src/templates/commands/workflow-fix.md.ejs`
7. `src/templates/partials/review-checklist.md.ejs`
8. `src/templates/partials/stack-context.md.ejs`
9. `src/templates/scripts/run-parallel.sh.ejs`

---

## Loop 1 — Code-reviewer findings

### Correctness

| Severity | File | Finding | Status |
|----------|------|---------|--------|
| ✅ pass | `.claude/commands/workflow-fix.md` | Old steps 6+7 merged to single step 6; step numbering renumbered correctly (3 skip target updated to 6; old 8/9/10 → 7/8/9) | PASS |
| ✅ pass | `.claude/scripts/run-parallel.sh` | `grep -P` replaced with portable `awk '/^### Task [0-9]+.*\[PARALLEL\]/{match($0,/[0-9]+/); print substr($0,RSTART,RLENGTH)}'`; first-number match safely extracts task ID because `### Task ` prefix contains no digits | PASS |
| ✅ pass | `.codex/rules/project.rules` | `terraform destroy` added as separate `prefix_rule`; both apply/destroy now blocked | PASS |
| ✅ pass | `.codex/skills/code-reviewer/SKILL.md` | "None" removed from Stack Context; A06 + A08 OWASP entries added between A05↔A07 and A07↔A09 — full A01–A10 sequence complete | PASS |
| ✅ pass | `src/templates/partials/stack-context.md.ejs` | `if (item.toLowerCase() !== 'none')` guard added — prevents "None" rendering in all future generated files | PASS |
| ✅ pass | `src/templates/partials/review-checklist.md.ejs` | A06/A08 added, mirrors code-reviewer SKILL.md | PASS |
| ✅ pass | `src/templates/commands/workflow-fix.md.ejs` | Template parity with rendered command — step numbering, lint justification, reviewer→code-reviewer | PASS |
| ✅ pass | `src/templates/scripts/run-parallel.sh.ejs` | Template matches rendered script | PASS |
| ✅ pass | `QA.md` | All 5 issues marked `[x]` | PASS |

### Security review

| Severity | File | Finding |
|----------|------|---------|
| info | `run-parallel.sh` / `.ejs` | `$TASK_NUM` passed to `bash cursor-task.sh`; the awk regex `[0-9]+` guarantees only digits — no injection risk |
| info | `stack-context.md.ejs` | EJS filter on in-memory `stackItems` array from trusted config; no external input path |
| ✅ pass | All | No hardcoded secrets, eval, exec, spawn, SQL, or path traversal introduced |

### Critical findings: 0
### Warning findings: 0
### Nit findings: 0

### Out-of-scope residual (informational, not blocking)

- `.codex/skills/security-reviewer/SKILL.md` (NOT in modified-files list) still renders `- None` in Stack Context (line 12). Root cause fixed in `stack-context.md.ejs`; will be resolved on next `pnpm generate` run.

---

## Commands run

| Command | Result |
|---------|--------|
| `git status` | 9 expected files modified, no stray files |
| `git branch --show-current` | `feature/epic-3-code-review-depth` ✅ |
| `pnpm check-types` | **PASS** (exit 0) |
| `pnpm test` | **PASS** — 151 tests, 19 suites (exit 0) |

---

## Final status

**Loop iterations:** 1  
**Critical findings:** 0  
**Warning findings:** 0  
**Nit/Info findings:** 1 (out-of-scope — security-reviewer/SKILL.md None placeholder; template fix applied)  
**No fixes required.**

REVIEW COMPLETE — type-check PASS, tests PASS
