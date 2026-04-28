# QA Review

## CodeRabbit Review - 2026-04-28

> **Warning**: These findings come from an automated tool (CodeRabbit) and may be inaccurate or
> based on incomplete context. Before applying any fix, verify the observation against the actual
> code. Skip findings that are wrong or do not apply.

### src/templates/agents/implementer-variants/svelte.md.ejs
- [x] [critical] Removed the nonexistent `@sveltejs/kit/testing` reference; updated Testing guidance to recommend extracting plain server logic for Vitest, `@testing-library/svelte` for components, and Playwright (or `supertest` against the adapter) for E2E/integration.

### tests/installer/safe-delete-stale-files.test.ts
- [x] [suggestion] Added `afterEach` to the `@jest/globals` import line. The hook was already running because Jest provides it as a global, but the explicit import keeps the file consistent with the rest of the imports.

### tests/generator/stack-aware-agents.test.ts
- [x] [skipped] Stale CodeRabbit observation. Verified locally: the `go: context.Context, go test` test passes (the `go test` string was already added to `go.md.ejs` during T8). No code change required.
