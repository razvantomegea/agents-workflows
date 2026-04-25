/**
 * Source-of-truth constants for Claude Code permission deny/allow lists and
 * pre-tool-use guard patterns. Import from permissions.ts — do not import
 * this file directly from outside the generator package.
 */

/**
 * Escape a literal string for safe inclusion in a POSIX/ERE regex alternation.
 * Shared by the generator (permissions.ts) and template-assertion tests.
 */
export function escapeRegexLiteral(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const ALLOWED_DOMAINS: readonly string[] = [
  'api.github.com',
  'registry.npmjs.org',
  'nodejs.org',
  'raw.githubusercontent.com',
  'objects.githubusercontent.com',
  'pypi.org',
  'files.pythonhosted.org',
];

export const EXPECTED_ALLOWED_DOMAINS_COUNT = ALLOWED_DOMAINS.length;

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
  'git reset --merge',
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
 * Raw-interpreter and shell-wrapper invocations that evaluate arbitrary code
 * inline. Listed as command-prefix literals so the deny list and guard regex
 * both block every `<runtime> <eval-flag>` combination explicitly.
 */
const RAW_INTERPRETER_PATTERNS: readonly string[] = [
  'pwsh',
  'pwsh.exe',
  'powershell',
  'powershell.exe',
  'cmd /c',
  'cmd /k',
  'cmd.exe /c',
  'cmd.exe /k',
  'node -e',
  'node --eval',
  'python -c',
  'python3 -c',
];

/**
 * Bash command literals that must remain blocked and mirrored in the pre-tool-use
 * guard alternation to keep the runtime guard aligned with the deny list.
 */
export const BASH_DENY_COMMAND_PATTERNS: readonly string[] = [
  ...DESTRUCTIVE_BASH_PATTERNS,
  'npm publish',
  'pnpm publish',
  'cargo publish',
  'twine upload',
  'terraform apply',
  'kubectl apply',
  'kubectl delete',
  'Invoke-WebRequest',
  'iwr',
  'Invoke-RestMethod',
  'irm',
  'curl.exe',
  'wget.exe',
  ...RAW_INTERPRETER_PATTERNS,
];

/**
 * Non-bash deny entries that are NOT derived from BASH_DENY_COMMAND_PATTERNS
 * (filesystem editors, pipe-to-shell bash expressions, secret-path globs).
 * Pure `Bash(<cmd>:*)` patterns belong in BASH_DENY_COMMAND_PATTERNS instead.
 */
const EXTRA_DENY_PATTERNS: readonly string[] = [
  // Pipe-to-shell (curl/wget without .exe — plain curl/wget for read-only fetches are allowed)
  'Bash(curl* | sh)',
  'Bash(curl* | bash)',
  'Bash(wget* | sh)',
  'Bash(wget* | bash)',
  // Filesystem editors: absolute and home-relative paths are off-limits
  'Edit(/**)',
  'Edit(~/**)',
  'Write(/**)',
  'Write(~/**)',
  'MultiEdit(/**)',
  'MultiEdit(~/**)',
  // Secret/credential path globs
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
];

/**
 * Complete deny list: DESTRUCTIVE_BASH_PATTERNS mapped to Bash entries, plus
 * all additional deny patterns. This is the single source of truth for
 * buildDenyList().
 */
export const DENY_PATTERNS: readonly string[] = [
  ...BASH_DENY_COMMAND_PATTERNS.map((p: string) => `Bash(${p}:*)`),
  ...EXTRA_DENY_PATTERNS,
];

/**
 * Local git subcommand allow entries: read-only inspection only.
 * Broad `Bash(git:*)` is intentionally excluded; mutating git operations stay denied
 * or require explicit approval in the current session.
 */
export const LOCAL_GIT_ALLOWS: readonly string[] = [
  'Bash(git status:*)',
  'Bash(git diff:*)',
  'Bash(git log:*)',
  'Bash(git branch:*)',
];

/**
 * Toolchain command allow entries for common dev tools not covered by pnpm.
 */
export const TOOLCHAIN_ALLOWS: readonly string[] = [
  'Bash(tsc:*)',
  'Bash(jest:*)',
  'Bash(eslint:*)',
  'Bash(prettier:*)',
];

/**
 * Cross-model handoff allow entries (§1.7.2): lets Claude Code invoke Codex in
 * headless mode (`codex exec`) and lets Codex invoke Claude Code in headless
 * mode (`claude -p`) as the subprocess fallback when the official Codex plugin
 * for Claude Code (`codex-plugin-cc`) is unavailable. The plugin itself uses
 * MCP, which does not require any Bash allowlist entry.
 */
export const CROSS_MODEL_HANDOFF_ALLOWS: readonly string[] = [
];
