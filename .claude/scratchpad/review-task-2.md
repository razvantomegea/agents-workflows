# Review Task 2 - Epic 1 QA Fixes

## Context

Fix all verified issues listed in `QA.md` for `feature/epic-1-agent-safety-core`.

## Modified files

- `PRD.md`
- `QA.md`
- `src/generator/permissions.ts`
- `src/templates/config/AGENTS.md.ejs`
- `src/utils/template-renderer.ts`
- `tests/generator/epic-1-safety.test.ts`
- `tests/generator/permissions.test.ts`

## Loop 1

- Code-reviewer pass: 1 warning found - package-run lint commands that already had a forwarded-args separator could receive a duplicate `--`.
- Security-reviewer pass: no findings. Changes add command-deny patterns and string formatting only; no untrusted input reaches a new sink.
- Fixes applied: reused existing package-run argument separators and added unit coverage.
- Type-check: `corepack pnpm check-types` PASS.
- Tests: targeted `corepack pnpm test -- tests/generator/permissions.test.ts tests/generator/epic-1-safety.test.ts` PASS.
- Full tests: `corepack pnpm test` PASS.
- Lint: `corepack pnpm lint` PASS.
- Status: REVIEW COMPLETE - type-check PASS, tests PASS.
