# QA Review

## CodeRabbit Review - 2026-04-30

> **Warning**: These findings come from an automated tool (CodeRabbit) and may be inaccurate or
> based on incomplete context. Before applying any fix, verify the observation against the actual
> code. Skip findings that are wrong or do not apply.

### scripts/lib/walk-src.ts
- [ ] [suggestion] `isOutOfScope` only matches `/dist/` and `/coverage/` substrings with a leading slash, so root-level `dist/` or `coverage/` entries (e.g. when `rootDir` is the repo root) would not be excluded. Add `relPath.startsWith('dist/')` and `relPath.startsWith('coverage/')` checks alongside the existing substring matches and the `.endsWith('.ejs')` check. (lines 11-15)
