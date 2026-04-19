Verify each finding against the current code and only fix it if needed.

- [x] In `@tests/generator/epic-1-safety.test.ts` at line 4, Remove the redundant alias
line "const makeConfig = makeStackConfig;" and update any test references that
call makeConfig to call makeStackConfig directly (or change the import to the
desired name instead); specifically search for usages of makeConfig in this test
and replace them with makeStackConfig, then delete the alias declaration to
avoid the unnecessary indirection.

Verify each finding against the current code and only fix it if needed.

Inline comments:
In `@src/generator/permissions.ts`:
- [x] Around line 9-30: DENY_PATTERNS is missing entries declared in the generated
policy (e.g., cargo/pypi publish ops), so add the corresponding deny patterns to
the DENY_PATTERNS array (for example entries like Bash(cargo publish:*),
Bash(twine upload:*), Bash(pypi upload:*), or other shell forms you use to
publish to PyPI) and ensure sensitive edit patterns mirror AGENTS.md.ejs; after
updating DENY_PATTERNS, update the unit test expectations in permissions.test.ts
to match the new array length and content so tests reflect the enforced policy.
- [x] Around line 55-60: The buildPostToolUseHooks function builds a lint command
incorrectly for run-wrappers (npm/yarn/pnpm/bun run) and its --fix detection is
too weak; update the logic that reads input.lintCommand to (1) enhance the
hasFix regex to match --fix and --fix=... (e.g., /\b--fix(?:=|\\b)/), (2) detect
run-wrapper patterns like /\b(?:npm|yarn|pnpm|bun)\s+run\b/ and when matched
insert the argument separator before forwarded flags so the fallback becomes
"npm run lint -- --fix || true" rather than "npm run lint --fix || true", and
(3) keep existing behavior for direct commands (e.g., "pnpm lint --fix ||
true"); also add unit tests covering run-wrapper cases to validate the new
behavior.

In `@src/utils/template-renderer.ts`:
- [x] Around line 9-17: The file currently exports multiple helpers (jsonString,
tomlString); to comply with the one-public-helper rule, remove the export
keywords from jsonString and tomlString to make them private module-scoped
functions, or alternatively move these two functions into a new helper module
and import them where needed; update any callers to import from the new module
if you choose to move them and ensure only the intended public function in
template-renderer.ts remains exported.

In `@tests/generator/epic-1-safety.test.ts`:
- [ ] Around line 119-123: The test currently asserts
expect(toml).toContain(`"${pattern}"`) but fails when pattern has
quotes/backslashes because the TOML generator escapes them; update the assertion
to compare against an escaped representation by using JSON.stringify(pattern)
(or another proper escape utility) instead of raw interpolation, i.e. replace
the `expect(toml).toContain(\`"${pattern}"\`)` check inside the loop over
parsed.permissions.deny with `expect(toml).toContain(JSON.stringify(pattern))`
so the test matches the TOML-escaped value for each pattern.
  - Skipped: stale finding. The current branch intentionally renders Codex-native safety defaults in `.codex/config.toml` (`approval_policy`, `sandbox_mode`, and `network_access`) and the current test asserts there is no `[permissions]` deny table, so there is no loop over `parsed.permissions.deny` or raw TOML deny-pattern interpolation to fix.

---

Nitpick comments:
In `@tests/generator/epic-1-safety.test.ts`:
- [x] Line 4: Remove the redundant alias line "const makeConfig = makeStackConfig;"
and update any test references that call makeConfig to call makeStackConfig
directly (or change the import to the desired name instead); specifically search
for usages of makeConfig in this test and replace them with makeStackConfig,
then delete the alias declaration to avoid the unnecessary indirection.
