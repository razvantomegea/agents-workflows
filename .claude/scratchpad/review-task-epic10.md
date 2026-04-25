# Review Task: Epic 10 Non-Interactive Mode — Final Gate

## Branch: feature/epic-10-non-interactive-mode

## Loop Iteration 1

### Gate results (pre-fix)
- pnpm check-types: PASS (clean, zero errors)
- pnpm test: PASS (49 suites, 589 tests)
- pnpm lint: PASS (0 warnings, 0 errors)

### Code Review Findings

**Critical: NONE**

**Warning: 2**

W1. `init-command.ts` is 192 lines — within limit but borderline. Not a violation.
W2. `ask-non-interactive.ts`: `renderTemplate` is called with `{ condense: false }` which passes a `boolean`, but the EJS template checks `typeof condense !== 'undefined' && condense`. When called from `askNonInteractiveMode` (the interactive flow), the condense variable is `false`, which evaluates correctly to the full disclosure. Confirmed correct — not a bug.

**NIT: 4**

N1. `init-command.ts` trailing blank line at EOF (line 193) — harmless, lint passes.
N2. `update-command.ts` trailing blank line at EOF (line 145) — same.
N3. `resolveNonInteractiveFlagPath` in `ask-non-interactive.ts`: the function is private but not exported — clear, correct.
N4. `ISOLATION_NAME_PAD` computed at module load time — acceptable for a small const tuple.

### Security Review Findings

**Critical: NONE**

**Warning: 1**

SW1. `resolveSecurityUpdate` Branch 1 check: when `options.nonInteractive` is explicitly passed as `undefined` but `options.isolation` or `options.acceptRisks` is defined (unusual but possible), the branch fires, `parseNonInteractiveFlags` is called with `nonInteractive: undefined`, which returns `DISABLED_RESULT` (Rule 2). So `parsed.enabled === false`, and the function returns `SECURITY_DEFAULTS`. This is safe — no injection path. Confirmed not a vulnerability.

SW2. `HOST_OS_WARNING` writes to stdout via `process.stdout.write` inside interactive prompts — correct channel, not a security issue.

SW3. `hashConfig` uses SHA-256, 16-hex-char truncation — non-cryptographic use (change detection only), no security claim made. Acceptable.

SW4. `stackConfigSchema` `security.disclosureAcknowledgedAt` uses `z.string().datetime()` — ISO 8601 validated at parse time. Correct.

**No critical or warning security findings.**

### DRY / Invariant checks

- `ISOLATION_CHOICES`: declared exactly once in `src/schema/stack-config.ts`. All consumers import from there. PASS.
- `IsolationChoice`: declared exactly once via `typeof ISOLATION_CHOICES`. PASS.
- `SECURITY_DEFAULTS`: declared exactly once in `src/schema/stack-config.ts`. PASS.
- `HOST_OS_ACCEPT_PHRASE`: declared exactly once in `src/prompt/ask-non-interactive.ts`, re-exported via `questions.ts`. PASS.
- Security disclosure text: lives exclusively in `src/templates/partials/security-disclosure.md.ejs`. All inclusions use EJS `include`. No parallel copy. PASS.

### PRD §E10.T12 error string verification

- Error 1: `'--non-interactive requires --isolation=<env>'` — confirmed character-for-character in `non-interactive-flags.ts:47` and tested in `epic-10-non-interactive.test.ts:85`. PASS.
- Error 2: `'--non-interactive --isolation=host-os requires --accept-risks (see PRD §1.9.1)'` — confirmed in `non-interactive-flags.ts:52-54` and tested in `epic-10-non-interactive.test.ts:73`. PASS.

### Backwards compat (manifest without security key)

- `stackConfigSchema` has `.default(SECURITY_DEFAULTS)` on the security object. Schema parses manifests without `security` to safe defaults.
- Covered by Case 6 in `epic-10-non-interactive.test.ts` (two sub-tests). PASS.

### Safe-default TOML branch (Epic 9 byte-for-byte match)

- Safe branch emits: `approval_policy = "on-request"`, `sandbox_mode = "workspace-write"`, `[sandbox_workspace_write]`, `network_access = false`. No leading whitespace artifacts (EJS `-%>` strips trailing newlines). Verified in template-branching tests. PASS.

### File line counts
- All new/modified source files within 200-line limit.
- `AGENTS.md` (247) and `AGENTS.md.ejs` (208): pre-existing overages, per plan notes — not a gate blocker.

### Deferred / non-blocking
- Root AGENTS.md (247 lines) — pre-existing, documented in PLAN.md External errors.
- AGENTS.md.ejs (208 lines) — pre-existing, same.
- PRD §E10.T11 JSON comment block: acknowledged gap (JSON has no comment syntax); `settings.json` emits the value change only.

## Status: CLEAN — no critical or warning findings require fixes.
