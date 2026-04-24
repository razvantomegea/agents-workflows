/**
 * Source-of-truth constants for Claude Code permission deny/allow lists and
 * pre-tool-use guard patterns. Import from permissions.ts — do not import
 * this file directly from outside the generator package.
 */

/**
 * Destructive bash command literals used both as `Bash(<cmd>:*)` deny entries
 * and as the base of the pre-tool-use guard regex alternation.
 */
export const DESTRUCTIVE_BASH_PATTERNS: readonly string[] = [
  'rm -rf',
  'rm -r',
  'rm --recursive',
  'rm --force',
  'git push --force',
  'git push -f',
  'git push --force-with-lease',
  'git reset --hard',
  'git clean -fd',
  'git clean -f',
  'git branch -D',
  // Prevent any form of commit or push
  'git push',
  'git commit',
  'git commit --amend',
  'git rm',
  // Privilege escalation
  'sudo',
];

/**
 * Additional regex fragments for the pre-tool-use guard that cannot be
 * represented as plain command literals (e.g. patterns with shell metacharacters).
 * These are combined with DESTRUCTIVE_BASH_PATTERNS into the grep -qE alternation.
 */
export const PRE_TOOL_USE_PATTERN_EXTRAS: readonly string[] = [
  'curl .*\\| *sh',
  'curl .*\\| *bash',
  'wget .*\\| *sh',
  'wget .*\\| *bash',
];

/**
 * Additional deny entries that are not derived from DESTRUCTIVE_BASH_PATTERNS
 * (filesystem editors, pipe-to-shell, exfil vectors).
 */
const EXTRA_DENY_PATTERNS: readonly string[] = [
  // Pipe-to-shell (curl/wget without .exe — plain curl/wget for read-only fetches are allowed)
  'Bash(curl:* | sh)',
  'Bash(curl:* | bash)',
  'Bash(wget:* | sh)',
  'Bash(wget:* | bash)',
  // Filesystem editors: absolute and home-relative paths are off-limits
  'Edit(/**)',
  'Edit(~/**)',
  'Write(/**)',
  'Write(~/**)',
  'MultiEdit(/**)',
  'MultiEdit(~/**)',
  // Existing non-destructive but sensitive patterns
  'Bash(npm publish:*)',
  'Bash(pnpm publish:*)',
  'Bash(cargo publish:*)',
  'Bash(twine upload:*)',
  'Bash(terraform apply:*)',
  'Bash(kubectl apply:*)',
  'Bash(kubectl delete namespace:*)',
  'Edit(.env*)',
  'Edit(**/*.key)',
  'Edit(**/*.pem)',
  'Edit(migrations/**)',
  'Write(.env*)',
  'Write(**/*.key)',
  'Write(**/*.pem)',
  'Write(migrations/**)',
  'MultiEdit(.env*)',
  'MultiEdit(**/*.key)',
  'MultiEdit(**/*.pem)',
  'MultiEdit(migrations/**)',
  // Exfil: Windows-native and .exe variants (plain curl/wget remain allowable)
  'Bash(Invoke-WebRequest:*)',
  'Bash(iwr:*)',
  'Bash(Invoke-RestMethod:*)',
  'Bash(irm:*)',
  'Bash(curl.exe:*)',
  'Bash(wget.exe:*)',
];

/**
 * Complete deny list: DESTRUCTIVE_BASH_PATTERNS mapped to Bash entries, plus
 * all additional deny patterns. This is the single source of truth for
 * buildDenyList().
 */
export const DENY_PATTERNS: readonly string[] = [
  ...DESTRUCTIVE_BASH_PATTERNS.map((p) => `Bash(${p}:*)`),
  ...EXTRA_DENY_PATTERNS,
];

/**
 * Local-only git subcommand allow entries (read-only plus local state mutations
 * that never touch the remote). Broad `Bash(git:*)` is intentionally excluded;
 * `push`, `commit`, `rm`, `reset --hard`, `clean -f`, `branch -D` stay denied.
 */
export const LOCAL_GIT_ALLOWS: readonly string[] = [
  'Bash(git status:*)',
  'Bash(git diff:*)',
  'Bash(git log:*)',
  'Bash(git branch:*)',
  'Bash(git add:*)',
  'Bash(git checkout:*)',
  'Bash(git switch:*)',
  'Bash(git stash:*)',
  'Bash(git pull:*)',
];

/**
 * Toolchain command allow entries for common dev tools not covered by pnpm.
 */
export const TOOLCHAIN_ALLOWS: readonly string[] = [
  'Bash(tsc:*)',
  'Bash(jest:*)',
  'Bash(eslint:*)',
  'Bash(prettier:*)',
  'Bash(node:*)',
  'Bash(npx:*)',
];
